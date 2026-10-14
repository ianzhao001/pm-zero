---
id: template-review-record-generic-critic
title: Generic critic review record template
tags: [template, review, critic]
created: 2026-05-20
updated: 2026-05-20
status: active
version: 1.0.0
---

# Review Record

```yaml
reviewer: generic-critic
target: <reviewed-file-path>
target_version: <git commit hash or sha256>
stance: critic
reviewed_at: <ISO 8601 timestamp>
context_loaded:
  - REQUIREMENT.md@<hash>
  - STATE.md@<hash>
  - <stage-contract>@<hash>
dimensions:
  - dim: evidence
    severity: <high | medium | low>
    finding: <specific finding>
    evidence: <file+line reference or external link>
    suggestion: <specific suggestion>
overall:
  blocking: <true | false>
  summary: <one-sentence overall judgment>
```

## Notes

Add short notes only when they clarify the YAML payload.
