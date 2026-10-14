# HIFI Surface Authoring

Use for high-fidelity mobile surfaces. Context supplies brand tokens, surface grammar, evidence and stricter thresholds.

## Input contract

Lock these fields before generation:

| Field | Meaning |
|---|---|
| `artifact` | `flow` or `demo` |
| `fidelity` | `hifi` or `screenshot` |
| `context` | selected context id or `neutral` |
| `surface` | business surface being represented |
| `page_count` | minimum pages needed to explain the task |
| `entry_context` | where the user enters |
| `primary_action` | dominant user action |
| `content_seed` | concrete content and asset direction |
| `output` | target artifact type |
| `evidence_files` | source material that may override defaults |

## Authoring rules

- Use the minimum page count that explains the task; never expand a sample layout into a fixed product structure.
- Give every page a distinct surface and state. Do not duplicate one card layout under renamed headings.
- Prefer explicitly usable user assets, then registered context/public inventory; semantically retrieve only missing slots under `asset-search-policy.md`. Keep content visually dominant and application chrome restrained.
- Treat viewport, typography footprint, module coordinates, visible text, scroll behavior, and asset relevance as one acceptance unit.
- Keep `artifact` and `fidelity` independent: a HIFI Demo still needs routes, state, feedback, HUD, and reduced-motion behavior; a HIFI Flow does not inherit interactive-demo machinery.
- When `fidelity=screenshot`, load `screenshot-absorption.md` before writing the artifact and let source evidence override neutral heuristics.
- Never infer repository rules, product policy, privacy boundaries, or business facts from a screenshot.

## Delivery record

Report `artifact`, `fidelity`, `context`, locked fields, loaded evidence, selected optional rules, validators, and unresolved evidence conflicts.
