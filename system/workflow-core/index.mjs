import { WorkflowError, fail } from './lib/errors.mjs';
import { toolSchemas } from './lib/schemas.mjs';
import { validateArgs } from './lib/validate.mjs';
import {
  artifactRegister, briefSave, changeApply, changePrepare, decisionRecord,
  gateConfirm, stepSelect, stepConfirm, projectOpen, projectRead, runtimeInfo, stagePrepare,
  projectDiagnose, projectRecoveryPrepare, projectRecoveryApply,
  candidateCreate, candidateRead, candidatePreview, candidateAccept, candidateDiscard,
} from './lib/core.mjs';

const handlers = Object.freeze({
  runtime_info: runtimeInfo,
  stage_prepare: stagePrepare,
  step_select: stepSelect,
  step_confirm: stepConfirm,
  project_open: projectOpen,
  project_read: projectRead,
  project_diagnose: projectDiagnose,
  project_recovery_prepare: projectRecoveryPrepare,
  project_recovery_apply: projectRecoveryApply,
  candidate_create: candidateCreate,
  candidate_read: candidateRead,
  candidate_preview: candidatePreview,
  candidate_accept: candidateAccept,
  candidate_discard: candidateDiscard,
  brief_save: briefSave,
  decision_record: decisionRecord,
  artifact_register: artifactRegister,
  change_prepare: changePrepare,
  change_apply: changeApply,
  gate_confirm: gateConfirm,
});

export async function callTool(name, args) {
  const handler = handlers[name];
  if (!handler) fail('E_TOOL_UNKNOWN', `Unknown workflow-core tool: ${name}`, { known_tools: Object.keys(handlers) });
  validateArgs(name, args, toolSchemas[name]);
  return handler(args);
}

export { toolSchemas, WorkflowError };
