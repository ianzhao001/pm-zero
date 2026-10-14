---
id: generic-critic-demo-dimensions
title: Stage 3 demo review dimensions
tags: [reviewer, critic, stage-3, demo]
created: 2026-05-20
updated: 2026-05-20
status: active
version: 1.0.0
---

# Stage 3 Demo Review Dimensions

Use these checks for runnable demos, clickable prototypes, and prototype HTML.

## Interactivity

- Can the primary path be exercised without reading external instructions?
- Are click targets obvious and stable?
- Do transitions preserve context?
- Do controls produce visible feedback?

## Visual Consistency

- Are layout, spacing, typography, color, and component patterns consistent?
- Does the demo introduce one-off UI that the design system does not explain?
- Does text fit on expected desktop and mobile viewports?
- Are visual states distinguishable without relying only on color?

## Boundary Cases

- Does the demo show empty, loading, error, and edge states when relevant?
- Does it handle repeated clicks, backtracking, and alternate paths?
- Are fake values labeled or clearly used as placeholders?

## Runnable Quality

- Does the demo actually run as a standalone artifact?
- Are console-breaking syntax errors absent?
- Are external assets necessary, or can the demo degrade gracefully?
- Does the demo expose technical debt that would mislead a PM review?
