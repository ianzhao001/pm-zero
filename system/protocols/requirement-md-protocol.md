---
id: contract-requirement-md-protocol
title: REQUIREMENT.md protocol
tags: [contract, requirement, scope]
created: 2026-05-20
updated: 2026-05-20
status: active
version: 1.0.0
---

# REQUIREMENT.md Protocol

`REQUIREMENT.md` is the active project requirement profile.

## Required Sections

Use numbered sections and explicit lifecycle markers:

```markdown
## 1. Project Identity [active]
## 2. Target Users [active]
## 3. Core Pain [active]
## 4. Scope Boundaries [active]
## 5. Key Decisions [active]
## 6. Historical Archive [active]
```

Allowed markers:

- `[active]`: default loaded requirement.
- `[deprecated]`: retained for audit, ignored by default.

## Progressive Accumulation

When requirements evolve:

1. Do not delete old sections.
2. Mark obsolete sections `[deprecated]`.
3. Add the new active section below or replace the section body with a dated active update while preserving the deprecated text in history.
4. Link major changes to `MEMORY.md` entries.

## Archive Rule

For large rewrites, move the old version to:

```text
requirements-archive/<YYYY-MM-DD>-<slug>.md
```

Then add a pointer in `## 6. Historical Archive [active]`.

## Loading Rule

Agents load active sections by default. Deprecated sections are read only when:

- The user asks for history.
- A conflict depends on the older decision.
- A review needs to compare old and new scope.
