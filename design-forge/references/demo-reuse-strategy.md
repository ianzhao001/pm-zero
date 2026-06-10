# Demo Reuse Strategy

- Status: active reference
- Scope: design-forge Demo stage
- Source lineage: magi-product `lead-pm-prompt.md` B.1-B.4
- Publish scope: private-mirror

## Purpose

When a reference Demo exists, the host Agent should reuse structure and make the smallest coherent change rather than starting from scratch.

## Rules

1. Copy the reference file before editing.
2. Preserve confirmed information architecture unless the user asks otherwise.
3. Preserve CSS variables and token naming where possible.
4. Preserve stable page chrome and navigation patterns.
5. Prefer deleting irrelevant modules over redesigning the entire hierarchy.
6. If multiple Demo files are needed, keep each file focused on one device, surface, or feature cluster.

## Information Architecture Downgrade

A complex reference Demo can be simplified for the current task. Downgrade by removing layers, not by inventing a new IA without reason.

## Review Evidence

Record what was reused and what changed. This note should be available to cross-review.
