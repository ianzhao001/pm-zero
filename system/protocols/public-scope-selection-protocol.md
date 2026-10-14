# Public Scope Selection Protocol

## Purpose

Define how pm-zero selects repository entries for `publish_scope=public` before any public repository write exists. Public scope is not a convenience flag; it is a maintenance and disclosure commitment.

## Evaluation Dimensions

Every candidate entry must be evaluated across five dimensions:

1. **Independent readability**: can an external reader understand the artifact without private journal context?
2. **Legal necessity**: is the artifact required or expected for public distribution, such as license terms?
3. **Brand consistency**: does the artifact match the intended external tone and positioning?
4. **Maintenance commitment**: can pm-zero keep this artifact accurate after public release?
5. **Reverse exposure risk**: could the artifact reveal private workflow, user-specific data, or unready internal commitments?

## Evaluation Levels

- **MUST**: required for v1.0 public release.
- **SHOULD**: valuable soon, but not mandatory for first public push.
- **COULD**: useful optional material after v1.0.
- **DEFERRED**: intentionally delayed until another condition is met.
- **WONT**: should not become public in the current product shape.

## Traceability Requirement

Each manifest entry must have an explicit public-scope decision row with:

- entry path
- current `publish_scope`
- recommended target `publish_scope`
- evaluation level
- reason for inclusion or exclusion
- follow-up notes when the decision is temporary

The decision table is stored at `docs/internal/public-scope-decision-table.md`.

## Selection Rule

Only entries marked `MUST` may be upgraded to `publish_scope=public` during the same task. `SHOULD`, `COULD`, and `DEFERRED` entries remain private or product-only until a later decision explicitly promotes them.

## Cross-reference

- `pm-zero.manifest.json`
- `system/protocols/manifest-protocol.md`
- `docs/internal/public-scope-decision-table.md`

