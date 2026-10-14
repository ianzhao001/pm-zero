---
id: contract-state-md-protocol
title: STATE.md protocol
tags: [contract, state, workspace]
created: 2026-05-20
updated: 2026-05-21
status: active
version: 1.2.0
---

# STATE.md Protocol

`STATE.md` is the current operating panel for a pm-zero workspace.

## Required Fields

YAML frontmatter:

- `id`: stable state document ID.
- `title`: human-readable title.
- `status`: current workflow state, such as `IN_PROGRESS`, `BLOCKED`, or `PENDING_USER_REVIEW`.
- `current_stage`: stage label.
- `current_task`: task label.
- `updated`: date of last update.
- `updated_by`: `agent` or `user`.

Body sections:

- Current stage.
- Current task.
- Current blockers.
- Pending user review list.
- Cross-device synchronization status.
- Module or milestone progress.
- Last update metadata.

## Update Triggers

Update `STATE.md` when:

- A stage starts, completes, or blocks.
- A cross-review starts or completes.
- A module or milestone completes.
- The user must make a decision.
- The local product repository or related mirror repository changes commit.
- A new device takes over the workspace.

## Cross-device Sync Fields

Track at least:

- `source`: current source commit hash.
- `deployment`: selected deployment version when relevant.
- Public release repository: latest known published commit when relevant.
- Working tree cleanliness.

## Blocker Rule

If work cannot continue without user input or a protocol-level decision, set:

```yaml
status: BLOCKED
```

Then list:

- Blocker description.
- Required decision.
- Last safe completed step.
- Recovery or resume path.

## Derived State Mirror Rule

PM-Pilot's `.pmagent/current-state.json` shows the value of a machine-readable state surface. pm-zero adopts the derived mirror principle, not the PM-Pilot implementation.

`STATE.md` remains canonical. A future `STATE.json`, dashboard, hook surface, or API payload may be generated from `STATE.md`, but it must not become a second human-authored source of truth.

If `STATE.md` and a generated mirror disagree:

1. `STATE.md` wins.
2. The mirror must be regenerated or marked stale.
3. No release, publish, or stage-completion gate may be unblocked by mirror data alone.

Minimum derived mirror fields, if implemented:

- current stage and task
- active constraints
- blocked actions
- manifest version pin
- pending review queues
- active fallbacks
- last-stable hash metadata
- updated timestamp and generator version

The mirror may be committed only if the project explicitly decides it is useful for cross-device handoff or validator performance. Otherwise it should be generated locally.

