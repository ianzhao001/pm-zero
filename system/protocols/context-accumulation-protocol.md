---
id: contract-context-accumulation-protocol
title: Context accumulation protocol
tags: [contract, context, state, requirement, memory]
created: 2026-05-20
updated: 2026-05-20
status: active
version: 1.0.0
---

# Context Accumulation Protocol

This contract defines the three-file context set used by pm-zero workspaces:

- `STATE.md`: current operating state.
- `REQUIREMENT.md`: active project requirement profile.
- `MEMORY.md`: append-only project discussion and decision log.

The goal is to let project discussions accumulate across sessions and devices without forcing every agent to reread all historical files.

## Responsibilities

`STATE.md`
: Fast operational state. It answers what is happening now, what is blocked, what needs review, and which commits represent synchronized state.

`REQUIREMENT.md`
: Project truth profile. It answers who the work is for, what pain it solves, what is in scope, what is out of scope, and which decisions are active or deprecated.

`MEMORY.md`
: Append-only timeline. It records important discussions, decisions, review summaries, and stage transitions.

## Automatic Accumulation Rules

Update `STATE.md` when:

- A stage changes.
- A task starts, completes, blocks, or moves to user review.
- Cross-review finishes.
- Cross-device synchronization status changes.
- A significant blocker appears or clears.

Update `REQUIREMENT.md` when:

- The project identity changes.
- Target users, pain points, scope, or key decisions change.
- A section is superseded and must be marked `deprecated`.
- A large requirement rewrite requires archival.

Append to `MEMORY.md` when:

- A session ends.
- A major decision is made.
- Cross-review completes.
- A stage output is accepted, rejected, blocked, or revised.
- A notable implementation workaround is used.

## Cross-review Coupling

Before review, reviewers must load `REQUIREMENT.md` and the relevant state from `STATE.md`.

After review, the PM must:

1. Append review summary to `MEMORY.md`.
2. Update `STATE.md` with review result and blockers.
3. Update `REQUIREMENT.md` only if review changes active requirements or decisions.

If a review has a blocking conclusion, `STATE.md` must show `BLOCKED` until the blocker is resolved or accepted by the user.

## Loading Rule

At the start of a new session or device handoff, load files in this order:

1. `STATE.md`
2. `REQUIREMENT.md`
3. `MEMORY.md`

Then load only the linked files needed for the current task.

### REQUIREMENT.md Loading

- Default: load only sections marked `[active]`.
- Agents must skip sections marked `[deprecated]` unless the current task explicitly requires historical context.
- An agent that needs deprecated context must declare it in the review record's `context_loaded` field.
