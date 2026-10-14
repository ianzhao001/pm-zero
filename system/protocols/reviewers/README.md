---
id: reviewers-registry
title: Reviewer registry
tags: [reviewer, registry, cross-review]
created: 2026-05-20
updated: 2026-05-20
status: active
version: 1.0.0
---

# Reviewer Registry

This directory registers reviewer roles used by `cross-review-protocol.md`.

## Registered Roles

| Role ID | Stance | Dimension Focus | Path | Recommended Use |
|---|---|---|---|---|
| `generic-critic` | `critic` | evidence, logic, boundary, ux, feasibility, business | `out/reviewers/generic-critic/` | Default defect-first review for stage outputs. |
| `generic-advocate` | `advocate` | evidence, logic, boundary, ux, feasibility, business | `out/reviewers/generic-advocate/` | Deprecated value-preserving reviewer; use pragmatic-advocate for new work. |
| `boss-distilled-mock` | `critic` | evidence, logic, boundary | `out/reviewers/boss-distilled-mock/` | Mock interface validation role; not a real boss-distilled persona. |
| `architect-critic` | `neutral/critic` | coupling, boundary, extensibility, replaceability, testability | `out/reviewers/architect-critic/` | Architecture and ADR review. |
| `pragmatic-advocate` | `advocate` | delivery cost, reuse, simplicity, reversibility, MVP feasibility | `out/reviewers/pragmatic-advocate/` | Scope and over-engineering review. |
| `security-skeptic` | `critic` | credentials, visibility, trust boundary, auditability, failure modes | `out/reviewers/security-skeptic/` | Publish, token, visibility, and cross-device review. |

## Adding A Role

1. Create `out/reviewers/<role-id>/`.
2. Add `SKILL.md`, `references/`, and `templates/`.
3. Follow `system/protocols/reviewer-role-protocol.md`.
4. Add the role to this registry.
5. Run a demo review before making the role a default reviewer.

## Call Example

```text
Cross-review target: workspaces/acme/stage-2/interaction-draft.md
Required context: REQUIREMENT.md, STATE.md
Reviewers: generic-critic, generic-advocate
Record path: workspaces/acme/reviews/stage-2-2026-05-20T01-30-00.md
PM action: merge findings, update MEMORY.md, update STATE.md
```
