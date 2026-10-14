---
id: generic-critic-interactive-dimensions
title: Stage 2 interactive review dimensions
tags: [reviewer, critic, stage-2, interaction]
created: 2026-05-20
updated: 2026-05-20
status: active
version: 1.0.0
---

# Stage 2 Interactive Review Dimensions

Use these checks for interaction drafts, wireframes, flow canvases, and markdown interaction specs.

## Information Architecture

- Is the hierarchy clear from entry point to completion?
- Does each screen or section have one primary job?
- Are secondary paths visible without competing with the main path?
- Are terms aligned with `REQUIREMENT.md`?

## Path Efficiency

- Is the shortest successful path actually short?
- Are repeated confirmations justified?
- Can the target user recover from a wrong turn?
- Are default states useful instead of blank?

## State Coverage

Required states:

- Loading
- Empty
- Error
- Permission or unavailable state when relevant
- Edge case for missing, partial, or stale inputs
- Success and post-success state

## Requirement Alignment

- Does the draft name or imply the target user from `REQUIREMENT.md`?
- Does it address the core pain instead of a neighboring convenience?
- Does it respect active scope boundaries?
- Are unresolved user decisions shown as open instead of silently chosen?
