## 十三、交付前 Checklist

适用边界：六阶段项目以当前计划和[六阶段协议](../../../../system/protocols/six-stage-product-workflow.md)为准；默认正常主流程，空态、异常态及对应测试仅在用户明确请求时纳入。旧项目按原已确认范围。本文的旧 HTML/工作台形态不应用于六阶段静态交付，局部 HTML 只可为导图中间文件。

### 线框画布

- [ ] 每个屏幕有 2–3 条 notes，至少一个 `<b>` 关键词
- [ ] 每条过渡箭头有用户语言的操作标签
- [ ] 强调色已全部替换（无 `oklch(...)` 等残留）
- [ ] `canvas-header` 的 KPI / Owner / Version 反映真实产品
- [ ] 每条 Rail 至少一个 `.hot` 交互标记
- [ ] 无手写/草书字体（grep `Caveat`、`Kalam`、`Shadows Into Light`、`font-family.*hand` — 应为 0）
- [ ] 所有重要数字（价格/计数/百分比）使用 `.num` 或 `.num-hero`
- [ ] `PingFang SC` 在 UI 字体栈首位（不是 Noto）
- [ ] 默认页面主语言为中文；未加载 context pack 时，导航/按钮/状态/卡片正文/说明文案仍不能退回英文
- [ ] **`{BRAND.signature}` 签名在左上角**（grep `{BRAND.signature}` — 恰好一处）
- [ ] 占位人名默认 `{BRAND.placeholder_user}`（grep `张三`/`Alex Chen`/`John Doe` — 应为 0）
- [ ] 直接在浏览器打开 — 无打包工具，无外部 JS 依赖

### 可交互 Demo（追加检查）

- [ ] 动效 token 与可见 transition/animation 存在；不强制平台主题
- [ ] 导航栏 + 状态栏在持久 Chrome 层（确认 `.chrome-layer` 存在，屏幕注册含 `{chrome, body}`，动画作用于 `.body` 而非 `.screen`）
- [ ] 返回按钮不随页面内容滑动（手动测试）
- [ ] 仅当用户显式要求 glass 主题时加载 `liquid-glass.css` 并检查 `backdrop-filter`
- [ ] `prefers-reduced-motion` 已支持
- [ ] 手机框是轻量线框风（1.5px 边框，白色背景，6–10px 内边距 — 非粗黑 Bezel）
- [ ] 右侧 HUD 控制台存在（二列工作台布局；sticky HUD 含标题/当前/状态/快速跳转/控制/事件日志；自动播放切换；日志捕获每个有意义的事件）
- [ ] 每个 `.btn` 有 `white-space: nowrap`；动态内容按钮已测试最长值
- [ ] 手机内页面、Sheet、Toast 和 HUD 主文案以中文为主；route id、日志 key 和签名可保留英文
- [ ] 并排两按钮用等值 `flex:1`
- [ ] 已对照原始交互稿/上一版本 demo，未改动用户明示保留的页面原则、元素和交互逻辑
- [ ] 除用户明确锁定的底部 Tab 外，所有热点都保留 tap feedback、Toast、Sheet 或跳转之一
- [ ] 半浮层不是全屏；点击遮罩空白区域可收起；Sheet/吸底 CTA 贴住屏幕底部且滚动不漂移
- [ ] 详情页无重复倒计时/重复指标；讨论 Tab 只显示评论，热门内容 Tab 才显示复盘/装备/相关内容/比率等内容
- [ ] 轻量玩法机制未造成卡片膨胀；`.market`、`.share-preview`、`.rank-sticky` 等关键组件无横向溢出
- [ ] 前端稳健性 C15：Tab、按钮、工具入口的 icon 都是真实可见资产；无空 SVG/空 i/emoji/CSS pseudo icon/填充块冒充 icon
- [ ] 前端稳健性 C16：手机内部 absolute/fixed 元素有边界；无负 left/right/top、过大 translate 或 badge 漂出内屏
- [ ] 前端稳健性 C17：紧凑文本容器声明 `min-width:0`、换行、clamp 或截断策略；长文案不会撑破卡片/Tab/utility row
- [ ] 图片真实性 C18：高保真 `<img>` 均有 `data-asset-id`，页面包含 INVENTORY_FIRST 或兼容的 SEARCHED_RELEVANT 来源策略；库存清单绑定目录版本、路径与hash，现场检索项记录query/source/relevance
- [ ] 商品图、内容图、头像和媒体封面没有使用随机生成、泛化编号或无来源的本地图片；exact 图片不可得时已调整文案或在 manifest 中标注品类 fallback
- [ ] 高保真或截图吸收交付前已运行 `scripts/validate-rendered-layout.mjs <html-file> --screenshot=<png-path>`，确认无空白屏、可见重叠、底栏遮挡、按钮文本溢出和 icon 空渲染
- [ ] 使用事件代理或单一监听入口，未新增重复 click listener；复杂逻辑优先静态结构 + CSS 动效
- [ ] 每个页面明确标注 Type 1（入口容器）或 Type 2（全屏 Push）；Type 2 无 TopTabs/TabBar，Type 1 无返回
- [ ] 底部 Tab 顺序为{BRAND.tab_order}；顶部社区 Tab 顺序为{BRAND.top_tabs}
- [ ] 社区 Feeds 使用双列 grid；评论/观点列表允许单列但不能伪装成 Feeds
- [ ] 示例业务/社区活动页至少有讨论或观点承接；若无真实数据，构造具体、有立场、有参与数值/点赞的观点样例
- [ ] 手机容器内可滚动 flex 子元素设置 `min-height:0`；手机内部无横向滚动条，纵向滚动面声明 `overflow-x:hidden`；Rail 轨道手机横排时使用 `flex-wrap:nowrap` + `overflow-x:auto`
- [ ] 截图吸收任务已验证 viewport、真实滚动、computed typography、模块坐标和 Feed 末尾无大片空白；具体字号/间距值由当前 DS Pack 或品牌 skill 提供
- [ ] 模板函数中避免硬编码重复 `id`，可复用元素改用 `data-*`；禁止 `scrollIntoView` 破坏嵌入式预览
- [ ] 新版本未覆盖旧版本；底部注释包含 `VERSION / CHANGES / BASED ON`
- [ ] preflight 全部 errors=0；warnings 已在最终响应中列出并标注处置
- [ ] R11/R12/R13/R14 全部通过或已说明例外原因
- [ ] Mode 声明合约段已在响应顶部贴出
- [ ] 若涉及迭代，已读取 interaction-feedback-patterns.md 并显式回顾「保留/新增/删除/验证」
- [ ] 单屏主信息行 ≤ 7
- [ ] Neutral 概念稿节奏清晰；source-led / context surface 以证据密度为准
- [ ] 倒计时/截止信息已按三档压缩
- [ ] Sheet 高度落在 60% / 80% / 100% 三档
- [ ] 分享卡在独立 Rail
- [ ] 屏幕底部主 CTA 唯一

---

---

## Neutral Methodology Preservation Note

本文件保留通用方法论机制，私有术语已替换为 DS Pack 占位符。执行时保持本文件结构，品牌值只在渲染时由当前激活的 DS Pack / context pack 提供；通用输出不得内联私有产品知识。
