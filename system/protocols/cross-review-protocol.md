---
id: contract-cross-review-protocol
title: Cross-review protocol
tags: [contract, cross-review, stage, reviewer, context]
created: 2026-05-20
updated: 2026-05-21
status: active
version: 1.2.0
---

# Cross-review Protocol

This contract makes a second perspective mandatory for stage outputs. A PM agent may not report a stage as "complete" until the output has been reviewed, the review records have been written, and the merge decision has been reflected in project context.

## Trigger Timing

Cross-review is required after every stage output is produced and before the PM reports completion to the user.

The minimum trigger points are:

- Stage 2 interactive design: after the interaction draft or flow document is written.
- Stage 3 interactive demo: after the runnable demo or prototype artifact is written.
- Any future stage with a durable output: after the output reaches a reviewable version.

If cross-review is skipped, the stage status remains `IN_PROGRESS` or `BLOCKED`; it cannot be marked `DONE`.

## Role Rules

Every cross-review must load at least two reviewer roles.

Default roles:

- `generic-critic`: looks for defects, gaps, weak evidence, and feasibility risks.
- `generic-advocate`: looks for strengths, preserved value, and risks of over-correction.

The reviewer stances must be different. A review set with two critic roles or two advocate roles is incomplete unless the PM adds a third role with a different stance and records why the default pair was not enough.

### Third-role Selection

- Default third role is `neutral` for arbitration between conflicting critic and advocate findings.
- A second critic or second advocate may be added when the conflict is about evidence depth in one direction, not stance imbalance.
- The PM must record the third-role selection rationale in `MEMORY.md`.

Reviewer records must be produced independently. Reviewers must not read each other's records before their own record is complete. The PM merges the records only after all required records exist.

## PM Merge Rules

The PM owns synthesis, not unilateral deletion of reviewer findings.

Merge flow:

1. Confirm all required review records exist and match the target output version.
2. Group findings by dimension: `evidence`, `logic`, `boundary`, `ux`, `feasibility`, `business`.
3. Separate blocking findings from non-blocking findings.
4. Resolve direct conflicts by comparing evidence, target requirement, and stage scope.
5. Create one merge summary that preserves both the critic and advocate perspectives.
6. Update `STATE.md`, `MEMORY.md`, and the reviewed output if changes are required.

Blocking conditions:

- Any reviewer sets `overall.blocking: true`.
- A high-severity finding affects the stage's primary user goal.
- The target output cannot be traced to `REQUIREMENT.md`.
- The target output cannot be locked to a stable identifier (neither a git commit hash nor a sha256 of a frozen snapshot).
- Reviewers disagree on a central decision and the PM cannot resolve it with current project context.

When a blocking condition remains unresolved, the PM must mark `STATE.md` as `BLOCKED` and report the blocker instead of reporting completion.

## Review Record Storage

Each review record is written to:

```text
workspaces/<workspace>/reviews/<stage>-<timestamp>.md
```

For repository-local demos or self-application workspaces, `<workspace>` may be an explicit local directory such as `workspaces/example`. The timestamp must be ISO-like and filesystem-safe, for example `2026-05-20T01-30-00`.

Each record must follow `review-record-schema.md`.

## Context Coupling

Reviewer required reads:

- `REQUIREMENT.md`
- `STATE.md`
- The target output
- Any stage-specific review dimensions referenced by the stage skill

After reviews complete, the PM must:

- Append a concise review summary to `MEMORY.md`.
- Update `STATE.md` with review status, blockers, and next action.
- Update the reviewed output or create follow-up tasks for non-blocking findings.
- Preserve blocking findings until they are resolved or explicitly accepted by the user.

The PM must not rewrite previous `MEMORY.md` entries. It only appends new entries.

## Evidence Plan Extension

PM-Pilot's delegated observation design separates evidence planning from evidence ingest. pm-zero adopts that separation for evidence-heavy cross-review.

An evidence plan is required when any of the following is true:

- the review challenges or relies on external market, competitor, user, or technical evidence
- the review proposes proactive acquisition of new material
- the target artifact contains B-grade or lower evidence that affects a major product decision
- reviewer findings depend on process inputs that are not already accepted in the workspace

The evidence plan must record:

```json
{
  "schema_version": 1,
  "review_id": "<review id or file stem>",
  "target": "<reviewed artifact>",
  "evidence_questions": ["<what needs evidence>"],
  "loaded_context": ["<already loaded local context>"],
  "process_input_plan": "<path or null>",
  "consent_required": true,
  "raw_findings": "<path or null>",
  "accepted_findings": ["<finding id or reference>"]
}
```

If proactive acquisition is needed, the reviewer must stop at the plan and follow `proactive-action-consent-protocol.md`. The review record may not smuggle unapproved external acquisition into its findings.

If no new process input is needed, the reviewer may write `process_input_plan: null` and cite already accepted artifacts.

## Evidence Ingest Coupling

When a review uses `process-input-protocol.md`, the merge summary must preserve the chain:

```text
evidence plan -> raw findings -> accept/reject/snooze decision -> review finding -> PM merge decision
```

This chain lets a later reviewer distinguish raw external signal from accepted project evidence.

