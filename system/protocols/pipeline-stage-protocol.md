---
id: contract-pipeline-stage-protocol
title: Pipeline stage protocol
tags: [contract, pipeline, stage, product-workflow]
created: 2026-05-20
updated: 2026-05-20
status: active
version: 1.0.0
publish_scope: public
lifecycle: stable
external_readiness: ready_for_brand_review
brand_review_status: pending_brand_review
---

# Pipeline Stage Protocol

## Purpose

Define the main pm-zero product workflow as a four-stage pipeline:

1. idea/MRD
2. visual interaction spec
3. interactive Demo
4. PRD

This protocol is stage-structural. It does not prescribe a runtime controller or implementation script.

## Stage 1: idea/MRD

### Inputs

- User intent, problem statement, or product opportunity.
- Relevant user-provided materials.
- Accepted process inputs from `process-input-protocol.md`.

### Outputs

- MRD or idea brief using `templates/MRD.template.md`.
- Evidence-graded assumptions for market, user, and value claims.
- Open decision list for the next stage.

### Exit criteria

- Core user, pain point, scope boundary, and unresolved assumptions are explicit.
- Evidence grades are applied where claims affect direction.
- User confirms the MRD/idea stage output.

### Cross-review profile

- `generic-critic`
- `pragmatic-advocate`

## Stage 2: visual interaction spec

### Inputs

- Confirmed idea/MRD output.
- Scenario anchoring output from design-forge references.
- Accepted process inputs relevant to user flow or interaction requirements.

### Outputs

- Visual interaction spec in the allowed shape defined by `interaction-spec-protocol.md`.
- Element list and information architecture.
- Links back to the source idea/MRD.

### Exit criteria

- User confirms scenario anchoring.
- User confirms the interaction spec version before Demo work begins.
- Interaction spec links to the idea/MRD source.

### Cross-review profile

- `generic-critic`
- `pragmatic-advocate`

## Stage 3: interactive Demo

### Inputs

- Confirmed interaction spec.
- Reference Demo files when available.
- Demo reuse and batch-output references from design-forge.

### Outputs

- Interactive Demo artifact.
- `element-mapping.md` mapping interaction-spec elements to Demo elements.
- Explicit list of any `Demo-filled` states or boundary values.

### Exit criteria

- Demo structure, UI element list, and information architecture conform to the confirmed interaction spec.
- Any Demo-filled items are labeled for later interaction-spec backfill.
- User confirms the Demo before PRD work begins.

### Cross-review profile

- `generic-critic`
- `security-skeptic`

## Stage 4: PRD

### Inputs

- Confirmed idea/MRD.
- Confirmed interaction spec.
- Confirmed Demo and element mapping.
- Accepted process inputs relevant to product requirement decisions.

### Outputs

- PRD artifact routed by PRD type.
- Evidence-graded product, user value, business, and metric claims.
- PRD §5 element table cross-linked to interaction-spec `element-mapping.md`.

### Exit criteria

- PRD references both the idea/MRD and interaction spec.
- PRD §5 element table and Demo `element-mapping.md` are mutually checkable.
- User confirms the PRD as delivery-ready or returns it for revision.

### Cross-review profile

- `generic-critic`
- `pragmatic-advocate`
- `architect-critic`

## User Confirmation Gates

Every stage output requires explicit user confirmation before the next stage starts. This is a protocol-level gate. The receiving agent may prepare notes or review records, but it must not treat a stage as complete until the user confirms the stage output.

Confirmation must state at minimum:

- Which artifact/version is being confirmed.
- Which next stage becomes eligible.
- Any known caveats that remain unresolved.

## Bidirectional Link Requirements

- Visual interaction specs must link to the idea/MRD source.
- Demos must link to the interaction spec they implement.
- PRDs must link to the interaction spec and Demo element mapping.
- If PRD changes invalidate interaction decisions, the workflow must return to the interaction spec stage for a new version.

