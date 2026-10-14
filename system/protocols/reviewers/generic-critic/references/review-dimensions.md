---
id: generic-critic-review-dimensions
title: Generic critic review dimensions
tags: [reviewer, critic, dimensions]
created: 2026-05-20
updated: 2026-05-20
status: active
version: 1.0.0
---

# Review Dimensions

## Evidence

Check whether the output is grounded in traceable evidence.

Questions:

- Are factual claims linked to a source, requirement, prior decision, or observable artifact?
- Are assumptions explicitly labeled as assumptions?
- Are numbers, percentages, timelines, and user claims traceable?
- Does the output use a weak assumption as if it were verified fact?

High severity examples:

- A major decision relies on an unlabeled assumption.
- A metric or user behavior claim has no source.
- The output contradicts `REQUIREMENT.md`.

## Logic

Check whether the reasoning chain is closed.

Questions:

- Does the output connect problem, user, decision, interaction, and expected outcome?
- Are there leaps from diagnosis to solution?
- Do sections contradict each other?
- Are acceptance criteria implied but not stated?

## Boundary

Check whether scope and edge cases are covered.

Questions:

- Are in-scope and out-of-scope areas explicit?
- Are loading, empty, error, permission, and edge states represented?
- Are rollback or recovery paths considered when needed?
- Are unresolved decisions visible instead of hidden?

## UX

Check whether the user path is reasonable.

Questions:

- Is the primary path short enough for the target user and task frequency?
- Does each step provide clear feedback?
- Are labels, hierarchy, and action names understandable?
- Does the output reduce cognitive load instead of moving it elsewhere?

## Feasibility

Check whether the output can realistically be built and operated.

Questions:

- Are dependencies real and available?
- Are data inputs, integrations, and permissions accounted for?
- Are resource assumptions explicit?
- Does the output hide major implementation complexity?

## Business

Check whether the work makes strategic sense.

Questions:

- Is the expected value proportional to effort?
- Is the priority justified by user pain, business value, or risk reduction?
- Are opportunity costs visible?
- Does the proposal preserve the project's positioning?
