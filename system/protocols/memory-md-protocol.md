---
id: contract-memory-md-protocol
title: MEMORY.md protocol
tags: [contract, memory, append-only]
created: 2026-05-20
updated: 2026-05-20
status: active
version: 1.0.0
---

# MEMORY.md Protocol

`MEMORY.md` is the append-only discussion and decision timeline for a pm-zero workspace.

## Append-only Rule

Do not rewrite historical entries. If an entry is wrong, append a correction entry with a timestamp and a link to the original entry.

## Append Triggers

Append an entry when:

- A session ends.
- A major decision is made.
- A cross-review completes.
- A stage output changes status.
- A blocker is opened or cleared.
- A notable implementation workaround or protocol exception occurs.

## Entry Format

```markdown
## <ISO 8601 timestamp> | <type>

Summary: <one or two sentences>

Related:
- `<file-or-artifact>`
- `<commit-or-review-record>`
```

Allowed `type` values:

- `session`
- `decision`
- `review`
- `stage`
- `blocker`
- `handoff`
- `sync`
- `correction`

## Relationship To Repository Memory

Workspace `MEMORY.md` is a fast local timeline. It does not replace `.memory/`; durable project knowledge and ADRs still live under `.memory/` and stay indexed by `.memory/INDEX.md`.
