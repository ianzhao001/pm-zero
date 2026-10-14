import { atomicWrite, atomicWriteNew, acquireProjectLock, runProjectTransaction, assertProjectStoreReady, diagnoseProjectStore, prepareProjectRecovery, applyProjectRecovery } from './project-store.mjs';
import { createCandidateCommands } from './candidate-commands.mjs';
import { STEPPED_WORKFLOW_ID, SIX_STAGE_STEPPED_WORKFLOW_ID, STEP_OUTPUT_TYPES, compileStepDefinition, compileSixStageStepDefinition, templateCatalog } from './step-workflow.mjs';
import { isStepped, allSteps, findStep, nextStep, stepInputs, stepArtifacts, stepConfirmed, stepProgress, invalidateStepControl, overviewMarkdown } from './step-control.mjs';
import {
  access, lstat, mkdir, readFile, readdir, realpath, stat,
} from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { fail } from './errors.mjs';
import { readBuildInfo } from './package-integrity.mjs';
import { verifyRender, effectiveVerification } from './evidence-verifier.mjs';
import {
  EIGHT_STAGE_DEFINITION, EIGHT_STAGE_WORKFLOW_ID, SIX_STAGE_DEFINITION, SIX_STAGE_WORKFLOW_ID, artifactRef,
  currentStage, definitionFor, dependencyClosure, downstreamTypes, expectedDependencies,
  isEightStage, sameRefs, stageForType, targetStage, validateElementTargets,
  validateStaticCaptured,
} from './eight-stage.mjs';
import { validateExecutionProvenance } from './provenance.mjs';
import { jsonSchemaErrors } from './validate.mjs';
import { changeRecovery, pendingChangeSummary, stageChangeContext } from './change-recovery.mjs';
import { resolveStagePlan } from '../../brand-registry/scripts/stage-planner.mjs';

const INTERNAL = '.pm-zero';
const COMMIT_WIDTH = 12;
const INSTALL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const DAG = JSON.parse(readFileSync(new URL('../contracts/artifact-dag.json', import.meta.url), 'utf8'));
const DESIGN_MODEL_SCHEMA = JSON.parse(readFileSync(new URL('../contracts/design-model.schema.json', import.meta.url), 'utf8'));
const GATE_TYPES = Object.freeze(Object.fromEntries(Object.entries(DAG.gates).map(([gate, value]) => [gate, [value.confirms, ...(value.also_confirms ?? [])]])));

function invalidationClosure(impact) {
  const entry = DAG.impact_entry_points[impact].default_entry;
  const seen = new Set([entry]);
  const queue = [entry];
  while (queue.length) {
    const from = queue.shift();
    for (const edge of DAG.edges) {
      if (edge.from !== from || DAG.impact_order[impact] < DAG.impact_order[edge.min_impact] || seen.has(edge.to)) continue;
      seen.add(edge.to);
      queue.push(edge.to);
    }
  }
  return [...Object.keys(DAG.nodes)].filter((type) => seen.has(type));
}

const INVALIDATION = Object.freeze(Object.fromEntries(DAG.impact_levels.map((impact) => [impact, invalidationClosure(impact)])));
const REQUIRED_DEPENDENCIES = Object.freeze(Object.fromEntries(Object.keys(DAG.nodes).map((type) => [
  type,
  DAG.edges.filter((edge) => edge.to === type).map((edge) => edge.from),
])));

function now() {
  return new Date().toISOString();
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : stable(value));
  return createHash('sha256').update(bytes).digest('hex');
}

async function exists(target) {
  try { await access(target); return true; } catch { return false; }
}

function commitPath(project, revision) {
  return path.join(project, INTERNAL, 'commits', `${String(revision).padStart(COMMIT_WIDTH, '0')}.json`);
}

async function loadState(project) {
  const commitsDir = path.join(project, INTERNAL, 'commits');
  let files;
  try {
    files = (await readdir(commitsDir)).filter((name) => /^\d{12}\.json$/.test(name)).sort();
  } catch {
    fail('E_PROJECT_NOT_FOUND', 'The selected directory is not a pm-zero project', { project_path: project });
  }
  if (!files.length) fail('E_PROJECT_CORRUPT', 'Project has no immutable commit record', { project_path: project });
  const record = JSON.parse(await readFile(path.join(commitsDir, files.at(-1)), 'utf8'));
  if (record.state.revision !== Number(files.at(-1).slice(0, 12))) {
    fail('E_PROJECT_CORRUPT', 'Latest commit revision does not match its filename');
  }
  await verifyCanonicalState(project, record.state);
  return record.state;
}

async function verifyCanonicalFile(project, reference, label) {
  if (!reference?.path || !reference?.sha256) fail('E_PROJECT_CORRUPT', `Missing canonical reference for ${label}`);
  let bytes;
  try { bytes = await readSafeProjectFile(project, reference.path); } catch (error) {
    if (error.code === 'E_PATH_SYMLINK' || error.code === 'E_PATH_ESCAPE') throw error;
    fail('E_CANONICAL_DRIFT', `Canonical ${label} is missing`, { path: reference.path });
  }
  if (digest(bytes) !== reference.sha256) fail('E_CANONICAL_DRIFT', `Canonical ${label} was modified outside the workflow`, { path: reference.path });
}

async function verifyCanonicalState(project, state) {
  await verifyCanonicalFile(project, state.project_record, 'project record');
  if (state.workflow) {
    await verifyCanonicalFile(project, state.workflow.definition_snapshot, 'workflow definition snapshot');
    if (digest(stable(state.workflow.definition)) !== state.workflow.definition_hash) {
      fail('E_CANONICAL_DRIFT', 'Embedded workflow definition does not match its immutable hash');
    }
    const snapshot = JSON.parse(await readFile(path.join(project, state.workflow.definition_snapshot.path), 'utf8'));
    if (digest(stable(snapshot)) !== state.workflow.definition_hash) {
      fail('E_CANONICAL_DRIFT', 'Workflow definition snapshot does not match its immutable semantic hash');
    }
  }
  for (const record of state.step_control?.history ?? []) await verifyCanonicalFile(project, record.canonical, `step ${record.workflow_step_id}`);
  for (const decision of state.decisions) await verifyCanonicalFile(project, decision.canonical, `decision ${decision.decision_id}`);
  for (const candidate of state.candidates ?? []) {
    await verifyCanonicalFile(project, candidate.canonical, `candidate ${candidate.candidate_id}`);
    for (const reference of candidate.record_history ?? []) await verifyCanonicalFile(project, reference, `candidate history ${candidate.candidate_id}`);
  }
  for (const change of state.changes) await verifyCanonicalFile(project, change.canonical, `change ${change.change.change_id}`);
  for (const gate of state.gate_history) await verifyCanonicalFile(project, gate.canonical, `gate ${gate.gate}`);
  for (const [artifactId, versions] of Object.entries(state.artifact_history)) {
    for (const artifact of versions) {
      await verifyCanonicalFile(project, artifact.canonical, `artifact metadata ${artifactId} v${artifact.version}`);
      for (const file of artifact.files) await verifyCanonicalFile(project, { path: file.snapshot_path, sha256: file.sha256 }, `artifact file ${artifactId} v${artifact.version}`);
    }
  }
}

async function publishCommit(project, previous, next, event) {
  if (next.revision !== previous.revision + 1) fail('E_INTERNAL', 'Non-sequential commit rejected');
  next.updated_at = now();
  const record = {
    schema_version: 1,
    revision: next.revision,
    previous_revision: previous.revision,
    committed_at: next.updated_at,
    event,
    state: next,
  };
  const target = commitPath(project, next.revision);
  if (await exists(target)) fail('E_COMMIT_EXISTS', 'Immutable commit already exists', { revision: next.revision });
  await atomicWrite(target, `${JSON.stringify(record, null, 2)}\n`);
  await writeDerivedState(project, next);
}

async function writeInitialCommit(project, state) {
  const record = { schema_version: 1, revision: 0, previous_revision: null, committed_at: state.created_at, event: { tool: 'project_open', action: 'create' }, state };
  await atomicWrite(commitPath(project, 0), `${JSON.stringify(record, null, 2)}\n`);
  await writeDerivedState(project, state);
}

function yamlScalar(value) {
  return JSON.stringify(value);
}

function frontmatter(fields) {
  return `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${yamlScalar(value)}`).join('\n')}\n---\n`;
}

function briefMarkdown(state, artifact) {
  const value = state.brief;
  return `${frontmatter({ schema_version: 1, project_id: state.project_id, artifact: 'brief', artifact_version: artifact.version, lifecycle_at_creation: 'draft' })}\n# Product brief\n\n## Target user\n\n${value.target_user}\n\n## Core problem\n\n${value.core_problem}\n\n## Scenario\n\n${value.scenario}\n\n## Scope\n\n${value.scope}\n\n## Non-goals\n\n${value.non_goals}\n\n## Success criteria\n\n${value.success_criteria.map((x) => `- ${x}`).join('\n')}\n\n## Key assumptions\n\n${value.key_assumptions.map((x) => `- ${x.id} [${x.grade}] ${x.claim}; source=${x.source}; supports_gate=${x.supports_gate}`).join('\n')}\n\n## Open questions\n\n${value.open_questions.length ? value.open_questions.map((x) => `- ${x.id} [${x.status}] ${x.question} — ${x.why}; owner=${x.owner}; blocks_gate=${x.blocks_gate ?? 'none'}`).join('\n') : '- None'}\n`;
}

function markdownRecord(kind, record) {
  return `${frontmatter({ schema_version: 1, record_type: kind, id: record.decision_id ?? record.change_id ?? record.gate, revision: record.revision })}\n# ${kind}\n\n\`\`\`json\n${JSON.stringify(record, null, 2)}\n\`\`\`\n`;
}

async function writeDerivedState(project, state) {
  if (isStepped(state)) await atomicWrite(path.join(project, INTERNAL, 'step-overview.md'), overviewMarkdown(state));
  await atomicWrite(path.join(project, INTERNAL, 'workflow-state.json'), `${JSON.stringify(deriveState(state), null, 2)}\n`);
}

function safeSegment(value) {
  const result = String(value).replace(/[^A-Za-z0-9._-]/g, '-');
  if (!result || result === '.' || result === '..') fail('E_ID_INVALID', 'Identifier cannot form a safe path segment');
  return result;
}

function clone(value) {
  return structuredClone(value);
}

async function readRuntimeManifest() {
  const candidates = [
    { layout: 'packaged', plugin: '.codex-plugin/plugin.json' },
    { layout: 'source', plugin: 'plugins/pm-zero/.codex-plugin/plugin.json' },
  ];
  let plugin;
  let layout;
  for (const candidate of candidates) {
    try {
      plugin = JSON.parse(await readFile(path.join(INSTALL_ROOT, candidate.plugin), 'utf8'));
      layout = candidate.layout;
      break;
    } catch { /* try the other supported root layout */ }
  }
  if (!plugin) fail('E_RUNTIME_INVALID', 'The installed pm-zero plugin manifest is unavailable or invalid');
  let manifest;
  try {
    manifest = JSON.parse(await readFile(path.join(INSTALL_ROOT, 'pm-zero.manifest.json'), 'utf8'));
  } catch (error) {
    fail('E_RUNTIME_INVALID', 'The installed pm-zero capability manifest is unavailable or invalid', { message: error.message });
  }
  return { plugin, manifest, layout };
}

async function runtimeFileAvailable(relative) {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative) || relative.split(/[\\/]+/).includes('..')) return false;
  try {
    const root = await realpath(INSTALL_ROOT);
    const target = await realpath(path.resolve(root, relative));
    if (!target.startsWith(`${root}${path.sep}`)) return false;
    return (await stat(target)).isFile();
  } catch {
    return false;
  }
}

async function runtimeContextCatalog(manifest) {
  const expectedStages = EIGHT_STAGE_DEFINITION.stages.map((stage) => stage.id);
  const profileSkills = new Set(manifest.installation_profiles?.['pm-zero-agent']?.skill_ids ?? []);
  const diagnostics = [];
  for (const skill of manifest.entries?.skills ?? []) {
    if (!skill.stage_context) continue;
    const contextId = String(skill.stage_context.context ?? skill.id).toLowerCase();
    const reasons = [];
    if (!profileSkills.has(skill.id)) reasons.push('outside-profile:pm-zero-agent');
    const stages = skill.stage_context.stages;
    if (!stages || typeof stages !== 'object' || Array.isArray(stages)) {
      reasons.push('invalid-stage-map');
    } else {
      const actualStages = Object.keys(stages).sort();
      if (JSON.stringify(actualStages) !== JSON.stringify([...expectedStages].sort())) reasons.push('incomplete-stage-map');
    }
    const files = [skill.stage_context.entrypoint];
    for (const stageId of expectedStages) {
      const stage = stages?.[stageId];
      if (!stage || !Array.isArray(stage.required_files) || !Array.isArray(stage.asset_files)) {
        reasons.push(`invalid-stage:${stageId}`);
        continue;
      }
      files.push(...stage.required_files, ...stage.asset_files);
    }
    const missingFiles = [];
    for (const file of [...new Set(files)]) {
      if (!(await runtimeFileAvailable(file))) missingFiles.push(file ?? '<missing-entrypoint>');
    }
    if (missingFiles.length) reasons.push(`missing-files:${missingFiles.join(',')}`);
    diagnostics.push({
      context_id: contextId,
      skill_id: skill.id,
      version: String(skill.version),
      status: reasons.length ? 'unavailable' : 'supported',
      stages: Object.keys(stages ?? {}).sort(),
      reasons,
    });
  }
  diagnostics.sort((left, right) => left.context_id.localeCompare(right.context_id));
  return diagnostics;
}

export async function runtimeInfo() {
  const { plugin, manifest, layout } = await readRuntimeManifest();
  const contextDiagnostics = await runtimeContextCatalog(manifest);
  const legacyDefinition = {
    workflow_id: 'legacy-four-gate-v1', version: 1,
    gates: Object.entries(GATE_TYPES).map(([gate, artifacts]) => ({ gate, artifacts })),
    artifact_dag: DAG,
  };
  const workflows = [legacyDefinition, EIGHT_STAGE_DEFINITION, SIX_STAGE_DEFINITION].map((definition) => ({
    workflow_id: definition.workflow_id,
    version: definition.version,
    definition_hash: digest(stable(definition)),
    ...(definition.default_target_stage ? { default_target_stage: definition.default_target_stage } : {}),
    ...(definition.scope ? { scope: definition.scope } : {}),
    stages: definition.stages?.map((stage) => ({
      id: stage.id,
      artifacts: clone(stage.artifacts),
      required_capabilities: clone(stage.required_capabilities),
      optional_capabilities: clone(stage.optional_capabilities ?? []),
      reviewers: stage.reviewers,
    })) ?? [],
  }));
  const providers = (manifest.entries?.skills ?? []).filter((skill) => skill.stage_provider).map((skill) => ({
    skill_id: skill.id,
    version: String(skill.version),
    contexts: clone(skill.stage_provider.contexts ?? ['*']),
    capabilities: clone(skill.stage_provider.capabilities ?? []).sort(),
  })).sort((left, right) => left.skill_id.localeCompare(right.skill_id));
  const capabilities = [...new Set(providers.flatMap((provider) => provider.capabilities))].sort();
  const capabilityCatalog = { capabilities, providers, contexts: contextDiagnostics };
  return {
    package: { name: plugin.name, version: plugin.version, layout,
      build: await readBuildInfo(INSTALL_ROOT), integrity: 'not_checked' },
    default_workflow_id: SIX_STAGE_WORKFLOW_ID,
    supported_workflows: [...workflows, ...[[STEPPED_WORKFLOW_ID, workflows[1]], [SIX_STAGE_STEPPED_WORKFLOW_ID, workflows[2]]].map(([workflow_id, base]) => ({ workflow_id, version: 1, manual_steps: true, default_target_stage: base.default_target_stage, ...(base.scope ? { scope: base.scope } : {}), stages: clone(base.stages), definition_source: 'immutable-project-template' }))],
    step_templates: templateCatalog(),
    registered_contexts: contextDiagnostics.map((context) => context.context_id),
    supported_contexts: ['none', ...contextDiagnostics.filter((context) => context.status === 'supported').map((context) => context.context_id)].sort(),
    context_diagnostics: contextDiagnostics,
    capability_catalog: {
      ...capabilityCatalog,
      digest: digest(stable(capabilityCatalog)),
    },
  };
}

function publicArtifact(artifact) {
  const { files, review, render_manifest, canonical, ...summary } = artifact;
  return {
    ...summary,
    ...(artifact.type === 'demo' ? { verification: effectiveVerification(artifact), recorded_verification: artifact.verification ?? null } : {}),
    paths: files.map((file) => file.source_path),
    ...(review ? { review } : {}),
  };
}

function blockersFromState(state, modified = []) {
  if (isEightStage(state)) {
    const blockers = [];
    for (const artifact of Object.values(state.artifacts)) {
      if (artifact.status === 'stale' || artifact.type === 'review') continue;
      for (const item of artifact.metadata?.blockers ?? []) {
        if (item.status === 'open') blockers.push({ code: 'STAGE_BLOCKER', artifact_id: artifact.artifact_id, ...clone(item) });
      }
      for (const item of artifact.metadata?.open_questions ?? []) {
        if (item.status === 'open') blockers.push({ code: 'STAGE_OPEN_QUESTION', artifact_id: artifact.artifact_id, ...clone(item) });
      }
      if (artifact.type === 'demo' && artifact.status !== 'stale' && !artifact.candidate_import && effectiveVerification(artifact).status !== 'verified') blockers.push({ code: 'CHANGE_VERIFICATION_PENDING', artifact_id: artifact.artifact_id, reason: effectiveVerification(artifact).reason });
    }
    for (const item of modified) blockers.push({ code: 'CONFIRMED_ARTIFACT_MODIFIED', artifact_id: item.artifact_id, path: item.path });
    return blockers;
  }
  const blockers = [];
  for (const question of state.brief?.open_questions ?? []) {
    if (question.blocks_gate && question.status === 'open') blockers.push({ code: 'BLOCKING_OPEN_QUESTION', id: question.id, gate: question.blocks_gate, message: question.question });
  }
  for (const assumption of state.brief?.key_assumptions ?? []) {
    if (assumption.supports_gate && ['D', 'E'].includes(assumption.grade)) blockers.push({ code: 'WEAK_GATE_ASSUMPTION', id: assumption.id, grade: assumption.grade, gate: 'G1' });
  }
  for (const item of modified) blockers.push({ code: 'CONFIRMED_ARTIFACT_MODIFIED', artifact_id: item.artifact_id, path: item.path });
  for (const artifact of Object.values(state.artifacts)) {
    if (artifact.type === 'demo' && artifact.status !== 'stale' && !artifact.candidate_import && effectiveVerification(artifact).status !== 'verified') blockers.push({ code: 'CHANGE_VERIFICATION_PENDING', artifact_id: artifact.artifact_id, reason: effectiveVerification(artifact).reason });
  }
  for (const gate of Object.values(state.gates)) {
    if (gate.status !== 'confirmed') continue;
    for (const ref of gate.artifacts) {
      const current = state.artifacts[ref.artifact_id];
      if (!current || current.version !== ref.version || current.sha256 !== ref.sha256 || current.status !== 'confirmed') {
        blockers.push({ code: 'GATE_ARTIFACT_DRIFT', gate: gate.gate, artifact_id: ref.artifact_id });
      }
    }
    for (const reviewRef of gate.review_artifacts ?? gate.review_artifact_ids.map((artifact_id) => ({ artifact_id }))) {
      const currentReview = state.artifacts[reviewRef.artifact_id];
      if (!currentReview || currentReview.type !== 'review' || currentReview.status === 'stale' || reviewRef.version && (currentReview.version !== reviewRef.version || currentReview.sha256 !== reviewRef.sha256)) {
        blockers.push({ code: 'GATE_REVIEW_DRIFT', gate: gate.gate, artifact_id: reviewRef.artifact_id });
      }
    }
  }
  return blockers;
}

function nextActions(state, blockers) {
  if (isStepped(state)) {
    if (blockers.length) return ['Resolve reported blockers; no step advances automatically'];
    if (!currentStage(state)) return ['The selected delivery target is confirmed'];
    if (state.step_control.active) return ['Prepare only the selected step; register and explicitly confirm its exact output versions'];
    const step = nextStep(state);
    return [step ? `Await a separate user selection for ${step.id}` : `Await explicit stage confirmation for ${currentStage(state).id}`];
  }
  if (blockers.some((item) => ['CONFIRMED_ARTIFACT_MODIFIED', 'CHANGE_VERIFICATION_PENDING', 'GATE_ARTIFACT_DRIFT', 'GATE_REVIEW_DRIFT'].includes(item.code))) return ['Resolve project blockers before continuing or accepting completion'];
  if (isEightStage(state)) {
    const stage = currentStage(state);
    if (!stage) return blockers.length ? ['Resolve project blockers before accepting completion'] : [`Workflow target ${targetStage(state)} is confirmed`];
    const stageBlockers = blockers.filter((item) => item.stage_id === stage.id || ['CONFIRMED_ARTIFACT_MODIFIED', 'CHANGE_VERIFICATION_PENDING'].includes(item.code));
    if (stageBlockers.length) return [`Resolve blockers for ${stage.id}`];
    const missing = stage.artifacts.filter((type) => !Object.values(state.artifacts).some((artifact) => artifact.type === type && artifact.status !== 'stale'));
    if (missing.length) return [`Register ${missing.join(' and ')} for ${stage.id}`];
    return stage.reviewers > 0
      ? [`Collect ${stage.reviewers} independent review(s) per target and confirm ${stage.id}`]
      : [`Confirm ${stage.id}`];
  }
  if (!state.brief) return ['Save the project brief'];
  if (blockers.length) return ['Resolve project blockers'];
  for (const [gate, types] of Object.entries(GATE_TYPES)) {
    if (!state.gates[gate] || state.gates[gate].status !== 'confirmed') {
      const missing = types.filter((type) => !Object.values(state.artifacts).some((x) => x.type === type));
      return missing.length ? [`Register ${missing.join(' and ')}`] : [`Collect independent reviews and confirm ${gate}`];
    }
  }
  return ['Project gates are confirmed'];
}

function deriveState(state, modified = []) {
  const blockers = blockersFromState(state, modified);
  const base = {
    schema_version: 1,
    derived_from_revision: state.revision,
    project_id: state.project_id,
    revision: state.revision,
    artifacts: Object.values(state.artifacts).map(publicArtifact),
    gates: Object.values(state.gates),
    open_questions: state.brief?.open_questions ?? [],
    blockers,
    next_actions: nextActions(state, blockers),
  };
  if (!isEightStage(state)) return base;
  const stage = currentStage(state);
  const target = targetStage(state);
  const openQuestions = Object.values(state.artifacts).flatMap((artifact) => artifact.status === 'stale' ? [] : artifact.metadata?.open_questions ?? []).filter((item) => item.status === 'open');
  const stageArtifacts = stage ? Object.values(state.artifacts).filter((artifact) => artifact.execution?.stage_id === stage.id && artifact.status !== 'stale') : [];
  const missingStageArtifacts = stage ? stage.artifacts.filter((type) => !stageArtifacts.some((artifact) => artifact.type === type)) : [];
  return {
    ...base,
    workflow_id: state.workflow.workflow_id,
    current_stage: stage?.id ?? null,
    target_stage: target,
    completed_to_target: stage === null && blockers.length === 0,
    pending_confirmation: stage && (!isStepped(state) || stage.steps.every(step => stepConfirmed(state, step))) && stage.artifacts.every((type) => stageArtifacts.some((artifact) => artifact.type === type)) ? stage.id : null,
    open_questions: openQuestions,
    unfinished_capability_tasks: missingStageArtifacts.length ? stage.required_capabilities.map((capability) => ({
      stage_id: stage.id,
      capability,
      status: 'pending',
      outputs_pending: clone(missingStageArtifacts),
    })) : [],
    provenance_summary: stageArtifacts.map((artifact) => ({
      artifact_id: artifact.artifact_id,
      type: artifact.type,
      producer_id: artifact.producer_id,
      plan_id: artifact.execution?.plan_id,
      plan_version: artifact.execution?.plan_version,
      plan_hash: artifact.execution?.plan_hash,
      skills: clone(artifact.execution?.skills ?? []),
      capability_assignments: clone(artifact.execution?.capability_assignments ?? []),
    })),
  };
}

async function resolveProject(projectPath) {
  if (!path.isAbsolute(projectPath)) fail('E_ARGS_INVALID', 'project_path must be absolute');
  let root;
  try { root = await realpath(projectPath); } catch { fail('E_PROJECT_NOT_FOUND', 'Project directory does not exist', { project_path: projectPath }); }
  const info = await lstat(root);
  if (!info.isDirectory()) fail('E_PROJECT_NOT_FOUND', 'project_path must select a directory');
  return root;
}

async function detectModifiedConfirmed(project, state) {
  return detectModifiedSources(project, Object.values(state.artifacts).filter(artifact => artifact.status === 'confirmed'));
}

async function detectModifiedSources(project, artifacts) {
  const changed = [];
  for (const artifact of new Set(artifacts.filter(Boolean))) {
    for (const file of artifact.files) {
      try {
        const bytes = await readSafeProjectFile(project, file.source_path);
        if (digest(bytes) !== file.sha256) changed.push({ artifact_id: artifact.artifact_id, path: file.source_path });
      } catch {
        changed.push({ artifact_id: artifact.artifact_id, path: file.source_path });
      }
    }
  }
  return changed;
}

async function readSafeProjectFile(project, relative) {
  if (path.isAbsolute(relative) || relative.split(/[\\/]+/).includes('..') || relative === '') {
    fail('E_PATH_ESCAPE', 'Artifact path must be a non-empty project-relative path', { path: relative });
  }
  const target = path.resolve(project, relative);
  if (target === project || !target.startsWith(`${project}${path.sep}`)) fail('E_PATH_ESCAPE', 'Artifact path escapes the project', { path: relative });
  const relParts = path.relative(project, target).split(path.sep);
  let cursor = project;
  for (const part of relParts) {
    cursor = path.join(cursor, part);
    let info;
    try { info = await lstat(cursor); } catch { fail('E_PATH_NOT_FOUND', 'Artifact source does not exist', { path: relative }); }
    if (info.isSymbolicLink()) fail('E_PATH_SYMLINK', 'Symlinks are not accepted as artifact input', { path: relative });
  }
  const canonical = await realpath(target);
  if (!canonical.startsWith(`${project}${path.sep}`)) fail('E_PATH_ESCAPE', 'Artifact canonical path escapes the project', { path: relative });
  const info = await stat(canonical);
  if (!info.isFile()) fail('E_PATH_NOT_FILE', 'Artifact source must be a regular file', { path: relative });
  return readFile(canonical);
}

function getArtifactVersion(state, reference) {
  return (state.artifact_history[reference.artifact_id] ?? []).find((item) => item.version === reference.version && item.sha256 === reference.sha256);
}

function assertExpectedArtifacts(state, expected) {
  for (const ref of expected) {
    const current = state.artifacts[ref.artifact_id];
    if (!current || current.version !== ref.version || current.sha256 !== ref.sha256) {
      fail('E_EXPECTED_ARTIFACT_MISMATCH', 'Expected artifact version/hash is no longer current', { expected: ref, current: current ? publicArtifact(current) : null });
    }
  }
}

function prepareChange(state, change, expectedArtifacts) {
  if (isEightStage(state)) {
    if (!change.entry_artifact || !change.scope) fail('E_CHANGE_SCOPE_INVALID', 'Eight-stage changes require exact entry_artifact and scope');
    const entry = state.artifacts[change.entry_artifact.artifact_id];
    if (!entry || entry.version !== change.entry_artifact.version || entry.sha256 !== change.entry_artifact.sha256 || entry.status === 'stale' || entry.type === 'review') {
      fail('E_CHANGE_ENTRY_INVALID', 'entry_artifact must be the exact current non-stale deliverable version/hash', { entry_artifact: change.entry_artifact });
    }
    validateElementTargets(state, change, entry);
    const actualDependencyClosure = dependencyClosure(state, entry);
    if (!sameRefs(expectedArtifacts, actualDependencyClosure)) {
      fail('E_EXPECTED_ARTIFACT_MISMATCH', 'expected_artifacts must exactly match the entry artifact and its recorded dependency closure', { expected: actualDependencyClosure, received: expectedArtifacts });
    }
    const invalidationTypes = downstreamTypes(definitionFor(state), entry.type);
    const invalidatedArtifacts = Object.values(state.artifacts)
      .filter((artifact) => artifact.type !== 'review' && invalidationTypes.includes(artifact.type))
      .map((artifact) => ({ artifact_id: artifact.artifact_id, type: artifact.type, version: artifact.version, sha256: artifact.sha256 }));
    const frozen = {
      change: clone(change),
      entry_artifact: artifactRef(entry),
      actual_dependency_closure: actualDependencyClosure,
      expected_artifacts: clone(expectedArtifacts),
      invalidation_types: invalidationTypes,
      invalidated_artifacts: invalidatedArtifacts,
      ...(isStepped(state) ? {
        affected_steps: allSteps(state).filter(step => (step.purpose === 'review' ? step.input_types : step.outputs).some(type => invalidationTypes.includes(type))).map(step => ({ id: step.id, stage_id: step.stage_id, name: step.name })),
        preserved_steps: allSteps(state).filter(step => stepConfirmed(state, step) && !(step.purpose === 'review' ? step.input_types : step.outputs).some(type => invalidationTypes.includes(type))).map(step => ({ id: step.id, stage_id: step.stage_id, name: step.name })),
      } : {}),
    };
    return { ...frozen, preview_hash: digest(frozen) };
  }
  if (!change.target_ids.length) fail('E_CHANGE_SCOPE_INVALID', 'Legacy changes require at least one target_id');
  assertExpectedArtifacts(state, expectedArtifacts);
  const invalidationTypes = [...INVALIDATION[change.impact]];
  const invalidatedArtifacts = Object.values(state.artifacts)
    .filter((artifact) => invalidationTypes.includes(artifact.type))
    .map((artifact) => ({ artifact_id: artifact.artifact_id, type: artifact.type, version: artifact.version, sha256: artifact.sha256 }));
  const frozen = { change: clone(change), expected_artifacts: clone(expectedArtifacts), invalidation_types: invalidationTypes, invalidated_artifacts: invalidatedArtifacts };
  return { ...frozen, preview_hash: digest(frozen) };
}

async function mutate(projectPath, tool, args, operation) {
  const project = await resolveProject(projectPath);
  const release = await acquireProjectLock(project);
  try {
    await assertProjectStoreReady(project);
    const state = await loadState(project);
    const argsDigest = digest(args);
    const prior = state.request_log[args.request_id];
    if (prior) {
      if (prior.tool !== tool || prior.args_digest !== argsDigest) fail('E_IDEMPOTENCY_CONFLICT', 'request_id was already used for different content', { request_id: args.request_id });
      await writeDerivedState(project, state);
      return { ...clone(prior.result), idempotent_replay: true };
    }
    if (state.revision !== args.expected_revision) fail('E_REVISION_CONFLICT', 'Project revision changed', { expected_revision: args.expected_revision, actual_revision: state.revision }, true);
    const modified = await detectModifiedConfirmed(project, state);
    if (modified.length) fail('E_CONFIRMED_ARTIFACT_MODIFIED', 'A confirmed artifact changed outside the workflow', { modified });
    return await runProjectTransaction(project, { base_revision: state.revision, request_id: args.request_id, tool }, async () => {
      const next = clone(state);
      const result = await operation(project, state, next);
      next.revision = state.revision + 1;
      const finalResult = { project_id: state.project_id, revision: next.revision, ...result };
      next.request_log[args.request_id] = { tool, args_digest: argsDigest, result: finalResult };
      await publishCommit(project, state, next, { tool, request_id: args.request_id, args_digest: argsDigest });
      return finalResult;
    });
  } finally {
    await release();
  }
}

export async function projectOpen(args) {
  const requestedWorkflow = args.workflow_id ?? SIX_STAGE_WORKFLOW_ID;
  const steppedCreation = [STEPPED_WORKFLOW_ID, SIX_STAGE_STEPPED_WORKFLOW_ID].includes(requestedWorkflow);
  if (args.create && steppedCreation && !args.step_template) fail('E_STEP_TEMPLATE_REQUIRED', 'New stepped projects require an explicit template');
  if (args.context !== undefined && ![STEPPED_WORKFLOW_ID, SIX_STAGE_WORKFLOW_ID, SIX_STAGE_STEPPED_WORKFLOW_ID].includes(requestedWorkflow)) fail('E_STEP_CONTEXT_INVALID', 'Project creation context requires a six-stage or historical stepped workflow');
  if (args.step_template && !steppedCreation) fail('E_STEP_TEMPLATE_INVALID', 'Step templates are only valid for new stepped projects');
  if (!args.create && (args.step_template || args.context !== undefined)) fail('E_STEP_TEMPLATE_IMMUTABLE', 'Opening a project cannot change its template or context');
  if (!args.create) {
    const project = await resolveProject(args.project_path);
    const state = await loadState(project);
    await writeDerivedState(project, state);
    return publicRead(state, await detectModifiedConfirmed(project, state));
  }
  if (args.context && args.context !== 'none') {
    const { manifest } = await readRuntimeManifest();
    const contexts = await runtimeContextCatalog(manifest);
    if (!contexts.some(item => item.context_id === args.context && item.status === 'supported')) {
      fail('E_CONTEXT_UNAVAILABLE', 'Requested context is not available in this deployment', { context: args.context });
    }
  }
  const parentInput = path.dirname(args.project_path);
  let parent;
  try { parent = await realpath(parentInput); } catch { fail('E_PARENT_NOT_FOUND', 'Parent directory for project_path does not exist', { parent: parentInput }); }
  const project = path.join(parent, path.basename(args.project_path));
  let initializeExisting = false;
  try {
    await mkdir(project, { recursive: false });
  } catch (error) {
    if (error.code === 'EEXIST') {
      const selected = await lstat(args.project_path);
      if (selected.isSymbolicLink()) fail('E_PATH_SYMLINK', 'Project directory cannot be a symlink');
      const existing = await lstat(project);
      if (existing.isSymbolicLink()) fail('E_PATH_SYMLINK', 'Project directory cannot be a symlink');
      if (!existing.isDirectory()) fail('E_PROJECT_EXISTS', 'project_path exists but is not a directory');
      if (await exists(path.join(project, INTERNAL, 'commits'))) {
        const state = await loadState(project);
        if (state.project_id !== args.project_id) fail('E_PROJECT_ID_MISMATCH', 'Existing project has a different project_id');
        const actualWorkflow = state.workflow?.workflow_id ?? 'legacy-four-gate-v1';
        if (args.workflow_id && args.workflow_id !== actualWorkflow) fail('E_WORKFLOW_ID_MISMATCH', 'Existing project has a different immutable workflow_id', { expected: args.workflow_id, actual: actualWorkflow });
        if (isStepped(state) && ((args.step_template && (args.step_template.project_type !== state.workflow.definition.step_template.project_type || args.step_template.depth !== state.workflow.definition.step_template.depth)) || (args.context !== undefined && args.context !== state.workflow.definition.step_context))) fail('E_STEP_TEMPLATE_IMMUTABLE', 'Existing projects retain their original template and context');
        return publicRead(state, await detectModifiedConfirmed(project, state));
      }
      if (await exists(path.join(project, INTERNAL))) fail('E_PROJECT_EXISTS', 'Existing .pm-zero directory is not a valid initialized workflow project');
      initializeExisting = true;
    } else {
      throw error;
    }
  }
  await mkdir(path.join(project, INTERNAL, 'commits'), { recursive: true });
  await mkdir(path.join(project, INTERNAL, 'versions'), { recursive: true });
  const created = now();
  const workflowId = requestedWorkflow;
  const projectRecordPath = path.join(INTERNAL, 'project', 'v0.md');
  const projectRecordBytes = Buffer.from(`${frontmatter({ schema_version: 1, project_id: args.project_id, project_name: args.project_name ?? args.project_id, status: 'experimental', revision: 0, workflow_id: workflowId })}\n# ${args.project_name ?? args.project_id}\n\nThis project uses the experimental pm-zero conversational product workflow.\n`);
  await atomicWriteNew(path.join(project, projectRecordPath), projectRecordBytes);
  const state = {
    schema_version: 1,
    project_id: args.project_id,
    project_name: args.project_name ?? args.project_id,
    status: 'experimental',
    revision: 0,
    created_at: created,
    updated_at: created,
    project_record: { path: projectRecordPath, sha256: digest(projectRecordBytes) },
    brief: null,
    decisions: [],
    artifacts: {},
    artifact_history: {},
    gates: {},
    gate_history: [],
    changes: [],
    request_log: {},
    audit: [{ at: created, action: 'project_created', request_id: args.request_id ?? null, initialized_existing_directory: initializeExisting }],
  };
  if ([EIGHT_STAGE_WORKFLOW_ID, STEPPED_WORKFLOW_ID, SIX_STAGE_WORKFLOW_ID, SIX_STAGE_STEPPED_WORKFLOW_ID].includes(workflowId)) {
    const base = [SIX_STAGE_WORKFLOW_ID, SIX_STAGE_STEPPED_WORKFLOW_ID].includes(workflowId) ? SIX_STAGE_DEFINITION : EIGHT_STAGE_DEFINITION;
    const definition = steppedCreation ? { ...(workflowId === STEPPED_WORKFLOW_ID ? compileStepDefinition(base, args.step_template) : compileSixStageStepDefinition(base, args.step_template)), step_context: args.context ?? 'none' }
      : args.context === undefined ? base : { ...base, initial_context: args.context };
    const definitionBytes = Buffer.from(`${JSON.stringify(definition, null, 2)}\n`);
    const definitionPath = path.join(INTERNAL, 'workflow', 'definition.json');
    await atomicWriteNew(path.join(project, definitionPath), definitionBytes);
    state.workflow = {
      workflow_id: workflowId,
      definition_version: definition.version,
      definition_hash: digest(stable(definition)),
      definition_snapshot: { path: definitionPath, sha256: digest(definitionBytes) },
      definition: clone(definition),
    };
    state.audit[0].workflow_id = workflowId;
    if (steppedCreation) state.step_control = { active: null, confirmations: {}, history: [] };
  }
  await writeInitialCommit(project, state);
  return { project_id: state.project_id, revision: 0, status: state.status, ...(state.workflow ? { workflow_id: state.workflow.workflow_id } : {}) };
}

function publicRead(state, modified = []) {
  const derived = deriveState(state, modified);
  const result = {
    project_id: derived.project_id,
    revision: derived.revision,
    ...(state.candidates ? { candidates: candidateSummaries(state) } : {}),
    artifacts: derived.artifacts,
    gates: derived.gates,
    open_questions: derived.open_questions,
    blockers: derived.blockers,
    next_actions: derived.next_actions,
  };
  if (isEightStage(state)) {
    Object.assign(result, {
      ...(isStepped(state) ? { step_progress: stepProgress(state) } : {}),
      workflow_id: derived.workflow_id,
      current_stage: derived.current_stage,
      target_stage: derived.target_stage,
      completed_to_target: derived.completed_to_target,
      pending_confirmation: derived.pending_confirmation,
      unfinished_capability_tasks: derived.unfinished_capability_tasks,
      provenance_summary: derived.provenance_summary,
    });
  }
  return result;
}

function materialRef(type, id, canonical, extra = {}) {
  return {
    type,
    id,
    ...extra,
    path: canonical.path,
    sha256: canonical.sha256,
  };
}

function artifactResumeSummary(artifact) {
  const summary = publicArtifact(artifact);
  delete summary.execution;
  delete summary.design_ids;
  delete summary.metadata;
  return {
    ...summary,
    detail_ref: { type: 'artifact', id: artifact.artifact_id, version: artifact.version },
  };
}

function decisionViews(state, compact = false) {
  const supersededBy = new Map();
  for (const decision of state.decisions) {
    for (const replacedId of decision.supersedes_decision_ids ?? []) {
      const replacements = supersededBy.get(replacedId) ?? [];
      replacements.push(decision.decision_id);
      supersededBy.set(replacedId, replacements);
    }
  }
  return state.decisions.map((decision) => {
    const replacements = supersededBy.get(decision.decision_id) ?? [];
    const detailContent = clone(decision);
    delete detailContent.canonical;
    const content = compact ? {
      decision_id: decision.decision_id,
      question: decision.question,
      selected_option: decision.selected_option,
      rejected_options: clone(decision.rejected_options),
      rationale: decision.rationale,
    } : detailContent;
    return {
      ...content,
      supersedes_decision_ids: clone(decision.supersedes_decision_ids ?? []),
      status: replacements.length ? 'superseded' : 'not_superseded',
      superseded_by_decision_ids: replacements,
      material_ref: materialRef('decision', decision.decision_id, decision.canonical),
    };
  });
}

function latestGateRecord(state, gateId) {
  return [...state.gate_history].reverse().find(gate => gate.gate === gateId) ?? state.gates[gateId];
}

function gateResumeSummary(gate) {
  return {
    gate: gate.gate,
    status: gate.status,
    revision: gate.revision,
    artifacts: clone(gate.artifacts),
    ...(gate.invalidated_by ? { invalidated_by: gate.invalidated_by } : {}),
    detail_ref: { type: 'gate', id: gate.gate },
  };
}

function briefView(state) {
  if (!state.brief) return null;
  const artifact = state.artifacts.brief;
  const file = artifact?.files[0];
  return {
    ...clone(state.brief),
    version: artifact.version,
    status: artifact.status,
    sha256: artifact.sha256,
    material_ref: materialRef('brief', 'brief', { path: file.snapshot_path, sha256: file.sha256 }, { version: artifact.version }),
  };
}

function resumeRead(state, modified) {
  const derived = deriveState(state, modified);
  const decisions = decisionViews(state, true);
  const currentArtifacts = Object.values(state.artifacts).map(artifactResumeSummary);
  const currentGates = Object.values(state.gates).map(gate => gateResumeSummary(latestGateRecord(state, gate.gate)));
  const brief = briefView(state);
  const result = {
    project_id: state.project_id,
    revision: state.revision,
    view: 'resume',
    ...(state.candidates ? { candidates: candidateSummaries(state) } : {}),
    brief,
    decisions,
    open_questions: derived.open_questions,
    effective_versions: currentArtifacts.filter((artifact) => artifact.status !== 'stale'),
    stale_versions: currentArtifacts.filter((artifact) => artifact.status === 'stale'),
    gates: currentGates,
    blockers: derived.blockers,
    next_actions: derived.next_actions,
    pending_changes: pendingChangeSummary(state, modified),
    material_refs: [materialRef('project', state.project_id, state.project_record)],
  };
  if (isEightStage(state)) {
    Object.assign(result, {
      ...(isStepped(state) ? { step_progress: stepProgress(state) } : {}),
      workflow_id: derived.workflow_id,
      current_stage: derived.current_stage,
      target_stage: derived.target_stage,
      completed_to_target: derived.completed_to_target,
      pending_confirmation: derived.pending_confirmation,
      unfinished_capability_tasks: derived.unfinished_capability_tasks,
      provenance_summary: derived.provenance_summary,
      workflow_definition: {
        version: state.workflow.definition_version,
        sha256: state.workflow.definition_hash,
        material_ref: materialRef('workflow-definition', state.workflow.workflow_id, state.workflow.definition_snapshot),
      },
    });
  }
  return result;
}

function detailNotFound(detail) {
  fail('E_DETAIL_NOT_FOUND', 'Requested workflow detail was not found', { detail });
}

function assertDetailVersionAllowed(detail, allowed) {
  if (detail.version !== undefined && !allowed) {
    fail('E_ARGS_INVALID', `version is not supported for ${detail.type} detail`, { detail });
  }
}

function detailRead(state, detail, modified = []) {
  const decisions = decisionViews(state);
  let record;
  if (detail.type === 'brief') {
    if (detail.id !== 'brief' || !state.brief) detailNotFound(detail);
    const current = briefView(state);
    if (detail.version !== undefined && detail.version !== current.version) detailNotFound(detail);
    record = current;
  } else if (detail.type === 'decision') {
    assertDetailVersionAllowed(detail, false);
    record = decisions.find((item) => item.decision_id === detail.id);
  } else if (detail.type === 'artifact') {
    const versions = state.artifact_history[detail.id] ?? [];
    const artifact = detail.version === undefined
      ? state.artifacts[detail.id]
      : versions.find((item) => item.version === detail.version);
    if (artifact) {
      const detailArtifact = clone(artifact);
      delete detailArtifact.canonical;
      record = {
        ...detailArtifact,
        ...(artifact.type === 'demo' ? { verification: effectiveVerification(artifact), recorded_verification: artifact.verification ?? null } : {}),
        current: state.artifacts[detail.id]?.version === artifact.version && state.artifacts[detail.id]?.sha256 === artifact.sha256,
        material_ref: materialRef('artifact', artifact.artifact_id, artifact.canonical, { version: artifact.version }),
      };
    }
  } else if (detail.type === 'gate') {
    const gate = detail.version === undefined
      ? latestGateRecord(state, detail.id)
      : state.gate_history.find((item) => item.gate === detail.id && item.revision === detail.version);
    if (gate) {
      const canonicalRecord = gate;
      const detailGate = clone(gate);
      delete detailGate.canonical;
      record = {
        ...detailGate,
        material_ref: materialRef('gate', gate.gate, canonicalRecord.canonical, { revision: canonicalRecord.revision, status: canonicalRecord.status }),
      };
    }
  } else if (detail.type === 'change') {
    assertDetailVersionAllowed(detail, false);
    const change = state.changes.find((item) => item.change.change_id === detail.id);
    if (change) {
      const detailChange = clone(change);
      delete detailChange.canonical;
      record = { ...detailChange, material_ref: materialRef('change', detail.id, change.canonical, { revision: change.revision }) };
    }
  } else if (detail.type === 'index') {
    assertDetailVersionAllowed(detail, false);
    if (detail.id === 'gates') {
      record = state.gate_history.map((gate) => ({
        gate: gate.gate,
        status: gate.status,
        revision: gate.revision,
        artifacts: clone(gate.artifacts),
        ...(gate.invalidated_by ? { invalidated_by: gate.invalidated_by } : {}),
        detail_ref: { type: 'gate', id: gate.gate, version: gate.revision },
      }));
    } else if (detail.id === 'changes') {
      record = changeRecovery(state, modified).map(({ record: change, summary, pending }) => ({
        change_id: change.change.change_id,
        request: change.change.request,
        impact: change.change.impact,
        revision: change.revision,
        pending,
        pending_artifact_ids: summary.pending_artifact_ids,
        pending_gates: summary.pending_gates,
        detail_ref: { type: 'change', id: change.change.change_id },
      }));
    }
  }
  if (!record) detailNotFound(detail);
  return {
    project_id: state.project_id,
    revision: state.revision,
    view: 'detail',
    blockers: blockersFromState(state, modified),
    detail: { type: detail.type, id: detail.id, ...(detail.version === undefined ? {} : { version: detail.version }), record },
  };
}

export async function projectRead(args) {
  if (args.view === 'resume' && args.detail !== undefined) fail('E_ARGS_INVALID', 'detail is only accepted with view=detail');
  if (args.view === undefined && args.detail !== undefined) fail('E_ARGS_INVALID', 'detail requires view=detail');
  const project = await resolveProject(args.project_path);
  const state = await loadState(project);
  const modified = await detectModifiedConfirmed(project, state);
  await writeDerivedState(project, state);
  if (args.view === 'resume') return resumeRead(state, modified);
  if (args.view === 'detail') return detailRead(state, args.detail, modified);
  return publicRead(state, modified);
}

function stageContext(state, stage, requestedContext, intent = 'advance') {
  if (isStepped(state)) {
    const context = state.workflow.definition.step_context;
    if (requestedContext !== undefined && requestedContext !== context) fail('E_STAGE_CONTEXT_LOCKED', 'Stepped project context is fixed at creation', { context });
    return context;
  }
  const goal = Object.values(state.artifacts).find((artifact) => artifact.type === 'goal_contract' && artifact.status !== 'stale');
  const goalStage = stage.artifacts.includes('goal_contract');
  if (!goalStage && requestedContext !== undefined) {
    fail('E_STAGE_CONTEXT_LOCKED', 'context may only be selected while S1 is the current unconfirmed stage', {
      current_stage: stage.id,
      effective_context: goal?.metadata?.context ?? 'none',
    });
  }
  const effective = goal?.metadata?.context ?? state.workflow.definition.initial_context ?? 'none';
  if (goalStage && goal && requestedContext !== undefined && requestedContext !== effective && intent !== 'revise') {
    fail('E_STAGE_CONTEXT_LOCKED', 'Changing the context of an existing S1 draft requires intent=revise', {
      current_stage: stage.id,
      effective_context: effective,
      requested_context: requestedContext,
    });
  }
  return goalStage
    ? requestedContext ?? effective
    : effective;
}

function planEnvelope(resolved, targetArtifact, purpose) {
  const copy = clone(resolved);
  const loadSteps = copy.load_steps;
  delete copy.load_steps;
  return {
    purpose,
    target_artifact: clone(targetArtifact),
    input_artifacts: clone(resolved.input_artifacts ?? []),
    plan: copy,
    load_steps: loadSteps,
  };
}

function executablePlan(entry) {
  const plan = entry.plan;
  return plan.errors?.length === 0
    && String(plan.resolution).startsWith('routed')
    && plan.optional_budget_status === 'pass'
    && plan.budget?.status === 'pass'
    && entry.load_steps?.length > 0;
}

function uniqueArtifactRefs(plans) {
  const byKey = new Map();
  for (const plan of plans) {
    for (const ref of plan.input_artifacts ?? []) {
      byKey.set(`${ref.artifact_id}:${ref.version}:${ref.sha256}`, clone(ref));
    }
  }
  return [...byKey.values()].sort((left, right) => left.artifact_id.localeCompare(right.artifact_id));
}

function stagePlan(state, stage, args, context, purpose, inputArtifacts) {
  return resolveStagePlan({
    root: INSTALL_ROOT,
    definition: definitionFor(state),
    stage: stage.id,
    workflowStepId: args.workflow_step_id,
    purpose,
    context,
    profile: 'pm-zero-agent',
    capabilities: args.capabilities ?? [],
    providers: args.providers ?? {},
    hostCapabilities: args.host_capabilities,
    planVersion: args.plan_version ?? 1,
    inputArtifacts,
  });
}

function prepareBase(state, stage, modified = []) {
  return {
    project_id: state.project_id,
    revision: state.revision,
    current_stage: stage?.id ?? null,
    target_stage: isEightStage(state) ? targetStage(state) : null,
    ...(isEightStage(state) ? { change_context: stageChangeContext(state, stage, modified) } : {}),
  };
}

export async function stagePrepare(args) {
  const project = await resolveProject(args.project_path);
  const state = await loadState(project);
  if (state.revision !== args.expected_revision) {
    fail('E_REVISION_CONFLICT', 'Project revision changed', {
      expected_revision: args.expected_revision,
      actual_revision: state.revision,
    }, true);
  }
  if (!isEightStage(state)) {
    return {
      ...prepareBase(state, null),
      status: 'blocked',
      input_artifacts: [],
      reasons: [{ code: 'WORKFLOW_UNSUPPORTED', message: 'stage_prepare routes product-stage workflows; this project uses legacy gates.' }],
      plans: [],
    };
  }
  const stage = currentStage(state);
  const modified = await detectModifiedConfirmed(project, state);
  const allBlockers = blockersFromState(state, modified);
  const safetyBlockers = !stage ? allBlockers : allBlockers.filter((item) => ['CONFIRMED_ARTIFACT_MODIFIED', 'CHANGE_VERIFICATION_PENDING', 'GATE_ARTIFACT_DRIFT', 'GATE_REVIEW_DRIFT'].includes(item.code));
  if (safetyBlockers.length && (!stage || modified.length || (args.intent ?? 'advance') !== 'revise')) {
    return { ...prepareBase(state, stage, modified), status: 'blocked', input_artifacts: [], reasons: safetyBlockers, plans: [] };
  }
  if (!stage) {
    if (args.context !== undefined) fail('E_STAGE_CONTEXT_LOCKED', 'context cannot be changed after the workflow target is confirmed');
    return {
      ...prepareBase(state, null),
      status: 'completed',
      input_artifacts: [],
      reasons: [{ code: 'TARGET_CONFIRMED', stage_id: targetStage(state) }],
      plans: [],
    };
  }
  const context = stageContext(state, stage, args.context, args.intent ?? 'advance');
  const base = { ...prepareBase(state, stage), context };

  if (isStepped(state)) return prepareStep(project, state, stage, args, context, base);

  const current = new Map(stage.artifacts.map((type) => [type,
    Object.values(state.artifacts).find((artifact) => artifact.type === type && artifact.status !== 'stale'),
  ]));
  const stageBlockers = blockersFromState(state).filter((item) => item.stage_id === stage.id || item.code === 'CHANGE_VERIFICATION_PENDING');
  if (stageBlockers.length && (args.intent ?? 'advance') !== 'revise') {
    return {
      ...base,
      status: 'blocked',
      input_artifacts: [],
      reasons: stageBlockers,
      plans: [],
    };
  }

  const productionReasons = [];
  const productionPlans = [];
  for (const type of stage.artifacts) {
    const artifact = current.get(type);
    let dependencies;
    try {
      dependencies = expectedDependencies(state, type);
    } catch (error) {
      if (error.code !== 'E_DEPENDENCY_INVALID') throw error;
      productionReasons.push({ code: 'DEPENDENCY_PENDING', artifact_type: type, ...(error.details ?? {}) });
      continue;
    }
    const dependencyDrift = artifact && !sameRefs(artifact.dependencies, dependencies);
    if (artifact && !artifact.candidate_import && !dependencyDrift && (args.intent ?? 'advance') !== 'revise') continue;
    const resolved = stagePlan(state, stage, args, context, 'production', dependencies);
    productionPlans.push(planEnvelope(resolved, {
      type,
      ...(artifact ? { artifact_id: artifact.artifact_id, version: artifact.version, sha256: artifact.sha256 } : {}),
    }, 'production'));
    productionReasons.push({
      code: artifact?.candidate_import ? 'CANDIDATE_VALIDATION_REQUIRED' : artifact ? (dependencyDrift ? 'DEPENDENCY_REVISION_REQUIRED' : 'REVISION_REQUESTED') : 'ARTIFACT_REQUIRED',
      artifact_type: type,
    });
    // A later output in the same stage can depend on this one. Its plan must be
    // prepared only after the new exact version/hash exists.
    if (!artifact || artifact.candidate_import || dependencyDrift || (args.intent ?? 'advance') === 'revise') break;
  }
  if (productionPlans.length) {
    const planFailures = productionPlans.filter((entry) => !executablePlan(entry));
    return {
      ...base,
      status: planFailures.length ? 'blocked' : 'produce',
      input_artifacts: uniqueArtifactRefs(productionPlans),
      reasons: [
        ...productionReasons,
        ...planFailures.map((entry) => ({
          code: 'PLAN_UNAVAILABLE',
          artifact_type: entry.target_artifact.type,
          resolution: entry.plan.resolution,
          errors: clone(entry.plan.errors ?? []),
        })),
      ],
      plans: productionPlans,
    };
  }
  if ([...current.values()].some((artifact) => !artifact)) {
    return {
      ...base,
      status: 'blocked',
      input_artifacts: [],
      reasons: productionReasons.length ? productionReasons : [{ code: 'ARTIFACT_REQUIRED' }],
      plans: [],
    };
  }

  const availableReviewIds = Object.values(state.artifacts)
    .filter((artifact) => artifact.type === 'review' && artifact.status !== 'stale'
      && [...current.values()].some((target) => sameRefs([artifact.review?.subject].filter(Boolean), [artifactRef(target)])))
    .map((artifact) => artifact.artifact_id);
  const eligibility = await eightStageConfirmationEligibility(project, state, stage, availableReviewIds);
  const reviewNeeded = eligibility.reasons.filter((reason) => reason.code === 'INDEPENDENT_REVIEWS_REQUIRED');
  const confirmationBlockers = eligibility.reasons.filter((reason) => reason.code !== 'INDEPENDENT_REVIEWS_REQUIRED');
  if (confirmationBlockers.length) {
    return { ...base, status: 'blocked', input_artifacts: [], reasons: confirmationBlockers, plans: [] };
  }
  if (reviewNeeded.length) {
    const reviewPlans = [];
    for (const reason of reviewNeeded) {
      const artifact = state.artifacts[reason.artifact_id];
      const subject = artifactRef(artifact);
      const resolved = stagePlan(state, stage, args, context, 'review', [subject]);
      reviewPlans.push(planEnvelope(resolved, subject, 'review'));
    }
    const planFailures = reviewPlans.filter((entry) => !executablePlan(entry));
    return {
      ...base,
      status: planFailures.length ? 'blocked' : 'review',
      input_artifacts: uniqueArtifactRefs(reviewPlans),
      reasons: [
        ...reviewNeeded,
        ...planFailures.map((entry) => ({ code: 'PLAN_UNAVAILABLE', artifact_id: entry.target_artifact.artifact_id,
          resolution: entry.plan.resolution, errors: clone(entry.plan.errors ?? []) })),
      ],
      plans: reviewPlans,
    };
  }
  return {
    ...base,
    status: 'await_confirmation',
    input_artifacts: stage.artifacts.map((type) => artifactRef(current.get(type))),
    reasons: [{ code: 'STAGE_READY_FOR_CONFIRMATION', stage_id: stage.id }],
    plans: [],
  };
}

function newArtifactRecord({ artifactId, type, version, sha, files, dependencies = [], exploration = false, review, renderManifest, verification, verificationEvidence, changeId, producerId, execution, metadata, designIds }) {
  return {
    artifact_id: artifactId,
    type,
    version,
    sha256: sha,
    status: 'draft',
    exploration,
    dependencies: clone(dependencies),
    files,
    registered_at: now(),
    ...(review ? { review: clone(review) } : {}),
    ...(renderManifest ? { render_manifest: clone(renderManifest) } : {}),
    ...(verification ? { verification } : {}),
    ...(verificationEvidence?.length ? { verification_evidence: clone(verificationEvidence) } : {}),
    ...(changeId ? { change_id: changeId } : {}),
    ...(producerId ? { producer_id: producerId } : {}),
    ...(execution ? { execution: clone(execution) } : {}),
    ...(metadata ? { metadata: clone(metadata) } : {}),
    ...(designIds ? { design_ids: clone(designIds) } : {}),
  };
}

async function writeArtifactMetadata(project, artifact) {
  const canonicalPath = path.join(INTERNAL, 'artifacts', safeSegment(artifact.artifact_id), `v${artifact.version}.md`);
  const { canonical: _ignored, registered_at: _volatile, ...payload } = artifact;
  const bytes = Buffer.from(`${frontmatter({ schema_version: 1, record_type: 'artifact', artifact_id: artifact.artifact_id, artifact_version: artifact.version, sha256: artifact.sha256 })}\n# Artifact version\n\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\`\n`);
  await atomicWriteNew(path.join(project, canonicalPath), bytes);
  artifact.canonical = { path: canonicalPath, sha256: digest(bytes) };
}

async function writeCanonicalRecord(project, directory, filename, kind, record) {
  const canonicalPath = path.join(INTERNAL, directory, filename);
  const payload = { ...record };
  delete payload.canonical;
  delete payload.recorded_at;
  delete payload.applied_at;
  delete payload.registered_at;
  const bytes = Buffer.from(markdownRecord(kind, payload));
  await atomicWriteNew(path.join(project, canonicalPath), bytes);
  record.canonical = { path: canonicalPath, sha256: digest(bytes) };
}

function replaceArtifact(next, artifact) {
  const previous = next.artifacts[artifact.artifact_id];
  if (previous?.status === 'stale') artifact.regenerated_from_version = previous.version;
  next.artifacts[artifact.artifact_id] = artifact;
  next.artifact_history[artifact.artifact_id] ??= [];
  next.artifact_history[artifact.artifact_id].push(artifact);
}

function invalidateTypes(next, types, changeId) {
  const invalidatedIds = [];
  const direct = Object.values(next.artifacts).filter((artifact) => artifact.type !== 'review' && types.includes(artifact.type));
  for (const artifact of direct) {
    if (artifact.status !== 'stale') {
      artifact.status = 'stale';
      artifact.stale_reason = `Invalidated by ${changeId}`;
      artifact.stale_change_id = changeId;
      invalidatedIds.push(artifact.artifact_id);
    }
  }
  if (types.includes('review') || isEightStage(next)) {
    for (const artifact of Object.values(next.artifacts).filter((candidate) => candidate.type === 'review' && invalidatedIds.includes(candidate.review?.subject.artifact_id))) {
      if (artifact.status === 'stale') continue;
      artifact.status = 'stale';
      artifact.stale_reason = `Invalidated by ${changeId}`;
      artifact.stale_change_id = changeId;
      invalidatedIds.push(artifact.artifact_id);
    }
  }
  for (const gate of Object.values(next.gates)) {
    if (gate.status === 'confirmed' && gate.artifacts.some((ref) => invalidatedIds.includes(ref.artifact_id))) {
      gate.status = 'invalidated';
      gate.invalidated_by = changeId;
      next.gate_history.push({ ...clone(gate), revision: next.revision + 1, recorded_at: now() });
    }
  }
  return invalidatedIds;
}

async function writeNewGateHistory(project, next, startIndex) {
  for (let index = startIndex; index < next.gate_history.length; index += 1) {
    const gate = next.gate_history[index];
    const suffix = gate.status === 'invalidated' ? `invalidated-${safeSegment(gate.invalidated_by)}` : 'confirmed';
    await writeCanonicalRecord(project, 'gates', `${gate.gate}-r${gate.revision}-${suffix}.md`, 'gate', gate);
  }
}

export async function briefSave(args) {
  return mutate(args.project_path, 'brief_save', args, async (project, state, next) => {
    if (isEightStage(state)) fail('E_TOOL_NOT_SUPPORTED', 'brief_save is legacy-only; S1 goal_contract is registered with artifact_register');
    const acceptableSources = {
      A: /^(interview|production-data|support-ticket|experiment|user-artifact):\S+/,
      B: /^(report|official-doc|benchmark):\S+/,
      C: /^derived:\S+/,
    };
    for (const assumption of args.brief.key_assumptions) {
      const pattern = acceptableSources[assumption.grade];
      if (pattern && !pattern.test(assumption.source)) {
        fail('E_EVIDENCE_INTEGRITY', `Grade ${assumption.grade} requires a grade-appropriate explicit source`, { assumption_id: assumption.id, source: assumption.source });
      }
      if (assumption.grade === 'C' && !(assumption.evidence_refs?.length)) {
        fail('E_EVIDENCE_INTEGRITY', 'Grade C requires evidence_refs naming the accepted inputs used for derivation', { assumption_id: assumption.id });
      }
    }
    const previous = next.artifacts.brief;
    if (previous?.status === 'confirmed') fail('E_CHANGE_REQUIRED', 'A confirmed brief must be invalidated by change_apply before a replacement version is saved', { artifact_id: 'brief', version: previous.version });
    const gateHistoryStart = next.gate_history.length;
    if (previous) invalidateTypes(next, INVALIDATION.structural, `brief-v${previous.version + 1}`);
    await writeNewGateHistory(project, next, gateHistoryStart);
    next.brief = clone(args.brief);
    const version = (previous?.version ?? 0) + 1;
    const provisional = { version, status: 'draft' };
    const bytes = Buffer.from(briefMarkdown(next, provisional));
    const snapshot = path.join(INTERNAL, 'brief', `v${version}.md`);
    await atomicWriteNew(path.join(project, snapshot), bytes);
    const file = { source_path: snapshot, snapshot_path: snapshot, filename: `v${version}.md`, sha256: digest(bytes), size: bytes.length };
    const artifact = newArtifactRecord({ artifactId: 'brief', type: 'brief', version, sha: file.sha256, files: [file] });
    await writeArtifactMetadata(project, artifact);
    replaceArtifact(next, artifact);
    next.audit.push({ at: now(), action: 'brief_saved', version });
    return { artifact: publicArtifact(artifact) };
  });
}

export async function decisionRecord(args) {
  return mutate(args.project_path, 'decision_record', args, async (project, _state, next) => {
    if (next.decisions.some((item) => item.decision_id === args.decision.decision_id)) fail('E_DECISION_EXISTS', 'decision_id already exists; supersede with a new decision record');
    const supersedes = args.decision.supersedes_decision_ids ?? [];
    const missing = supersedes.filter((decisionId) => !next.decisions.some((item) => item.decision_id === decisionId));
    if (supersedes.includes(args.decision.decision_id) || missing.length) {
      fail('E_DECISION_SUPERSEDES_INVALID', 'supersedes_decision_ids must reference existing earlier decisions and cannot reference the new decision itself', {
        decision_id: args.decision.decision_id,
        missing_decision_ids: missing,
      });
    }
    const decision = { ...clone(args.decision), revision: next.revision + 1, recorded_at: now() };
    await writeCanonicalRecord(project, 'decisions', `${safeSegment(decision.decision_id)}.md`, 'decision', decision);
    next.decisions.push(decision);
    next.audit.push({ at: decision.recorded_at, action: 'decision_recorded', decision_id: decision.decision_id, user_response: clone(decision.user_response) });
    return { decision };
  });
}

async function captureFiles(project, files) {
  const captured = [];
  const seenNames = new Set();
  for (let index = 0; index < files.length; index += 1) {
    const input = files[index];
    const bytes = await readSafeProjectFile(project, input.path);
    let filename = path.basename(input.path);
    while (seenNames.has(filename)) filename = `${index}-${filename}`;
    seenNames.add(filename);
    captured.push({ input, filename, bytes, sha256: digest(bytes), size: bytes.length });
  }
  return captured;
}

async function snapshotCapturedFiles(project, artifactId, version, captured) {
  const records = [];
  for (const item of captured) {
    const snapshot = path.join(INTERNAL, 'versions', safeSegment(artifactId), `v${version}`, item.filename);
    await atomicWriteNew(path.join(project, snapshot), item.bytes);
    records.push({ source_path: item.input.path, snapshot_path: snapshot, filename: item.filename, role: item.input.role, sha256: item.sha256, size: item.size });
  }
  return records;
}

function validateDesignModel(captured) {
  if (captured.length !== 1 || !/\.json$/i.test(captured[0].filename)) fail('E_DESIGN_MODEL_INVALID', 'design_model requires exactly one JSON file');
  let model;
  try { model = JSON.parse(captured[0].bytes.toString('utf8')); } catch { fail('E_DESIGN_MODEL_INVALID', 'Design model is not valid JSON'); }
  const errors = jsonSchemaErrors(model, DESIGN_MODEL_SCHEMA);
  const screenIds = new Set();
  for (const screen of model?.screens ?? []) {
    if (screenIds.has(screen.screen_id)) errors.push(`duplicate screen_id ${screen.screen_id}`);
    screenIds.add(screen.screen_id);
  }
  const elementIds = new Set();
  for (const element of model?.elements ?? []) {
    if (elementIds.has(element.element_id)) errors.push(`duplicate element_id ${element.element_id}`);
    elementIds.add(element.element_id);
    if (!screenIds.has(element.screen_id)) errors.push(`element ${element.element_id ?? '<missing>'} references unknown screen ${element.screen_id ?? '<missing>'}`);
  }
  if (errors.length) fail('E_DESIGN_MODEL_INVALID', 'Design model violates the stable-identity contract', { errors });
  return [...screenIds, ...elementIds].sort();
}

function aggregateArtifactHash(files) {
  return files.length === 1 ? files[0].sha256 : digest(files.map((x) => ({ path: x.source_path, sha256: x.sha256 })));
}

export async function artifactRegister(args) {
  return mutate(args.project_path, 'artifact_register', args, async (project, state, next) => {
    const eightStage = isEightStage(state);
    const selectedStep = isStepped(state) ? assertSelectedStep(state, args.workflow_step_id) : null;
    if (!selectedStep && STEP_OUTPUT_TYPES.includes(args.type)) fail('E_STEP_UNSUPPORTED', 'Intermediate step output types require a new stepped project');
    if (!selectedStep && (args.workflow_step_id || args.execution?.workflow_step_id)) fail('E_STEP_UNSUPPORTED', 'Product steps require a stepped project');
    if (selectedStep && (!selectedStep.outputs.includes(args.type) || args.execution?.workflow_step_id !== selectedStep.id)) fail('E_STEP_OUTPUT_INVALID', 'Only the selected step outputs may be registered');
    let workflowStage;
    let normalizedMetadata;
    if (eightStage) {
      if (!args.producer_id || !args.execution) fail('E_PROVENANCE_REQUIRED', 'Eight-stage artifacts require producer_id and execution provenance');
      if (args.type === 'review') {
        if (!args.review) fail('E_REVIEW_REQUIRED', 'Review metadata is required');
        const subject = getArtifactVersion(state, args.review.subject);
        if (!subject) fail('E_REVIEW_SUBJECT_INVALID', 'Review subject does not match a recorded artifact version/hash', { subject: args.review.subject });
        workflowStage = stageForType(definitionFor(state), subject.type);
        if (!workflowStage?.reviewers) fail('E_REVIEW_NOT_ALLOWED', 'This workflow stage does not require review artifacts', { stage_id: workflowStage?.id });
        const currentSubject = state.artifacts[subject.artifact_id];
        if (!currentSubject || currentSubject.version !== subject.version || currentSubject.sha256 !== subject.sha256 || currentSubject.status === 'stale' || currentStage(state)?.id !== workflowStage?.id) {
          fail('E_REVIEW_SUBJECT_INVALID', 'Review subject must be a current deliverable in the earliest unconfirmed stage', { subject: args.review.subject });
        }
        if (args.producer_id !== args.review.reviewer_id) fail('E_PROVENANCE_INVALID', 'Review producer_id must equal review.reviewer_id');
        if (subject.producer_id === args.review.reviewer_id) fail('E_INDEPENDENT_REVIEW_REQUIRED', 'Review author must differ from the target producer', { producer_id: subject.producer_id });
        if (!sameRefs(args.dependencies, [args.review.subject])) fail('E_DEPENDENCY_INVALID', 'Review dependencies must contain exactly its subject artifact reference');
      } else {
        workflowStage = stageForType(definitionFor(state), args.type);
        if (!workflowStage) fail('E_ARTIFACT_TYPE_INVALID', 'Artifact type is not part of the project workflow definition', { type: args.type });
        const earliest = currentStage(state);
        if (!earliest || earliest.id !== workflowStage.id) {
          fail('E_STAGE_ORDER', 'Only the earliest unconfirmed stage may register deliverables', { current_stage: earliest?.id ?? null, artifact_stage: workflowStage.id });
        }
        const required = expectedDependencies(state, args.type);
        if (!sameRefs(args.dependencies, required)) fail('E_DEPENDENCY_INVALID', 'Artifact dependencies must exactly match the current workflow definition', { required, received: args.dependencies });
        for (const dependency of required) {
          const artifact = state.artifacts[dependency.artifact_id];
          const dependencyStage = stageForType(definitionFor(state), artifact.type);
          if (artifact.status !== 'confirmed' && dependencyStage.id !== workflowStage.id) {
            fail('E_DEPENDENCY_INVALID', 'Dependencies from earlier stages must be confirmed', { dependency });
          }
        }
        if (!args.metadata) fail('E_STAGE_METADATA_REQUIRED', 'Eight-stage deliverables require structured open_questions and blockers metadata');
        normalizedMetadata = clone(args.metadata);
        const misplaced = [...normalizedMetadata.open_questions, ...normalizedMetadata.blockers].filter((item) => item.stage_id !== workflowStage.id);
        if (misplaced.length) fail('E_STAGE_METADATA_INVALID', 'All open questions and blockers must name the deliverable stage', { expected_stage: workflowStage.id, ids: misplaced.map((item) => item.id) });
        if (args.type === 'goal_contract') {
          normalizedMetadata.target_stage ??= definitionFor(state).default_target_stage;
          normalizedMetadata.context ??= isStepped(state) ? state.workflow.definition.step_context : state.workflow.definition.initial_context ?? 'none';
          if (!definitionFor(state).stages.some(stage => stage.id === normalizedMetadata.target_stage)) fail('E_STAGE_METADATA_INVALID', 'target_stage must belong to this project workflow', { target_stage: normalizedMetadata.target_stage });
          if (isStepped(state) && normalizedMetadata.context !== state.workflow.definition.step_context) fail('E_STAGE_CONTEXT_MISMATCH', 'Step project context is fixed at creation', { expected_context: state.workflow.definition.step_context, received_context: normalizedMetadata.context });
        } else {
          if (normalizedMetadata.target_stage !== undefined) fail('E_STAGE_METADATA_INVALID', 'target_stage is only valid on goal_contract');
          if (normalizedMetadata.context !== undefined) fail('E_STAGE_METADATA_INVALID', 'context is only valid on the S1 goal_contract');
        }
      }
      if (!workflowStage || args.execution.stage_id !== workflowStage.id) {
        fail('E_PROVENANCE_INVALID', 'execution.stage_id must equal the stage of the deliverable or reviewed subject', { expected_stage: workflowStage?.id, received_stage: args.execution.stage_id });
      }
      const currentGoal = Object.values(state.artifacts).find((artifact) => artifact.type === 'goal_contract' && artifact.status !== 'stale');
      const expectedContext = args.type === 'goal_contract'
        ? normalizedMetadata.context
        : isStepped(state) ? state.workflow.definition.step_context : currentGoal?.metadata?.context ?? 'none';
      if (args.execution.selection.context !== expectedContext) {
        fail('E_STAGE_CONTEXT_MISMATCH', 'Execution context must match the effective S1 goal_contract context', {
          expected_context: expectedContext,
          received_context: args.execution.selection.context,
          goal_contract_version: currentGoal?.version ?? null,
        });
      }
      await validateExecutionProvenance(project, args.execution, args.dependencies, {
        required_capabilities: selectedStep?.required_capabilities ?? (args.type === 'review' ? ['independent-review'] : workflowStage.required_capabilities),
        workflow_step_id: selectedStep?.id,
        provider_output_type: selectedStep?.provider_output_type,
        provider_output_types: selectedStep?.provider_output_types ?? (!selectedStep && args.type !== 'review' ? workflowStage.artifacts : undefined),
        output_type: args.type,
        expected_purpose: args.type === 'review' ? 'review' : 'production',
        definition: definitionFor(state),
        definition_hash: state.workflow.definition_hash,
      });
    }
    const previous = state.artifacts[args.artifact_id];
    if (previous && previous.type !== args.type) fail('E_ARTIFACT_TYPE_IMMUTABLE', 'An artifact_id cannot be reused for another artifact type', { artifact_id: args.artifact_id, previous_type: previous.type, received_type: args.type });
    if (selectedStep && previous?.status === 'confirmed') fail('E_CHANGE_REQUIRED', 'Confirmed step output versions cannot be replaced without an approved change');
    if (selectedStep) {
      const paths = args.files.map(file => path.normalize(file.path));
      const reused = Object.values(state.artifacts).find(artifact => artifact.artifact_id !== args.artifact_id && artifact.files.some(file => paths.includes(path.normalize(file.source_path))));
      if (reused) fail('E_STEP_FILE_REUSED', 'Each step output must use independent source files', { artifact_id: reused.artifact_id });
    }
    if (previous?.type === 'review' && Object.values(state.gates).some((gate) => gate.status === 'confirmed' && gate.review_artifact_ids.includes(args.artifact_id))) {
      fail('E_REVIEW_ID_IN_USE', 'A review artifact referenced by a confirmed gate is immutable; register a new review_artifact_id');
    }
    if (previous?.status === 'confirmed' && args.type !== 'review') {
      fail('E_CHANGE_REQUIRED', 'A confirmed artifact must be invalidated by change_apply before a replacement version is registered', { artifact_id: args.artifact_id, version: previous.version });
    }
    if (args.type !== 'review') {
      const conflict = Object.values(state.artifacts).find((item) => item.type === args.type && item.artifact_id !== args.artifact_id);
      if (conflict) fail('E_ARTIFACT_TYPE_CONFLICT', 'Deliverable artifact types use one stable artifact_id', { existing_artifact_id: conflict.artifact_id });
    }
    for (const dependency of args.dependencies) {
      if (!getArtifactVersion(state, dependency)) fail('E_DEPENDENCY_INVALID', 'Dependency does not match a recorded artifact version/hash', { dependency });
    }
    if (args.type === 'demo') {
      if (args.change_id && args.change_id !== args.render_manifest.change_id) fail('E_CHANGE_MISMATCH', 'Demo change_id must match render_manifest.change_id');
      const modelDependency = args.dependencies.find((dependency) => getArtifactVersion(state, dependency)?.type === 'design_model');
      if (modelDependency) {
        const currentModel = state.artifacts[modelDependency.artifact_id];
        if (!currentModel || currentModel.version !== modelDependency.version || currentModel.sha256 !== modelDependency.sha256 || currentModel.status === 'stale') {
          fail('E_RENDER_MODEL_MISMATCH', 'Demo must reference the current non-stale design model version/hash', { dependency: modelDependency });
        }
        if (args.render_manifest.input_design_model_hash !== modelDependency.sha256) {
          fail('E_RENDER_MODEL_MISMATCH', 'render_manifest.input_design_model_hash must equal the exact design-model artifact dependency hash', { expected: modelDependency.sha256, received: args.render_manifest.input_design_model_hash });
        }
      }
    }
    if (args.type === 'review') {
      if (!getArtifactVersion(state, args.review.subject)) fail('E_REVIEW_SUBJECT_INVALID', 'Review subject does not match a recorded artifact version/hash', { subject: args.review.subject });
      if (args.review.subject.artifact_id === args.artifact_id) fail('E_REVIEW_SUBJECT_INVALID', 'Review cannot review itself');
    }
    const version = (previous?.version ?? 0) + 1;
    const captured = await captureFiles(project, args.files);
    if (selectedStep) validateStepContent(selectedStep, args.type, captured);
    if (eightStage) validateStaticCaptured(definitionFor(state), { ...workflowStage, static_only: args.type === 'review' || workflowStage.static_only }, captured);
    const designIds = args.type === 'design_model' ? validateDesignModel(captured) : undefined;
    const files = await snapshotCapturedFiles(project, args.artifact_id, version, captured);
    const sha = aggregateArtifactHash(files);
    let verification;
    if (args.type === 'demo') verification = await verifyRender(project, state, files, args.render_manifest, args.verification_evidence ?? [], { producerId: args.producer_id });
    const artifact = newArtifactRecord({
      artifactId: args.artifact_id, type: args.type, version, sha, files,
      dependencies: args.dependencies, exploration: args.exploration ?? false,
      review: args.review, renderManifest: args.render_manifest, verification, verificationEvidence: args.verification_evidence,
      changeId: args.type === 'demo' ? previous?.stale_change_id ?? previous?.change_id ?? args.change_id ?? args.render_manifest?.change_id : args.change_id,
      producerId: args.producer_id, execution: args.execution, metadata: normalizedMetadata, designIds,
    });
    await writeArtifactMetadata(project, artifact);
    replaceArtifact(next, artifact);
    next.audit.push({ at: now(), action: 'artifact_registered', artifact_id: args.artifact_id, version, sha256: sha });
    return { artifact: publicArtifact(artifact) };
  });
}

export async function changePrepare(args) {
  const project = await resolveProject(args.project_path);
  const state = await loadState(project);
  return { project_id: state.project_id, revision: state.revision, ...prepareChange(state, args.change, args.expected_artifacts) };
}

export async function changeApply(args) {
  return mutate(args.project_path, 'change_apply', args, (project, state, next) => applyChangeOperation(project, state, next, args));
}

async function applyChangeOperation(project, state, next, args) {
  if (isStepped(state)) assertUserResponse(args.user_response);
  if (state.changes.some((x) => x.change.change_id === args.change.change_id)) fail('E_CHANGE_EXISTS', 'change_id is already applied');
  const preview = prepareChange(state, args.change, args.expected_artifacts);
  if (preview.preview_hash !== args.preview_hash) fail('E_CHANGE_PREVIEW_MISMATCH', 'Change preview is stale or does not match the frozen scope', { expected: preview.preview_hash, received: args.preview_hash });
  const gateHistoryStart = next.gate_history.length;
  const invalidatedIds = invalidateTypes(next, preview.invalidation_types, args.change.change_id);
  invalidateStepControl(next, invalidatedIds);
  const verificationBaselines = Object.values(state.artifacts).filter(artifact => artifact.type === 'demo' && invalidatedIds.includes(artifact.artifact_id)).map(artifact => {
    if (effectiveVerification(artifact).status === 'verified') return artifactRef(artifact);
    const priorChangeId = artifact.stale_change_id ?? artifact.change_id;
    const priorBaseline = state.changes.find(item => item.change.change_id === priorChangeId)?.verification_baselines?.find(ref => ref.artifact_id === artifact.artifact_id);
    if (priorBaseline) return clone(priorBaseline);
    if (artifact.verification?.status === 'failed') fail('E_VERIFICATION_BASELINE_UNTRUSTED', 'A failed Demo cannot become a fresh verification baseline; restore or correct its existing change first', { artifact_id: artifact.artifact_id });
    return artifactRef(artifact);
  });
  await writeNewGateHistory(project, next, gateHistoryStart);
  const record = { ...preview, ...(isStepped(state) ? { user_response: clone(args.user_response) } : {}), applied_at: now(), revision: next.revision + 1, invalidated_artifact_ids: invalidatedIds, verification_baselines: verificationBaselines };
  await writeCanonicalRecord(project, 'changes', `${args.change.change_id}.md`, 'change', record);
  next.changes.push(record);
  next.audit.push({ at: record.applied_at, action: 'change_applied', change_id: args.change.change_id, frozen_scope_hash: preview.preview_hash });
  return {
    change: clone(record.change),
    preview_hash: record.preview_hash,
    invalidation_types: clone(record.invalidation_types),
    ...(isStepped(state) ? { affected_steps: clone(record.affected_steps), preserved_steps: clone(record.preserved_steps) } : {}),
    invalidated_artifact_ids: clone(record.invalidated_artifact_ids),
    ...(record.entry_artifact ? { entry_artifact: clone(record.entry_artifact), actual_dependency_closure: clone(record.actual_dependency_closure) } : {}),
  };
}

function validateCurrentDependencies(state, artifact, atomicallyConfirmedTypes = []) {
  const missing = [];
  for (const type of REQUIRED_DEPENDENCIES[artifact.type] ?? []) {
    const current = Object.values(state.artifacts).find((x) => x.type === type);
    if (!current || current.status === 'stale') {
      missing.push({ type, reason: current ? 'stale' : 'missing' });
      continue;
    }
    if (current.status !== 'confirmed' && !atomicallyConfirmedTypes.includes(type)) {
      missing.push({ type, reason: 'not confirmed' });
      continue;
    }
    const ref = artifact.dependencies.find((x) => x.artifact_id === current.artifact_id && x.version === current.version && x.sha256 === current.sha256);
    if (!ref) missing.push({ type, reason: 'current version/hash not referenced' });
  }
  return missing;
}

function precedingGateProblems(state, gate) {
  const order = ['G1', 'G2', 'G3', 'G4'];
  const problems = [];
  for (const priorGate of order.slice(0, order.indexOf(gate))) {
    const record = state.gates[priorGate];
    if (!record || record.status !== 'confirmed') {
      problems.push({ code: 'PRECEDING_GATE_REQUIRED', gate: priorGate });
      continue;
    }
    for (const ref of record.artifacts) {
      const current = state.artifacts[ref.artifact_id];
      if (!current || current.version !== ref.version || current.sha256 !== ref.sha256 || current.status !== 'confirmed') {
        problems.push({ code: 'PRECEDING_GATE_STALE', gate: priorGate, artifact_id: ref.artifact_id });
      }
    }
  }
  return problems;
}

function reviewsForTarget(state, ids, target) {
  return ids.map((id) => state.artifacts[id]).filter((artifact) => artifact?.type === 'review' && artifact.status !== 'stale' && artifact.review?.subject.artifact_id === target.artifact_id && artifact.review.subject.version === target.version && artifact.review.subject.sha256 === target.sha256);
}

// Confirm only the registered bytes currently presented to the user. Snapshots remain
// authoritative; this check neither adopts edits nor prevents re-registering a draft.
async function confirmationSourceProblems(project, state, targets, reviewArtifactIds) {
  const candidates = [...targets, ...reviewArtifactIds.map(id => state.artifacts[id])]
    .filter(artifact => artifact && artifact.status !== 'confirmed' && artifact.status !== 'stale');
  const imported = candidates.filter(artifact => artifact.candidate_import?.status === 'pending_validation')
    .map(artifact => ({ code: 'CANDIDATE_VALIDATION_REQUIRED', artifact_id: artifact.artifact_id, recovery: artifact.candidate_import.next_action }));
  const modified = await detectModifiedSources(project, candidates);
  return [...imported, ...(modified.length ? [{
    code: 'ARTIFACT_SOURCE_MODIFIED', modified,
    recovery: 'Restore the registered source bytes or register the intended edits as a new version; obtain reviews for the new version before confirming.',
  }] : [])];
}

async function eightStageConfirmationEligibility(project, state, stage, reviewArtifactIds) {
  const targets = stage.artifacts.map((type) => Object.values(state.artifacts).find((artifact) => artifact.type === type && artifact.status !== 'stale'));
  const reasons = [];
  if (stage.reviewers === 0 && reviewArtifactIds.length) reasons.push({ code: 'REVIEWS_NOT_ALLOWED', stage_id: stage.id });
  if (targets.some((target) => !target)) reasons.push({ code: 'MISSING_STAGE_ARTIFACT', types: stage.artifacts.filter((_, index) => !targets[index]) });
  for (const reviewId of reviewArtifactIds) {
    if (state.artifacts[reviewId]?.type !== 'review') reasons.push({ code: 'INVALID_REVIEW_ARTIFACT', artifact_id: reviewId });
  }
  for (const target of targets.filter(Boolean)) {
    if (target.exploration) reasons.push({ code: 'EXPLORATION_NOT_CONFIRMABLE', artifact_id: target.artifact_id });
    if (target.type === 'demo' && effectiveVerification(target).status !== 'verified') reasons.push({ code: 'CHANGE_VERIFICATION_PENDING', artifact_id: target.artifact_id, reason: effectiveVerification(target).reason });
    const required = expectedDependencies(state, target.type);
    if (!sameRefs(target.dependencies, required)) reasons.push({ code: 'DEPENDENCIES_INVALID', artifact_id: target.artifact_id, required });
    for (const dependency of required) {
      const artifact = state.artifacts[dependency.artifact_id];
      const dependencyStage = stageForType(definitionFor(state), artifact.type);
      if (artifact.status !== 'confirmed' && dependencyStage.id !== stage.id) reasons.push({ code: 'DEPENDENCIES_INVALID', artifact_id: target.artifact_id, dependency, reason: 'not confirmed' });
    }
    const selectedReviews = reviewsForTarget(state, reviewArtifactIds, target);
    const selectedReviewerIds = new Set(selectedReviews.map((review) => review.review.reviewer_id));
    if (selectedReviews.length < stage.reviewers || selectedReviewerIds.size < stage.reviewers) {
      reasons.push({
        code: 'INDEPENDENT_REVIEWS_REQUIRED', artifact_id: target.artifact_id,
        required: stage.reviewers, current: selectedReviewerIds.size,
        matching_reviews: selectedReviews.map((review) => review.artifact_id),
      });
    }
    for (const review of selectedReviews) {
      if (review.review.reviewer_id === target.producer_id) reasons.push({ code: 'REVIEWER_IS_PRODUCER', artifact_id: target.artifact_id, reviewer_id: review.review.reviewer_id });
    }
    const allCurrentIndependentReviews = Object.values(state.artifacts).filter((review) => review.type === 'review'
      && review.status !== 'stale'
      && review.review?.reviewer_id !== target.producer_id
      && sameRefs([review.review?.subject].filter(Boolean), [artifactRef(target)]));
    for (const review of allCurrentIndependentReviews) {
      const openSerious = review.review.findings.filter((finding) => ['blocker', 'major'].includes(finding.severity) && finding.status === 'open');
      if (openSerious.length) {
        reasons.push({
          code: 'OPEN_REVIEW_FINDINGS', artifact_id: target.artifact_id,
          review_artifact_id: review.artifact_id,
          finding_ids: openSerious.map((finding) => finding.id),
        });
      }
    }
  }
  reasons.push(...blockersFromState(state).filter((blocker) => blocker.stage_id === stage.id || blocker.code === 'CHANGE_VERIFICATION_PENDING'));
  reasons.push(...await confirmationSourceProblems(project, state, targets, reviewArtifactIds));
  const modified = await detectModifiedConfirmed(project, state);
  if (modified.length) reasons.push({ code: 'CONFIRMED_ARTIFACT_MODIFIED', modified });
  return { targets, reasons };
}

export async function gateConfirm(args) {
  return mutate(args.project_path, 'gate_confirm', args, async (project, state, next) => {
    if (isEightStage(state)) {
      const stage = currentStage(state);
      if (!stage || args.gate !== stage.id) {
        fail('E_STAGE_ORDER', 'Only the earliest unconfirmed stage can be confirmed', { current_stage: stage?.id ?? null, requested_stage: args.gate });
      }
      if (isStepped(state) && (state.step_control.active || stage.steps.some(step => !stepConfirmed(state, step)))) fail('E_STEPS_UNCONFIRMED', 'Every step must be confirmed before the stage gate');
      const { targets, reasons } = await eightStageConfirmationEligibility(project, state, stage, args.review_artifact_ids);
      if (reasons.length) fail('E_GATE_BLOCKED', `${stage.id} cannot be confirmed`, { reasons });
      const refs = targets.map((target) => ({ ...artifactRef(target), type: target.type }));
      for (const target of targets) next.artifacts[target.artifact_id].status = 'confirmed';
      const goalTarget = targets.find(target => target.type === 'goal_contract');
      if (goalTarget) next.workflow.target_stage = goalTarget.metadata.target_stage;
      const gate = {
        gate: stage.id,
        stage_id: stage.id,
        status: 'confirmed',
        artifacts: refs,
        review_artifact_ids: [...args.review_artifact_ids],
        review_artifacts: args.review_artifact_ids.map((artifactId) => {
          const review = state.artifacts[artifactId];
          return { artifact_id: artifactId, version: review.version, sha256: review.sha256, reviewer_id: review.review.reviewer_id, perspective: review.review.perspective };
        }),
        user_response: clone(args.user_response),
        caveats: clone(args.caveats ?? []),
        workflow_definition_hash: state.workflow.definition_hash,
        revision: next.revision + 1,
        recorded_at: now(),
        evidence_note: 'The exact caller-supplied user response, artifact versions, producer/reviewer identities, and provenance are audit evidence; identity and authorship are not cryptographically proven.',
      };
      await writeCanonicalRecord(project, 'gates', `${stage.id}-r${gate.revision}-confirmed.md`, 'gate', gate);
      next.gates[stage.id] = gate;
      next.gate_history.push(clone(gate));
      next.audit.push({ at: gate.recorded_at, action: 'stage_confirmed', stage_id: stage.id, user_response: clone(args.user_response) });
      return { gate };
    }
    const types = GATE_TYPES[args.gate];
    if (!types) fail('E_GATE_INVALID', 'Gate is not valid for the legacy workflow', { gate: args.gate });
    const targets = types.map((type) => Object.values(state.artifacts).find((x) => x.type === type));
    const reasons = precedingGateProblems(state, args.gate);
    if (args.review_artifact_ids.length < 2) reasons.push({ code: 'INDEPENDENT_REVIEWS_REQUIRED', required: 2 });
    for (const reviewId of args.review_artifact_ids) {
      if (state.artifacts[reviewId]?.type !== 'review') reasons.push({ code: 'INVALID_REVIEW_ARTIFACT', artifact_id: reviewId });
    }
    if (targets.some((x) => !x)) reasons.push({ code: 'MISSING_GATE_ARTIFACT', types: types.filter((_, index) => !targets[index]) });
    for (const target of targets.filter(Boolean)) {
      if (target.exploration) reasons.push({ code: 'EXPLORATION_NOT_CONFIRMABLE', artifact_id: target.artifact_id });
      if (target.status === 'stale') reasons.push({ code: 'STALE_NOT_CONFIRMABLE', artifact_id: target.artifact_id });
      if (target.type === 'demo' && effectiveVerification(target).status !== 'verified') reasons.push({ code: 'CHANGE_VERIFICATION_PENDING', artifact_id: target.artifact_id, reason: effectiveVerification(target).reason });
      const dependencyProblems = validateCurrentDependencies(state, target, args.gate === 'G2' ? types : []);
      if (dependencyProblems.length) reasons.push({ code: 'DEPENDENCIES_INVALID', artifact_id: target.artifact_id, dependencies: dependencyProblems });
      const reviews = reviewsForTarget(state, args.review_artifact_ids, target);
      const reviewerIds = new Set(reviews.map((x) => x.review.reviewer_id));
      const perspectives = new Set(reviews.map((x) => x.review.perspective));
      if (reviews.length < 2 || reviewerIds.size < 2 || perspectives.size < 2) reasons.push({ code: 'INDEPENDENT_REVIEWS_REQUIRED', artifact_id: target.artifact_id, matching_reviews: reviews.map((x) => x.artifact_id) });
      for (const review of reviews) {
        const openSerious = review.review.findings.filter((x) => ['blocker', 'major'].includes(x.severity) && x.status === 'open');
        if (openSerious.length) reasons.push({ code: 'OPEN_REVIEW_FINDINGS', review_artifact_id: review.artifact_id, finding_ids: openSerious.map((x) => x.id) });
      }
    }
    reasons.push(...blockersFromState(state).filter((x) => x.gate === args.gate || (x.code === 'CHANGE_VERIFICATION_PENDING' && state.artifacts[x.artifact_id]?.status === 'confirmed')));
    reasons.push(...await confirmationSourceProblems(project, state, targets, args.review_artifact_ids));
    const modified = await detectModifiedConfirmed(project, state);
    if (modified.length) reasons.push({ code: 'CONFIRMED_ARTIFACT_MODIFIED', modified });
    if (reasons.length) fail('E_GATE_BLOCKED', `${args.gate} cannot be confirmed`, { reasons });
    const refs = targets.map((x) => ({ artifact_id: x.artifact_id, type: x.type, version: x.version, sha256: x.sha256 }));
    for (const target of targets) next.artifacts[target.artifact_id].status = 'confirmed';
    const gate = {
      gate: args.gate,
      status: 'confirmed',
      artifacts: refs,
      review_artifact_ids: [...args.review_artifact_ids],
      review_artifacts: args.review_artifact_ids.map((artifactId) => {
        const review = state.artifacts[artifactId];
        return {
          artifact_id: artifactId,
          version: review.version,
          sha256: review.sha256,
          reviewer_id: review.review.reviewer_id,
          perspective: review.review.perspective,
        };
      }),
      user_response: clone(args.user_response),
      caveats: clone(args.caveats ?? []),
      revision: next.revision + 1,
      recorded_at: now(),
      evidence_note: 'Recorded user-response evidence is an audit statement supplied by the caller; it is not cryptographic proof of identity or authorship.',
    };
    await writeCanonicalRecord(project, 'gates', `${args.gate}-r${gate.revision}-confirmed.md`, 'gate', gate);
    next.gates[args.gate] = gate;
    next.gate_history.push(clone(gate));
    next.audit.push({ at: gate.recorded_at, action: 'gate_confirmed', gate: args.gate, user_response: clone(args.user_response) });
    return { gate };
  });
}

export const internals = Object.freeze({ digest, stable, deriveState, INVALIDATION, GATE_TYPES });

function candidateSummaries(state) {
  return (state.candidates ?? []).map(candidate => ({
    candidate_id: candidate.candidate_id, status: candidate.status,
    workspace_path: candidate.manifest.workspace_path,
    entry_artifact: clone(candidate.manifest.entry_artifact),
    baseline_revision: candidate.manifest.baseline_revision,
    baseline_current: candidate.status === 'active' && candidate.manifest.baseline_revision === state.revision,
    ...(candidate.accepted_artifact ? { accepted_artifact: clone(candidate.accepted_artifact) } : {}),
  }));
}

export async function projectDiagnose(args) {
  const project = await resolveProject(args.project_path);
  let store;
  try { store = await diagnoseProjectStore(project); }
  catch (error) {
    store = { writable: false, recovery_required: true,
      issues: [{ code: error.code ?? 'E_STORE_DIAGNOSIS_FAILED', message: error.message }] };
  }
  let state, modified;
  try {
    state = await loadState(project);
    modified = await detectModifiedConfirmed(project, state);
  } catch (error) {
    return { project_path: project, readable: false, plannable: false, writable: false, store,
      issues: [...(store.issues ?? []), { code: error.code ?? 'E_PROJECT_CORRUPT', message: error.message }] };
  }
  return { project_path: project, project_id: state.project_id, revision: state.revision,
    readable: true, plannable: true, writable: store.writable === true && modified.length === 0, store,
    issues: [...(store.issues ?? []), ...modified.map(item => ({ code: 'CONFIRMED_ARTIFACT_MODIFIED', ...item }))],
    resume: resumeRead(state, modified) };
}

export async function projectRecoveryPrepare(args) {
  const project = await resolveProject(args.project_path);
  return prepareProjectRecovery(project);
}

export async function projectRecoveryApply(args) {
  assertUserResponse(args.user_response);
  const project = await resolveProject(args.project_path);
  return applyProjectRecovery(project, args, { rebuildDerived: async () => writeDerivedState(project, await loadState(project)) });
}

export const { candidateCreate, candidateRead, candidatePreview, candidateAccept, candidateDiscard } = createCandidateCommands({
  mutate, resolveProject, loadState, digest, prepareChange, applyChangeOperation,
  writeCanonicalRecord, snapshotCapturedFiles, aggregateArtifactHash, newArtifactRecord,
  writeArtifactMetadata, replaceArtifact, publicArtifact, assertUserResponse,
  validateDesignModel, validateStepContent, detectModifiedConfirmed,
});

function assertUserResponse(response) {
  if (!response?.source?.trim() || !response?.text?.trim()) fail('E_USER_RESPONSE_REQUIRED', 'Record the explicit user response and its source; silence or prior general authorization is not a step choice');
}

function assertSelectedStep(state, id) {
  if (!isStepped(state)) fail('E_STEP_UNSUPPORTED', 'Step operations require a new stepped project');
  const active = state.step_control.active;
  const step = active && findStep(state, active.workflow_step_id);
  if (!step || active.workflow_step_id !== id) fail('E_STEP_NOT_SELECTED', 'Explicitly select this step before producing or confirming its artifacts');
  if (step.stage_id !== currentStage(state)?.id || nextStep(state)?.id !== step.id) fail('E_STEP_SELECTION_STALE', 'The selected step is no longer current');
  const inputs = stepInputs(state, step);
  if (inputs.some(a => !a || a.status !== 'confirmed') || !sameRefs(active.input_artifacts, inputs.map(artifactRef))) fail('E_STEP_SELECTION_STALE', 'The selected step inputs changed; obtain a fresh selection');
  return step;
}

async function saveStepEvent(project, next, event) {
  const record = { ...event, revision: next.revision + 1 };
  await writeCanonicalRecord(project, 'steps', `${safeSegment(record.workflow_step_id)}-r${record.revision}-${record.action}.md`, 'step', record);
  next.step_control.history.push(record);
  return record;
}

export async function stepSelect(args) {
  return mutate(args.project_path, 'step_select', args, async (project, state, next) => {
    if (!isStepped(state)) fail('E_STEP_UNSUPPORTED', 'Step selection is only available for new stepped projects');
    assertUserResponse(args.user_response);
    if (state.step_control.active) fail('E_STEP_ALREADY_SELECTED', 'Finish or revise the selected step before selecting another');
    const step = nextStep(state);
    if (!step || step.id !== args.workflow_step_id) fail('E_STEP_ORDER', 'Only the next unconfirmed step in the current stage can be selected', { next_step_id: step?.id ?? null });
    const inputs = stepInputs(state, step);
    if (inputs.some(a => !a || a.status !== 'confirmed')) fail('E_STEP_INPUT_REQUIRED', 'All step inputs must be current confirmed versions');
    const record = await saveStepEvent(project, next, { action: 'selected', workflow_step_id: step.id, stage_id: currentStage(state).id, input_artifacts: inputs.map(artifactRef), user_response: clone(args.user_response) });
    next.step_control.active = clone(record);
    return { selection: clone(record), step_progress: stepProgress(next) };
  });
}

function validateStepContent(step, type, captured) {
  if (captured.some(file => file.bytes.length === 0 || (['.md', '.txt', '.json', '.svg', '.html'].includes(path.extname(file.filename)) && !file.bytes.toString('utf8').trim()))) fail('E_STEP_CONTENT_INVALID', 'Step outputs cannot be empty');
  // Final assets retain their existing type-specific validators. The added
  // intermediate documents have explicit structural requirements, not a claim
  // of semantic quality; users still confirm their exact version separately.
  if ((step.required_sections ?? []).length) {
    const text = captured.filter(file => path.extname(file.filename) === '.md').map(file => file.bytes.toString('utf8')).join('\n');
    const headings = text.split(/\r?\n/).filter(line => /^#{1,6}\s+/.test(line)).map(line => line.replace(/^#{1,6}\s+/, '').trim());
    const sections = new Map();
    let heading;
    for (const line of text.split(/\r?\n/)) {
      if (/^#{1,6}\s+/.test(line)) { heading = line.replace(/^#{1,6}\s+/, '').trim(); sections.set(heading, ''); }
      else if (heading) sections.set(heading, sections.get(heading) + line.trim());
    }
    const missing = (step.required_sections ?? []).filter(section => !headings.includes(section) || !sections.get(section));
    if (!text.trim() || missing.length) fail('E_STEP_CONTENT_INVALID', 'This step requires a Markdown document with the declared sections', { missing_sections: missing });
  }
}

async function stepCompletionProblems(project, state, step) {
  const artifacts = stepArtifacts(state, step);
  const reasons = [];
  if (step.purpose === 'review') {
    const stage = currentStage(state);
    const eligible = await eightStageConfirmationEligibility(project, state, stage, artifacts.map(a => a.artifact_id));
    reasons.push(...eligible.reasons);
  } else {
    for (const type of step.outputs) {
      const artifact = artifacts.find(a => a.type === type);
      if (!artifact) { reasons.push({ code: 'STEP_OUTPUT_REQUIRED', type }); continue; }
      if (artifact.exploration) reasons.push({ code: 'EXPLORATION_NOT_CONFIRMABLE', artifact_id: artifact.artifact_id });
      if (!sameRefs(artifact.dependencies, expectedDependencies(state, type))) reasons.push({ code: 'DEPENDENCIES_INVALID', artifact_id: artifact.artifact_id });
      if (type === 'demo' && effectiveVerification(artifact).status !== 'verified') reasons.push({ code: 'CHANGE_VERIFICATION_PENDING', artifact_id: artifact.artifact_id, reason: effectiveVerification(artifact).reason });
    }
    reasons.push(...blockersFromState(state).filter(b => b.stage_id === currentStage(state)?.id));
    reasons.push(...await confirmationSourceProblems(project, state, artifacts, []));
  }
  return { artifacts, reasons };
}

export async function stepConfirm(args) {
  return mutate(args.project_path, 'step_confirm', args, async (project, state, next) => {
    assertUserResponse(args.user_response);
    const step = assertSelectedStep(state, args.workflow_step_id);
    const { artifacts, reasons } = await stepCompletionProblems(project, state, step);
    if (!sameRefs(args.artifacts, artifacts.map(artifactRef))) fail('E_STEP_VERSION_MISMATCH', 'Step confirmation must name exactly the current output versions');
    if (reasons.length) fail('E_STEP_BLOCKED', 'Current step cannot be confirmed', { reasons });
    for (const artifact of artifacts) next.artifacts[artifact.artifact_id].status = 'confirmed';
    const record = await saveStepEvent(project, next, { action: 'confirmed', workflow_step_id: step.id, artifacts: artifacts.map(artifactRef), status: 'confirmed', user_response: clone(args.user_response) });
    next.step_control.confirmations[step.id] = clone(record);
    next.step_control.active = null;
    return { step_confirmation: record, step_progress: stepProgress(next) };
  });
}

async function prepareStep(project, state, stage, args, context, base) {
  const pending = nextStep(state);
  const progress = stepProgress(state);
  const common = { ...base, step_progress: progress, input_artifacts: [], plans: [] };
  if (!pending) {
    const reviews = stage.steps.filter(s => s.purpose === 'review').flatMap(s => stepArtifacts(state, s).map(a => a.artifact_id));
    const { reasons } = await eightStageConfirmationEligibility(project, state, stage, reviews);
    return { ...common, status: reasons.length ? 'blocked' : 'await_confirmation', reasons: reasons.length ? reasons : [{ code: 'STAGE_READY_FOR_CONFIRMATION', stage_id: stage.id }] };
  }
  if (!state.step_control.active) return { ...common, status: 'await_selection', selectable_steps: [{ ...clone(pending), stage_id: stage.id }], reasons: [{ code: 'MANUAL_STEP_SELECTION_REQUIRED' }] };
  const step = assertSelectedStep(state, state.step_control.active.workflow_step_id);
  const { artifacts, reasons } = await stepCompletionProblems(project, state, step);
  const missing = reasons.filter(r => ['STEP_OUTPUT_REQUIRED', 'INDEPENDENT_REVIEWS_REQUIRED'].includes(r.code));
  const blocked = reasons.filter(r => !['STEP_OUTPUT_REQUIRED', 'INDEPENDENT_REVIEWS_REQUIRED'].includes(r.code));
  if (blocked.length && args.intent !== 'revise') return { ...common, status: 'blocked', workflow_step: clone(step), reasons: blocked };
  if (!reasons.length && args.intent !== 'revise') return { ...common, status: 'await_step_confirmation', workflow_step: clone(step), step_artifacts: artifacts.map(artifactRef), reasons: [{ code: 'STEP_READY_FOR_CONFIRMATION' }] };
  const planArgs = { ...args, workflow_step_id: step.id };
  let target, input;
  if (step.purpose === 'review') {
    const type = stage.artifacts.find(type => missing.some(r => state.artifacts[r.artifact_id]?.type === type)) ?? stage.artifacts[0];
    const subject = Object.values(state.artifacts).find(a => a.type === type && a.status !== 'stale');
    target = artifactRef(subject); input = [target];
  } else {
    const type = missing.find(r => r.type)?.type ?? step.outputs[0];
    target = { type }; input = expectedDependencies(state, type);
  }
  const plan = planEnvelope(stagePlan(state, stage, planArgs, context, step.purpose, input), target, step.purpose);
  if (!executablePlan(plan)) return { ...common, status: 'blocked', workflow_step: clone(step), reasons: [{ code: 'PLAN_UNAVAILABLE', errors: plan.plan.errors, resolution: plan.plan.resolution }] };
  return { ...common, status: step.purpose === 'review' ? 'review' : 'produce', workflow_step: clone(step), input_artifacts: input, plans: [plan], reasons: missing };
}
