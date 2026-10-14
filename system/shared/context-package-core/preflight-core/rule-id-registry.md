# Rule ID 注册表

rule id 使用检查面前缀加稳定后缀。规则可以是单端规则，也可以是 parity 规则。

- `Scope = design-only`：只由 JavaScript HTML preflight 实现。
- `Scope = prd-only`：只由 Python DOCX validator 实现。
- `Scope = context-design`：由 context pack 的设计端规则模块实现。
- `Scope = context-prd`：由 context pack 的 PRD 端规则模块实现。
- `Parity`：当规则有意在两个引擎中同时实现时，id 与语义必须一致。

当前 v1.1 规则大多为单端规则，因为 HTML 与 DOCX 检查的产物类型不同。未来新增 parity 规则时，两个 runtime 必须保持相同 id、severity、trigger 与 fix 文案。

| ID | Scope | 名称 | 严重度 | JS 实现位置 | Python 实现位置 | 触发条件 | 修复建议 |
|---|---|---|---|---|---|---|---|
| C01 | design-only | 临时/过重颜色 | error | `design-forge/scripts/rules/common.mjs` | n/a | HTML 含临时颜色函数或过重黑色 fallback | 替换为当前 DS tokens |
| C02 | design-only | UI 手写字体 | error | `design-forge/scripts/rules/common.mjs` | n/a | UI 字体栈使用手写字体 | 使用系统/CJK UI 字体栈 |
| C03 | design-only | 占位文案 | error | `design-forge/scripts/rules/common.mjs` | n/a | 出现通用占位姓名或 lorem 文本 | 替换为真实中性文案或 DS Pack 占位值 |
| C04 | design-only | 按钮 nowrap | warning | `design-forge/scripts/rules/common.mjs` | n/a | `.btn` 缺少 `white-space: nowrap` | 增加稳定按钮尺寸规则 |
| C05 | design-only | 内联 JavaScript 语法 | error | `design-forge/scripts/rules/common.mjs` | n/a | 内联 script 解析失败 | 修复 script 语法 |
| C06 | design-only | HTML 文件行数 | warning/error | `design-forge/scripts/rules/common.mjs` | n/a | 单 HTML 文件超过行数预算 | 拆分或简化重复 markup |
| C07 | design-only | Tab grid 范围 | error | `design-forge/scripts/rules/common.mjs` | n/a | Tabbar 列数超出通用范围 | 使用 2-5 稳定列，或由 DS Pack 声明例外 |
| C08 | design-only | 手机容器基线 | error/warning | `design-forge/scripts/rules/common.mjs` | n/a | Flow/Demo 缺少 `.phone-shell > .phone-screen`、Dynamic Island，或偏离 320x694 参考框 | 使用 compact iPhone shell 基线 |
| C09 | design-only | 移动字号密度 | warning | `design-forge/scripts/rules/common.mjs` | n/a | 手机内 hero/card/body 字号明显偏大 | 使用 caption 9-10、body 11-12、card 12-13、hero 20-24 |
| C10 | design-only | 手机内纵向滚动 | error | `design-forge/scripts/rules/common.mjs` | n/a | Flow/Demo 缺少手机内部 `overflow-y:auto` 滚动面 | 为内容区添加可纵向滚动的 flex 子元素 |
| C11 | design-only | 中文主语言 | error | `design-forge/scripts/rules/common.mjs` | n/a | Flow/Demo 页面可见文案不是以中文为主 | 将默认页面主文案、导航、按钮、状态和说明改为中文；保留少量技术标识可接受 |
| F01 | design-only | Flow 画布容器 | error | `design-forge/scripts/rules/flow.mjs` | n/a | `MODE_FLOW` 缺少 canvas marker | 添加 `.canvas` 或等价 id |
| F02 | design-only | Flow 声明 | error | `design-forge/scripts/rules/flow.mjs` | n/a | `MODE_FLOW` 缺少 `window.SCREENS` 或 `window.ARROWS` | 声明 screen 与 arrow metadata |
| F03 | design-only | Flow 中混入 demo 结构 | error | `design-forge/scripts/rules/flow.mjs` | n/a | Flow 含 demo-only shell/HUD/motion marker | 移除 demo-only 结构或切换 mode |
| F04 | design-only | Flow 横向滚动 | error | `design-forge/scripts/rules/flow.mjs` | n/a | Flow canvas/rail 缺少横向滚动兜底 | 为 body/canvas/rail 添加 `overflow-x:auto` |
| D01 | design-only | Demo shell | error | `design-forge/scripts/rules/demo.mjs` | n/a | `MODE_DEMO` 缺少 `.chrome-layer` 或 `.body-container` | 添加持久 chrome/body shell |
| D02 | design-only | Demo 动效/毛玻璃 | error | `design-forge/scripts/rules/demo.mjs` | n/a | `MODE_DEMO` 缺少 motion token 或 glass layer | 添加 `--ease-ios` 与 `backdrop-filter` |
| D03 | design-only | HUD 区块 | warning | `design-forge/scripts/rules/demo.mjs` | n/a | HUD 少于四个标准区块 | 添加 title/current/kv/jump/controls/log 区块 |
| D04 | design-only | Reduced motion | warning | `design-forge/scripts/rules/demo.mjs` | n/a | Demo 缺少 `prefers-reduced-motion` | 添加 reduced-motion media query |
| D05 | design-only | Demo 居中布局 | error | `design-forge/scripts/rules/demo.mjs` | n/a | Demo 默认手机壳右对齐或 workbench 无居中声明 | 居中 workbench，禁止 `.phone-shell { justify-self:end }` |
| V01 | design-only | Version block | error | `design-forge/scripts/rules/version.mjs` | n/a | 版本化 HTML 缺少版本注释 | 添加 VERSION / CHANGES / BASED ON |
| P01 | prd-only | PRD 痕迹卫生 | error | n/a | `prd-forge/scripts/rules/common.py` | 出现工具名、本地路径、旧结构、内部 id | 移除痕迹并使用业务名 |
| P02 | prd-only | 标题样式 | error | n/a | `prd-forge/scripts/rules/common.py` | 编号正文标题未使用 Word Heading style | 应用 Word Heading 1-5 |
| P03 | prd-only | 表格单元格换行 | error | n/a | `prd-forge/scripts/rules/common.py` | 单元格含字面或 XML 换行 | 拆成多个段落 |
| P04 | prd-only | 证据覆盖 | error | n/a | `prd-forge/scripts/rules/common.py` | 功能证据缺图片且无缺失标记 | 添加截图或 `待设计补图` |
| P05 | prd-only | 后台映射 | warning/error | n/a | `prd-forge/scripts/rules/common.py` | 可配置字段未映射到后台行 | 增加匹配的后台需求 |
| P06 | prd-only | 高风险闭环 | error | n/a | `prd-forge/scripts/rules/common.py` | strict 高风险模块缺 AC/异常/owner | 补 AC、异常路径与 owner |
| P08 | prd-only | Screenshot manifest | warning/error | n/a | `prd-forge/scripts/rules/common.py` | Manifest 格式错误或模块不匹配 | 对齐 manifest 与第 4 章模块 |
| B01 | context-design | Context 签名 | error | `*/preflight-rules/brand.mjs` | n/a | 已加载设计 context 缺少必需签名 | 添加 context-pack 签名 |
| B02 | context-design | Context 底部 Tabs | error | `*/preflight-rules/brand.mjs` | n/a | 已加载设计 context 的 tab 顺序错误 | 使用 context-pack layout 顺序 |
| B03 | context-design | Context 顶部 Tabs | error | `*/preflight-rules/brand.mjs` | n/a | 已加载设计 context 的顶部 tabs 顺序或活动位异常 | 使用 context-pack 顶部 tab 顺序 |
| B04 | context-design | 旧 token | error | `*/preflight-rules/brand.mjs` | n/a | 已加载设计 context 使用废弃 token | 替换为当前 DS Pack tokens |
| B05 | context-design | Context accent token | error | `*/preflight-rules/brand.mjs` | n/a | 已加载设计 context 缺少 accent token | 声明或使用 DS Pack 的 `--accent` |
| B06 | context-design | 底部五 Tab | error | `*/preflight-rules/brand.mjs` | n/a | 已加载设计 context 使用 five-tab grid | 改回 context-pack 四 Tab |
| B07 | context-design | 主价格红色 | error | `*/preflight-rules/brand.mjs` | n/a | 主价格/金额使用促销红或风险红 | 改用 N140 或品牌中性色 |
| B08 | context-design | 底部 Tab icon | error | `*/preflight-rules/brand.mjs` | n/a | 底部 Tab 缺真实 SVG/icon 或使用伪元素占位 | 使用 20px SVG stroke icon |
| B09 | context-design | 底部 Tab active 色 | error | `*/preflight-rules/brand.mjs` | n/a | 底部 Tab active 使用 accent | 改用 N140；accent 留给顶部下划线/CTA |
| B10 | context-design | Type 2 Tab 残留 | error | `*/preflight-rules/brand.mjs` | n/a | Type 2 Push 页残留顶/底 Tab | Type 2 只保留返回导航 |
| B11 | context-design | Feeds 单列伪装 | error | `*/preflight-rules/brand.mjs` | n/a | `.feed-grid` 被做成单列列表 | 社区 feeds 双列，讨论/排行使用 list class |
| BR01 | context-prd | Context PRD 实质性 | error | n/a | `*/preflight-rules/brand.py` | 已加载 PRD context 缺少领域术语 | 补充产品专属实质内容 |
| BR02 | context-prd | 积分/资金闭环 | error | n/a | `*/preflight-rules/brand.py` | 积分/资金 PRD 缺对账、异常、owner | 补齐三段内容 |
| BR03 | context-prd | 术语表覆盖 | error | n/a | `*/preflight-rules/brand.py` | 旧品牌术语只在正文出现、未进 glossary | 增加 glossary 条目 |
