---
id: contract-review-record-schema
title: Review record schema
tags: [contract, review, schema, yaml]
created: 2026-05-20
updated: 2026-05-20
status: active
version: 1.0.0
---

# Review Record Schema

Review records are Markdown files with a YAML block as their primary machine-readable payload. A short narrative summary may follow the YAML block, but the YAML block is authoritative.

## Required YAML Shape

```yaml
schema_version: 1.0.0
reviewer: <role-id>
target: <reviewed-file-path>
target_version: <git commit hash or sha256>
stance: critic | advocate | neutral
reviewed_at: <ISO 8601 timestamp>
context_loaded:
  - REQUIREMENT.md@<hash>
  - <other-context>@<hash>
dimensions:
  - dim: evidence | logic | boundary | ux | feasibility | business
    severity: high | medium | low
    finding: <specific finding>
    evidence: <file+line reference or external link>
    suggestion: <specific suggestion>
overall:
  blocking: true | false
  summary: <one-sentence overall judgment>
```

## Field Definitions

`schema_version`
: Required. Schema version this review record conforms to. Used by future preflight validation to apply the correct schema.

`reviewer`
: Required. Stable reviewer role ID, such as `generic-critic` or `generic-advocate`.

`target`
: Required. Path to the reviewed artifact, relative to the workspace root when possible.

`target_version`
: Required. Git commit hash, blob hash, or sha256 identifying the reviewed version. Use a sha256 when the target is uncommitted or generated in an isolated demo workspace.

`stance`
: Required. Enumerated value.

Allowed values:

- `critic`: defect-first review.
- `advocate`: value-preserving review.
- `neutral`: balanced review used only for third-role arbitration.

`reviewed_at`
: Required. ISO 8601 timestamp with timezone when available, for example `2026-05-20T01:30:00+08:00`.

`context_loaded`
: Required. List of context files and their hashes. Must include `REQUIREMENT.md@<hash>`. Add `STATE.md@<hash>`, `MEMORY.md@<hash>`, stage contracts, and stage dimensions when used.

`dimensions`
: Required. One or more dimension findings. If the reviewer found no new issue, include one low-severity dimension item explaining the positive or no-new-issue result.

`dimensions[].dim`
: Required. Enumerated review dimension.

Allowed values:

- `evidence`: support, source quality, and assumption labeling.
- `logic`: reasoning chain, consistency, and missing steps.
- `boundary`: scope, edge cases, error paths, and state coverage.
- `ux`: user path, information architecture, and operation cost.
- `feasibility`: technical, resource, dependency, and execution realism.
- `business`: prioritization, ROI logic, and strategic fit.

`dimensions[].severity`
: Required. Enumerated severity.

Allowed values:

- `high`: can block stage completion or mislead a major decision.
- `medium`: should be fixed or explicitly accepted before final delivery.
- `low`: improvement, clarification, or positive preservation note.

`dimensions[].finding`
: Required. Concrete finding. Avoid vague labels such as "unclear" without naming the exact missing information.

`dimensions[].evidence`
: Required. Evidence reference. Prefer `file.md:12` or `file.html:42`. Use an external link only when the finding depends on an external source.

`dimensions[].suggestion`
: Required. Specific action the PM can take.

`overall`
: Required. Object containing the blocking flag and one-sentence summary.

`overall.blocking`
: Required. Boolean. `true` means the PM cannot report the stage as complete until the blocker is resolved or explicitly accepted by the user.

`overall.summary`
: Required. One sentence that captures the review result and PM action implication.

## Optional Narrative

Reviewers may add a short `## Notes` section after the YAML block. It must not contradict the YAML payload.

