# Interactive Demo System

适用边界：六阶段项目以当前计划和[六阶段协议](../../../../system/protocols/six-stage-product-workflow.md)为准；默认正常主流程，空态、异常态及对应测试仅在用户明确请求时纳入。旧项目按原已确认范围。本文的旧 HTML/工作台形态不应用于六阶段静态交付，局部 HTML 只可为导图中间文件。

Use only when `artifact=demo`. This contract defines interaction behavior; visual styling comes from the selected context or neutral DS. High fidelity is an independent `fidelity` setting.

## Assets

Reuse instead of rewriting:

- `assets/demo-shell/core.css`: motion, scroll containment, HUD layout, and reduced-motion baseline.
- `assets/demo-shell/core.js`: route history, state notifications, reset, visited state, and bounded event log.
- `assets/demo-shell/liquid-glass.css`: optional theme loaded only when the user explicitly requests glass styling.

Copy or inline assets with `scripts/materialize-design-assets.mjs`. Asset bytes are mechanical output inputs, not prompt-loaded reference text.

## Runtime contract

- Keep one state object as the data source. Do not derive application state from DOM text.
- Register named routes and expose `go`, `back`, and `reset`; unknown routes fail visibly.
- Keep persistent application chrome separate from the scrollable body when the source design requires it. Do not force a platform-specific chrome treatment over a context pack.
- Animate page and modal entry/exit before removal; use motion tokens and avoid `linear` easing.
- Give buttons and large hit areas restrained pressed feedback.
- Respect `prefers-reduced-motion` and keep the final state reachable without animation.
- Keep scrollable flex children at `min-height:0`; the phone surface must not scroll horizontally.

## HUD contract

Place the inspection HUD outside the phone surface so it cannot override internal design rules. Include six blocks:

1. title and artifact metadata;
2. current route/state;
3. three to six state fields;
4. route jump controls;
5. back/next/autoplay/reset controls as applicable;
6. a bounded event log.

Update the HUD after every state mutation and route change. Log meaningful actions with short labels and details; keep at most 30 entries.

## Fidelity and context

- `fidelity=standard`: use the current DS and core assets.
- `fidelity=hifi`: additionally load `hifi-surface-authoring.md`, visual quality, mobile craft, and the selected evidence/context overlay.
- `fidelity=screenshot`: additionally load `screenshot-absorption.md` and source evidence before generation.
- Glass, iOS-like motion, confetti, or other decorative themes are opt-in. They never override measured screenshots or context tokens.

## Delivery checks

- Routes, state mutations, back behavior, reset, HUD, feedback, and event logging are visible and functional.
- No hidden evidence or selector aliases satisfy validation.
- Reduced-motion, scroll containment, text overflow, icon rendering, bottom obstruction, and source-specific rules pass.
- Report `artifact=demo`, fidelity, context, assets materialized, selected optional rules, and validation results.
