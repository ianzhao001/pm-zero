# Dewu Layout Overrides

本文件只保留 Dewu 专属布局覆盖。通用页面模型、Feed/List 密度、Sheet 档位和主辅动作规则见 `../../design-forge/references/interaction-feedback-patterns.md`。

## Screenshot Evidence Priority

四张上传截图是 v1.0.4 的设计语言事实证据。设计语言、视觉规范、页面结构样式与本地旧规则冲突时，以截图为准；具体 surface 基线见 `tab-surfaces.md`。

## Bottom Tab

Order:

1. 得物
2. 购买
3. 探索
4. 我

Rules:

- `grid-template-columns: repeat(4, 1fr)`.
- Visual default: 52px height, `padding-bottom: 8px`, white surface, `1px` top border, icon above label.
- Each tab uses a real 20px SVG stroke-only line icon or real line-style asset; do not use filled blocks, generative illustration marks, pure text, emoji, CSS pseudo-elements, or placeholder dots as final icons.
- Inactive tabs use `--n100` and light text weight; the active tab uses `--n140` and regular text weight. Do not use `--accent` as the bottom tab active color.
- Red is limited to notification dots or numeric badges, such as the screenshot-backed `探索` badge.
- Do not add a fifth bottom tab.
- Do not rename the four logical tabs when doing visual polish; copy can be localized only when the user explicitly asks for a different Dewu surface.
- Type 2 push pages remove the bottom tab instead of showing a disabled or decorative tabbar.

## Community Top Tabs

Order:

1. 推荐
2. 极光街
3. 运营活动
4. 灵感
5. 关注
6. 穿搭

Activity names may replace the displayed third tab label, but the logical position stays third.

Visual default:

- 43px height, `padding: 0 10px`, white surface, `1px` bottom border.
- Align labels to the bottom, use about 18px horizontal gap, and keep every label on one line.
- Active tab uses larger type and stronger weight, with a centered 22px by 2px underline using `--accent`.
- Screenshot-backed high-fidelity baseline: active `推荐` about 18px; inactive channels about 16px. Compact 320px canvases may tighten by 1px only to keep the six channels visible.
- Do not use `--n140` for the top active underline on screenshot-backed community tabs.

## Dewu Feed Mapping

- Dewu community feeds default to two columns.
- The `得物` recommended community surface goes directly from top channel tabs to `.feed-grid`; do not insert unproven brand chips or hot-topic rows between them.
- Comments and rankings stay one column.
- Product grids may use 2-3 columns by task needs.
- Use a class such as `.feed-grid` only for real visual content feeds; use `.discussion-list`, `.comment-list`, or `.rank-list` for single-column discussion/ranking surfaces.
- 讨论和热门内容必须拆开：讨论是评论/立场列表，热门内容是穿搭、复盘、装备、晒单、商品或测评内容流。
- 活动、竞猜或运营页需要至少一个社区承接入口，避免变成孤立交易页。

## Dewu Page State Mapping

- Type 1 entry container: top community tabs + bottom 4 tabs, no back button.
- Type 2 push page: back button, no community top tabs, no bottom tab.
- Full-screen modal flows omit tab bars.
- `购买`、`探索`、`我` 的页面组织按截图 surface 处理：购买是交易类目/商品网格，探索是功能入口列表，我是个人中心 dashboard。不要把推荐 Feed 结构外推到所有 Tab。
- 鉴定、开奖、兑换、毒币、榜单奖励等异常态优先进入 Type 2 详情、sheet 或 toast，不要污染 Type 1 首屏主结构。
- 倒计时、权益、热度、资金流和奖励进度压缩进同一卡片的状态行；避免重复指标或多处倒计时。

## Exceptions

No Dewu layout exceptions are required for v1.0.4.
