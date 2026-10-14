---
id: contract-proactive-action-consent-protocol
title: Proactive action consent protocol
tags: [contract, consent, active-action, user-gate]
created: 2026-05-20
updated: 2026-05-20
status: active
version: 1.0.0
publish_scope: public
lifecycle: stable
external_readiness: ready_for_brand_review
brand_review_status: pending_brand_review
---

# Proactive Action Consent Protocol

## Purpose

Define a cross-cutting consent rule for actions initiated by pm-zero or the host Agent. User-provided input may be received without an extra confirmation gate, but pm-zero-initiated external action requires explicit user consent.

## Core Principle

If pm-zero or its host Agent initiates an action that reaches outside the current accepted context, it must first ask for explicit user confirmation.

If the user actively provides the input or manually mounts the capability, the input may be ingested without an additional proactive-action consent gate.

## Proactive Actions Requiring Confirmation

The following actions require consent before execution:

- Proactively searching external signals.
- Proactively pulling competitor or market materials.
- Proactively invoking a third-party skill package.
- Proactively delegating to a sub-agent.
- Proactively contacting or querying an external system.

## Passive Receipt Not Requiring Confirmation

The following inputs are user-initiated and do not require an additional consent gate:

- User uploads a file.
- User pastes text into the working context.
- User manually mounts a third-party skill.
- User explicitly names a source and asks pm-zero to use it in the current task.

## Minimum Consent Prompt

Before a proactive action, the user must be able to see:

1. What pm-zero intends to do.
2. Why the action is needed.
3. Which stage or artifact the action may affect.
4. Where the action output will be recorded.
5. Whether any external system, third-party skill, or sub-agent is involved.

## Scope

This protocol is cross-cutting. It is referenced by:

- `process-input-protocol.md`
- `third-party-skill-protocol.md`
- future observation or runtime proposals

## Non-goals

- This protocol does not implement a runtime prompt.
- This protocol does not replace user confirmation gates between pipeline stages.
- This protocol does not authorize secret or token access.

