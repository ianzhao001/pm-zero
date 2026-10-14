import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadAssetCatalogs } from '../../shared/demo-assets/lib/catalog.mjs';

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const defaultContractPath = 'system/workflow-core/contracts/product-design-eight-stage-v1.json';
const defaultManifestPath = 'pm-zero.manifest.json';
const defaultStartupBudget = 12000;

const unique = values => [...new Set((values || []).filter(Boolean).map(String))];
const sha256 = value => createHash('sha256').update(value).digest('hex');
const stable = value => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const stableJson = value => JSON.stringify(stable(value));

function readJson(file, label) {
  try {
    const bytes = fs.readFileSync(file);
    return { value: JSON.parse(bytes.toString('utf8')), bytes };
  } catch (error) {
    throw new Error(`invalid JSON in ${label || file}: ${error.message}`);
  }
}

function resolveFile(root, skill, declared) {
  if (typeof declared !== 'string' || !declared || path.isAbsolute(declared) || declared.split(/[\\/]/).includes('..')) {
    throw new Error(`unsafe provider file path: ${declared}`);
  }
  const direct = path.resolve(root, declared);
  const relativeToSkill = path.resolve(root, skill.path || '', declared);
  const absolute = fs.existsSync(direct) ? direct : relativeToSkill;
  const realRoot = fs.realpathSync(root);
  const real = fs.realpathSync(absolute);
  if (!real.startsWith(`${realRoot}${path.sep}`) || !fs.statSync(real).isFile()) throw new Error(`provider file is outside workspace or not a file: ${declared}`);
  return path.relative(realRoot, real).split(path.sep).join('/');
}

function providerFiles(root, skill) {
  const provider = skill.stage_provider;
  const entrypoint = resolveFile(root, skill, provider.entrypoint);
  const requiredFiles = unique([entrypoint, ...(provider.required_files || []).map(file => resolveFile(root, skill, file))]);
  const optionalFiles = Object.fromEntries(Object.entries(provider.optional_files || {}).map(([capability, files]) => [capability,
    unique((files || []).map(file => resolveFile(root, skill, file))).filter(file => !requiredFiles.includes(file))]));
  const assetFiles = unique((provider.asset_files || []).map(file => resolveFile(root, skill, file)));
  if (assetFiles.some(file => requiredFiles.includes(file) || Object.values(optionalFiles).some(files => files.includes(file)))) throw new Error(`provider files cannot be both prompt and asset: ${skill.id}`);
  return { entrypoint, requiredFiles, optionalFiles, assetFiles };
}

function stageContextFiles(root, skill, stageDefinition) {
  const stageId = stageDefinition.id;
  const declaration = skill.stage_context;
  const semanticKeys = declaration?.artifact_stages
    ? unique((stageDefinition.artifacts || []).map(type => declaration.artifact_stages[type])) : [stageId];
  const parts = semanticKeys.map(key => declaration?.stages?.[key]);
  const stage = parts.length && parts.every(Boolean) ? {
    required_files: unique(parts.flatMap(part => part.required_files || [])),
    asset_files: unique(parts.flatMap(part => part.asset_files || [])),
  } : null;
  if (!declaration || !stage) throw new Error(`context ${skill.id} has no stage context loading configuration for ${stageId}`);
  const entrypoint = resolveFile(root, skill, declaration.entrypoint);
  const requiredFiles = unique([entrypoint, ...(stage.required_files || []).map(file => resolveFile(root, skill, file))]);
  const assetFiles = unique((stage.asset_files || []).map(file => resolveFile(root, skill, file)));
  const skillRoot = String(skill.path || '').replace(/\\/g, '/').replace(/\/?$/, '/');
  for (const file of [...requiredFiles, ...assetFiles]) {
    if (!skillRoot || !file.startsWith(skillRoot)) throw new Error(`stage context file must stay inside ${skill.path}: ${file}`);
  }
  const overlap = assetFiles.filter(file => requiredFiles.includes(file));
  if (overlap.length) throw new Error(`stage context files cannot be both prompt and asset: ${overlap.join(', ')}`);
  return { entrypoint, requiredFiles, assetFiles };
}

function parseBindings(values) {
  if (!values) return {};
  if (!Array.isArray(values) && typeof values === 'object') return Object.fromEntries(Object.entries(values).map(([key, value]) => [String(key), String(value)]));
  const bindings = {};
  for (const raw of values) {
    const match = String(raw).match(/^([^=]+)=([^=]+)$/);
    if (!match) throw new Error(`invalid provider binding ${raw}; expected capability=skill-id`);
    if (bindings[match[1]] && bindings[match[1]] !== match[2]) throw new Error(`duplicate provider binding for ${match[1]}`);
    bindings[match[1]] = match[2];
  }
  return bindings;
}

function dependencyStages(contract, stage) {
  const byId = new Map(contract.stages.map(item => [item.id, item]));
  const seen = new Set();
  const visit = id => {
    if (seen.has(id)) return;
    seen.add(id);
    for (const dependency of byId.get(id)?.depends_on_stages || []) visit(dependency);
  };
  for (const id of stage.depends_on_stages || []) visit(id);
  return [...seen].map(id => byId.get(id)).filter(Boolean);
}

function contextCompatible(skill, context) {
  const contexts = skill.stage_provider.contexts;
  if (context === 'none') return skill.kind !== 'context-pack' && (!Array.isArray(contexts) || contexts.includes('none'));
  if (Array.isArray(contexts)) return contexts.includes(context);
  return skill.kind !== 'context-pack';
}

function combinationCompatible(skills, contextSkill) {
  for (let i = 0; i < skills.length; i += 1) {
    for (let j = i + 1; j < skills.length; j += 1) {
      const left = skills[i];
      const right = skills[j];
      if ((left.mutually_exclusive_with || []).includes(right.id) || (right.mutually_exclusive_with || []).includes(left.id)) return false;
      if (!(left.composes_with || []).includes(right.id) || !(right.composes_with || []).includes(left.id)) return false;
    }
  }
  if (!contextSkill) return true;
  return skills.every(skill => skill.id === contextSkill.id || (
    !(skill.mutually_exclusive_with || []).includes(contextSkill.id)
    && !(contextSkill.mutually_exclusive_with || []).includes(skill.id)
    && (skill.composes_with || []).includes(contextSkill.id)
    && (contextSkill.composes_with || []).includes(skill.id)
  ));
}

function chooseProviderSet(candidates, capabilities, bindings, contextSkill) {
  const bySkill = [...new Map(candidates.map(item => [item.skill.id, item])).values()];
  const covers = (selection, capability) => selection.some(item => item.capabilities.includes(capability)
    && (!bindings[capability] || item.skill.id === bindings[capability]));
  for (let size = 1; size <= bySkill.length; size += 1) {
    const matches = [];
    const visit = (start, selected) => {
      if (selected.length === size) {
        if (capabilities.every(capability => covers(selected, capability))
          && combinationCompatible(selected.map(item => item.skill), contextSkill)) matches.push(selected);
        return;
      }
      for (let index = start; index <= bySkill.length - (size - selected.length); index += 1) visit(index + 1, [...selected, bySkill[index]]);
    };
    visit(0, []);
    if (!matches.length) continue;
    const scored = matches.map(items => ({ items, priority: items.reduce((sum, item) => sum + item.priority, 0) }));
    const bestPriority = Math.max(...scored.map(item => item.priority));
    return scored.filter(item => item.priority === bestPriority).map(item => item.items);
  }
  return [];
}

function combinations(values, size) {
  const result = [];
  const visit = (start, selected) => {
    if (selected.length === size) { result.push(selected); return; }
    for (let index = start; index <= values.length - (size - selected.length); index += 1) visit(index + 1, [...selected, values[index]]);
  };
  visit(0, []);
  return result;
}

function chooseWithOptionalFallback(candidates, required, optional, bindings, contextSkill) {
  for (let keepCount = optional.length; keepCount >= 0; keepCount -= 1) {
    const choices = [];
    for (const keptOptional of combinations(optional, keepCount)) {
      for (const items of chooseProviderSet(candidates, [...required, ...keptOptional], bindings, contextSkill)) {
        choices.push({ items, keptOptional, priority: items.reduce((sum, item) => sum + item.priority, 0) });
      }
    }
    if (!choices.length) continue;
    const minimumSkills = Math.min(...choices.map(choice => choice.items.length));
    const shortest = choices.filter(choice => choice.items.length === minimumSkills);
    const bestPriority = Math.max(...shortest.map(choice => choice.priority));
    return shortest.filter(choice => choice.priority === bestPriority);
  }
  return [];
}

function orderProviders(chosen, assignments, dependencies = {}) {
  const providerFor = new Map(assignments.map(item => [item.capability, item.skill_id]));
  const byId = new Map(chosen.map(item => [item.skill.id, item]));
  const incoming = new Map(chosen.map(item => [item.skill.id, new Set()]));
  const outgoing = new Map(chosen.map(item => [item.skill.id, new Set()]));
  for (const assignment of assignments) {
    for (const prerequisite of dependencies[assignment.capability] || []) {
      if (!providerFor.has(prerequisite)) continue;
      const before = providerFor.get(prerequisite);
      const after = assignment.skill_id;
      if (before === after) continue;
      incoming.get(after).add(before);
      outgoing.get(before).add(after);
    }
  }
  const ready = [...incoming].filter(([, parents]) => parents.size === 0).map(([id]) => id).sort();
  const ordered = [];
  while (ready.length) {
    const id = ready.shift();
    ordered.push(byId.get(id));
    for (const child of [...outgoing.get(id)].sort()) {
      incoming.get(child).delete(id);
      if (incoming.get(child).size === 0 && !ready.includes(child)) ready.push(child);
    }
    ready.sort();
  }
  if (ordered.length !== chosen.length) throw new Error('capability_dependencies contain a cycle between selected providers');
  return ordered;
}

function baseResult({ contract, stage, stageContractHash, profile, context, purpose, planVersion, startupBudget, hostCapabilities, requestedCapabilities, inputArtifacts, bindings }) {
  return {
    plan_version: planVersion,
    workflow_id: contract.workflow_id,
    workflow_version: contract.version,
    stage_contract_hash: stageContractHash,
    stage_id: stage?.id || null,
    stage_name: stage?.name || null,
    purpose,
    context,
    active_profile: profile,
    artifacts: stage?.artifacts || [],
    requested_capabilities: requestedCapabilities,
    host_capabilities: hostCapabilities,
    producer_id: 'pm-zero-stage-planner',
    selected_skills: [],
    skill_versions: {},
    capability_assignments: [],
    required_files: [],
    selected_optional_files: [],
    load_steps: [],
    input_artifacts: inputArtifacts,
    outputs: stage?.artifacts || [],
    handoff: null,
    char_budget: stage?.char_budget || null,
    startup_char_budget: startupBudget,
    budget: { startup_char_budget: startupBudget, stage_char_budget: stage?.char_budget || null, step_chars: [], total_chars: 0, status: 'not-evaluated' },
    file_hashes: {},
    file_set_hash: sha256(''),
    plan_id: null,
    plan_hash: null,
    route_id: null,
    optional_budget_status: 'not-applicable',
    resolution: 'route_error',
    missing_capabilities: [],
    provider_conflicts: [],
    warnings: [],
    errors: [],
    execution: { plan_id: null, plan_hash: null, plan_version: planVersion, stage_id: stage?.id || null,
      selection: { context, profile, purpose, capabilities: requestedCapabilities, providers: bindings, host_capabilities: hostCapabilities },
      skills: [], capability_assignments: [], read_receipts: [], input_artifacts: inputArtifacts },
  };
}

/** Resolve one current stage only. It never loads instructions for dependency or future stages. */
export function resolveStagePlan(options = {}) {
  const workspaceRoot = fs.realpathSync(path.resolve(options.root || moduleRoot));
  const contractFile = path.resolve(workspaceRoot, options.contract || defaultContractPath);
  const manifestFile = path.resolve(workspaceRoot, options.manifest || defaultManifestPath);
  const contract = options.definition || readJson(contractFile, path.relative(workspaceRoot, contractFile)).value;
  const { value: manifest } = readJson(manifestFile, path.relative(workspaceRoot, manifestFile));
  const stageId = String(options.stage || '').toUpperCase();
  const originalStage = contract.stages?.find(item => item.id === stageId);
  const hasWorkflowStep = options.workflowStepId !== undefined;
  const workflowStepId = hasWorkflowStep ? String(options.workflowStepId ?? '') : null;
  const workflowStep = hasWorkflowStep ? originalStage?.steps?.find(item => item.id === workflowStepId) : null;
  // Product steps select a narrower capability/output contract. The original
  // definition remains intact so provenance still binds the complete workflow.
  const stage = workflowStep ? { ...originalStage,
    artifacts: workflowStep.outputs,
    required_capabilities: workflowStep.required_capabilities,
    optional_capabilities: workflowStep.optional_capabilities || [],
  } : originalStage;
  const profileId = options.profile || process.env.PM_ZERO_PROFILE || manifest.default_installation_profile || 'pm-zero-agent';
  const context = String(options.context || 'none').toLowerCase();
  const purpose = String(options.purpose || 'production').toLowerCase();
  const requestedPlanVersion = Number(options.planVersion ?? 1);
  const planVersion = Number.isInteger(requestedPlanVersion) && requestedPlanVersion >= 1 ? requestedPlanVersion : 1;
  const startupBudget = Number(options.startupCharBudget ?? defaultStartupBudget);
  const requestedCapabilities = unique(options.capabilities || []).sort();
  const hostCapabilities = unique(options.hostCapabilities || []).sort();
  const inputArtifacts = Array.isArray(options.inputArtifacts) ? options.inputArtifacts.map(item => ({ artifact_id: String(item.artifact_id), version: item.version, sha256: String(item.sha256) })) : [];
  let bindings = {};
  let bindingError = null;
  try { bindings = parseBindings(options.providers); } catch (error) { bindingError = error; }
  bindings = Object.fromEntries(Object.entries(bindings).sort(([left], [right]) => left.localeCompare(right)));
  const result = baseResult({ contract, stage, stageContractHash: sha256(stableJson(contract)), profile: profileId, context, purpose,
    planVersion, startupBudget, hostCapabilities, requestedCapabilities, inputArtifacts, bindings });
  if (hasWorkflowStep) {
    result.workflow_step_id = workflowStepId;
    result.workflow_step = workflowStep ? structuredClone(workflowStep) : null;
    result.execution.workflow_step_id = workflowStepId;
  }

  const skills = manifest.entries?.skills;
  if (!Array.isArray(skills)) throw new Error('manifest entries.skills must be an array');
  const registeredContexts = skills.filter(skill => skill.kind === 'context-pack').map(skill => skill.id);
  const contextSkill = context === 'none' ? null : skills.find(skill => skill.id === context && skill.kind === 'context-pack');
  if (!stage) result.errors.push(`unknown stage ${options.stage || '<missing>'}; expected ${contract.stages.map(item => item.id).join(", ")}`);
  if (hasWorkflowStep && !workflowStep) result.errors.push(`unknown workflow step ${workflowStepId || '<missing>'} for ${stageId}`);
  if (workflowStep && workflowStep.purpose !== purpose) result.errors.push(`workflow step ${workflowStepId} requires purpose ${workflowStep.purpose}`);
  if (context !== 'none' && !contextSkill) result.errors.push(`unknown stage context ${context}; available project contexts: ${registeredContexts.join(', ') || '<none>'}`);
  if (!['production', 'review'].includes(purpose)) result.errors.push(`invalid purpose ${purpose}; expected production or review`);
  if (!Number.isInteger(requestedPlanVersion) || requestedPlanVersion < 1) result.errors.push(`invalid plan version ${options.planVersion}; expected an integer >= 1`);
  if (!Number.isInteger(startupBudget) || startupBudget <= 0 || startupBudget > defaultStartupBudget) {
    result.errors.push(`startup char budget must be an integer between 1 and ${defaultStartupBudget}; the hard limit cannot be raised`);
  }
  if (bindingError) result.errors.push(bindingError.message);
  if (purpose === 'review' && stage && !(stage.reviewers > 0)) result.errors.push(`stage ${stage.id} does not allow independent review`);
  const profiles = manifest.installation_profiles || {};
  const profile = profiles[profileId];
  if (Object.keys(profiles).length && !profile) result.errors.push(`invalid installation profile: ${profileId}`);
  if (result.errors.length) return finalizeBlocked(result, 'invalid_stage_request');

  const optionalCapabilities = new Set(stage.optional_capabilities || []);
  const redundantRequired = requestedCapabilities.filter(capability => (stage.required_capabilities || []).includes(capability));
  if (redundantRequired.length) result.warnings.push(`required capabilities are selected automatically: ${redundantRequired.join(', ')}`);
  const invalidRequested = requestedCapabilities.filter(capability => !optionalCapabilities.has(capability) && !(stage.required_capabilities || []).includes(capability));
  if (invalidRequested.length) result.errors.push(`capabilities are not optional for ${stage.id}: ${invalidRequested.join(', ')}`);

  const productionCapabilities = unique([...(stage.required_capabilities || []), ...requestedCapabilities.filter(capability => optionalCapabilities.has(capability))]);
  const requiredCapabilities = workflowStep ? [...(stage.required_capabilities || [])]
    : purpose === 'review' ? ['independent-review'] : [...(stage.required_capabilities || [])];
  const desiredCapabilities = purpose === 'review' ? requiredCapabilities : productionCapabilities;
  for (const capability of Object.keys(bindings)) if (!desiredCapabilities.includes(capability)) result.errors.push(`provider binding targets capability outside this plan: ${capability}`);
  if (result.errors.length) return finalizeBlocked(result, 'invalid_stage_request');

  const profileSkills = new Set(profile?.skill_ids || skills.map(skill => skill.id));
  let contextFiles = null;
  if (contextSkill && !profileSkills.has(contextSkill.id)) result.errors.push(`context ${context} is outside installation profile ${profileId}`);
  if (contextSkill && !contextSkill.stage_context) result.errors.push(`context ${context} has no registered stage context loading configuration`);
  if (contextSkill && !result.errors.length) {
    try { contextFiles = stageContextFiles(workspaceRoot, contextSkill, originalStage); }
    catch (error) { result.errors.push(error.message); }
  }
  if (result.errors.length) return finalizeBlocked(result, 'invalid_context');

  const dependencyArtifacts = unique(dependencyStages(contract, stage).flatMap(item => item.artifacts || []));
  // Current-stage outputs are legal inputs for later providers in the same
  // capability DAG (for example demo -> browser verification).
  // Providers declare stage-level aliases; intermediate step types supplement
  // those aliases without requiring duplicate registrations of the same skill.
  const availableInputs = new Set([...dependencyArtifacts, ...originalStage.artifacts,
    ...stage.artifacts, ...(workflowStep?.input_types || [])]);
  const candidateRejections = [];
  const candidates = [];
  for (const skill of skills) {
    const provider = skill.stage_provider;
    if (!provider || !Array.isArray(provider.capabilities)) continue;
    const relevant = provider.capabilities.filter(capability => desiredCapabilities.includes(capability));
    if (!relevant.length) continue;
    const reasons = [];
    if (!profileSkills.has(skill.id) || (skill.install_profiles?.length && !skill.install_profiles.includes(profileId))) reasons.push(`outside profile ${profileId}`);
    if (!contextCompatible(skill, context)) reasons.push(`context ${context} not supported`);
    const missingHost = unique(provider.required_host_capabilities || []).filter(capability => !hostCapabilities.includes(capability));
    if (missingHost.length) reasons.push(`missing host capabilities: ${missingHost.join(', ')}`);
    const inputs = unique(provider.inputs || []);
    if (inputs.length && !inputs.some(input => availableInputs.has(input))) reasons.push(`no accepted input artifact is available (accepts: ${inputs.join(', ')})`);
    const outputs = unique(provider.outputs || []);
    if (workflowStep ? !outputs.some(output => (workflowStep.provider_output_types || [workflowStep.provider_output_type]).includes(output))
      : purpose === 'production' && !outputs.some(output => stage.artifacts.includes(output))) reasons.push(`does not produce a ${stage.id} artifact`);
    let files = null;
    if (!reasons.length) {
      try {
        files = providerFiles(workspaceRoot, skill);
        if (contract.scope === 'normal-product-flow') {
          files.requiredFiles = unique(files.requiredFiles.map(file => file === 'system/protocols/staged-product-workflow.md'
            ? resolveFile(workspaceRoot, skill, 'system/protocols/six-stage-product-workflow.md') : file));
        }
      } catch (error) { reasons.push(error.message); }
    }
    if (files) {
      for (const file of unique([...files.requiredFiles, ...Object.values(files.optionalFiles).flat(), ...files.assetFiles])) {
        const owner = skills.find(candidate => candidate.path && file.startsWith(candidate.path));
        if (!owner) continue;
        if (!profileSkills.has(owner.id)) reasons.push(`provider file ${file} belongs to skill outside profile ${profileId}`);
        if (owner.kind === 'context-pack' && owner.id !== context) reasons.push(`provider file ${file} belongs to inactive context ${owner.id}`);
        if ((skill.mutually_exclusive_with || []).includes(owner.id) || (owner.mutually_exclusive_with || []).includes(skill.id)) {
          reasons.push(`provider file ${file} belongs to mutually exclusive skill ${owner.id}`);
        }
      }
    }
    if (reasons.length) candidateRejections.push({ skill_id: skill.id, capabilities: relevant, reasons });
    else candidates.push({ skill, provider, capabilities: relevant, priority: Number(provider.priority || 0), inputs, outputs, files });
  }

  const availableByCapability = new Map(desiredCapabilities.map(capability => [capability, candidates.filter(item => item.capabilities.includes(capability))]));
  for (const [capability, skillId] of Object.entries(bindings)) {
    const match = availableByCapability.get(capability)?.find(item => item.skill.id === skillId);
    if (!match) {
      const rejected = candidateRejections.find(item => item.skill_id === skillId && item.capabilities.includes(capability));
      const message = `explicit provider ${skillId} is unavailable for ${capability}${rejected ? `: ${rejected.reasons.join('; ')}` : ''}`;
      if (requiredCapabilities.includes(capability)) result.errors.push(message);
      else result.warnings.push(message);
    }
  }
  const missingRequired = requiredCapabilities.filter(capability => !(availableByCapability.get(capability) || []).some(item => !bindings[capability] || item.skill.id === bindings[capability]));
  const missingOptional = purpose === 'production' ? requestedCapabilities.filter(capability => optionalCapabilities.has(capability)
    && !(availableByCapability.get(capability) || []).some(item => !bindings[capability] || item.skill.id === bindings[capability])) : [];
  result.missing_capabilities = missingRequired;
  if (missingOptional.length) result.warnings.push(`optional capabilities unavailable and omitted: ${missingOptional.join(', ')}`);
  if (missingRequired.length || result.errors.length) {
    for (const capability of missingRequired) {
      const rejected = candidateRejections.filter(item => item.capabilities.includes(capability));
      result.errors.push(`required capability ${capability} has no eligible provider${rejected.length ? ` (${rejected.map(item => `${item.skill_id}: ${item.reasons.join(', ')}`).join(' | ')})` : ''}`);
    }
    const isBrowserBlock = originalStage.artifacts.includes('demo') && missingRequired.includes('browser-verification');
    return finalizeBlocked(result, isBrowserBlock ? 'blocked' : 'missing_required_capability');
  }

  const availableOptional = purpose === 'production'
    ? requestedCapabilities.filter(capability => optionalCapabilities.has(capability) && !missingOptional.includes(capability)) : [];
  const providerChoices = chooseWithOptionalFallback(candidates, requiredCapabilities, availableOptional, bindings, contextSkill);
  if (!providerChoices.length) {
    result.errors.push(`no compatible provider combination covers: ${requiredCapabilities.join(', ')}`);
    return finalizeBlocked(result, originalStage.artifacts.includes('demo') && requiredCapabilities.includes('browser-verification') ? 'blocked' : 'missing_required_capability');
  }
  if (providerChoices.length > 1) {
    result.provider_conflicts = providerChoices.map(choice => ({ skill_ids: choice.items.map(item => item.skill.id).sort(), optional_capabilities: choice.keptOptional }));
    result.errors.push(`provider conflict: equal minimum provider sets at the same priority (${result.provider_conflicts.map(item => `${item.skill_ids.join('+')}[${item.optional_capabilities.join(',')}]`).join(' | ')})`);
    return finalizeBlocked(result, 'provider_conflict');
  }
  const chosenOptional = providerChoices[0].keptOptional;
  const incompatibleOptional = availableOptional.filter(capability => !chosenOptional.includes(capability));
  if (incompatibleOptional.length) result.warnings.push(`optional capabilities could not compose with required providers and were omitted: ${incompatibleOptional.join(', ')}`);
  const targetCapabilities = [...requiredCapabilities, ...chosenOptional];
  let chosen = providerChoices[0].items;
  const assignments = [];
  for (const capability of targetCapabilities) {
    const eligible = chosen.filter(item => item.capabilities.includes(capability) && (!bindings[capability] || item.skill.id === bindings[capability]));
    const bestPriority = Math.max(...eligible.map(item => item.priority));
    const best = eligible.filter(item => item.priority === bestPriority);
    if (best.length > 1) {
      result.provider_conflicts.push({ capability, skill_ids: best.map(item => item.skill.id) });
      result.errors.push(`provider conflict for ${capability}: ${best.map(item => item.skill.id).join(', ')} have equal priority ${bestPriority}`);
      continue;
    }
    assignments.push({ capability, skill_id: best[0].skill.id, producer_id: best[0].skill.id,
      required: requiredCapabilities.includes(capability), priority: bestPriority,
      reason: bindings[capability] ? 'explicit-provider-binding' : 'minimum-skill-cover-then-priority',
      inputs: best[0].inputs, outputs: best[0].outputs });
  }
  if (result.errors.length) return finalizeBlocked(result, 'provider_conflict');

  try { chosen = orderProviders(chosen, assignments, stage.capability_dependencies || {}); }
  catch (error) { result.errors.push(error.message); return finalizeBlocked(result, 'provider_dependency_error'); }

  const assignedBySkill = new Map(chosen.map(item => [item.skill.id, assignments.filter(assignment => assignment.skill_id === item.skill.id).map(assignment => assignment.capability)]));
  const providerLoadSteps = chosen.map((item, index) => {
    const assigned = assignedBySkill.get(item.skill.id) || [];
    const selectedOptional = unique(assigned.flatMap(capability => item.files.optionalFiles[capability] || []));
    const files = unique([...item.files.requiredFiles, ...selectedOptional, ...item.files.assetFiles]);
    const fileMetadata = Object.fromEntries(files.map(file => {
      const bytes = fs.readFileSync(path.join(workspaceRoot, file));
      if (item.files.assetFiles.includes(file)) return [file, { sha256: sha256(bytes), chars: 0, bytes: bytes.length, kind: 'asset', reasons: [`stage-provider:${item.skill.id}:asset`] }];
      const optionalReasons = assigned.filter(capability => (item.files.optionalFiles[capability] || []).includes(file));
      return [file, { sha256: sha256(bytes), chars: bytes.toString('utf8').length,
        reasons: optionalReasons.length ? optionalReasons.map(capability => `capability:${capability}:optional`) : [`stage-provider:${item.skill.id}:required`] }];
    }));
    return { skill: item.skill.id, skill_version: String(item.skill.version), capabilities: assigned,
      after: index === 0 ? (contextSkill?.id || null) : chosen[index - 1].skill.id,
      session_scope: purpose === 'review' ? 'isolated-review-session' : (chosen.length > 1 || contextSkill ? 'shared-stage-session' : 'single-step'),
      required_files: item.files.requiredFiles, selected_optional_files: selectedOptional, asset_files: item.files.assetFiles,
      retained_context_files: [], retained_required_files: [], file_metadata: fileMetadata };
  });
  const contextLoadSteps = contextSkill ? [{
    skill: contextSkill.id,
    skill_version: String(contextSkill.version),
    capabilities: [],
    after: null,
    session_scope: purpose === 'review' ? 'isolated-review-session' : 'shared-stage-session',
    required_files: contextFiles.requiredFiles,
    selected_optional_files: [],
    asset_files: contextFiles.assetFiles,
    retained_context_files: [],
    retained_required_files: [],
    file_metadata: Object.fromEntries([...contextFiles.requiredFiles, ...contextFiles.assetFiles].map(file => {
      const bytes = fs.readFileSync(path.join(workspaceRoot, file));
      const isAsset = contextFiles.assetFiles.includes(file);
      return [file, { sha256: sha256(bytes), chars: isAsset ? 0 : bytes.toString('utf8').length, bytes: bytes.length,
        kind: isAsset ? 'asset' : 'instruction', reasons: [`stage-context:${contextSkill.id}:${stage.id}:${isAsset ? 'asset' : 'required'}`] }];
    })),
  }] : [];
  if (originalStage.artifacts.some(type => ['visual_design', 'demo'].includes(type)) && manifest.asset_catalogs?.length) {
    let registeredAssets;
    let registeredCatalogs;
    try {
      const inventory = loadAssetCatalogs({ root: workspaceRoot, manifest, context });
      registeredAssets = inventory.entries;
      registeredCatalogs = inventory.catalogs;
    }
    catch (error) { result.errors.push(error.message); return finalizeBlocked(result, 'invalid_asset_catalog'); }
    const assetSteps = providerLoadSteps.filter(step => originalStage.artifacts.includes('demo')
      ? step.capabilities.some(capability => ['demo-implementation', 'browser-verification', 'independent-review'].includes(capability))
      : step.capabilities.some(capability => ['interface-visual-design', 'independent-review'].includes(capability)));
    for (const assetStep of assetSteps) {
      assetStep.asset_files = unique([...assetStep.asset_files, ...registeredAssets.map(asset => asset.relativePath)]);
      for (const catalog of registeredCatalogs) {
        const catalogBytes = fs.readFileSync(path.join(workspaceRoot, catalog.catalog_path));
        assetStep.asset_files = unique([...assetStep.asset_files, catalog.catalog_path]);
        assetStep.file_metadata[catalog.catalog_path] = { sha256: catalog.catalog_sha256, chars: 0, bytes: catalogBytes.length,
          kind: 'asset', catalog_id: catalog.id, catalog_version: catalog.version, origin: 'preset',
          reasons: [`asset-catalog:${catalog.id}:${stage.id}:index`] };
        const sample = catalog.sample_data;
        if (!sample) continue;
        assetStep.asset_files = unique([...assetStep.asset_files, sample.relativePath]);
        assetStep.file_metadata[sample.relativePath] = { sha256: sample.sha256, chars: 0, bytes: sample.bytes,
          kind: 'asset', catalog_id: catalog.id, catalog_version: catalog.version, origin: 'preset',
          reasons: [`asset-catalog:${catalog.id}:${stage.id}:sample-data`] };
      }
      for (const asset of registeredAssets) assetStep.file_metadata[asset.relativePath] = {
        sha256: asset.sha256, chars: 0, bytes: asset.bytes, kind: 'asset', asset_id: asset.id,
        catalog_id: asset.catalog_id, catalog_version: asset.catalog_version, origin: 'preset',
        source: asset.source, relevance: asset.tags.join(', ') || 'registered demo asset',
        reasons: [`asset-catalog:${asset.catalog_id}:${stage.id}`],
      };
    }
  }
  if (originalStage.artifacts.includes('demo')) {
    const browserStep = providerLoadSteps.find(step => step.capabilities.includes('browser-verification'));
    if (browserStep) {
      browserStep.session_scope = 'isolated-verification-session';
      if (contextSkill) {
        browserStep.retained_context_files = [...contextFiles.requiredFiles];
        browserStep.asset_files = unique([...browserStep.asset_files, ...contextFiles.assetFiles]);
        browserStep.file_metadata = { ...contextLoadSteps[0].file_metadata, ...browserStep.file_metadata };
      }
    }
  }
  const loadSteps = [...contextLoadSteps, ...providerLoadSteps];
  const stepPromptFiles = step => unique([
    ...step.required_files,
    ...step.selected_optional_files,
    ...step.retained_context_files,
    ...(step.retained_required_files || []),
  ]);
  const stepChars = loadSteps.map(step => stepPromptFiles(step).reduce((sum, file) => sum + step.file_metadata[file].chars, 0));
  const promptFiles = unique(loadSteps.flatMap(stepPromptFiles));
  const assetFiles = unique(loadSteps.flatMap(step => step.asset_files || []));
  const totalFiles = unique([...promptFiles, ...assetFiles]);
  const filesBySession = new Map();
  for (const step of loadSteps) {
    if (!filesBySession.has(step.session_scope)) filesBySession.set(step.session_scope, new Set());
    for (const file of stepPromptFiles(step)) filesBySession.get(step.session_scope).add(file);
  }
  const totalChars = [...filesBySession.values()].reduce((sum, files) => sum + [...files].reduce((sessionSum, file) =>
    sessionSum + (loadSteps.find(step => step.file_metadata[file])?.file_metadata[file].chars || 0), 0), 0);
  const assetBytes = assetFiles.reduce((sum, file) => sum + (loadSteps.find(step => step.file_metadata[file])?.file_metadata[file].bytes || 0), 0);
  const overSteps = stepChars.flatMap((chars, index) => chars > startupBudget ? [{ step: index, skill: loadSteps[index].skill, chars, budget: startupBudget }] : []);
  if (overSteps.length) result.errors.push(...overSteps.map(item => `step ${item.step} (${item.skill}) exceeds startup char budget: ${item.chars} > ${item.budget}`));
  if (totalChars > stage.char_budget) result.errors.push(`stage ${stage.id} exceeds char budget: ${totalChars} > ${stage.char_budget}`);

  result.capability_assignments = assignments;
  result.selected_skills = chosen.map(item => ({ skill_id: item.skill.id, version: String(item.skill.version), priority: item.priority,
    capabilities: assignedBySkill.get(item.skill.id) || [], inputs: item.inputs, outputs: item.outputs }));
  result.skill_versions = Object.fromEntries(result.selected_skills.map(item => [item.skill_id, item.version]));
  result.required_files = unique(loadSteps.flatMap(step => step.required_files));
  result.selected_optional_files = unique(loadSteps.flatMap(step => step.selected_optional_files));
  result.file_hashes = Object.fromEntries(totalFiles.sort().map(file => [file, loadSteps.find(step => step.file_metadata[file]).file_metadata[file].sha256]));
  result.file_set_hash = sha256(stableJson(result.file_hashes));
  result.budget = { startup_char_budget: startupBudget, stage_char_budget: stage.char_budget, step_chars: stepChars, total_chars: totalChars,
    asset_bytes: assetBytes,
    status: result.errors.length ? 'fail' : 'pass' };
  result.optional_budget_status = result.errors.length ? 'fail' : 'pass';
  result.handoff = { depends_on_stages: stage.depends_on_stages || [],
    input_artifact_types: workflowStep ? workflowStep.input_types : purpose === 'review' ? stage.artifacts : dependencyArtifacts,
    input_artifacts: inputArtifacts, output_artifact_types: stage.artifacts,
    next_stage_ids: contract.stages.filter(item => (item.depends_on_stages || []).includes(stage.id)).map(item => item.id) };
  result.execution.skills = [
    ...(contextSkill ? [{ skill_id: contextSkill.id, version: String(contextSkill.version) }] : []),
    ...result.selected_skills.map(({ skill_id, version }) => ({ skill_id, version })),
  ];
  result.execution.capability_assignments = assignments.map(({ capability, skill_id }) => ({ capability, skill_id }));
  return finalizePlan(result, result.errors.length ? 'budget_exceeded' : 'routed_stage', result.errors.length ? [] : loadSteps);
}

function finalizeBlocked(result, resolution) {
  result.optional_budget_status = result.budget.status === 'fail' ? 'fail' : 'not-applicable';
  return finalizePlan(result, resolution, []);
}

function finalizePlan(result, resolution, loadSteps) {
  result.resolution = resolution;
  result.load_steps = loadSteps;
  const payload = { ...result, plan_id: undefined, plan_hash: undefined, route_id: undefined,
    execution: { ...result.execution, plan_id: undefined, plan_hash: undefined } };
  result.plan_hash = sha256(stableJson(payload));
  result.plan_id = `stage-plan-${result.plan_hash.slice(0, 16)}`;
  result.route_id = result.plan_id;
  result.execution.plan_id = result.plan_id;
  result.execution.plan_hash = result.plan_hash;
  return result;
}

export function compactStagePlan(result) {
  return { ...result,
    load_steps: result.load_steps.map(({ file_metadata, ...step }) => step),
    file_hashes: undefined };
}
