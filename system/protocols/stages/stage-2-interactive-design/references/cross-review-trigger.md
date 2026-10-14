---
id: stage-2-cross-review-trigger
title: Stage 2 cross-review trigger
tags: [stage-2, cross-review, interaction]
created: 2026-05-20
updated: 2026-05-20
status: active
version: 1.0.0
---

# Stage 2 Cross-review Trigger

## When To Trigger

Trigger cross-review immediately after the interaction draft is written and before reporting completion.

## Reviewers

Default reviewers:

- `generic-critic`
- `generic-advocate`

Both reviewers must load:

- `REQUIREMENT.md`
- `STATE.md`
- Target interaction draft
- `out/reviewers/generic-critic/references/review-dimensions-interactive.md`

## Convergence Rules

- Blocking findings must be resolved before stage completion.
- Non-blocking findings must be appended to `MEMORY.md` and either addressed or converted into follow-up tasks.
- If critic and advocate findings conflict, the PM compares them against `REQUIREMENT.md` and records the selected path in the PM merge summary.
- If the conflict changes the protocol or the stage output contract, mark `STATE.md` as `BLOCKED` and ask the user.
