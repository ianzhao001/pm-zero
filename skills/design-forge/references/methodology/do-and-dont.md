## 六、设计规则：Do / Don't（严格模式）

### Do

- **强调色纪律**：`--accent`（accent）只用在每屏最重要的单个 CTA 或选中态，不作装饰，不作大块背景
- **间距层级系统**：`5 / 10 / 20pt` 三档，不跳级，不混用
- **中性色只用官方色阶**：每个 `color / background / border` 的灰色必须来自 N 色阶
- **CJK 字体**：所有中文内容用 PingFang SC / Noto Sans SC，不混入拉丁展示字体
- **WCAG AA**：正文在白色背景 → `var(--n140)`；`#7F7F8E`（N100）仅用于大字或注释

### Don't

- **字重上限**：每屏不超过 2 个字重。不用 600/700/800 加粗
- **阴影洁癖**：只有 `.btn.accent`（主 CTA）有阴影 `0 2px 4px rgba(0,0,0,.05)`。卡片/Sheet/Toast/气泡/芯片 无阴影
- **红色管控**：`--semantic-danger` 只用于折扣标签 / 真正破坏性操作（删除/解绑）/ 警告。**绝不**用于 立即购买/下单/确认支付 等商务 CTA —— 这些是主操作，用accent
- **价格颜色**：中性默认使用高对比主文字 token；红色仅给折扣对比、风险或 context 明确允许的状态
- **按钮配色层级**：
  - `.btn.accent`（accent filled）— 默认首选：立即购买/确认/发布/提交/下一步
  - `.btn.primary`（黑色 filled）— 备用：与选中态冲突时，或编辑风格页面
  - `.btn.outline`（白底 + N140 边框）— 次要操作：取消/返回/重新选择
  - `.btn.destructive`（红色 filled）— 仅真正破坏性：删除/清空/解绑/退订
- **按钮文本不换行**：每个 `.btn` 必须有 `white-space: nowrap`
- **不在按钮内嵌套 `.chip`**：用 `<span>` + inline 样式替代
- **两按钮并排**：用 `flex: 1`，不用 `flex: 1 / 1.2`
- **段落无彩色背景**：正文落在白色 / N-bg。彩色面板（accent-soft、软木板、Feed 高亮）最多放 ≤2 行短标签

---

---

## Neutral Methodology Preservation Note

本文件保留通用方法论机制，私有术语已替换为 DS Pack 占位符。执行时保持本文件结构，品牌值只在渲染时由当前激活的 DS Pack / context pack 提供；通用输出不得内联私有产品知识。
