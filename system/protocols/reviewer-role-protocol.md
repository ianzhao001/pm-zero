---
id: contract-reviewer-role-protocol
title: Reviewer role protocol
tags: [contract, reviewer, skill, registry]
created: 2026-05-20
updated: 2026-05-20
status: active
version: 1.0.0
---

# Reviewer Role Protocol

Reviewer roles are internal role packages loaded by review workflows. They are not host-discoverable skills.

## Required File List

Each reviewer role directory must contain:

- `role.md`: role identity, selection guidance, stance, review dimensions, and output requirements.
- `references/`: detailed review dimensions or role method notes.
- `templates/`: at least one review record template matching `review-record-schema.md`.

Optional files:

- `examples/`: canonical review records.
- `scripts/`: deterministic validation helpers.

## role.md Metadata

Required fields:

```yaml
---
id: <role-id>
status: native | mock
stance: critic | advocate | neutral
dimensions_focus: evidence,logic,boundary,ux,feasibility,business
version: 1.0.0
---
```

Field rules:

- `id`: stable role ID, lowercase kebab-case.
- `status`: native or mock role classification.
- `stance`: the role's default review stance.
- `dimensions_focus`: comma-separated dimensions the role can review.
- `version`: SemVer string.

Optional role-only fields:

- `distillation_source`: `boss-distilled`, `self-distilled`, `human-authored`, or `hybrid`.
- `source_identity`: source person, team, or method family when a distilled role is allowed.
- `critique_style`: short style label, such as `strict`, `Socratic`, or `operator`.
- `risk_level`: `safe`, `caution`, or `review`.
- `requires_user_approval`: boolean for roles that encode sensitive or opinionated behavior.

## Loading Rules

Stage skills load reviewer roles on demand:

1. Read the stage output and required context.
2. Read `cross-review-protocol.md`.
3. Load default reviewer roles unless the user or stage contract selects different roles.
4. Keep reviewer outputs independent until each required review record is written.
5. Run PM merge only after all required records exist.

Reviewer roles must not perform PM synthesis. They only produce review records.

## Registration

Every role must be listed in `out/reviewers/README.md` with:

- Role ID.
- Stance.
- Dimension focus.
- Directory path.
- Recommended use.

New roles are inactive until registered.

