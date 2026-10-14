import { readFile, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fail } from './errors.mjs';
import { resolveStagePlan } from '../../brand-registry/scripts/stage-planner.mjs';

const installRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

function same(left, right) {
  return JSON.stringify(stable(left)) === JSON.stringify(stable(right));
}

async function readConfined(root, relative) {
  if (path.isAbsolute(relative) || relative.split(/[\\/]+/).includes('..')) return null;
  const candidate = path.resolve(root, relative);
  if (!candidate.startsWith(`${root}${path.sep}`)) return null;
  try {
    const canonical = await realpath(candidate);
    if (!canonical.startsWith(`${root}${path.sep}`)) return null;
    return await readFile(canonical);
  } catch {
    return null;
  }
}

export async function validateExecutionProvenance(project, execution, dependencies, requirements = {}) {
  if (execution.selection.purpose !== requirements.expected_purpose) {
    fail('E_PROVENANCE_INVALID', 'Execution selection purpose does not match the artifact operation', { expected: requirements.expected_purpose, received: execution.selection.purpose });
  }
  if (execution.workflow_step_id !== requirements.workflow_step_id) {
    fail('E_PROVENANCE_INVALID', 'Execution workflow step does not match the selected product step', {
      expected: requirements.workflow_step_id ?? null, received: execution.workflow_step_id ?? null,
    });
  }
  let plan;
  try {
    plan = resolveStagePlan({
      root: installRoot,
      definition: requirements.definition,
      stage: execution.stage_id,
      workflowStepId: execution.workflow_step_id,
      purpose: execution.selection.purpose,
      context: execution.selection.context,
      profile: execution.selection.profile,
      capabilities: execution.selection.capabilities,
      providers: execution.selection.providers,
      hostCapabilities: execution.selection.host_capabilities,
      planVersion: execution.plan_version,
      inputArtifacts: dependencies,
    });
  } catch (error) {
    fail('E_PROVENANCE_INVALID', 'Execution selection could not be resolved against the installed registry', { message: error.message });
  }
  if (plan.errors?.length || !String(plan.resolution).startsWith('routed') || plan.optional_budget_status !== 'pass' || plan.budget?.status !== 'pass') {
    fail('E_PROVENANCE_INVALID', 'Execution selection does not resolve to an executable stage plan', { resolution: plan.resolution, errors: plan.errors ?? [] });
  }
  if (plan.stage_contract_hash !== requirements.definition_hash) {
    fail('E_PROVENANCE_INVALID', 'Resolved stage plan is not bound to the project workflow definition', { expected: requirements.definition_hash, received: plan.stage_contract_hash });
  }
  for (const [field, expected] of [
    ['plan_id', plan.plan_id], ['plan_hash', plan.plan_hash], ['plan_version', plan.plan_version], ['stage_id', plan.stage_id],
  ]) {
    if (execution[field] !== expected) fail('E_PROVENANCE_INVALID', `Execution ${field} does not match the deterministically resolved plan`, { expected, received: execution[field] });
  }
  if (!same(execution.skills, plan.execution.skills) || !same(execution.capability_assignments, plan.execution.capability_assignments)) {
    fail('E_PROVENANCE_INVALID', 'Execution skills or capability assignments do not match the deterministically resolved plan', {
      expected_skills: plan.execution.skills,
      expected_capability_assignments: plan.execution.capability_assignments,
    });
  }
  let manifest;
  try {
    manifest = JSON.parse(await readFile(path.join(installRoot, 'pm-zero.manifest.json'), 'utf8'));
  } catch (error) {
    fail('E_PROVENANCE_INVALID', 'Installed pm-zero.manifest.json is unavailable or invalid', { message: error.message });
  }
  const registered = new Map((manifest.entries?.skills ?? []).map((skill) => [skill.id, skill]));
  const selected = new Map(execution.skills.map((used) => [used.skill_id, used]));
  for (const used of execution.skills) {
    const skill = registered.get(used.skill_id);
    if (!skill || skill.version !== used.version) {
      fail('E_PROVENANCE_INVALID', 'Execution skill is not registered at the declared version', {
        skill_id: used.skill_id,
        declared_version: used.version,
        registered_version: skill?.version ?? null,
      });
    }
    const entryPath = skill.stage_provider?.entrypoint ?? path.posix.join(skill.path.replace(/\\/g, '/').replace(/\/$/, ''), 'SKILL.md');
    const receipt = execution.read_receipts.find((item) => item.path.replace(/\\/g, '/') === entryPath);
    if (!receipt) {
      fail('E_PROVENANCE_INVALID', 'Each selected skill requires a read receipt for its registered SKILL.md entry', { skill_id: used.skill_id, expected_path: entryPath });
    }
  }
  const assignments = new Map();
  for (const assignment of execution.capability_assignments) {
    if (assignments.has(assignment.capability)) fail('E_PROVENANCE_INVALID', 'Each capability may be assigned only once', { capability: assignment.capability });
    assignments.set(assignment.capability, assignment.skill_id);
    if (!selected.has(assignment.skill_id)) fail('E_PROVENANCE_INVALID', 'Capability assignment names a skill absent from execution.skills', { assignment });
    const provider = registered.get(assignment.skill_id)?.stage_provider;
    if (!provider?.capabilities?.includes(assignment.capability)) {
      fail('E_PROVENANCE_INVALID', 'Assigned skill is not registered for the declared stage capability', { assignment });
    }
    const providerOutputType = requirements.provider_output_type ?? requirements.output_type;
    const outputTypes = requirements.provider_output_types ?? [providerOutputType].filter(Boolean);
    if (outputTypes.length && !provider.outputs?.some(type => outputTypes.includes(type))) {
      fail('E_PROVENANCE_INVALID', 'Assigned skill is not registered to produce this artifact type', { assignment, output_type: providerOutputType });
    }
  }
  if (requirements.provider_output_types && requirements.output_type
      && !execution.capability_assignments.some(assignment => registered.get(assignment.skill_id)?.stage_provider?.outputs?.includes(requirements.output_type))) {
    fail('E_PROVENANCE_INVALID', 'No assigned stage provider can produce the registered artifact type', { output_type: requirements.output_type });
  }
  const missingCapabilities = (requirements.required_capabilities ?? []).filter((capability) => !assignments.has(capability));
  if (missingCapabilities.length) {
    fail('E_PROVENANCE_INVALID', 'Execution plan does not cover every required stage capability', { missing_capabilities: missingCapabilities });
  }
  const plannedFiles = new Map();
  for (const step of plan.load_steps) {
    for (const file of [...step.required_files, ...step.selected_optional_files, ...step.retained_context_files, ...(step.retained_required_files ?? []), ...(step.asset_files ?? [])]) {
      plannedFiles.set(file, step.file_metadata[file]?.sha256 ?? plan.file_hashes?.[file]);
    }
  }
  const receiptedFiles = new Map();
  for (const receipt of execution.read_receipts) {
    const relative = receipt.path.replace(/\\/g, '/');
    if (!plannedFiles.has(relative)) fail('E_PROVENANCE_INVALID', 'Read receipt names a file outside the resolved stage plan', { path: receipt.path });
    const bytes = await readConfined(installRoot, relative);
    if (!bytes || sha256(bytes) !== receipt.sha256 || plannedFiles.get(relative) !== receipt.sha256) {
      fail('E_PROVENANCE_INVALID', 'Read receipt does not match the planned and current installation file', { path: receipt.path });
    }
    receiptedFiles.set(relative, receipt.sha256);
  }
  const missingReceipts = [...plannedFiles.keys()].filter((file) => receiptedFiles.get(file) !== plannedFiles.get(file));
  if (missingReceipts.length) fail('E_PROVENANCE_INVALID', 'Execution is missing receipts for planned instruction or asset files', { missing_paths: missingReceipts });
  const normalize = (refs) => refs.map((item) => `${item.artifact_id}:${item.version}:${item.sha256}`).sort();
  if (JSON.stringify(normalize(execution.input_artifacts)) !== JSON.stringify(normalize(dependencies))) {
    fail('E_PROVENANCE_INVALID', 'execution.input_artifacts must exactly match artifact dependencies', {
      execution_input_artifacts: execution.input_artifacts,
      dependencies,
    });
  }
}

export const provenanceInternals = Object.freeze({ installRoot });
