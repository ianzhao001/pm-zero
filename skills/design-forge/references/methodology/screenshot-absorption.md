# Screenshot Absorption

Use this reference only when the request supplies or explicitly asks to absorb screenshots. Convert visual evidence into structured facts, failure fixtures, and rendered acceptance checks before generating the final artifact.

## One-Pass Workflow

1. Record source id, pixel size, device scale, normalized CSS viewport, scroll state, and crop/long-shot status.
2. Classify the surface, entry state, persistent navigation, overlays, and push/modal behavior.
3. Capture visible text and module order; mark facts the screenshot cannot prove.
4. Record typography footprint: font size, line height, weight, wrapping, clamp, visible lines, padding, gap, and module coordinates.
5. Record image/icon rules and stable selectors for rendered checks.
6. Add a negative fixture for the most likely regression before updating validators.
7. Validate visible DOM, computed style, real scrolling, viewport geometry, horizontal overflow, overlaps, bottom-bar obstruction, and feed-end behavior.
8. Generate or revise the acceptance artifact only after evidence and validators are ready.

## Intake Template

Validate the evidence object with `../screenshot-evidence.schema.json`. Context packs may add fields, selectors, and thresholds, but must not duplicate this schema or workflow.

## Failure Taxonomy

- Structure copied without typography, wrapping, spacing, or visible-line fidelity.
- Hidden templates, `display:none` evidence, selector aliases, or off-screen DOM used to satisfy static checks.
- Device shells, rails, borders, or transforms compressing the normalized internal viewport.
- Long screenshots flattened, cropped, or faked with spacer/min-height blank regions instead of real scrollable content.
- Source-specific rules applied to unrelated surfaces.
- Generic visual heuristics overriding measured screenshot evidence.

## Definition of Done

- Evidence validates against the schema and records unsupported claims.
- At least one negative fixture captures the task's highest-risk failure.
- Rendered checks inspect what the user sees, including computed typography and scroll behavior.
- Generated artifacts are acceptance carriers, never the evidence source.
