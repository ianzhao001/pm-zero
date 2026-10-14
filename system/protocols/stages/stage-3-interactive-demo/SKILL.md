---
name: stage-3-interactive-demo
description: Turns an interaction draft into a runnable or inspectable interactive demo. Use when stage 3 needs demo production or demo review before user-facing completion.
version: 1.0.0
risk: caution
---

# Stage 3 Interactive Demo

Stage 3 turns the stage-2 interaction draft into a runnable or inspectable demo artifact.

## Inputs

- `REQUIREMENT.md`
- Stage-2 interaction draft and PM merge summary
- Active `STATE.md`
- Relevant `MEMORY.md` entries

## Outputs

- Interactive demo artifact.
- Demo run or inspection notes.
- Cross-review records.
- PM merge summary.

## Required Reads

Before demo work, read `REQUIREMENT.md`, `STATE.md`, and the stage-2 review summary. Confirm that unresolved stage-2 blockers are closed or explicitly accepted.

## Hard Constraint

After the demo is produced, cross-review must run before the PM reports the stage as complete.

Default reviewers:

- `out/reviewers/generic-critic/`
- `out/reviewers/generic-advocate/`

If cross-review is not complete, report the stage as `IN_PROGRESS` or `BLOCKED`, not `DONE`.

## Review Coupling

Read `references/cross-review-trigger.md` for trigger and merge rules. Use `templates/cross-review-output.template.md` for the PM-facing review summary.
