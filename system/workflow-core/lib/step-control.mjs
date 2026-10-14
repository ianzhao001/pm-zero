import { STEPPED_WORKFLOW_ID, SIX_STAGE_STEPPED_WORKFLOW_ID } from './step-workflow.mjs';
import { currentStage, artifactRef, sameRefs, targetStage, stageIndex } from './eight-stage.mjs';

export const isStepped = state => [STEPPED_WORKFLOW_ID, SIX_STAGE_STEPPED_WORKFLOW_ID].includes(state.workflow?.workflow_id);
export const allSteps = state => state.workflow.definition.stages.flatMap(stage => stage.steps.map(step => ({ ...step, stage_id: stage.id })));
export const findStep = (state, id) => allSteps(state).find(step => step.id === id);
export function stepArtifacts(state, step) {
  return Object.values(state.artifacts).filter(artifact => artifact.execution?.workflow_step_id === step.id && artifact.status !== 'stale');
}
export function stepConfirmed(state, step) {
  const confirmation = state.step_control?.confirmations[step.id];
  if (!confirmation || confirmation.status !== 'confirmed') return false;
  const artifacts = stepArtifacts(state, step);
  return artifacts.length > 0 && artifacts.every(a => a.status === 'confirmed')
    && sameRefs(confirmation.artifacts, artifacts.map(artifactRef));
}
export function nextStep(state) {
  const stage = currentStage(state);
  return stage?.steps.find(step => !stepConfirmed(state, step)) ?? null;
}
export function stepInputs(state, step) {
  return (step.input_types ?? []).map(type => Object.values(state.artifacts).find(a => a.type === type && a.status !== 'stale'));
}
function hasStepOutputs(state, step) {
  const artifacts = stepArtifacts(state, step);
  if (step.purpose !== 'review') return step.outputs.every(type => artifacts.some(a => a.type === type));
  const stage = state.workflow.definition.stages.find(stage => stage.id === step.stage_id);
  return stage.artifacts.every(type => {
    const target = Object.values(state.artifacts).find(a => a.type === type && a.status !== 'stale');
    if (!target) return false;
    return new Set(artifacts.filter(a => a.review && sameRefs([a.review.subject], [artifactRef(target)])).map(a => a.review.reviewer_id)).size >= stage.reviewers;
  });
}
export function stepProgress(state) {
  const current = currentStage(state);
  return {
    template: structuredClone(state.workflow.definition.step_template),
    current_stage: current?.id ?? null,
    active_step_id: state.step_control.active?.workflow_step_id ?? null,
    next_step_id: nextStep(state)?.id ?? null,
    overview_path: '.pm-zero/step-overview.md',
    steps: allSteps(state).map(step => ({
      id: step.id, name: step.name, stage_id: step.stage_id,
      status: stageIndex(state.workflow.definition, step.stage_id) > stageIndex(state.workflow.definition, targetStage(state)) ? 'outside_target' : stepConfirmed(state, step) ? 'confirmed'
        : state.step_control.confirmations[step.id]?.status === 'stale' ? 'stale'
        : state.step_control.active?.workflow_step_id === step.id ? (hasStepOutputs(state, step) ? 'awaiting_confirmation' : stepArtifacts(state, step).length ? 'in_progress' : 'selected') : 'pending',
      artifacts: stepArtifacts(state, step).map(a => ({ ...artifactRef(a), paths: a.files.map(file => file.source_path) })),
    })),
  };
}
export function invalidateStepControl(next, invalidatedIds) {
  if (!isStepped(next)) return;
  const changed = new Set(invalidatedIds);
  for (const confirmation of Object.values(next.step_control.confirmations)) {
    if (confirmation.artifacts.some(ref => changed.has(ref.artifact_id))) confirmation.status = 'stale';
  }
  const active = next.step_control.active;
  if (active && (active.input_artifacts.some(ref => changed.has(ref.artifact_id))
    || Object.values(next.artifacts).some(a => a.execution?.workflow_step_id === active.workflow_step_id && changed.has(a.artifact_id))
    || active.stage_id !== currentStage(next)?.id)) next.step_control.active = null;
}
export function overviewMarkdown(state) {
  const progress = stepProgress(state);
  const lines = ['# 项目步骤总览', '', `Revision: ${state.revision}`, `模板：${progress.template.template_id}`, '', '确认当前产物后仍须单独选择下一步；此文件为可重建视图。', '', '| 阶段 | 步骤 | 状态 | 产物 |', '|---|---|---|---|'];
  for (const step of progress.steps) {
    const links = step.artifacts.flatMap(a => a.paths.map(p => `[${a.artifact_id} v${a.version}](../${encodeURI(p).replace(/[()]/g, c => encodeURIComponent(c).replace('(', '%28').replace(')', '%29'))})`));
    lines.push(`| ${step.stage_id} | ${step.name} | ${step.status} | ${links.join(' · ') || '—'} |`);
  }
  return lines.join('\n') + '\n';
}
