---
id: stage-3-cross-review-trigger
title: Stage 3 cross-review trigger
tags: [stage-3, cross-review, demo]
created: 2026-05-20
updated: 2026-05-20
status: active
version: 1.0.0
---

# Stage 3 Cross-review Trigger

## When To Trigger

Trigger cross-review immediately after the demo artifact is written and before reporting completion.

## Reviewers

Default reviewers:

- `generic-critic`
- `generic-advocate`

Both reviewers must load:

- `REQUIREMENT.md`
- `STATE.md`
- Target demo artifact
- `out/reviewers/generic-critic/references/review-dimensions-demo.md`

## Convergence Rules

- Blocking findings must be resolved before stage completion.
- Non-blocking findings must be appended to `MEMORY.md` and either addressed or converted into follow-up tasks.
- The demo must be runnable or inspectable enough for the review claim being made.
- If the demo cannot be run or inspected, mark `STATE.md` as `BLOCKED` unless the user explicitly accepts a static demo review.
