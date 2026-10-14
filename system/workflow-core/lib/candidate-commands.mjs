import path from 'node:path';
import { fail } from './errors.mjs';
import { artifactRef, sameRefs, isEightStage, stageForType, definitionFor, validateStaticCaptured } from './eight-stage.mjs';
import { isStepped, allSteps } from './step-control.mjs';
import { makeCandidateManifest, materializeCandidateWorkspace, scanCandidateWorkspace, assertCandidateTargets } from './candidate-workspace.mjs';
import { transactionalWriteSource } from './project-store.mjs';

// Storage and workflow rules remain owned by their existing modules. Commands
// compose those rules; candidate copies never become a second source of state.
export function createCandidateCommands(hooks) {
  const { mutate, resolveProject, loadState, digest, prepareChange, applyChangeOperation,
    writeCanonicalRecord, snapshotCapturedFiles, aggregateArtifactHash, newArtifactRecord,
    writeArtifactMetadata, replaceArtifact, publicArtifact, assertUserResponse,
    validateDesignModel, validateStepContent, detectModifiedConfirmed } = hooks;
  const clone = value => structuredClone(value);
  const reservedPaths = (state, artifactId) => Object.values(state.artifacts)
    .filter(item => item.artifact_id !== artifactId)
    .flatMap(item => item.files.map(file => file.source_path)).filter(file => !file.startsWith('.pm-zero/'));
  function getCandidate(state, id, active = false) {
    const candidate = state.candidates?.find(item => item.candidate_id === id);
    if (!candidate) fail('E_CANDIDATE_NOT_FOUND', 'Candidate was not found', { candidate_id: id });
    if (active && candidate.status !== 'active') fail('E_CANDIDATE_CLOSED', 'Candidate is already accepted or discarded', { status: candidate.status });
    return candidate;
  }
  function assertBaseline(state, candidate) {
    const entry = state.artifacts[candidate.manifest.entry_artifact.artifact_id];
    if (state.revision !== candidate.manifest.baseline_revision || entry?.status !== 'confirmed'
      || !sameRefs([artifactRef(entry)], [candidate.manifest.entry_artifact])) {
      fail('E_CANDIDATE_BASELINE_STALE', 'Formal state changed; retain this copy, discard it and create a candidate from the latest confirmed version', {
        baseline_revision: candidate.manifest.baseline_revision, actual_revision: state.revision,
        workspace_path: candidate.manifest.workspace_path,
      });
    }
    return entry;
  }
  async function preview(project, state, args, includeBytes = false) {
    const candidate = getCandidate(state, args.candidate_id, true);
    const entry = assertBaseline(state, candidate);
    if (!args.change.entry_artifact || !sameRefs([artifactRef(entry)], [args.change.entry_artifact])) {
      fail('E_CANDIDATE_CHANGE_MISMATCH', 'The change must name the candidate baseline artifact');
    }
    const modified = await detectModifiedConfirmed(project, state);
    if (modified.length) fail('E_CONFIRMED_ARTIFACT_MODIFIED', 'Confirmed sources changed outside the workflow', { modified });
    const scan = await scanCandidateWorkspace(project, candidate.manifest, { include_bytes: includeBytes });
    if (!scan.files.length) fail('E_CANDIDATE_EMPTY', 'A candidate must retain at least one artifact file');
    if (!scan.differences.length) fail('E_CANDIDATE_UNCHANGED', 'Candidate has no file changes to accept');
    await assertCandidateTargets(project, candidate.manifest, scan, { reserved_paths: reservedPaths(state, entry.artifact_id) });
    const impact = prepareChange(state, args.change, args.expected_artifacts);
    if (!impact.invalidated_artifacts.some(item => item.artifact_id === entry.artifact_id)) {
      fail('E_CANDIDATE_CHANGE_MISMATCH', 'Change impact must include the candidate artifact');
    }
    const result = {
      project_id: state.project_id, revision: state.revision, candidate_id: candidate.candidate_id,
      baseline_hash: candidate.manifest.baseline_hash, content_hash: scan.content_hash,
      files: scan.files.map(({ bytes, ...file }) => file), differences: scan.differences,
      summary: scan.summary, impact, verification_status: 'pending',
      next_action: 'Explicitly accept the entire candidate or continue editing. Acceptance does not confirm an artifact or select a step.',
    };
    return { candidate, entry, scan, result: { ...result, preview_hash: digest(result) } };
  }
  async function candidateCreate(args) {
    return mutate(args.project_path, 'candidate_create', args, async (project, state, next) => {
      if ((state.candidates ?? []).some(item => item.status === 'active')) fail('E_CANDIDATE_ACTIVE', 'Finish or discard the active candidate first');
      if ((state.candidates ?? []).some(item => item.candidate_id === args.candidate_id)) fail('E_CANDIDATE_EXISTS', 'Candidate IDs cannot be reused');
      const entry = state.artifacts[args.artifact.artifact_id];
      if (!entry || entry.status !== 'confirmed' || entry.type === 'review' || entry.type === 'brief'
        || !sameRefs([artifactRef(entry)], [args.artifact])) fail('E_CANDIDATE_BASELINE_REQUIRED', 'Select an exact confirmed deliverable version with external source files');
      const manifest = makeCandidateManifest({ candidate_id: args.candidate_id, artifact: entry,
        baseline_revision: state.revision + 1, source_root: args.source_root, reserved_paths: reservedPaths(state, entry.artifact_id) });
      await materializeCandidateWorkspace(project, manifest);
      const candidate = { candidate_id: args.candidate_id, status: 'active', manifest, revision: state.revision + 1 };
      await writeCanonicalRecord(project, 'candidate-records', `${args.candidate_id}-created.md`, 'candidate', candidate);
      next.candidates ??= [];
      next.candidates.push(candidate);
      next.audit.push({ action: 'candidate_created', candidate_id: args.candidate_id, revision: state.revision + 1 });
      return { candidate: clone(candidate), workspace_path: manifest.workspace_path };
    });
  }
  async function candidateRead(args) {
    const project = await resolveProject(args.project_path), state = await loadState(project);
    const describe = item => ({ ...clone(item), baseline_current: item.status === 'active' && state.revision === item.manifest.baseline_revision });
    return { project_id: state.project_id, revision: state.revision,
      ...(args.candidate_id ? { candidate: describe(getCandidate(state, args.candidate_id)) }
        : { candidates: (state.candidates ?? []).map(describe) }) };
  }
  async function candidatePreview(args) {
    const project = await resolveProject(args.project_path), state = await loadState(project);
    return (await preview(project, state, args)).result;
  }
  async function candidateDiscard(args) {
    return mutate(args.project_path, 'candidate_discard', args, async (project, state, next) => {
      assertUserResponse(args.user_response);
      const candidate = getCandidate(next, args.candidate_id, true);
      candidate.record_history = [...(candidate.record_history ?? []), clone(candidate.canonical)];
      candidate.status = 'discarded';
      candidate.closed_revision = state.revision + 1;
      candidate.user_response = clone(args.user_response);
      await writeCanonicalRecord(project, 'candidate-records', `${args.candidate_id}-discarded.md`, 'candidate', candidate);
      next.audit.push({ action: 'candidate_discarded', candidate_id: args.candidate_id, revision: state.revision + 1 });
      return { candidate: clone(candidate), files_preserved: true };
    });
  }
  async function candidateAccept(args) {
    return mutate(args.project_path, 'candidate_accept', args, async (project, state, next) => {
      assertUserResponse(args.user_response);
      const { candidate, entry, scan, result } = await preview(project, state, args, true);
      if (result.preview_hash !== args.preview_hash) fail('E_CANDIDATE_PREVIEW_MISMATCH', 'Candidate bytes, baseline or approved impact changed; inspect a new preview');
      const names = new Set();
      const captured = scan.files.map((file, index) => {
        let filename = path.basename(file.source_path);
        while (names.has(filename)) filename = `${index}-${filename}`;
        names.add(filename);
        return { input: { path: file.source_path, ...(file.role ? { role: file.role } : {}) }, filename,
          bytes: file.bytes, sha256: file.sha256, size: file.size };
      });
      const step = isStepped(state) ? allSteps(state).find(item => item.outputs.includes(entry.type)) : null;
      if (step) validateStepContent(step, entry.type, captured);
      if (isEightStage(state)) validateStaticCaptured(definitionFor(state), stageForType(definitionFor(state), entry.type), captured);
      const designIds = entry.type === 'design_model' ? validateDesignModel(captured) : undefined;
      // Apply the same frozen impact rules as a normal approved change, inside
      // the same transaction as source publication and version registration.
      const applied = await applyChangeOperation(project, state, next, { ...args, preview_hash: result.impact.preview_hash });
      for (const file of scan.files) {
        const before = candidate.manifest.files.find(item => item.source_path === file.source_path);
        if (before?.sha256 !== file.sha256) await transactionalWriteSource(project, file.source_path, file.bytes, {
          expected_before: before ? { kind: 'file', sha256: before.sha256, size: before.size } : { kind: 'absent' },
        });
      }
      for (const file of scan.differences.filter(item => item.change === 'deleted')) await transactionalWriteSource(project, file.path, null, {
        expected_before: { kind: 'file', sha256: file.before_sha256, size: file.before_size },
      });
      const files = await snapshotCapturedFiles(project, entry.artifact_id, entry.version + 1, captured);
      const artifact = newArtifactRecord({ artifactId: entry.artifact_id, type: entry.type, version: entry.version + 1,
        sha: aggregateArtifactHash(files), files, dependencies: entry.dependencies, metadata: entry.metadata,
        producerId: args.producer_id, changeId: args.change.change_id, designIds,
        ...(entry.type === 'demo' ? { verification: { status: 'pending', reason: 'Accepted external candidate requires fresh render mapping and execution evidence.' } } : {}) });
      artifact.candidate_import = { candidate_id: candidate.candidate_id, status: 'pending_validation',
        baseline: artifactRef(entry), content_hash: scan.content_hash,
        ...(step ? { workflow_step_id: step.id } : {}),
        next_action: 'Manually select the affected step when applicable; use artifact_register with fresh execution provenance and validation evidence before confirmation.' };
      await writeArtifactMetadata(project, artifact);
      replaceArtifact(next, artifact);
      const accepted = getCandidate(next, args.candidate_id, true);
      accepted.record_history = [...(accepted.record_history ?? []), clone(accepted.canonical)];
      Object.assign(accepted, { status: 'accepted', closed_revision: state.revision + 1, user_response: clone(args.user_response),
        accepted_preview: result, accepted_artifact: artifactRef(artifact) });
      await writeCanonicalRecord(project, 'candidate-records', `${args.candidate_id}-accepted.md`, 'candidate', accepted);
      next.audit.push({ action: 'candidate_accepted', candidate_id: args.candidate_id, preview_hash: args.preview_hash,
        artifact: artifactRef(artifact), revision: state.revision + 1, user_response: clone(args.user_response) });
      return { candidate: clone(accepted), artifact: publicArtifact(artifact), change: applied,
        next_action: artifact.candidate_import.next_action };
    });
  }
  return { candidateCreate, candidateRead, candidatePreview, candidateAccept, candidateDiscard };
}
