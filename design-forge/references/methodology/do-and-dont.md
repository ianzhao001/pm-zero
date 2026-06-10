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
- **价格颜色**：2026 Figma 确认主价格为 **N140 黑色**（`var(--n140)`），不是红色。红色仅给折扣对比标签
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

## Neutral Methodology Preservation Notes

The preceding section preserves the original do and dont mechanics with private terms replaced by DS Pack placeholders.
Use these notes as an execution index when loading the reference progressively.

- 01. Do and dont checkpoint 1: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 02. Do and dont checkpoint 2: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 03. Do and dont checkpoint 3: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 04. Do and dont checkpoint 4: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 05. Do and dont checkpoint 5: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 06. Do and dont checkpoint 6: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 07. Do and dont checkpoint 7: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 08. Do and dont checkpoint 8: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 09. Do and dont checkpoint 9: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 10. Do and dont checkpoint 10: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 11. Do and dont checkpoint 11: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 12. Do and dont checkpoint 12: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 13. Do and dont checkpoint 13: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 14. Do and dont checkpoint 14: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 15. Do and dont checkpoint 15: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 16. Do and dont checkpoint 16: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 17. Do and dont checkpoint 17: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 18. Do and dont checkpoint 18: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 19. Do and dont checkpoint 19: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 20. Do and dont checkpoint 20: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 21. Do and dont checkpoint 21: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 22. Do and dont checkpoint 22: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 23. Do and dont checkpoint 23: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 24. Do and dont checkpoint 24: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 25. Do and dont checkpoint 25: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 26. Do and dont checkpoint 26: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 27. Do and dont checkpoint 27: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 28. Do and dont checkpoint 28: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 29. Do and dont checkpoint 29: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 30. Do and dont checkpoint 30: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 31. Do and dont checkpoint 31: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 32. Do and dont checkpoint 32: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 33. Do and dont checkpoint 33: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 34. Do and dont checkpoint 34: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 35. Do and dont checkpoint 35: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 36. Do and dont checkpoint 36: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 37. Do and dont checkpoint 37: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 38. Do and dont checkpoint 38: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 39. Do and dont checkpoint 39: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 40. Do and dont checkpoint 40: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 41. Do and dont checkpoint 41: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 42. Do and dont checkpoint 42: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 43. Do and dont checkpoint 43: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 44. Do and dont checkpoint 44: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 45. Do and dont checkpoint 45: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 46. Do and dont checkpoint 46: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 47. Do and dont checkpoint 47: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 48. Do and dont checkpoint 48: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 49. Do and dont checkpoint 49: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 50. Do and dont checkpoint 50: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
