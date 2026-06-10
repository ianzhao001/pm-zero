# Scenario Anchoring

- Status: active reference
- Scope: design-forge interaction-spec stage
- Source lineage: magi-product `lead-pm-prompt.md` A.0
- Publish scope: private-mirror

## Purpose

Before visual interaction work begins, the host Agent must produce a scenario understanding and wait for user confirmation.

## Required Scenario Fields

1. User who will operate the product.
2. People explicitly not being designed for in this round.
3. Core user need.
4. Operating environment.
5. Hardware or system context involved.
6. Functional scope for this round.
7. Suggested target level or fidelity.
8. Signal-interface reservation, if relevant, without turning it into technical design.

## Confirmation Gate

The interaction spec stage cannot start until the user confirms the scenario anchor or asks for a revision.

## Output Shape

Use short bullets. Do not generate screens, Demo code, or PRD content in the anchoring step.
