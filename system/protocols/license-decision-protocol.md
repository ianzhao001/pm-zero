# License Decision Protocol

## Purpose

Record the pre-public license decision for pm-zero before the first public release scope is selected.

## Candidate Licenses

### MIT

- Fit: very high.
- Rationale: pm-zero is a methodology-plus-tooling skeleton. A permissive license makes it easy for teams to copy, adapt, and embed the protocols in their own workflows.
- Tradeoff: minimal patent language and limited explicit defensive terms.

### Apache-2.0

- Fit: medium-high.
- Rationale: stronger patent grant and familiar enterprise posture.
- Tradeoff: slightly heavier text and ceremony than needed for a lightweight protocol skeleton.

### BSD-3-Clause

- Fit: medium.
- Rationale: permissive and well-understood.
- Tradeoff: less common than MIT for small methodology/tooling projects, with no decisive advantage here.

## Decision

Default and implemented license: **MIT**.

## Decision Rationale

pm-zero should be easy to study, fork, copy into private workflows, and adapt without negotiation. MIT best matches the current goal: maximize protocol reuse while keeping legal overhead low.

## Implementation

- Root `LICENSE` uses standard MIT text.
- Manifest entry `license` uses `publish_scope=public`, `lifecycle=stable`, and `required=true`.

