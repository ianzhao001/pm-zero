# Task Entry State Protocol

## Purpose

Formalize how Codex handles pre-existing workspace changes at the start of a task.

## Entry Check

At task start, Codex must run a workspace state check. If uncommitted changes exist, Codex evaluates them before beginning task edits.

## Decision Rules

- If the existing change aligns with the current task's protocol spirit, keep it, include it in the task commit, and document it in the final report under `Pre-task workspace state`.
- If the existing change conflicts with the current task or could corrupt the task scope, stop and ask the user.
- If Codex cannot determine whether the change is related or safe, stop and ask the user.
- Never revert pre-existing user changes without explicit approval.

## Report Requirement

Every final task report must include `Pre-task workspace state` with:

- files already modified before task start
- whether the task instruction explicitly mentioned them
- the inclusion/rejection decision
- rationale

## Application


