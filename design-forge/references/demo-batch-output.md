# Demo Batch Output

- Status: active reference
- Scope: design-forge Demo stage
- Source lineage: magi-product batch output rules
- Publish scope: private-mirror

## Purpose

Prevent Demo generation from becoming one oversized artifact that is hard to review or iterate.

## Batch Rules

- More than 3 modules: split into batches.
- More than 500 lines expected: split into batches.
- Single output should not exceed 800 lines unless the user explicitly accepts the tradeoff.
- Multi-device output should use one HTML per device class.
- Multi-function output should use one HTML per coherent function group.

## Batch Metadata

Each batch should state:

- Batch number.
- Covered modules.
- Dependency on previous batches.
- Known follow-up batch if incomplete.

## Cross-review Use

Reviewers should inspect each batch independently and then inspect cross-batch navigation consistency.
