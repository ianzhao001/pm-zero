# PRD Rationale vs Implementation Boundary

- Status: active reference
- Scope: prd-forge PRD stage
- Source lineage: magi-product product-vs-technical boundary

## Purpose

Keep PRD content focused on product requirements rather than technical implementation details.

## PRD Should Include

- User operation path.
- Product behavior visible to users or operators.
- Business rules.
- Acceptance criteria.
- Response expectations stated in product language.
- Configuration requirements from the product perspective.

## PRD Should Not Include

- Signal paths.
- CAN/LIN or communication protocol choices.
- Chip or SoC selection.
- Bus speed such as 500kbps.
- Motor response implementation details.
- Backend architecture diagrams that are not product-facing.

## Boundary Rule

If a detail is necessary for engineering implementation but not necessary for product acceptance, move it to an engineering design document or mark it as out of PRD scope.
