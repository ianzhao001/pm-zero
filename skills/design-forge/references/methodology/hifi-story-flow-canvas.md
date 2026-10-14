# HIFI Story Flow Canvas

本参考只在 `MODE_FLOW` 且声明 `FLOW_VARIANT: STORY_CANVAS`，或用户要求高保真流程矩阵、产品故事板、3x3 手机画布时加载。

## Purpose

Story canvas 用于讲清一个产品机制如何从入口、门槛、证据、行动、共创到身份沉淀。它不是 Demo，也不是线框 rail 的替代默认值；只有当叙事结构比箭头连线更重要时使用。

## Required Shape

- 顶部必须说明产品假设、核心动作和本版决策主题。
- 主画布使用 3x3 或 3xN 手机矩阵；每个 screen 是一个稳定 `article[data-screen-id]`。
- 每个 screen 必须包含：编号、标题、一句话角色、surface/state 类型、可见 `.phone-shell > .phone-screen`。
- 手机内部必须有真实可见 DOM、纵向滚动面和中文主文案；不得用 hidden template、display:none evidence 或空白占位通过校验。
- 外层 `.story-canvas`、`.flow` 或 `.canvas` 可横向滚动；手机内部不得横向滚动。
- `window.STORY_FLOW` 声明 screen 顺序、stage 类型和关键转场；不要只靠视觉排列表达状态机。

## Stage Archetypes

按任务选择 6-9 个阶段，常见顺序：

`pre-entry -> gate -> proof -> post-entry -> action -> co-create -> exchange -> identity`

命名可以随业务变化，但 stage 语义必须能从 `data-stage`、screen 标题或 `window.STORY_FLOW` 中验证。

## Report Blocks

完整 story canvas 必须在手机矩阵后提供三个报告区：

- `.journey-report`：7/30/90 天或自定义 milestone 旅程。
- `.metric-card`：用于验证机制是否成立的 3-4 个指标。
- `.thought-card`：本版设计假设、取舍或需要验证的风险。

报告区服务于决策，不得覆盖手机画布、隐藏在屏幕内部或只写成注释。

## Variant Lineage

如果来源说明中出现 `v4`、`v5`、旧版 layout、复用某屏等信息：

- 保留来源关系，在版本块或 header 中写明 `BASED_ON`。
- 未经用户要求，不因统一视觉而重画已验证的旧屏结构。
- context pack 的私有 token、文案、surface grammar 只从显式加载的 pack 来，不写进通用 story-canvas 规则。

## Robustness Checklist

- 每个 phone-screen 都有实质内容和稳定尺寸。
- report、header、phone matrix 是兄弟层级，不互相绝对定位覆盖。
- 不使用大体积 base64 图片；需要示例资产时使用轻量、可复现、可替换的资源。
- 交付前运行 `scripts/preflight.mjs <file> --mode=flow`；带 context pack 时追加对应 `--brand-rules`。
