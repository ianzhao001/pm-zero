# Three-role Collaboration Protocol

## Purpose

Define the operating model for pm-zero's three-role collaboration loop: User, Tabbit, and Codex.

## Roles

### User

- Owns architecture decisions.
- Owns brand judgment and public-release sign-off.
- Approves irreversible actions, especially public repository writes.

### Tabbit

- Performs requirement engineering.
- Produces large instruction packs and acceptance criteria.
- Performs final review and scope reconciliation.

### Codex

- Executes goal-mode implementation.
- Maintains structured reports, validators, and repository state.
- Applies pre-authorized decisions without stopping for small details.

## Workflow

1. User sets direction and decision constraints.
2. Tabbit converts direction into an executable instruction pack.
3. Codex executes, validates, commits, and reports.
4. Case-study review feeds findings into the next task.
5. User remains the final authority for brand and public release.

## Decision Authorization Matrix

Instruction packs may include pre-authorized decisions. Codex may apply those decisions directly when:

- the decision is explicit,
- the implementation is reversible or covered by the task scope,
- no hard constraint is violated.

If a decision touches public writes, secrets, or destructive data loss, Codex must stop unless the user explicitly approves.

