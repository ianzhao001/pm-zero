---
id: contract-process-input-protocol
title: Process input protocol
tags: [contract, process-input, observation, consent]
created: 2026-05-20
updated: 2026-05-21
status: active
version: 1.1.0
publish_scope: public
lifecycle: stable
external_readiness: ready_for_brand_review
brand_review_status: pending_brand_review
source_lineage: PM-Pilot observation plan-ingest separation
---

# Process Input Protocol

## Purpose

Define how pm-zero receives process inputs without letting external or remote signals directly overwrite active artifacts.

This protocol has two channels:

1. Push channel: user actively provides input.
2. Pull channel: pm-zero proactively requests or fetches input.

## Push Channel

The push channel is used when the user actively provides material such as:

- Meeting notes.
- Emails.
- Documents.
- Screenshots.
- Research excerpts.
- User-pasted text.

Flow:

```text
ingest -> review -> accept/reject/snooze -> influence artifact
```

No proactive-action confirmation gate is required because the user initiated the input.

## Pull Channel

The pull channel is used when pm-zero or the host Agent initiates external acquisition.

Flow:

```text
plan -> user confirmation gate -> execute -> ingest -> review -> accept/reject/snooze -> influence artifact
```

The user confirmation gate must follow `proactive-action-consent-protocol.md`.

## Observation Plan Record

Before a pull-channel acquisition starts, pm-zero must create or display an observation plan. The plan is advisory until the user confirms it.

Minimum fields:

```json
{
  "schema_version": 1,
  "run_id": "<stable run id>",
  "source": "<source or source class>",
  "target_stage": "idea_mrd|interaction_spec|demo|prd|review|maintenance",
  "target_artifact": "<path or artifact id>",
  "questions": ["<what needs evidence>"],
  "known_context": ["<already loaded context references>"],
  "proactive_consent_required": true,
  "raw_findings_path": "<planned raw-findings.jsonl path>",
  "review_queue_path": "<planned review queue path>"
}
```

This shape is distilled from PM-Pilot's `observe plan -> raw-findings.jsonl -> observe ingest` boundary and generalized for pm-zero. The plan must not mutate active product artifacts.

## Pull Trigger Whitelist

Pull can be proposed only in the following cases:

### Periodic triggers

- Entering idea/MRD stage.
- Interaction spec iteration point.
- PRD preparation before dev-readiness.

### Event triggers

- Cross-review finds insufficient evidence for a D/E-grade claim.
- PRD stage finds missing competitor or market comparison.
- User explicitly asks pm-zero to acquire external process input.

## Raw Findings JSONL Schema

The ingest format is JSONL: one finding per line.

Each line must contain:

```json
{
  "source": "<source id or path>",
  "title": "<finding title>",
  "url": "<url or empty string>",
  "summary": "<short summary>",
  "evidence": "<evidence excerpt or reference>",
  "confidence": "high|medium|low"
}
```

This shape is distilled from PM-Pilot's delegated observation plan and generalized for pm-zero.

Raw findings are evidence inputs, not product decisions. They may be written by a human, host Agent, delegated Agent, or future runtime, but they must enter review before affecting active artifacts.

## Review Queue States

Every ingested finding must enter one of three review decisions:

- `accept`: finding can influence active artifacts.
- `reject`: finding is not used.
- `snooze`: finding is not used now but may be reconsidered later.

Only accepted findings may affect active artifacts.

## Review Decision Record

Each finding decision must be durable enough to audit later. A review decision record may be one Markdown file per finding, one JSONL line per finding, or a table in a review artifact, but it must include:

- finding id or source line reference
- decision: `accept`, `reject`, or `snooze`
- reviewer or decision owner
- rationale
- target stage or artifact, if accepted
- follow-up action, if any

Accepted findings must name how they influence an active artifact. Rejected and snoozed findings must remain traceable but must not silently disappear.

## Project / Workspace Boundary

PM-Pilot separates project-level observation logs from workspace-level candidate updates. pm-zero adopts the same boundary as a protocol rule:

- project-level raw findings may describe broad external signals
- workspace-level review decisions decide whether a signal matters to a specific output
- active artifacts change only after a workspace-level accept decision

This avoids treating every external signal as immediately relevant to the current PRD, Demo, or decision.

## Canonical Invariant

External signals, remote changes, or process inputs must never directly overwrite active artifacts such as idea/MRD, interaction specs, Demos, or PRDs.

All process inputs must pass through review before they influence active outputs.

## Runtime Non-mutation Rule

Any future observation runner, delegated Agent, hook, or external connector must be constrained to:

1. create a plan
2. write raw findings
3. call or hand off to ingest/review

It must not directly edit idea/MRD, interaction spec, Demo, PRD, `STATE.md`, or other canonical artifacts as part of the acquisition step.

## Non-implemented in v1.1.0

This protocol does not implement:

- Trigger engine.
- Plan generator.
- Execute scheduler.
- External source connector.
- Review queue script.

