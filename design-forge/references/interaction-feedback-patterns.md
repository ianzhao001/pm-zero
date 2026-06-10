# Interaction Feedback Patterns

Use this file when iterating an existing flow canvas or interactive demo.

## 1. Source Fidelity

- Treat the user's current artifact as the source of truth.
- Preserve screen structure, route logic, and confirmed copy unless explicitly changed.
- When adding missing screens, mark them as additions in the version block.
- Do not regress previous accepted structure while improving visual quality.
- Do not “improve” by redesigning a confirmed page from scratch. Keep the working surface, then upgrade density, spacing, state clarity, and interaction feedback.
- Use a change ledger before editing: keep / add / remove / verify. If the user says a module is gone, remove its copy, route, hotspot, and leftover state together.

## 1.1 Cross-mode Sync

- Flow-to-demo sync means screens, route names, hotspot intent, disabled zones, and page-state labels must match.
- Demo-to-flow sync means every new route or modal introduced in the demo gets a matching flow node or spec card.
- If one mode cannot faithfully hold the other mode's behavior, split the work into separate deliverables and state the difference.

## 2. Page State Model

Use two default page states unless the source artifact says otherwise:

- Type 1 container page: entry context, persistent navigation, no back button.
- Type 2 push page: back button, focused task, often no persistent navigation.

Only the first page in a flow is usually a Type 1 page. Later task pages usually become Type 2 pages.

## 3. Motion and Tap Feedback

- Buttons should show tap feedback with a small scale or opacity change.
- Page transitions should use push/pop or fade, not abrupt replacement.
- Sheets need enter and leave animations.
- Scrims must be clickable to close unless the flow is destructive or blocking.

## 4. Sheet Height Tiers

- 60% for selection, filtering, or quick actions.
- 80% for list or form tasks.
- 100% for full takeover flows.

Every tier must support an obvious dismissal path.

## 5. Feed and List Density

- Visual feed cards usually work best as a two-column grid.
- Comments, logs, and rankings usually work best as one-column lists.
- Do not let placeholder text or images stretch a card beyond its column width.

## 6. Urgency Compression

Use three tiers for countdown-like status:

- More than one day: show a day-level label.
- Less than one day: show a same-day time label.
- Less than one hour: show minutes remaining and increase visual priority.

Avoid showing multiple countdowns on the same card.

## 7. Share Rail

Share, export, and result cards should use a separate rail or route. They may use stronger visual hierarchy, but still use the active design system.

## 8. Primary and Secondary Actions

- Only one bottom primary CTA should occupy the safe-area zone.
- Secondary actions should be smaller, outlined, ghosted, or placed in the header.
- Do not let secondary actions compete with the main task.

## 9. Interaction Scope Locks

- If the source artifact or user says an entry is locked or non-clickable, preserve that lock exactly.
- A locked navigation item may still show visual active state, but it must not grow a route unless the user reopens it.
- When the user narrows allowed routing to a subset of pages or tabs, other hotspots should degrade to tap feedback, toast, sheet, or no-op state within the allowed route.
- When adding missing screens, mark them as additions in the version block instead of silently treating them as original structure.
- Do not infer new business surfaces from decorative labels, bottom tabs, or placeholder chips. Navigation growth requires explicit user intent or a clearly missing state from the supplied flow.

## 10. CSS / JS Stability

- Scrollable flex children inside a phone frame need `min-height:0`.
- Horizontal rails should use `flex-wrap:nowrap` plus `overflow-x:auto` when the relationship between screens matters.
- Reusable template output should avoid repeated `id`; prefer `data-*` attributes for repeated cards, modals, toasts, and canvases.
- Avoid `scrollIntoView` in embedded previews unless the artifact explicitly owns the viewport.
- Prefer one delegated event listener over many repeated click listeners.
- Keep complex effects as static structure plus CSS motion where possible.

## 11. Versioning

- When modifying a user-provided HTML prototype, create a new version file unless the user asks for an in-place edit.
- Versioned artifacts should include `VERSION`, `CHANGES`, and `BASED ON` comments.
- The final handoff should summarize kept structure, added screens, removed modules, and validation performed.
- Increment version names monotonically. Do not overwrite an older artifact with a newer behavior unless the user asked for replacement.
- The `CHANGES` block should separate visual polish from structural or routing changes.

## 12. Community Surfaces

- Community feeds need concrete posts, stance, counts, and participation signals; avoid empty placeholder commentary.
- Discussion lists and content feeds are different surfaces. A discussion tab should not silently inherit content-feed modules.
- Share/export/result cards should live in their own rail or route so they do not distort the main task flow.

## 13. Preflight Rhythm

Before delivery:

1. Check JavaScript syntax.
2. Check mode-specific DOM markers.
3. Check layout-critical classes.
4. Check version comments.
5. Capture or inspect mobile dimensions when a browser is available.

## 14. Generic Visual Floor

- Flow canvases should feel like a deliberate workspace: paper-like canvas, multiple light phone frames, rail labels, hotspots, arrows, and spec cards.
- Interactive demos should include a persistent shell, HUD, jump controls, current-route label, event log, and tap feedback.
- Use real-looking task copy. Placeholder names, filler copy, handwritten UI fonts, and temporary black/gray swatches are preflight failures.
- Buttons and compact controls must keep labels on one line unless the component is designed as a multiline content card.
