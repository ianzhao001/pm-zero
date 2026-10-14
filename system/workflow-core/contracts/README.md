# Workflow core contract snapshot

This directory is the production snapshot of the machine-readable design-workflow v2 contract baseline adopted by the experimental workflow core.

- The historical source remains frozen. Runtime code reads this directory only.
- `artifact-dag.json` is the runtime source for artifact types, dependency edges, gate targets, impact order, and invalidation closure.
- The original six JSON Schemas describe change requests, design models, gate records, recipes, render manifests, and the derived workflow-state cache.

`change-request.schema.json` is the frozen historical change-request contract and remains unchanged. `eight-stage-change-request-v1.schema.json` is the versioned contract for eight-stage changes. It keeps `schema_version` at `1` and preserves the shared request fields while requiring `scope` and an `entry_artifact` reference. Artifact scope requires empty target and preserve ID arrays; element scope requires at least one target ID. The runtime tool schema reuses its shared properties while keeping the two eight-stage fields optional for legacy callers. Core validation binds `entry_artifact` to the exact current, non-stale deliverable and retains the stage-specific scope checks.

The runtime adds stricter production controls around that snapshot: content-bound request idempotency, optimistic revision checks, path and symlink confinement, immutable version snapshots, gate-specific open questions, grade-appropriate evidence sources, two independent review perspectives per gate target, explicit user-response audit evidence, and fail-closed render verification. These controls are documented in the parent `README.md` and tested under `test/`.

`validation-report.schema.json` is the versioned independent-check report contract added for verification policy 2. It is not part of the frozen historical baseline.

Recovery and candidate-editing tool inputs are strict runtime contracts in `../lib/schemas.mjs`; they do not revise the frozen historical change-request schemas. `project_diagnose` reports readability, planning availability and writability independently and performs no derived-cache writes. Recovery is split into a read-only preview and a user-confirmed apply operation that rechecks the scene.

Candidate operations preserve the existing formal baseline during trial editing. Preview and whole-package acceptance bind the baseline, candidate bytes and affected scope; a changed baseline cannot be silently merged or accepted. Acceptance records a draft import with `candidate_import.status: "pending_validation"`, not an inherited verification result. Ordinary artifact registration still supplies current execution provenance and applicable evidence before confirmation. In stepped projects, candidate acceptance does not select a step or replace separate step/stage confirmation.

## Six-stage standard

`product-design-six-stage-v1.json` is the new-project default. It has its own workflow ID, S6 endpoint and normal-product-flow scope; it does not replace the eight-stage file or existing project snapshots. Six-stage stepped projects compile a separate definition from this contract. Source provenance and versioned change requests are shared with other product-stage workflows; their validation is derived from the active frozen definition.
