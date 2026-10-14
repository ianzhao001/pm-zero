---
id: contract-pipeline-format-validator
title: Pipeline format validator
tags: [contract, pipeline, format, validation]
created: 2026-05-20
updated: 2026-05-20
status: active
version: 1.0.0
publish_scope: public
lifecycle: stable
external_readiness: ready_for_brand_review
brand_review_status: pending_brand_review
source_lineage: magi-product/SKILL.md and lead-pm-prompt.md
---

# Pipeline Format Validator

## Purpose

Define protocol-level format validation rules for pm-zero pipeline artifacts. This document intentionally does not implement scripts. Use the installed runtime validators for executable checks.

## Validation Pattern Catalog

### Distilled from magi-product

| Pattern group | Pattern examples | Intended interception |
|---|---|---|
| ASCII box diagrams | `[┌└│├┬┴─]` | PRD or MRD artifacts must not include terminal-style UI diagrams as a substitute for clear requirements |
| Technical implementation detail | `CAN|LIN|SoC|500kbps|电机响应|芯片选型|信号路径|通信协议` | PRD/MRD must not drift into implementation design or hardware protocol selection |

### pm-zero native additions

| Pattern group | Pattern examples | Intended interception |
|---|---|---|
| Interaction placeholder copy | `lorem ipsum|Lorem ipsum|TODO copy|placeholder text` | Interaction specs must not ship filler content as if it were product language |
| PRD unfinished markers | `TODO|TBD|待补|待确认` | PRD final/review states must not hide unresolved work inside body text |
| Demo debug leftovers | `console\.log\(|debugger;|alert\("debug` | Demo artifacts must not ship obvious debug statements |

## Per-stage Matrix

| Stage | ASCII diagrams | Technical details | Placeholder copy | PRD TODO markers | Demo debug leftovers |
|---|---:|---:|---:|---:|---:|
| idea/MRD | warn | fail for product claims | warn | warn | n/a |
| visual interaction spec | n/a | warn | fail | warn | n/a |
| interactive Demo | n/a | warn | warn | n/a | fail |
| PRD | fail | fail | warn | fail | n/a |

## Interpretation Rules

- `fail` means the artifact cannot pass the stage exit gate until corrected or explicitly waived by the user.
- `warn` means the reviewer must inspect and decide whether the issue is acceptable.
- `n/a` means the pattern does not apply to the stage.

## Script Boundary

This protocol is only a specification. It does not create grep scripts, validators, watchdogs, or runtime guards.

