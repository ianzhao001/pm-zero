# pm-zero workflow core

Experimental, private, host-neutral project workflow state machine for conversational product work. It persists product decisions, versioned artifacts, frozen change scopes, independent reviews, and explicit step/stage confirmations without HTTP calls or model APIs.

The core supports five immutable project workflows:

- `product-design-six-stage-v1` is the default for new projects: S1 goals/scenarios, S2 MRD, S3 visual direction, S4 wireframes/interaction/model, S5 visual design, S6 Demo. S1 and S4 require all their artifacts before joint confirmation; normal product flows are the default scope.
- `product-design-six-stage-stepped-v1` is an explicit opt-in with `step_template: { project_type, depth }`; it compiles finer steps against the six-stage snapshot.
- `legacy-four-gate-v1` remains available explicitly. Existing projects without a `workflow_id` keep the original G1–G4 behavior and response shapes.
- `product-design-eight-stage-v1` is selected only at `project_open(create: true)`. The project snapshots the complete workflow definition under `.pm-zero/workflow/definition.json`, records both byte and semantic hashes, and then drives S1–S8 artifacts, dependencies, review counts, stale closure, target-stage completion, and next actions from that snapshot.
- `product-design-stepped-v1` is a new-project opt-in with required `step_template: { project_type, depth }`. It retains S1–S8 and their stage gates, while giving each product step independent files, exact-version confirmation, and a separate user selection before any next step. Existing projects are never migrated automatically.

Eight-stage projects use `artifact_register` for every stage, including `goal_contract` at S1. `brief_save` remains legacy-only. A goal defaults to `metadata.target_stage: "S8"`; the exact value becomes locked with the version when S1 is confirmed. `project_read(view: "resume")` adds `workflow_id`, `current_stage`, `target_stage`, `completed_to_target`, `pending_confirmation`, unfinished capability tasks, and compact execution provenance. Existing legacy reads remain unchanged. Six-stage goals default to S6; creation accepts context and locks it through the goal contract. `runtime_info.default_workflow_id` exposes the new default.

The public module is `index.mjs`:

```js
import { callTool, toolSchemas, WorkflowError } from './index.mjs';
```

`toolSchemas` is a plain map from the twenty names below to strict JSON Schemas. `callTool(name, args)` returns a direct result object and throws `WorkflowError` for controlled failures.

`runtime_info.package.build` is additive metadata: a packaged build reports its source commit (or null), dirty state (or null), context and deterministic content digest. Source checkouts and legacy packages without build metadata report null. `package.integrity` is `not_checked`: reading runtime metadata does not certify installed bytes. The portable `mcp/diagnose.mjs` entry verifies the complete v2 package inventory and composes physically read-only `project_diagnose` with `stage_prepare` at the returned revision when planning is available. It reports readability, planning availability and writability separately; a locked project can remain readable and plannable while mutation is blocked. It never rebuilds caches, repairs files, creates a project, infers host capabilities or confirms a stage. See the plugin README for invocation and exit codes.

| Tool | Purpose |
|---|---|
| `runtime_info` | Read the actual package version, supported workflow definition hashes, available `step_templates`, validated stage contexts, and deterministic capability-catalog digest. It accepts no `project_path`. |
| `stage_prepare` | Read-only routing for the current eight-stage or stepped project revision. It returns `produce`, `review`, `await_confirmation`, `blocked`, or `completed`; stepped projects also return `await_selection` and `await_step_confirmation`. Only a selected product step receives an executable plan. |
| `project_open` | Initialize or reopen an absolute, user-selected project directory. `create: true` requires `project_id`; the stepped workflow also requires `step_template`. Existing product files are retained; initialization refuses an existing `.pm-zero` collision. |
| `project_read` | Without `view`, return the original compact state unchanged. `view: "resume"` returns current brief facts, compact decision/rejection summaries, effective artifact versions, blockers, and direct material/detail references. `view: "detail"` returns one requested record or on-demand history index. Rebuilds disposable derived files; use `project_diagnose` for physically read-only inspection. |
| `project_diagnose` | Inspect locks, interrupted transactions, canonical integrity and confirmed-source drift without writing files. Return `readable`, `plannable`, `writable`, issues, store diagnostics and a resume summary when readable. These are point-in-time conditions, not a reservation for a later write. |
| `project_recovery_prepare` | Preview explicit recovery actions against the current project and recovery scene without writing files. Show the preview before requesting user confirmation. |
| `project_recovery_apply` | Recheck and apply the exact recovery preview with the user's explicit response. Preserve committed facts, isolate eligible remnants and report the result; never confirm or execute a product step. |
| `candidate_create` | Create one editable file-package candidate from an exact confirmed artifact. Keep the formal baseline effective while the candidate is edited. |
| `candidate_read` | Read candidate status, baseline and editable paths without writing files. |
| `candidate_preview` | Preview the whole candidate's changes and affected/retained scope without changing formal validity. Candidate edits or baseline changes invalidate the preview. |
| `candidate_accept` | Accept the whole exact preview with the user's explicit response and import a draft pending validation. Invalidate only the approved affected scope. Do not inherit old execution/verification evidence, confirm an output or select a step. |
| `candidate_discard` | Close a candidate without changing formal artifacts. Keep its audit history; this does not revert an already accepted version. |
| `brief_save` | Save a versioned Markdown brief with the six G1 facts, success criteria, graded assumptions, and gate-specific open questions. |
| `decision_record` | Append a decision with the selected option, rejected options, rationale, and reported user-response source/text. |
| `step_select` | Select the available product step in a stepped project, recording its `workflow_step_id` and the user's separate selection response. It does not generate an artifact. |
| `step_confirm` | Confirm the selected step's complete set of exact output references and record the user's response. It clears the selection and never activates the next step or confirms a stage gate. |
| `artifact_register` | Snapshot explicit project-relative files and bind them to a version, hash, dependencies, review metadata, and optional render evidence. |
| `change_prepare` | Read-only preview of a frozen stable-ID change scope, expected artifact versions, and DAG invalidation closure. |
| `change_apply` | Apply the exact preview hash and invalidate affected artifacts and gate records. Stepped projects require a user response confirming the displayed change scope, and invalidate the affected step confirmations and selection. |
| `gate_confirm` | Confirm the current workflow gate/stage after dependency, blocker, user-response, and workflow-specific review requirements pass (legacy: two independent perspectives per target; eight-stage: zero or one independent reviewer per target from the snapshot). |

For an existing unconfirmed S1 draft in the original eight-stage workflow, requesting a different `context` requires `stage_prepare.intent: "revise"`; an ordinary advance request fails with `E_STAGE_CONTEXT_LOCKED`. The replacement goal version becomes the effective context for later preparation, provenance, confirmation, and reads. Stepped projects instead freeze their context at creation as described below.

At a reviewed eight-stage target, any current independent review of the exact artifact version with an open `major` or `blocker` finding blocks both preparation and confirmation. Selecting a separate clean review cannot bypass it. Updating that review ID with resolved findings, or producing a new artifact version that makes the old review inapplicable, clears this condition.

For an eight-stage deliverable, registration also requires:

```js
{
  producer_id: 'agent-or-person-audit-id',
  execution: {
    plan_id: 'stage-plan-...',
    plan_version: 1,
    plan_hash: '<64 lowercase hex characters>',
    stage_id: 'S6',
    selection: {
      context: 'none',
      profile: 'pm-zero-agent',
      purpose: 'production',
      capabilities: [],
      providers: {},
      host_capabilities: []
    },
    skills: [{ skill_id: 'interaction-design', version: '0.1.0' }],
    capability_assignments: [
      { capability: 'interaction-design', skill_id: 'interaction-design' },
      { capability: 'state-modeling', skill_id: 'interaction-design' }
    ],
    read_receipts: [{ path: 'skills/interaction-design/SKILL.md', sha256: '<file hash>', context: 'instructions used for this run' }],
    input_artifacts: [{ artifact_id: 'wireframes', version: 1, sha256: '<artifact hash>' }]
  },
  metadata: {
    open_questions: [{ id: 'Q-1', question: '...', why: '...', stage_id: 'S6', owner: 'PM', status: 'open' }],
    blockers: [{ id: 'B-1', summary: '...', stage_id: 'S6', owner: 'PM', status: 'open' }]
  }
}
```

At registration time the core deterministically rebuilds the stage plan from `execution.selection`, the project's immutable workflow definition, the installed registry, the declared plan version, and exact input artifacts. It rejects non-executable selections and any mismatch in plan ID/hash, selected Skill versions, capability assignments, purpose, or workflow hash. Read receipts must cover every required, selected optional, retained instruction, and declared asset file in the rebuilt plan; extra files and stale hashes are rejected. An asset receipt proves that the exact planned bytes were obtained and hash-checked; it does not prove that an asset validator or executable asset ran. The core also binds `execution.input_artifacts` exactly to artifact dependencies. Producer and reviewer identities remain caller-supplied audit evidence, not cryptographic identity proof. Reviews use the reviewed artifact's stage, rebuild a `purpose: "review"` plan requiring `independent-review`, require the review artifact's own `producer_id` to equal `reviewer_id`, and reject a `reviewer_id` equal to the reviewed subject's `producer_id`.

S1–S7 reject executable formats. Markdown may contain ordinary document links but cannot embed scripts, controls, event handlers, or javascript links. SVG rejects external resources, links, CSS URLs, animation, handlers, entities, and foreign content; bitmap extensions are checked against content signatures. S8 keeps the existing fail-closed Demo checks for stable IDs, exact design-model hash, complete declared outputs, and bound independent evidence.

Eight-stage changes require `scope` plus an exact current `entry_artifact`. Artifact scope uses empty `target_ids` and `preserve_ids`; element scope validates target and preserve IDs against the current design model and rejects overlap. The preview hash freezes the entry reference, its actual recorded dependency closure, exact expected artifacts, and the definition-derived downstream invalidation closure. For example, an S4 `visual_direction` change invalidates S4/S7/S8, while an S2 `requirements_scenarios` change invalidates S2–S8. Unchanged bytes may be registered as a new version after invalidation and then reconfirmed.

Every mutation except initial creation requires a non-empty `request_id` and integer `expected_revision`. Repeating the same request ID with byte-equivalent arguments returns the original result with `idempotent_replay: true`. Reusing it for different content throws `E_IDEMPOTENCY_CONFLICT`. Revision mismatches throw `E_REVISION_CONFLICT` without publishing a new revision.

## Product steps and templates

The nine templates combine `project_type: "new_product" | "iteration" | "feature"` with `depth: "lean" | "standard" | "full"`. Project type changes the required framing: opportunity, existing-product conditions, or host-product/feature boundaries. Depth changes the preparation steps and material detail. Lean templates still require independent review, version-bound Demo evidence, and every applicable stage gate. The complete compiled definition is frozen at creation; this version does not support switching templates or freely editing the step sequence during a project.

The optional creation argument `context` binds `none` or a registered context ID, defaulting to `none`, and must be supported by the actual installed package. Unknown/unavailable creation contexts fail before a project directory is created. External brands follow the [local brand package API](../../docs/private-brand-pack-guide.md). Stepped v1 freezes it with the template. Preparation, registration, and reopening cannot change the project's brand; a goal artifact must use that same context.

Create a stepped project explicitly:

```js
await callTool('project_open', {
  project_path: '/absolute/path/to/stepped-product',
  create: true,
  project_id: 'stepped-product',
  workflow_id: 'product-design-stepped-v1',
  step_template: { project_type: 'new_product', depth: 'standard' },
  context: 'none',
  request_id: 'create-stepped-product'
});
```

Read `project_read(view: "resume")`, then call `stage_prepare` at that revision. An unselected step returns `await_selection` with no executable plan. Display the available step and its required inputs/outputs; only a fresh user choice authorizes `step_select`:

```js
await callTool('step_select', {
  project_path,
  expected_revision: resume.revision,
  request_id: 'select-step-001',
  workflow_step_id: resume.step_progress.next_step_id,
  user_response: { source: 'conversation:<message-id>', text: '<actual selection response>' }
});
```

Prepare again at the new revision and execute only the selected step's plan. `workflow_step_id` names a product step; `load_steps` are the Skill files to load while executing that one plan. They are distinct mechanisms. Every stepped `artifact_register` must provide both top-level `workflow_step_id` and matching `execution.workflow_step_id`. The step's declared output types and confirmed dependency versions constrain registration. Each step owns independent source files; another step cannot reuse them as its own output. The ordinary plan/hash/read-receipt checks still apply.

After registering all declared outputs, stop and show their exact versions, paths, validation findings and unresolved questions. `stage_prepare` returns `await_step_confirmation`. Only the user's explicit response authorizes confirmation of those references:

```js
await callTool('step_confirm', {
  project_path,
  expected_revision: currentRevision,
  request_id: 'confirm-step-001',
  workflow_step_id: selectedStepId,
  artifacts: outputRefs, // every output: { artifact_id, version, sha256 }, including reviews
  user_response: { source: 'conversation:<message-id>', text: '<actual version confirmation>' }
});
```

Successful confirmation returns `step_confirmation` and `step_progress` with no active selection. The host must stop again: confirming the current version cannot also select the next step. Missing outputs, stale dependencies, changed source files, unresolved blockers, missing review or required Demo evidence prevent confirmation. S6's joint outputs must all be present. Structural checks are separate from human acceptance and do not certify product quality or real demand.

When all product steps in a stage are confirmed, preparation returns `await_confirmation` for the ordinary `gate_confirm`. Step confirmation never substitutes for that stage gate, and gate confirmation never selects the next step. Reading, diagnosis, restarting the server, and restoring a session cannot select or execute a step.

Stepped reads add `step_progress` with `template`, `current_stage`, `active_step_id`, `next_step_id`, and a `steps` list containing IDs, names, stages, statuses, and artifact references/paths. `.pm-zero/step-overview.md` renders that progress as a disposable derived file, rebuilt from canonical state without overwriting a root product document. Existing workflows keep their original read behavior and do not acquire fabricated historical step records.

For confirmed-material changes, first show the exact `change_prepare` preview, including affected and retained work. A stepped `change_apply` requires `user_response: { source, text }` for that scope. Actual dependency closure invalidates the relevant output versions and step confirmations while retaining unrelated work. Affected selection is cleared; rework still requires an explicit step choice. Changing the preview, suppressing an affected dependency, or editing the derived overview cannot authorize a different scope.

## Recovery and candidate editing

Start a blocked-write investigation with `project_diagnose`. `readable` means canonical state can be loaded; `plannable` means it can be passed to stage planning, not that the resulting plan is executable or accepted. `writable` distinguishes storage/source blockers from these read capabilities. The CLI retains `project.resume` and `project.preparation` for existing consumers and adds the diagnosis and all three capability flags. Missing caches are not repaired by diagnosis. `project_read` remains the explicit operation that can rebuild disposable views without advancing canonical revision.

Use `project_recovery_prepare` to show the proposed recovery actions, then `project_recovery_apply` with the user's actual response and the exact preview. The apply operation rechecks the revision, lock identity and relevant file state. A changed scene needs a fresh preview and confirmation. A lock's age alone never proves that its owner is dead. Owner identity currently uses Linux process start ticks and boot identity; legacy locks without identity, different-host locks and platforms without that evidence remain unknown and blocked rather than silently releasing another writer's lock. Referenced immutable records and user source files must be retained; uncommitted remnants eligible for recovery are isolated instead of treated as confirmed output.

A published canonical commit is the success boundary. A derived-view failure after that boundary does not undo the commit or authorize a second registration. Diagnose/read the committed revision and retry the same request to obtain its recorded result. A failure before the commit must remain distinguishable and recoverable; recovery never fabricates a user confirmation or executes the next product step.

For trial edits, create a candidate rather than modifying confirmed source files:

1. `candidate_create` captures the exact confirmed entry artifact and its file package as the project's single active candidate.
2. Edit the returned candidate workspace using the host's editor. Logical source paths, candidate paths and immutable version snapshot paths have different roles. Markdown/JSON and HTML/CSS/JS are the initial supported editing scope; a candidate workspace is not an image-layer or native Figma editor.
3. `candidate_preview` reports the changed files and the affected/retained artifact and step scope. The formal baseline remains effective. Display the whole preview, including unresolved validation work, before asking the user to accept it.
4. `candidate_accept` checks the unchanged preview, current baseline and scope, then accepts the whole candidate as one batch. It registers an imported draft marked `candidate_import.status: "pending_validation"`; it does not reuse prior execution provenance or claim prior checks cover new bytes.
5. Prepare and execute the affected production plan, then use ordinary `artifact_register` with current provenance, dependencies and applicable evidence to register validated output as a new version. This also applies to original eight-stage projects: importing a candidate does not satisfy execution provenance. In a stepped project, first ask for a separate selection of the affected product step; only after formal registration may the user confirm exact outputs and, separately, choose the next step.

Accepting edits is not artifact acceptance, browser verification or stage completion. A failed or pending check stays visible. A candidate can be revised and previewed repeatedly, or discarded with `candidate_discard`; neither action invalidates formal work. Version one accepts the entire file package and does not offer partial file selection or automatic merging. If the formal baseline has changed, preserve the old edits, close the old candidate, create one from the current confirmed baseline and migrate desired edits before generating a new preview. Old previews cannot be reused after migration.

Candidate creation and acceptance do not migrate existing workflows or change their template/context. Legacy and original eight-stage projects retain their respective gate behavior; separate step selection applies only to stepped projects. All hosts receive individual MCP tool descriptions explaining purpose, write behavior, confirmation requirements and recovery boundaries. MCP `readOnlyHint` marks actual read-only operations; `project_read` is deliberately not marked read-only because it writes derived files.

## Examples

Create or initialize a legacy project (omitting `workflow_id` retains the original default):

```js
await callTool('project_open', {
  project_path: '/absolute/path/to/community-poll',
  create: true,
  project_id: 'community-poll',
  project_name: 'Neutral community poll pilot',
  request_id: 'create-community-poll'
});
```

Save the brief:

```js
await callTool('brief_save', {
  project_path: '/absolute/path/to/community-poll',
  expected_revision: 0,
  request_id: 'brief-001',
  brief: {
    target_user: 'Community members',
    core_problem: 'There is no lightweight way to collect structured preferences',
    scenario: 'A member posts two neutral choices and others vote',
    scope: 'Create a poll, vote once, and view totals',
    non_goals: 'Identity proof, paid promotion, or public elections',
    success_criteria: ['A member can create and vote in under one minute'],
    key_assumptions: [{
      id: 'A-1',
      claim: 'Two choices cover the pilot',
      grade: 'A',
      source: 'interview:pilot-1',
      supports_gate: true,
      evidence_refs: ['interview-notes:v1']
    }],
    open_questions: [{
      id: 'Q-1',
      question: 'Should votes be editable?',
      why: 'This changes the state model',
      blocks_gate: 'G2',
      owner: 'PM',
      status: 'open'
    }]
  }
});
```

`blocks_gate` is `G1`, `G2`, `G3`, `G4`, or `null`; status is `open` or `closed`. Grade A sources use `interview:`, `production-data:`, `support-ticket:`, `experiment:`, or `user-artifact:`. Grade B uses `report:`, `official-doc:`, or `benchmark:`. Grade C uses `derived:` and requires `evidence_refs`. A D/E assumption with `supports_gate: true` blocks G1.

Resume a project without loading historical artifact bodies:

```js
const resume = await callTool('project_read', {
  project_path: '/absolute/path/to/community-poll',
  view: 'resume'
});
```

The resume response includes the complete current brief and open questions; each decision's question, selected option, complete `rejected_options`, rationale, and explicit replacement status; current effective and stale artifact summaries; current gate summaries; blockers; and next actions. Decision audit fields such as `user_response`, timestamps, revisions, and internal canonical metadata stay in detail responses. Artifact summaries carry one `detail_ref`; snapshot file references stay in artifact detail. Current gate summaries likewise carry one `detail_ref` and omit user-response evidence.

Top-level `material_refs` contains only the project record. The brief and decisions carry their own single material reference, so resume does not repeat them or expand gate history. A decision is `superseded` only when a later record explicitly names it in `supersedes_decision_ids`; otherwise it is `not_superseded`. The latter is deliberately not a claim that old data is currently valid. The core does not infer replacement from matching questions or record order, so conflicting old decisions remain visible and their key content is never truncated.

`pending_changes` is a derived recovery view with `total`, at most five newest-first `items`, and `index_ref: { type: "index", id: "changes" }`. Each item contains its change ID/revision, a request summary capped at 240 characters, the eight-stage entry reference when present, affected and pending deliverable IDs, pending gates, and a `detail_ref` to the full immutable change. Full requests and frozen scopes are never truncated in detail. The changes index adds `pending`, `pending_artifact_ids`, and `pending_gates` for all records, including those beyond the resume limit. No changes produces an empty item list and zero total; the default read without `view` is unchanged.

Pending means unresolved against the **current** project state, not a persisted change lifecycle or inferred cancellation. Affected deliverables must have a newer confirmed version, current Demo verification, and matching current gate/review bindings. Source drift remains pending; obsolete review IDs do not keep a completed change open. Later invalidation can make an earlier change pending again. No change silently supersedes another: use full records to reconcile overlapping scopes, and clarify contradictory feedback before producing a replacement.

For eight-stage projects, `stage_prepare.change_context` returns the pending changes relevant to the current stage, newest first, without the five-item resume cap. Each entry includes `change_id`, `detail_ref`, the full frozen `change`, `expected_artifacts`, and `verification_baselines`. Empty context means no applied change needs continuation at this stage. It uses the same derivation as resume and does not alter routing, blockers, user confirmation, independent review, or verification requirements. Historical changes without recorded verification baselines return an empty list, never a fabricated baseline. Reads and stage preparation do not mutate canonical records or their hashes.

Record an explicit replacement:

```js
await callTool('decision_record', {
  project_path,
  expected_revision: resume.revision,
  request_id: 'decision-ordering-v2',
  decision: {
    decision_id: 'D-ORDERING-V2',
    question: 'Which ordering?',
    selected_option: 'Newest first',
    rejected_options: [{ option: 'Popular first', reason: 'It biases the neutral pilot' }],
    rationale: 'Recent polls need a predictable position.',
    user_response: { source: 'conversation:turn-31', text: 'Use newest first.' },
    supersedes_decision_ids: ['D-ORDERING-V1']
  }
});
```

Each superseded ID must name an existing earlier decision. Duplicate IDs, self references, and missing IDs fail before a revision is published. The optional field is part of the normal content-bound idempotency digest.

Fetch one full record only when it is needed:

```js
const decision = await callTool('project_read', {
  project_path,
  view: 'detail',
  detail: { type: 'decision', id: 'D-ORDERING-V2' }
});

const modelV1 = await callTool('project_read', {
  project_path,
  view: 'detail',
  detail: { type: 'artifact', id: 'design-model', version: 1 }
});
```

Detail types are `brief`, `decision`, `artifact`, `gate`, `change`, and `index`. Use ID `brief` for the current brief; an optional brief version must be its current version. Artifact detail can select any recorded version. Gate detail accepts the gate-record revision as `version`. Historical Gate and change IDs are available on demand through `{ type: 'index', id: 'gates' }` and `{ type: 'index', id: 'changes' }`; these indexes contain compact summaries and exact `detail_ref` values rather than audit bodies. Missing records fail with `E_DETAIL_NOT_FOUND`; unsupported version selectors fail with `E_ARGS_INVALID`. Every default, resume, detail, and index read validates all canonical records before returning, so a narrow query cannot bypass project integrity checks.

A change is previewed and then applied without modifying the preview in between:

```js
const prepared = await callTool('change_prepare', {
  project_path,
  change: {
    schema_version: 1,
    change_id: 'chg-1000',
    request: 'Change the submit action',
    target_ids: ['EL-POLL-SUBMIT'],
    allowed_changes: ['action'],
    preserve_ids: ['SC-POLL'],
    impact: 'interaction',
    reason: 'Show a submitted state'
  },
  expected_artifacts: [{ artifact_id: 'design-model', version: 1, sha256: modelHash }]
});

await callTool('change_apply', {
  project_path,
  expected_revision: prepared.revision,
  request_id: 'apply-chg-1000',
  change: prepared.change,
  expected_artifacts: prepared.expected_artifacts,
  preview_hash: prepared.preview_hash
});
```

Use `toolSchemas.artifact_register` and `toolSchemas.gate_confirm` as the authoritative nested shapes. Review registrations bind `reviewer_id` and `perspective` to one exact subject `artifact_id`/`version`/`sha256`. G2 therefore needs two independent reviews for the interaction specification and two for the design model. Gate confirmation records `user_response.source` and `user_response.text` as audit evidence; it does not claim cryptographic proof of who supplied that text.

## Persistence and integrity

Workflow-owned canonical records live under `.pm-zero/` so initialization never overwrites root `PROJECT.md`, product source, or other existing files:

- immutable Markdown/frontmatter records under `project/`, `brief/`, `decisions/`, `artifacts/`, `changes/`, and `gates/`;
- exact artifact bytes under `versions/<artifact-id>/v<N>/`;
- immutable atomic commit records under `commits/`;
- `workflow-state.json`, a disposable derived cache rebuilt from the latest commit;
- the design model remains an exact versioned JSON artifact.

Each load verifies canonical hashes. Manual edits or missing canonical records fail with `E_CANONICAL_DRIFT`; the core does not overwrite them. Artifact source paths reject traversal and symlinks, and source bytes are captured once under the project mutation lock before hashing and snapshot publication. `lib/project-store.mjs` owns lock identity, atomic writes, transaction journals and recovery. Before-commit failures leave identifiable, recoverable write intent; identical unpublished canonical bytes can be reused, while different bytes at the same immutable path require explicit recovery. A published commit advances revision even if derived-view rebuilding subsequently fails; that case returns the recorded result with a warning instead of claiming the authoritative commit failed.

The production contract snapshot is in `contracts/`. Runtime gate targets, dependency edges, impact ordering, and stale closure come from `artifact-dag.json`, rather than a second handwritten DAG.

Confirmed artifacts require `change_prepare` plus `change_apply` before replacement. Reviews referenced by a confirmed gate are immutable under their artifact ID. A later version must use a new review ID and the gate must be confirmed again after invalidation.

Demo verification uses policy version 2. `verification_evidence` still binds immutable independent report files by path/hash; each file must contain JSON matching `contracts/validation-report.schema.json`. Reports bind the exact non-evidence output path/hash set and design-model hash, checker version, run and environment, explicit per-check results and overall result. Report files are excluded from `subject.outputs` to avoid circular hashes. Initial reports require `baseline: null`; revisions bind the Demo artifact reference frozen by change_apply and applied change ID. Required checks are `stable_mapping`, `rendered_layout`, `interaction`, plus `scope_preservation` for changes. A failed check cannot pass, and skipped or missing checks remain pending, while malformed or mismatched policy-v2 evidence fails. All supplied evidence is evaluated; a passing report cannot erase a conflicting failure.

HTML mapping is parsed, not found through raw string search. Static structure/text/attribute changes outside the authorized targets cannot be overridden by a report. Authorized descendants are masked while comparing preserved ancestors. CSS, scripts and resource impacts require actual version-bound browser coverage of targets and preserved objects; static DOM checks do not prove visual or behavioral preservation. Each applied change stores immutable verification_baselines; retries and newly applied changes cannot adopt a failed draft as a clean baseline; unresolved drafts retain the preceding frozen baseline. A failed draft without a recoverable baseline is rejected by change_apply. Older applied changes without this field remain pending until a fresh change is prepared/applied. Caller-reported authorship remains audit information, not identity authentication.

`verification.status` distinguishes `verified`, `failed`, and `pending`; user acceptance remains a separate gate record. Runtime reads, gate eligibility and completion all use the current verification policy. Old Demo records lacking policy version 2 remain immutable and appear as pending revalidation, with `recorded_verification` retaining the original historical value. Confirmed gate records are historical, not a claim that current validation still passes. To revalidate, prepare/apply a change at the affected Demo stage, register a new artifact version with a structured report, obtain reviews of that exact version, and request user confirmation again. Never synthesize a past confirmation. Confirmed-source drift and pending revalidation take precedence over completed status and next-action messages.


## Errors and tests

```js
try {
  await callTool(name, args);
} catch (error) {
  console.error(error.toJSON());
  // { error: { code, message, details, retryable } }
}
```

Run the zero-dependency test suite:

```bash
node --test system/workflow-core/test/core.test.mjs
```

The suite covers empty projects, optimistic concurrency, content-bound retry, canonical drift, traversal/symlink confinement, immutable versions, design-model validation, gate blockers, review independence, gate ordering, change closure, render-model binding, fail-closed actual differences, confirmed-artifact replacement, and a synthetic G1–G4 project lifecycle.

Detail responses include current project blockers, including detected external edits to confirmed source files. Gate resume/detail projections use the latest canonical history record so the returned revision matches its reference.
