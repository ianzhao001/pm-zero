import { STEPPED_WORKFLOW_ID, SIX_STAGE_STEPPED_WORKFLOW_ID } from './step-workflow.mjs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fail } from './errors.mjs';

export const EIGHT_STAGE_WORKFLOW_ID = 'product-design-eight-stage-v1';
export const EIGHT_STAGE_DEFINITION = Object.freeze(JSON.parse(
  readFileSync(new URL('../contracts/product-design-eight-stage-v1.json', import.meta.url), 'utf8'),
));

export const SIX_STAGE_WORKFLOW_ID = 'product-design-six-stage-v1';
export const SIX_STAGE_DEFINITION = Object.freeze(JSON.parse(
  readFileSync(new URL('../contracts/product-design-six-stage-v1.json', import.meta.url), 'utf8'),
));

// Historical export name retained for consumers; all product-stage workflows use
// their immutable definition rather than stage-number semantics.
export function isEightStage(state) {
  return [EIGHT_STAGE_WORKFLOW_ID, STEPPED_WORKFLOW_ID, SIX_STAGE_WORKFLOW_ID, SIX_STAGE_STEPPED_WORKFLOW_ID].includes(state.workflow?.workflow_id);
}

export function definitionFor(state) {
  return isEightStage(state) ? state.workflow.definition : null;
}

export function stageForType(definition, type) {
  return definition.stages.find((stage) => stage.artifacts.includes(type) || stage.steps?.some(step => step.purpose !== 'review' && step.outputs.includes(type)));
}

export function stageIndex(definition, stageId) {
  return definition.stages.findIndex((stage) => stage.id === stageId);
}

export function targetStage(state) {
  return state.workflow.target_stage ?? state.workflow.definition.default_target_stage;
}

export function currentStage(state) {
  const definition = definitionFor(state);
  if (!definition) return null;
  const targetIndex = stageIndex(definition, targetStage(state));
  for (let index = 0; index <= targetIndex; index += 1) {
    const stage = definition.stages[index];
    if (state.gates[stage.id]?.status !== 'confirmed') return stage;
  }
  return null;
}

export function artifactRef(artifact) {
  return { artifact_id: artifact.artifact_id, version: artifact.version, sha256: artifact.sha256 };
}

export function sameRefs(left, right) {
  const normalized = (refs) => refs.map((ref) => `${ref.artifact_id}:${ref.version}:${ref.sha256}`).sort();
  return JSON.stringify(normalized(left)) === JSON.stringify(normalized(right));
}

export function expectedDependencies(state, type) {
  const definition = definitionFor(state);
  return (definition.artifact_dependencies[type] ?? []).map((dependencyType) => {
    const artifact = Object.values(state.artifacts).find((item) => item.type === dependencyType);
    if (!artifact || artifact.status === 'stale') {
      fail('E_DEPENDENCY_INVALID', 'Required workflow dependency is missing or stale', { type, dependency_type: dependencyType });
    }
    return artifactRef(artifact);
  });
}

export function downstreamTypes(definition, entryType) {
  const reverse = new Map();
  for (const [type, dependencies] of Object.entries(definition.artifact_dependencies)) {
    for (const dependency of dependencies) {
      const children = reverse.get(dependency) ?? [];
      children.push(type);
      reverse.set(dependency, children);
    }
  }
  const seen = new Set([entryType]);
  const queue = [entryType];
  while (queue.length) {
    const current = queue.shift();
    for (const child of reverse.get(current) ?? []) {
      if (seen.has(child)) continue;
      seen.add(child);
      queue.push(child);
    }
  }
  return [...new Set(definition.stages.flatMap(stage => [...stage.artifacts, ...(stage.steps ?? []).filter(step => step.purpose !== 'review').flatMap(step => step.outputs)]))].filter(type => seen.has(type));
}

export function dependencyClosure(state, entryArtifact) {
  const seen = new Map();
  const visit = (artifact) => {
    if (seen.has(artifact.artifact_id)) return;
    seen.set(artifact.artifact_id, artifactRef(artifact));
    for (const dependency of artifact.dependencies ?? []) {
      const exact = (state.artifact_history[dependency.artifact_id] ?? []).find(
        (candidate) => candidate.version === dependency.version && candidate.sha256 === dependency.sha256,
      );
      if (exact) visit(exact);
    }
  };
  visit(entryArtifact);
  return [...seen.values()].sort((a, b) => a.artifact_id.localeCompare(b.artifact_id));
}

export function validateStaticCaptured(definition, stage, captured) {
  if (!stage.static_only) return;
  const allowed = new Set(definition.static_extensions);
  for (const item of captured) {
    const extension = path.extname(item.filename).toLowerCase();
    if (!allowed.has(extension)) {
      fail('E_STATIC_ARTIFACT_REQUIRED', `${stage.id} accepts only static document, JSON, or image files`, { filename: item.filename, extension });
    }
    if (extension === '.json') {
      try { JSON.parse(item.bytes.toString('utf8')); } catch {
        fail('E_STATIC_ARTIFACT_INVALID', 'Static JSON artifact is not valid JSON', { filename: item.filename });
      }
    }
    if (extension === '.png' && !item.bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) {
      fail('E_STATIC_ARTIFACT_INVALID', 'PNG extension does not match file content', { filename: item.filename });
    }
    if (['.jpg', '.jpeg'].includes(extension) && !item.bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))) {
      fail('E_STATIC_ARTIFACT_INVALID', 'JPEG extension does not match file content', { filename: item.filename });
    }
    if (extension === '.webp' && !(item.bytes.subarray(0, 4).toString('ascii') === 'RIFF' && item.bytes.subarray(8, 12).toString('ascii') === 'WEBP')) {
      fail('E_STATIC_ARTIFACT_INVALID', 'WebP extension does not match file content', { filename: item.filename });
    }
    if (extension === '.md') {
      const text = item.bytes.toString('utf8');
      const executable = /<(?:script|iframe|object|embed|form|input|button|select|textarea|video|audio|details|dialog)\b|\son[a-z]+\s*=|(?:href|src)\s*=\s*["']javascript:/i;
      if (executable.test(text)) fail('E_STATIC_ARTIFACT_INVALID', 'Markdown cannot embed executable HTML, controls, event handlers, or javascript links', { filename: item.filename });
    }
    if (extension === '.svg') {
      const text = item.bytes.toString('utf8');
      const unsafe = /<!DOCTYPE\b|<!ENTITY\b|<script\b|<foreignObject\b|<a\b|\son[a-z]+\s*=|(?:href|src)\s*=|url\s*\(|<animate(?:Motion|Transform)?\b|<set\b/i;
      if (unsafe.test(text)) {
        fail('E_STATIC_ARTIFACT_INVALID', 'Static SVG cannot contain scripts, event handlers, animation, interactive foreign content, or external resources', { filename: item.filename });
      }
    }
  }
}

export function validateElementTargets(state, change, entryArtifact) {
  const definition = definitionFor(state);
  const modelStage = stageForType(definition, 'design_model');
  const entryStage = stageForType(definition, entryArtifact.type);
  const beforeModel = stageIndex(definition, entryStage.id) < stageIndex(definition, modelStage.id);
  if (change.scope === 'artifact') {
    if (change.target_ids.length !== 0 || change.preserve_ids.length !== 0) {
      fail('E_CHANGE_SCOPE_INVALID', 'Artifact-scoped changes require empty target_ids and preserve_ids', { entry_type: entryArtifact.type });
    }
    return;
  }
  if (beforeModel) {
    if (change.scope !== 'artifact') {
      fail('E_CHANGE_SCOPE_INVALID', 'Artifacts before the design model require artifact scope with an empty target_ids list', { entry_type: entryArtifact.type });
    }
    return;
  }
  if (change.scope !== 'elements' || change.target_ids.length === 0) {
    fail('E_CHANGE_SCOPE_INVALID', 'Design-model and downstream changes require elements scope and target_ids', { entry_type: entryArtifact.type });
  }
  const model = Object.values(state.artifacts).find((artifact) => artifact.type === 'design_model' && artifact.status !== 'stale');
  if (!model?.design_ids) fail('E_CHANGE_SCOPE_INVALID', 'A current design model is required to validate element targets');
  const valid = new Set(model.design_ids);
  const invalid = [...change.target_ids, ...change.preserve_ids].filter((id) => !valid.has(id));
  if (invalid.length) fail('E_CHANGE_SCOPE_INVALID', 'target_ids must name current design-model screen or element IDs', { invalid_ids: invalid });
  const overlap = change.target_ids.filter((id) => change.preserve_ids.includes(id));
  if (overlap.length) fail('E_CHANGE_SCOPE_INVALID', 'target_ids and preserve_ids must not overlap', { overlap });
}
