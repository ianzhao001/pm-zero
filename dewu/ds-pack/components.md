# Dewu 组件覆盖

本文件只声明 Dewu 相对 `design-forge` 通用原子表的品牌覆盖项。通用组件职责、稳定尺寸、点击反馈和可访问性规则见 `../../design-forge/references/methodology/atom-defaults.md`。

截图事实优先：四张上传截图在设计语言、视觉规范、页面结构样式上高于本地旧规则。Tab surface 细节见 `tab-surfaces.md`。

| Atom | Dewu 覆盖 |
|---|---|
| `.btn.accent` | 使用 `--accent`，白色文字，轻阴影；用于主要商业 CTA 或主选中动作。 |
| `.btn.primary` | 使用 `--n140`，白色文字，作为主 CTA 的备份层级。 |
| `.btn.destructive` | 仅破坏性、风险或撤销动作使用 `--semantic-danger` / `--dewu-red`。 |
| `.chip` | 选中态优先使用 `--accent-soft`，文字使用 `--accent-press` 或 `--n140`。 |
| `.p-card` / `.feed-card` | 商品图或内容图为主视觉；同组卡片圆角必须统一。推荐 Feed 标题最多 2 行，meta 单行。 |
| `.product-hero` / `.media-thumb` | 商品图、装备图、穿搭图应占据卡片或首屏的视觉主位，不用抽象渐变替代。 |
| `.price` / `.main-price` | 主价格、金额、保证金和权益价值默认使用 `--n140`；红色仅用于折扣、风险或异常说明。 |
| `.top-tabs` | 高 43px、底部对齐；活动场景允许把第 3 位展示名替换为活动名；active 使用 22x2px `--accent` 下划线，active 约 18px、inactive 约 16px。 |
| `.tabbar` | 高约 52px、四列固定、白底、顶部 1px 分割线；active 使用 `--n140`，不用 `--accent`。 |
| `.tabbar svg` | 底部 Tab icon 使用清晰 20px SVG stroke-only 或真实线框资产，尺寸和线宽统一。 |
| `.like` | 推荐 Feed 统一右侧 thumbs-up 描边图标 + 数字；同屏不混用 heart。 |
| `.tip-badge` / `.bubble` / `.toast` | 只承载短反馈；不得使用大面积红色促销风。 |

说明：

- 主要商业 CTA 默认使用 `--accent`。
- 红色仅用于折扣、警告、破坏性动作或明确风险态。
- 认证徽章使用 `--auth-green`，不得挪作普通成功态。
- 底部 Tab 最终 HTML 必须是 icon + label，不用填充块、纯文字、emoji、CSS `::before` 或占位圆点代替。
- `得物` 推荐 Tab 顶部频道后直接进入双列 Feed；不得凭空插入 `先鉴别后发货`、`今日热帖`、`穿搭灵感` 等截图中没有的 chip row。
- 社区 Feed 卡不得添加 `AUTH` / `NEW` 角标，除非用户提供新的截图证据。
- 讨论、热门内容、榜单、兑换、开奖、鉴定异常等业务态优先用 chip、inline row、toast 或 sheet 承接，不用长段说明挤压主卡。
