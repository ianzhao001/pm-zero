# PRD Type Routing

- Status: active reference
- Scope: prd-forge PRD stage
- Source lineage: magi-product `lead-pm-prompt.md` A.2

## Purpose

Route PRD work by product document type so the document emphasizes the right evidence, scope, and structure.

| PRD type | Primary focus | Demo applicability | Section trimming guidance |
|---|---|---|---|
| Functional | User flow, UI behavior, acceptance criteria | Usually applicable | Keep UI/flow sections full; trim strategy if not needed |
| Strategy | Business logic, positioning, decision rationale | Optional, often not required | Emphasize rationale, metrics, rollout, risks |
| Fix | Existing issue, root cause from user perspective, expected correction | Use only if visual behavior changes | Keep scope narrow; emphasize before/after and acceptance criteria |
| Architecture | Product-level system shape, boundaries, operational model | Rarely required | Avoid technical implementation; focus product-facing capability and boundary |

## Routing Rule

Before drafting the PRD, state the selected type and why. If multiple types apply, choose a primary type and list secondary influences.
