---
id: contract-third-party-skill-protocol
title: Third-party skill protocol
tags: [contract, skill, extension-channel, stage-mount]
created: 2026-05-20
updated: 2026-05-21
status: active
version: 1.1.0
publish_scope: public
lifecycle: stable
external_readiness: ready_for_brand_review
brand_review_status: pending_brand_review
---

# Third-party Skill Protocol

## Purpose

Define how pm-zero can accept third-party skill packages at a coarse granularity without importing their runtime implementation or fine-grained step system.

## Access Granularity

pm-zero uses package-level declaration plus stage-level mounting.

- Package-level declaration: the third-party skill declares its role, prompts, compatible stages, and contract touchpoints.
- Stage-level mounting: the user chooses which pipeline stages the package may affect.
- Fine-grained PM-Pilot-style step merging is out of scope for the current public release line.

## PM-Pilot Step Library Boundary

PM-Pilot includes fine-grained workflow steps, an executor registry, hooks, and delegated observation runtime. pm-zero absorbs the design boundary but does not import those runtime pieces into public v1.0.

Allowed absorption:

- package-level skill declarations
- stage-level mounting semantics
- advisory next-step recommendations
- process-input plans and accepted findings

Not allowed without a separate runtime decision:

- importing PM-Pilot `skills/steps/` as executable pm-zero steps
- adding a step planner that chooses steps automatically
- adding an executor registry or backend abstraction
- adding hook/event handlers that block tool calls
- allowing third-party packages to mutate canonical artifacts without explicit stage confirmation

This keeps pm-zero reviewable as a protocol-first system while preserving PM-Pilot's stronger runtime ideas for a future fork or runtime layer.

## Required Package Structure

A third-party skill package must contain:

1. `SKILL.md`
   - Declares dispatch rules.
   - Declares when the skill should be considered.
   - Declares whether it can produce proactive actions.
2. Prompt files
   - Define role behavior.
   - Must be named and documented clearly enough for review.
3. Manifest fragment
   - Declares `applicable_stages`.
   - Declares version.
   - Declares dependencies.
   - Declares touchpoints with pm-zero shared contracts.

## Manifest Fragment Shape

```json
{
  "skill_id": "example-skill",
  "version": "1.0.0",
  "applicable_stages": ["idea_mrd", "interaction_spec", "demo", "prd"],
  "dependencies": [],
  "contract_touchpoints": [
    "pipeline-stage-protocol",
    "proactive-action-consent-protocol"
  ]
}
```

## Mounting Semantics

When mounting a third-party skill, the user may choose any subset of the declared `applicable_stages`. A mounted skill is active only for those stages.

Example:

- Package declares: `idea_mrd`, `interaction_spec`, `demo`, `prd`.
- User mounts only: `interaction_spec`, `demo`.
- Result: skill must not affect idea/MRD or PRD stage outputs.

## Conflict Handling

If multiple third-party skills are mounted for the same stage, pm-zero must ask the user to explicitly decide priority. v1.0.0 does not define automatic synthesis rules.

The minimum conflict decision must state:

- Which skills conflict.
- Which stage is affected.
- Which skill takes priority.
- Whether lower-priority skills are disabled or used as advisory input only.

## Relationship to Active Skills

Third-party skills may override pm-zero default active skills such as `design-forge` or `prd-forge`, but only with explicit user confirmation.

Without explicit override confirmation:

- pm-zero active skills remain primary.
- third-party output is advisory only.

## Consent Boundary

Mounting a third-party skill is user-initiated and does not itself require `proactive-action-consent-protocol.md`.

After mounting, any proactive behavior initiated by that third-party skill still must pass through `proactive-action-consent-protocol.md`.

## Non-goals

- External Skills require explicit installation and capability registration.
- No package loader is implemented.
- No runtime dispatch or step engine is introduced.

