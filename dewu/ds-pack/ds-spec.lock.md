# ⚠️ AUTHORITATIVE DESIGN SYSTEM (LOCKED)

> 本文件是 Dewu 本地品牌包的锁定 DS 源之一。
> v1.0.9 起，上传截图在设计语言/视觉规范/页面结构样式上的优先级升级为截图证据包：字体、字号、行高、换行、截断、可见行数、模块间距、内部坐标、真实滚动模型、滚动内容高度、可见文字、移动端无横向溢出和 Type 2 详情页结构必须可测；截图未覆盖处仍以本文件为准。
> v1.0.12 起，新增截图吸收必须先更新 evidence/runbook/validator/negative fixture，再生成 proof artifact；demo 不得作为规则来源。
> 任何与本文件冲突的旧资料（含 dewu-research.md §3 §9、external dewu-interaction-design）一律以截图证据包、本文件和 `tab-surfaces.md` 为准。
> 修改本文件需要版本升级（vX.Y）并在文件底部追加 CHANGELOG。

## 五、得物设计系统（Dewu DS）

### 5.1 色彩规范（必须遵守）

```css
/* 品牌色 */
--accent:        #01C2C3;  /* 极光蓝/Teal 500 — 按钮/选中/关注，唯一强调色 */
--accent-bright: #00FEFF;  /* 极光蓝/400 — hover/glow */
--accent-press:  #029999;  /* 极光蓝 darken — 按下态 */
--accent-soft:   #D9F4F4;  /* 极光蓝 tint 90% — 柔和标签背景 */

/* 价格/促销/危险 */
--dewu-red:      #FF4F66;  /* 价格红（2026 Figma 校准值，原 #FF2E4D / #FF4657）*/ <!-- DEPRECATED — legacy conflict marker; see ds-spec.lock.md -->
--dewu-red-light:#FFA9A9;  /* 柔性促销底色 */

/* 功能色 */
--auth-green:    #00C853;  /* 鉴定徽章绿 — 仅限鉴定标识场景 */
--vip-gold:      #C9A84C;  /* 高端/VIP 金色 */

/* 中性色阶（来自 2026 商详 Figma，非自造）*/
--n00:           #FFFFFF;
--n-bg:          #F5F5F9;  /* 浅色模式页面背景 */
--n20:           #F1F1F5;  /* 0.5pt 分隔线 */
--n40:           #E6E6EB;  /* 弱描边 */
--n-stroke-strong:#2B2C3C; /* 强描边 — 非文本 N140 */
--n80:           #AAAABB;  /* 辅助信息文本 */
--n100:          #7F7F8E;  /* 次要信息文本 */
--n140:          #14151A;  /* 标题正文 */
```

⚠️ **不得自造灰色**：`#D7D7DE` / `#5A5A66` / `#2B2F36` 均为非法色值。如某色阶缺失，选最近的合法值。

**主背景为 `#F5F5F9`（页面）或 `#FFFFFF`（卡片）**，非 `#000000`。线框画布背景为 `#f6f5f1`（纸感）。

### 5.2 字体规范

```css
/* UI 文本（中文 + 拉丁 UI）*/
font-family: "PingFang SC", "PingFang HK", -apple-system, "Noto Sans SC", sans-serif;

/* 数字/数据展示 — DIN 优先 */
.num-hero {
  font-family: "DIN Alternate","DIN Condensed","Helvetica Neue","Helvetica","Oswald","PingFang HK",sans-serif;
  font-weight: 700; font-stretch: condensed;
  letter-spacing: -0.02em; font-variant-numeric: tabular-nums;
}
.num {
  font-family: "DIN Alternate","Helvetica Neue","Oswald","PingFang HK","PingFang SC",sans-serif;
  letter-spacing: -0.02em; font-variant-numeric: tabular-nums;
  font-weight: 600;
}

/* 注释/ID/开发标签 */
font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
```

Google Fonts 导入（每个原型必须包含）：
```html
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

**❌ 禁止**：Caveat、Kalam、Shadows Into Light、Ma Shan Zheng 等手写字体。强调用 scale + weight + color，不用草书。

### 5.3 字型比例（严格遵守）

| Token | Size | Weight | Line-height | 用途 |
|---|---|---|---|---|
| **H1** | 22px | 600 | 140% | 页面级 hero 强调（Splash、大分享卡）|
| **H2** | 18px | 500 | 145% | 导航栏标题、区块标题 |
| **H3** | 16px | 500 | 150% | 模块标题、按钮标签 |
| **T1** | 14px | 400 | 155% | 正文（主要内容）|
| **T2** | 12px | 400 | 160% | 次级/说明文字 |
| **M1** | 11px | 300 | 170% | 辅助标签、元信息 |
| **M2** | 10px | 300 | 170% | 最细元信息（日期、计数）|

每屏**最多 2 个字重**（默认 Medium 500 + Regular 400）。

### 5.4 间距层级（不可妥协）

| 场景 | 值 |
|---|---|
| 瀑布流卡片间距 | `5pt` |
| 卡片内边距 | `10pt` |
| 非卡片页面布局 | `20pt` |
| 导航栏水平边距 | `16pt`（iOS 默认）|

### 5.5 圆角分组

| 组件类型 | 圆角 |
|---|---|
| 控件（按钮/芯片/输入框/标签）| `2px` |
| 卡片（商品卡/Feed卡）| `4–12px`（同组内统一）|
| 圆形（头像/状态点/关闭按钮）| `999px` |

不在同一组件组内混用 2px 和 8px。

### 5.6 布局规范（必须遵守）

- **商品/社区列表**：双列瀑布流，图片占比 70%+
- **商品详情**：全屏大图 + 底部固定 CTA
- **底部 4 Tab（当前版本）**：
  - 得物（社区 feeds）/ 购买（交易 feeds）/ 探索（消息中心 + 功能入口）/ 我（个人中心）
  - 顺序不可重排、不可省略；`grid-template-columns: repeat(4, 1fr)`，20×20 SVG 描边图标（`stroke`，非 `fill`，linecap round），M2 字号标签
  - 禁止用 CSS `:before` 伪元素或纯文字替代真实图标
- **得物（社区）顶部 Tab**：推荐 / 极光街 / 运营活动 / 灵感 / 关注 / 穿搭
  - 顺序不可重排；截图基线中选中态默认底部 2px `var(--accent)` 下划线，active 约 18px、inactive 约 16px；紧凑画布可为可见性轻微收缩
  - 活动场景可将「运营活动」显示文案替换为活动名，但逻辑位置仍是第 3 个 Tab

**Tab 激活规则**：
- 社区 / OOTD / 穿搭 / 心愿池 → `0`（得物）
- 商品详情 / 购物车 / 订单 / AI 试穿 → `1`（购买）
- 通知 / 消息 / 搜索 / 功能入口 → `2`（探索）
- 个人主页 / 设置 / 历史记录 → `3`（我）
- 全屏模态（上传/结果页）→ 省略 Tab Bar

**页面状态策略（活动型原型默认）**：
- Type 1 入口容器页：显示顶部社区 Tab + 底部 4 Tab，不显示返回；用于社区入口、活动主页、推荐 Feed 插卡。
- Type 2 全屏 Push 页：显示返回，不显示顶部社区 Tab 和底部 Tab；用于列表、详情、投注、结算、榜单、兑换、我的记录等后续页面。
- 每条用户动线通常只有第一个页面是 Type 1，后续页面全部 Type 2；如原稿另有规定，以原稿为准并在 notes 中标注。

**社区 Feeds 约束**：
- 社区内容卡片流默认双列：`display:grid; grid-template-columns:repeat(2,1fr); gap:5pt|8px`。
- 评论/观点列表不是 Feeds，可单列；商品网格可按业务需要 2–3 列。
- 不要把单列 `flex-direction:column` 内容列表误当成社区 Feeds。

### 5.7 品牌气质（必须遵守）

- ✅ 冷静、高端、Street、专业
- ✅ 产品图是视觉主角，界面 Chrome 退后
- ✅ 中英混排，英文品牌名保留原文（Nike / Air Jordan / Supreme）
- ❌ 不用橙/黄/红大面积促销风格
- ❌ 不参照淘宝/拼多多/京东设计语言
- ❌ 不用紫蓝渐变、过度 emoji、廉价 SVG 插图

---

## 十、原子默认值速查

| 原子 | 圆角 | 字重 | 阴影 | 备注 |
|---|---|---|---|---|
| `.btn` | 2px | 500 | 无 | `flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap` 必须 |
| `.btn.accent`（主 CTA 极光蓝）| 2px | 500 | `0 2px 4px rgba(0,0,0,.05)` | 继承 flex |
| `.btn.primary`（主 CTA 黑色）| 2px | 500 | `0 2px 4px rgba(0,0,0,.05)` | 继承 flex |
| `.btn.outline`（次要）| 2px | 500 | 无 | 继承 flex |
| `.btn.destructive`（破坏性）| 2px | 500 | `0 2px 4px rgba(0,0,0,.05)` | 继承 flex |
| `.btn.lg`（双行 CTA）| 2px | 500 | 继承 | `flex-direction:column` |
| `.chip` | 2px | 400（solid 时 500）| 无 | — |
| 卡片（`.p-card`、`.feed-card`）| 8px | 继承 | 无 | — |
| 头像 / 圆形点 | 999px | — | 无 | — |
| 输入框 / 文本域 | 2px | 400 | 无 | — |
| `.sheet` | 顶部 14px | 继承 | 无 | — |
| `.tip-badge` / `.bubble` / `.toast` | 4px | 400 | 无 | — |
| 手机外壳（设备）| 44px | — | 软阴影 OK | — |

## LOCKED EXECUTION INDEX

> 本区块是从 SKILL.md §5 §10 派生的执行索引，不新增 token，不覆盖上方原文。
> 生成 HTML/CSS 时优先查本索引，再回到原始章节定位细节。

### A. Token 覆盖优先级

0. 上传截图在设计语言、视觉规范、页面结构样式上优先级最高；详见 `tab-surfaces.md`。
1. 页面背景只允许使用 `--n-bg` 或 `--n00`。
2. 卡片背景只允许使用 `--n00`。
3. 主 CTA 默认使用 `--accent`。
4. 顶部社区 Tab 选中下划线使用 `--accent`；底部 Tab active 使用 `--n140`。
5. 主价格默认使用 `--n140`。
6. 折扣、风险、破坏性语义才允许使用 `--dewu-red`。
7. 鉴定徽章才允许使用 `--auth-green`。
8. VIP、高端、榜首奖励才允许使用 `--vip-gold`。
9. 辅助文字优先使用 `--n80` 或 `--n100`。
10. 分割线优先使用 `--n20` 或 `--n40`。

### B. 禁止回退清单

1. 禁止把页面主背景回退为纯黑。
2. 禁止把主价格回退为红色。
3. 禁止把底部导航回退为 5 Tab。 <!-- DEPRECATED — legacy conflict marker; see ds-spec.lock.md -->
4. 禁止把主 CTA 回退为红色促销按钮。
5. 禁止引入 `#D7D7DE`。
6. 禁止引入 `#5A5A66`。
7. 禁止引入 `#2B2F36`。
8. 禁止引入 `#FF2E4D`。 <!-- DEPRECATED — legacy conflict marker; see ds-spec.lock.md -->
9. 禁止引入 `#FF4657`。
10. 禁止使用 `oklch(...)` 临时色。
11. 禁止使用手写字体作为 UI 文案。
12. 禁止用 CSS 伪元素或纯文字替代底部 Tab 图标。

### C. 组件默认值索引

| 组件 | 必须项 | 易错点 |
|---|---|---|
| 主按钮 | 2px 圆角、500 字重、nowrap | 不得用红色承载确认/购买 |
| 次按钮 | 白底、N140 或 N40 描边 | 不得与主按钮争抢强调色 |
| 芯片 | 2px 圆角、轻量描边 | 选中态不应大面积铺色 |
| 商品卡 | 图片占比 70%+、8px 内统一 | 不得堆叠阴影 |
| Feed 卡 | 双列、5pt/8px gap | 评论列表不可伪装成 Feed |
| Tab Bar | 4 列、stroke-only SVG 图标 | 不得恢复发布中心独立 Tab，不得使用填充块 icon |
| Top Tabs | 推荐/极光街/运营活动/灵感/关注/穿搭 | 活动名只能替换第 3 位展示文案；active 下划线用 `--accent` |
| 商品详情 | 全屏大图 + 固定 CTA | 购买 CTA 优先极光蓝 |
| 输入框 | 2px 圆角、400 字重 | 不得混入手写体 |
| Sheet | 顶部 14px 圆角 | 不得加重阴影或全屏化 |
| Toast | 4px 或胶囊按场景 | 不得承载长正文 |
| 头像 | 999px 圆角 | 不得变成方形品牌块 |

### D. 模式适配提示

1. MODE_FLOW 使用本 DS 时，画布背景仍为 `#f6f5f1`。
2. MODE_FLOW 的手机内部页面背景仍遵守 `--n-bg` / `--n00`。
3. MODE_FLOW 可以使用便利贴标注，但正文不得使用手写字体。
4. MODE_FLOW 的底部 Tab 必须是得物 / 购买 / 探索 / 我。
5. MODE_FLOW 的社区 Feed 默认双列。
6. MODE_DEMO 使用本 DS 时，Chrome 层必须保持浅色毛玻璃。
7. MODE_DEMO 的 HUD 只作为走查工具，不改变手机内 DS。
8. MODE_DEMO 中 Router 动效不得覆盖 DS 色彩约束。
9. MODE_PRD 引用本 DS 时只摘取原则，不生成 HTML。
10. 任一模式遇到旧研究库冲突，以本文件为准。

### E. 生成自检速查

1. 搜索 `#000000`，确认不是页面主背景。
2. 搜索 `#FF2E4D`，应为 0。 <!-- DEPRECATED — legacy conflict marker; see ds-spec.lock.md -->
3. 搜索 `#FF4657`，应为 0。
4. 搜索 `grid-template-columns: repeat(5`，应为 0。
5. 搜索 `Caveat`，应为 0。
6. 搜索 `Kalam`，应为 0。
7. 搜索 `Shadows Into Light`，应为 0。
8. 搜索 `Ma Shan Zheng`，应为 0。
9. 搜索 `.btn`，确认存在 `white-space: nowrap`。
10. 搜索 `@ianzhao`，确认输出原型含签名。
11. 检查底部 Tab 文案顺序：得物 → 购买 → 探索 → 我。
12. 检查顶部社区 Tab 文案顺序：推荐 → 极光街 → 运营活动/活动名 → 灵感 → 关注 → 穿搭。
13. 检查推荐 Tab 顶部频道后直接进入双列 Feed，没有截图外 chip row。
14. 检查推荐 Feed 点赞图标统一为 thumbs-up，卡片没有 `AUTH` / `NEW` 标签。

### F. 回答口径

1. 当旧资料说“5 Tab”时，回答“当前生成规范使用 4 Tab”。 <!-- DEPRECATED — legacy conflict marker; see ds-spec.lock.md -->
2. 当旧资料说“黑色主背景”时，回答“当前生成规范使用浅色页面背景”。
3. 当旧资料说“价格红色”时，回答“当前生成规范使用 N140 主价格”。
4. 当旧资料说“黑色购买按钮”时，回答“当前主 CTA 默认极光蓝，黑色为备用”。
5. 当用户明确要求复刻旧稿时，只能保留信息结构，不继承过期 token。
6. 当用户要求得物真实背景分析时，可以引用 dewu-research.md 的商业、用户、竞品内容。
7. 当用户要求 UI 规范时，不引用 dewu-research.md §3 §9 的过期 token。
8. 当用户要求改已有 Demo 时，同时读取 interaction-feedback-patterns.md。
9. 当用户要求新线框时，本文件 + SKILL.md §7 足够。
10. 当用户要求可交互 Demo 时，本文件 + SKILL.md §8 + 反馈库共同生效。


## CHANGELOG

- v1.0.12 (2026-05-24) — add screenshot absorption runbook and readiness gate: new screenshots must go through evidence intake, typography/spacing anchors, negative fixture and rendered-DOM validation before proof artifact generation.
- v1.0.11 (2026-05-23) — add Dewu demo rendered-DOM contract and B43: visible phone DOM must carry screenshot grammar directly, with real `.tabbar`, no hidden evidence templates, no `.tabbarx` selector aliases, and HUD/demo chrome constrained outside the Dewu surface.
- v1.0.10 (2026-05-23) — refine profile-dashboard screenshot absorption: compact profile header/body rhythm, 16px module titles, Dewu nickname-pool enforcement, wallet as numeric/text summary instead of icon grid, lower dashboard no excessive blank space, and B37-B42 checks for profile plus all-surface typography footprint. Generic screenshot absorption and feed-end blank-space rules stay in design-forge; Dewu keeps brand layout and typography.
- v1.0.9 (2026-05-23) — repair long screenshot proof artifact real-scroll model: fixed `393x852` viewport, fixed-height `.scroll-content` with taller `.scroll-inner`, B33-B36 checks for actual scrolling, buy top text/rhythm, typography footprint, and scroll-reachable profile lower dashboard.
- v1.0.8 (2026-05-23) — absorb long screenshots and feed detail evidence: fixed `393x852` viewport plus scroll-content heights, reusable long feed/buy/profile modules, Type 2 content detail grammar, B27-B32 preflight checks, and v1.0.8 proof artifact.
- v1.0.7 (2026-05-23) — add `screenshot-evidence-pack.md`, normalize uploaded screenshots to `393x852 CSS px @3x`, require App chrome, visible text, typography/spacing anchors, B23-B26 preflight checks, and v4 HIFI golden reference.
- v1.0.6 (2026-05-23) — absorb screenshot typography, wrapping, spacing, buy tab menu-category structure, internal mobile no-horizontal-overflow, and profile header anti-collapse gates.
- v1.0.4 (2026-05-23) — add uploaded screenshot evidence priority for design language; align recommended tab top underline, bottom tab stroke-only icons, feed card density, like icon consistency, and anti-hallucination checks.
- v1.0.0 (2026-05-13) — initial lock from SKILL.md §5 §10
