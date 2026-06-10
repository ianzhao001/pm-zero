---
skill_id: design-forge
name: design-forge
description: >-
  Generate mobile interaction drafts, flow canvases, and clickable demos. Use when the user asks for mobile flows, prototypes, UI iteration, or interaction review.
version: 1.0.5
publish_scope: public
lifecycle: active
---

# Design Forge

Design Forge 是移动端交互稿与可交互 Demo 的通用 workflow skill。入口文件只保留路由、边界和最小执行门；详细方法必须按当前任务从 `references/` 渐进加载。

默认页面主语言为中文。未显式加载 context pack 时，导航、按钮、状态、卡片正文、说明文本和 HUD 主文案仍必须使用中文为主的中性移动端表达。

## 触发条件

当用户要求以下任务时使用：

- 移动端线框稿、流程图、功能链路图。
- 可点击原型、可交互 Demo、交互动效稿。
- 用户旅程、状态机、跨屏跳转逻辑。
- 对已有 HTML 原型做迭代优化。

## 渐进式加载

默认只读：

- `references/ds-spec.lock.md`：Neutral Mobile DS 与通用截图吸收原则。

按 mode 或风险加载：

| 场景 | 加载 |
|---|---|
| 新建流程画布 | `references/methodology/flow-canvas-recipe.md` |
| 修改流程画布 | `flow-canvas-recipe.md` + `references/interaction-feedback-patterns.md` |
| 生成可点击 Demo | `references/methodology/interactive-demo-system.md` |
| 修改 Demo | `interactive-demo-system.md` + `references/methodology/checklist.md` |
| 组合组件 | `references/methodology/atom-defaults.md` |
| 视觉打磨 | `references/methodology/visual-quality-bar.md` |
| 严格设计规则争议 | `references/methodology/do-and-dont.md` |
| 交付前检查 | `references/methodology/checklist.md` |
| context pack 任务 | `references/brand-pack-loader.md`，再按当前 mode 只读必要 pack 文件 |
| pm-zero 主流水线 | 本文件“Pipeline 输出门”列出的协议与 stage references |

不得因为任务“看起来像”某品牌或历史产物就加载 private context。加载必须依赖用户文本或 mode 声明中的显式 trigger。

## Mode Router

遵循 `../../system/protocols/mode-declaration.md`。

```text
MODE: MODE_FLOW | MODE_DEMO | MODE_PRODUCT_ADVICE
REQUIRED: Neutral DS plus selected references or context pack
DISABLED: unsupported surfaces for this mode
AMBIGUITY: use Neutral Mobile DS and record assumptions
```

- `MODE_FLOW`：静态多屏流程画布。
- `MODE_DEMO`：带移动端外壳、路由、转场和 HUD 的可点击原型。
- `MODE_PRODUCT_ADVICE`：只做产品结构、信息架构或交互评审，不生成产物。
- Flow 与 Demo 不混写；用户同时要求两者时拆成两个产物，并用同一屏幕/路由命名保持同步。

## 执行边界

- 通用流程、方法论和原子组件留在 design-forge；产品专属 token、tab、术语、截图 grammar 和加严规则来自显式加载的 context pack。
- 除非用户明确要求变化，否则迭代时保留现有信息架构、屏幕数量、已确认文案和路由逻辑。
- 修改用户提供的 HTML 时，创建新的版本文件并单调递增版本名。
- 只有文件位于用户要求的输出目录时，才优先原地修改既有产物。
- 交付前按 `../../system/protocols/version-block.md` 补版本注释块。

## 关键质量门

- Flow mode 必须有 canvas、screens、arrows，且不含 demo-only HUD。
- Demo mode 必须有 shell、HUD、motion token、reduced-motion fallback 和可见点击反馈。
- 手机内部页面、内容区、列表、卡片不得产生横向滚动条；纵向滚动面同时设置 `overflow-x:hidden`。
- 按钮和紧凑控件尺寸稳定，`.btn` 保持 `white-space: nowrap`。
- 未显式加载 context pack 时，通用输出不出现 private pack 的签名、tab、token 或业务语义。
- 截图吸收任务只吸收通用验收方法；具体字号、间距、图标形态、Tab 文案和品牌色由当前 DS Pack 或品牌 skill 承担。
- 高保真与截图吸收必须检查可见 rendered DOM、computed style、真实滚动、模块坐标和 Feed 末尾无人工 blank block。
- MODE_DEMO 的 HUD、路由控制和外部 workbench 只能存在于手机外部，不得污染手机内部 DS。

## Pipeline 输出门

当用于 pm-zero 主流水线的交互稿或 Demo 阶段时，先按需读取：

- `../../system/protocols/pipeline-stage-protocol.md`
- `../../system/protocols/evidence-grading-protocol.md`
- `../../system/protocols/pipeline-format-validator.md`
- `references/scenario-anchoring.md`
- `references/interaction-spec-protocol.md`
- `references/demo-reuse-strategy.md`
- `references/demo-batch-output.md`

执行要求：

1. 交互稿阶段先输出场景锚点，不直接生成页面。
2. 交互稿只使用协议允许的 HTML / SVG / Mermaid 形态。
3. Demo 阶段必须生成或要求生成 `element-mapping.md`。
4. Demo 未声明的次级状态可标为 `Demo-filled`，但主流程、关键决策路径和信息架构不能由 Demo 阶段擅自补写。
5. Demo 复杂度超过批量阈值时分批落盘。

## 校验

- 交付前运行 `scripts/preflight.mjs`。
- 修改规则后运行 `scripts/preflight.mjs --self-test`。
- 当 context pack 注册额外规则时，运行 `scripts/preflight.mjs <file> --brand-rules=<relative-or-absolute-rule-module>`。
- 最终响应列出 mode、加载的 references/context pack、校验结果和输出文件路径。

## Version History

- v1.0.5 (2026-05-24): 收缩入口文件为短路由与加载矩阵，恢复渐进式披露；详细方法保留在 `references/`。
- v1.0.4 (2026-05-24): 强化通用截图证据吸收与 rendered-DOM 验收门。
