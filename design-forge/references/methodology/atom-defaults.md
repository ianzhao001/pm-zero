# Atom Defaults

本文件是 `design-forge` 的通用原子组件基线。Context pack 只能覆盖 token、圆角、布局顺序或局部状态值，不能复制本文件的工作流和组件语义。

## 通用原则

- 原子命名稳定：`btn`、`chip`、`card`、`sheet`、`toast`、`avatar`、`tabbar`、`feed-card`。
- 按钮、chip、输入框等紧凑控件必须有稳定尺寸；动态文案不能挤破容器。
- 颜色使用 Neutral DS token；加载 DS Pack 后只替换 token 值，不改组件职责。
- 默认页面主语言使用中文；未加载 context pack 时也不能退回英文页面。
- 破坏性动作使用 `--semantic-danger` 或 DS Pack 对它的 alias，不使用品牌促销色承载普通确认。
- 图标按钮优先使用真实图标，不用纯文字或 CSS 伪元素冒充导航图标。

## 原子表

| Atom | 通用默认 | Context 可覆盖 |
|---|---|---|
| `.btn` | `display:flex; align-items:center; justify-content:center; gap:6px; white-space:nowrap` | 圆角、字重、背景 token、阴影 |
| `.btn.accent` | 主 CTA 或主选中动作，白字，使用 `--accent` | accent token 与按下态 |
| `.btn.outline` | 次要动作，白底或透明底，中性描边 | 描边 token |
| `.btn.destructive` | 仅破坏性、风险确认、撤销类动作 | danger token |
| `.chip` | 小尺寸筛选/状态标记，选中态可用 `--accent-soft` | 圆角、选中态 token |
| `.card` / `.feed-card` | 承载一组可扫读信息，默认 8px 圆角 | 卡片圆角、图片占比、边框 token |
| `.sheet` | 底部弹层，有 scrim 和关闭路径 | 顶部圆角、动效时长 |
| `.toast` | 短反馈，不承载长正文 | 背景/文字 token |
| avatar / status dot | `border-radius:999px` | 尺寸、状态色 |
| `.tabbar` | 稳定列宽，真实图标 + 标签 | tab 数量、顺序、选中态 |

## 布局原子

- Mobile shell 默认使用 `.phone-shell > .phone-screen`：320×694、44px 外圆角、7px padding、Dynamic Island、36px 内屏圆角；`.phone-screen` 隐藏溢出，内部 `.content` / `.body` 负责 `overflow-y:auto`。
- 移动端字号默认保持紧凑：caption 9-10px、meta 10-11px、body 11-12px、card title 12-13px、nav title 16px、hero 20-24px。
- 导航、按钮、卡片、状态、Sheet、Toast 和 HUD 主文案默认使用中文；route id、签名和版本标签可保留少量英文。
- Visual feed cards 默认适合双列 grid；评论、日志、排行适合单列列表。
- Detail page 通常使用大媒体/内容区 + 一个底部主动作。
- Push page 使用返回入口，可省略 bottom tabs。
- Tabbar 是通用导航原子；默认使用中性顺序和真实 SVG/icon 资产，品牌顺序、文案和 active 色由 context pack 覆盖。
- Modal / sheet flow 必须有明确退出路径。

## Context 覆盖边界

允许放在 context pack:

- 品牌 token 值。
- 品牌 tab 顺序。
- 品牌组件的局部默认值，例如卡片图片占比或选中态样式。
- 品牌 layout exception 及其 rule id。

必须留在 `design-forge`:

- 组件命名与职责。
- 按钮 nowrap、稳定尺寸、可访问性、点击反馈。
- Type 1 / Type 2 页面模型。
- Sheet 高度档位、主辅 CTA 取舍、版本注释与 preflight 节奏。
