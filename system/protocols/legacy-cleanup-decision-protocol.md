# Legacy Cleanup Decision Protocol

## Purpose

Define how Codex handles legacy configuration, old path rules, and historical compatibility branches encountered during goal-mode execution.

## Required Flow

1. **Discover legacy**: record the legacy rule, path, or behavior in `.memory/pending.md` unless the current task already authorizes cleanup.
2. **Assess impact**: identify what depends on the legacy item and whether it conflicts with current protocols.
3. **Record decision**: create a decision record under `.memory/legacy-cleanup-decisions/` with context, impact, action, and rollback path.
4. **Implement cleanup**: make the smallest safe change and update validators when relevant.
5. **Journal the action**: append a short audit note to `.memory/journal/<date>.md`.
6. **Reference decision in commit**: commit messages for legacy cleanup must mention the decision record path or ID.

## Severity Guidance

- Blocking legacy: conflicts with current required behavior or publish safety.
- Deferred legacy: harmless but confusing; keep a deadline.
- Archived legacy: intentionally retained as historical fixture.

## Cross-reference

- `system/protocols/fallback-deadline-protocol.md`
- `.memory/legacy-cleanup-decisions/`

