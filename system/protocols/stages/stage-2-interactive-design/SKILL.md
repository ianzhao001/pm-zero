---
name: stage-2-interactive-design
description: Turns a product direction into an interaction draft, flow, or wireframe. Use when stage 2 needs to produce or review interactive design artifacts before demo work.
version: 1.0.0
risk: caution
---

# Stage 2 Interactive Design

Stage 2 turns a validated requirement direction into an interaction draft: markdown flow, wireframe narrative, ASCII sketch, or Mermaid diagram.

## Inputs

- `REQUIREMENT.md`
- Current user discussion
- Active `STATE.md`
- Relevant `MEMORY.md` entries

## Outputs

- Interaction draft in Markdown.
- Optional ASCII or Mermaid diagram.
- Cross-review records.
- PM merge summary.

## Required Reads

Before drafting, read `REQUIREMENT.md` and confirm the target user, core pain, scope boundaries, and active decisions.

## Hard Constraint

After the interaction draft is produced, cross-review must run before the PM reports the stage as complete.

Default reviewers:

- `out/reviewers/generic-critic/`
- `out/reviewers/generic-advocate/`

If cross-review is not complete, report the stage as `IN_PROGRESS` or `BLOCKED`, not `DONE`.

## Review Coupling

Read `references/cross-review-trigger.md` for trigger and merge rules. Use `templates/cross-review-output.template.md` for the PM-facing review summary.
