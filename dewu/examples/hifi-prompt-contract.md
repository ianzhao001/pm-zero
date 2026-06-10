# Dewu HIFI Prompt Contract

本文件用于让同一类 prompt 稳定生成同一类 Dewu 高保真页面。它不是测试用例；它是调用当前项目产物 skill 时的输入契约。

## Stable Prompt Skeleton

```text
MODE: MODE_FLOW | MODE_DEMO
CONTEXT: Dewu / 得物
QUALITY: HIFI_SURFACE_BASELINE
REFERENCE: skills/dewu/examples/hifi-golden-reference.md

请生成一个得物 App 高保真页面/流程：
- surface: <社区推荐 | 购买交易 | 探索工具 | 我页面 | 商品详情 | 发布器 | 鉴别结果 | 自定义>
- page_count: <1 | N | 四个底部 Tab 定位页>
- entry_context: <用户从哪里进入>
- primary_action: <本页最主要动作>
- content_seed: <商品/穿搭/用户/服务/消息等真实内容方向>
- output: <Open Design artifact | 单 HTML | flow/demo pair>

约束：
- 必须加载 skills/dewu/ds-pack/hifi-surface-baseline.md。
- 必须加载 skills/dewu/ds-pack/tab-surfaces.md。
- 如果用户提供截图或要求截图级复刻，必须加载 skills/dewu/ds-pack/screenshot-evidence-pack.md 和 skills/dewu/ds-pack/screenshot-absorption-runbook.md。
- 截图吸收任务必须按固定顺序执行：先更新 evidence intake 和 runbook 判断，再补 validator / negative fixture / rendered-DOM 测试，最后才生成 proof artifact 或 demo。
- 不得把 demo 或 proof artifact 当成规则来源；demo 只能作为规则链路完成后的验收载体。
- 不要把四 Tab golden reference 当成默认页面数量。
- 迁移 golden reference 的美观原因：真实素材密度、393x852 内部截图坐标、surface 独立结构、底部 Tab 克制、页面模块丰富、可测 typography/spacing footprint。
- 如果截图是长截图，必须生成固定 393x852 viewport、固定高度滚动视口和承载长内容的内层容器；测试应能验证 `scrollHeight > clientHeight` 和 `scrollTop` 实际变化，不要把长截图缩放进一屏或裁切成不可滚动内容。
- 如果 surface 是社区内容详情，默认 Type 2 push：无底部四 Tab，使用 hero 轮播、返回/分享 overlay、商品推荐条、评论区和底部互动栏。
- 如果 mode 是 `MODE_DEMO`，手机内部必须是可见 rendered DOM：使用真实 `.tabbar`、真实滚动区和截图 grammar；禁止 hidden evidence、不可见 `<template>` 证据、`.tabbarx`/别名底栏或只为 preflight 存在的静态模板。
- Demo HUD、路由控制、日志和外部工作台只允许存在于手机外部；不得覆盖或改变 Dewu 手机内部的字体、间距、状态栏、底栏、图片策略和滚动模型。
```

## Exact Prompt Route

当用户提示词精确或近似为：

```text
请生成四个tab定位下的页面（总共四个），全部高保真。
```

必须走四 Tab anatomy route，而不是重新自由发挥或复制某个 HTML：

- `mode`: `MODE_FLOW`
- `surface`: `得物推荐 / 购买 / 探索 / 我`
- `page_count`: `4`
- `anatomy_source`: `skills/dewu/ds-pack/hifi-four-tab-anatomy.md`
- `evidence_source`: `skills/dewu/ds-pack/screenshot-evidence-pack.md`
- `quality_reference`: `_workspace/test-cases/dewu-tab-wireframe-smoke-20260523/dewu-four-tabs-hifi-v4.html`
- `quality_target`: 模块结构、图片策略、`我` 页 dashboard 元素、底部 Tab icon、顶部 Tab、模块密度、可见文字、字体、行高、坐标和模块高度都达到 golden reference 同级。

生成时允许替换文案或业务内容，但不得降级以下元素：

- 图片必须是真实图片 URL、真实本地图片资产或用户提供图片；不得用内联 SVG 假图、纯渐变、抽象色块替代。
- `我` 页必须包含：深色/Teal 资料头图、头像、来自 Dewu 昵称池的昵称（截图基线默认 `道u_5dbd337a7a...`）、等级、获赞与收藏/关注/粉丝数据、创作中心、订单五项、想要/我有/足迹/关注、钱包、省钱神券。
- `我` 页钱包是四列纯数字/文本资产摘要，不使用入口图标；`钱包`、`省钱神券`、`出售` 等模块主标题约 16px，lower dashboard 不得用空白撑高。
- `得物` 页必须保持推荐顶部 Tab active，且顶部频道后直接进入双列 Feed。
- `购买` 页必须保持频道宫格、平台背书行和商品卡，不得复用社区 Feed。
- `探索` 页必须保持消息中心、鉴别服务、玩一玩、买卖闲置、得有钱/借钱等工具入口。
- 当用户提供下滑截图时，必须吸收滚动后出现的模块，例如社区视频卡、购买长商品流、我页出售模块和 8 宫格服务入口。
- 截图级复刻必须检查所有页面的 typography footprint：字号、行高、字重、margin/padding、clamp、模块 top/height 一起验收；不得只让 `得物` 首页字号正确而忽略 `购买 / 探索 / 我 / 详情`。

这不是复制模板关系。golden reference 用来校准质量和结构完整度；实际生成时应按 anatomy 重新组织页面，保留可迁移原则，避免后续生成商品详情、发布器、鉴别结果等非四 Tab 页面时失真。

## Defaults

未指定时采用以下默认值：

- `MODE`: `MODE_FLOW`
- `QUALITY`: `HIFI_SURFACE_BASELINE`
- `page_count`: 能解释当前业务目标的最小页面数
- `output`: 优先 Open Design artifact；若 Open Design 不可用，再询问用户是否允许本地 HTML
- `asset_policy`: 固定本地或内联素材，避免远程图片造成不可复现

## Prompt Examples

单页商品详情：

```text
MODE: MODE_FLOW
CONTEXT: Dewu / 得物
QUALITY: HIFI_SURFACE_BASELINE

请生成一个得物 App 商品详情高保真页面：
- surface: 商品详情
- page_count: 1
- entry_context: 用户从购买 Tab 的鞋类商品卡进入
- primary_action: 立即购买
- content_seed: Air Jordan 复古篮球鞋，突出先鉴别后发货和尺码选择
- output: Open Design artifact
```

社区内容详情：

```text
MODE: MODE_FLOW
CONTEXT: Dewu / 得物
QUALITY: HIFI_SURFACE_BASELINE

请生成一个得物社区内容详情页：
- surface: 社区内容详情
- page_count: 1
- entry_context: 用户从得物推荐 Feed 卡片进入
- primary_action: 阅读内容、评论、点赞、收藏
- content_seed: 情侣宅家穿搭，正文包含话题和商品推荐
- output: Open Design artifact
```

四个底部 Tab 定位页：

```text
MODE: MODE_FLOW
CONTEXT: Dewu / 得物
QUALITY: HIFI_SURFACE_BASELINE

请生成得物 App 四个底部 Tab 定位页：
- surface: 得物推荐 / 购买 / 探索 / 我
- page_count: 四个底部 Tab 定位页
- entry_context: 用户打开 App
- primary_action: 浏览内容、购买商品、查看探索入口、进入个人中心
- content_seed: 潮流穿搭、球鞋交易、鉴别服务、个人订单 dashboard
- output: Open Design artifact
```
