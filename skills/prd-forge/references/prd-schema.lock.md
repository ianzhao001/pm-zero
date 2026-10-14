# PRD Schema Lock

This is the authoritative chapter skeleton for `prd-forge`.

## Skeleton

0. Project materials and collaboration info, optional front table, not part of numbered body.
1. Revision history.
2. Background, goals, and strategy.
3. In scope and out of scope.
4. Functional requirements.
5. Admin requirements.
6. Experiment details.
7. Analytics.
8. Glossary.

## Required Tables

- Revision history: `Date | Version | Changes | Author`
- In scope: `No. | Requirement | Team | Priority`
- Out of scope: `No. | Excluded item | Reason`
- Functional requirements: `Module | Evidence | Requirement Details`
- Admin requirements: `No. | Capability | Config item | Related field | Default | Permission`
- Experiments: `Module | Group | Primary metric | Guardrail metric | Period`
- Analytics: `Event | Params | Trigger | Notes`
- Glossary: `Term | Definition`

## Lock Rules

1. Body headings must use Word-native heading styles.
2. Chapter 4 module headings must be business names.
3. Evidence is either a real image or `待设计补图`.
4. Missing evidence must be registered in open issues and manifest when a manifest exists.
5. Unknown owners use `/`.
6. Do not add private product vocabulary unless an explicit context pack is loaded.

