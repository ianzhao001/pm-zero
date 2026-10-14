// Keep host-visible behavior alongside the transport, without changing core contracts.
// An unknown tool must receive an explicit description before it can be advertised.
export const toolMetadata = Object.freeze({
  runtime_info: {
    description: 'Read this installed package identity, workflows, templates, contexts and capabilities. Default summary; request detail: full only for stage definitions and provider mappings. Does not inspect projects, verify inventory, write files or record confirmation.',
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  stage_prepare: {
    description: 'Plan the current project stage or selected product step at expected_revision. Read-only: returns plans, blockers or a waiting status; never executes a plan, selects a step or confirms an output. Declare only actual host capabilities. On revision conflict read the current state and prepare again.',
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  project_open: {
    description: 'Create or reopen an absolute user-selected project directory. New projects default to the six-stage standard workflow; explicitly select six-stage-stepped and a template only when the user requests finer steps. Creation freezes workflow/template/context; existing projects keep their snapshot. Opening never selects a step or confirms a stage.',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  project_read: {
    description: 'Read compact, resume or detail project state and rebuild disposable derived caches/overviews from canonical commits. This operation writes derived files; use project_diagnose for a physically read-only inspection. Does not change canonical revisions, produce artifacts, select steps or record user acceptance.',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  project_diagnose: {
    description: 'Inspect project readability, planning availability and writability, current locks, interrupted transactions and canonical/source integrity. Physically read-only: returns issues, store diagnostics and a resume summary when readable; does not rebuild caches, release locks or repair files. Readable/plannable does not imply writable. Show the diagnosis before preparing explicit recovery.',
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  project_recovery_prepare: {
    description: 'Create a read-only recovery preview for the current lock/transaction/file state. Show every proposed action and its scope to the user, then obtain explicit confirmation before project_recovery_apply. Lock age alone never authorizes release. A changed project or recovery scene requires a fresh preview.',
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  project_recovery_apply: {
    description: 'Apply the exact recovery preview after the user explicitly confirms its actions. Rechecks the project and recovery scene; refuses changed previews or unsafe lock ownership. May isolate proven uncommitted remnants and rebuild derived views, preserving committed facts and user source files. Never confirms artifacts or selects/executes a workflow step. Diagnose again if recovery is interrupted.',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  candidate_create: {
    description: 'Create the project\'s single active editable candidate from an exact confirmed artifact and its file package. Writes a separate candidate workspace and records its baseline. Formal artifact versions and confirmations remain effective while the candidate is edited. Use the returned candidate paths; do not edit confirmed source files.',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  candidate_read: {
    description: 'Read the candidate record, baseline and editable file locations without writing project files. The candidate is a trial workspace, not a confirmed artifact or stage result. Do not infer approval from the existence of edited files.',
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  candidate_preview: {
    description: 'Read the whole candidate file package and preview its exact changes and affected/retained work against the recorded baseline. Does not change formal validity. Display this preview before requesting acceptance; changes to candidate bytes, baseline or impact invalidate the preview. Stale baselines require a new candidate and a fresh preview after migrating edits.',
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  candidate_accept: {
    description: 'Accept the entire candidate against its exact current preview with an explicit user response. Rechecks baseline, candidate bytes and impact, invalidates approved affected work and imports a new draft version pending validation. Does not inherit old execution provenance or passing verification, confirm artifacts, select steps or execute the next step. In stepped projects, ask for a separate step selection and formally register validated output before confirmation.',
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  },
  candidate_discard: {
    description: 'Close the active candidate with the user\'s explicit response, without accepting any of its changes into formal artifacts. Requires request_id and current expected_revision. Preserves the formal baseline, edited files and candidate audit history; does not roll back an already accepted version, confirm a result or select a step.',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  brief_save: {
    description: 'Save a new version of the structured product brief in a legacy project. Requires request_id and current expected_revision; eight-stage and stepped projects use artifact_register instead. Writes immutable brief records but does not confirm a gate. Reuse the same request and arguments to retry safely.',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  decision_record: {
    description: 'Append a product decision, alternatives, rationale and the actual user-response source/text. Requires current expected_revision and request_id. Writes an audit record; a recorded decision does not confirm artifact versions, invalidate dependent work or authorize the next step by itself.',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  step_select: {
    description: 'Record the user\'s separate selection of an available product step in a stepped project. Requires an explicit user_response, request_id and expected_revision. Changes the active selection only; produce just this step after preparing its plan. Never infer selection from confirmation of the previous step.',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  step_confirm: {
    description: 'Confirm all exact artifact versions of the selected product step using the user\'s explicit response. Requires complete valid outputs and current expected_revision. Writes the confirmation and clears the active selection. Stop afterward: this never selects or executes the next step or confirms the stage gate.',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  artifact_register: {
    description: 'Capture explicit project-relative source files as an immutable artifact version with exact dependencies, execution provenance and applicable review/render evidence. Requires request_id and current expected_revision; stepped projects require the selected workflow_step_id. Registration is not user acceptance and never advances a step. Diagnose interrupted writes before altering canonical files.',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  change_prepare: {
    description: 'Preview a change against exact current artifact versions and stable IDs without writing files. Returns the frozen impact/retained scope and preview_hash. Show this scope before requesting acceptance; it does not invalidate artifacts or authorize editing confirmed source files.',
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  change_apply: {
    description: 'Apply the exact change_prepare preview at current expected_revision, recording the change and invalidating affected artifacts, gates and step confirmations. Stepped projects require the user\'s explicit scope response. Does not edit source files, produce replacements or select the next step; reprepare if the preview or baseline changes.',
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  },
  gate_confirm: {
    description: 'Record the user\'s explicit confirmation of the current gate/stage after required exact versions, dependencies, review and verification checks pass. Requires request_id and expected_revision. Writes a gate record; does not replace product-step confirmation, generate output or select the next step.',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
});

export function describeTool(name) {
  const metadata = toolMetadata[name];
  if (!metadata) throw new Error(`Missing MCP tool description: ${name}`);
  return metadata;
}
