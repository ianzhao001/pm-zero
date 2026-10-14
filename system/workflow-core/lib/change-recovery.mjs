import { readFileSync } from 'node:fs';
import { effectiveVerification } from './evidence-verifier.mjs';
import { definitionFor, isEightStage, stageForType } from './eight-stage.mjs';

const DAG = JSON.parse(readFileSync(new URL('../contracts/artifact-dag.json', import.meta.url), 'utf8'));
const INDEX_REF = Object.freeze({ type: 'index', id: 'changes' });

function gateFor(state, type) {
  return isEightStage(state) ? stageForType(definitionFor(state), type)?.id : DAG.nodes[type]?.gate;
}

function usableArtifact(artifact, modifiedIds) {
  return artifact?.status === 'confirmed' && !modifiedIds.has(artifact.artifact_id)
    && (artifact.type !== 'demo' || effectiveVerification(artifact).status === 'verified');
}

function usableGate(state, gateId, modifiedIds) {
  const gate = state.gates[gateId];
  if (gate?.status !== 'confirmed') return false;
  return gate.artifacts.every(ref => {
    const current = state.artifacts[ref.artifact_id];
    return usableArtifact(current, modifiedIds) && current.version === ref.version && current.sha256 === ref.sha256;
  }) && (gate.review_artifacts ?? (gate.review_artifact_ids ?? []).map(artifact_id => ({ artifact_id })))
    .every(ref => {
      const current = state.artifacts[ref.artifact_id];
      return current?.type === 'review' && current.status !== 'stale'
        && (!ref.version || (current.version === ref.version && current.sha256 === ref.sha256));
    });
}

/** A current-state recovery view, not a new persisted change lifecycle. */
export function changeRecovery(state, modified = []) {
  const modifiedIds = new Set(modified.map(item => item.artifact_id));
  return state.changes.map(record => {
    // Old review IDs remain stale forever after replacement. Completion follows
    // the deliverables and their current gate/review bindings, never those IDs.
    const affected = record.invalidated_artifacts.filter(ref => ref.type !== 'review');
    const pending = affected.filter(ref => {
      const current = state.artifacts[ref.artifact_id];
      return !usableArtifact(current, modifiedIds) || current.version <= ref.version;
    });
    const gates = [...new Set(affected.map(ref => gateFor(state, ref.type)).filter(Boolean))];
    const pendingGates = gates.filter(id => !usableGate(state, id, modifiedIds)
      || pending.some(ref => gateFor(state, ref.type) === id));
    const summary = {
      change_id: record.change.change_id,
      revision: record.revision,
      request: record.change.request.length > 240 ? `${record.change.request.slice(0, 239)}…` : record.change.request,
      ...(record.entry_artifact ? { entry_artifact: structuredClone(record.entry_artifact) } : {}),
      affected_artifact_ids: affected.map(ref => ref.artifact_id),
      pending_artifact_ids: pending.map(ref => ref.artifact_id),
      pending_gates: pendingGates,
      detail_ref: { type: 'change', id: record.change.change_id },
    };
    return { record, summary, pending: pending.length > 0 || pendingGates.length > 0 };
  });
}

export function pendingChangeSummary(state, modified = []) {
  const pending = changeRecovery(state, modified).filter(item => item.pending).reverse();
  return { total: pending.length, items: pending.slice(0, 5).map(item => item.summary), index_ref: { ...INDEX_REF } };
}

export function stageChangeContext(state, stage, modified = []) {
  if (!stage || !isEightStage(state)) return [];
  return changeRecovery(state, modified).filter(item => item.pending && item.summary.pending_gates.includes(stage.id))
    .reverse().map(({ record, summary }) => ({
      change_id: summary.change_id,
      detail_ref: summary.detail_ref,
      change: structuredClone(record.change),
      expected_artifacts: structuredClone(record.expected_artifacts),
      verification_baselines: structuredClone(record.verification_baselines ?? []),
    }));
}
