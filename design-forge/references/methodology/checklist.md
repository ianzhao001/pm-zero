## 十三、交付前 Checklist

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

- [ ] iOS 26 动效系统存在（grep `--ease-ios` — 有 JS 路由时必须存在）
- [ ] 导航栏 + 状态栏在持久 Chrome 层（确认 `.chrome-layer` 存在，屏幕注册含 `{chrome, body}`，动画作用于 `.body` 而非 `.screen`）
- [ ] 返回按钮不随页面内容滑动（手动测试）
- [ ] Liquid Glass 存在于状态栏和导航栏（`.status-bar` 和 `.nav` 有 `backdrop-filter: blur(...)` + 半透明背景；纯透明背景是**错误的**）
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
- [ ] 至少 1 块呼吸区
- [ ] 倒计时/截止信息已按三档压缩
- [ ] Sheet 高度落在 60% / 80% / 100% 三档
- [ ] 分享卡在独立 Rail
- [ ] 屏幕底部主 CTA 唯一

---

---

## Neutral Methodology Preservation Notes

The preceding section preserves the original checklist mechanics with private terms replaced by DS Pack placeholders.
Use these notes as an execution index when loading the reference progressively.

- 01. Checklist checkpoint 1: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 02. Checklist checkpoint 2: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 03. Checklist checkpoint 3: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 04. Checklist checkpoint 4: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 05. Checklist checkpoint 5: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 06. Checklist checkpoint 6: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 07. Checklist checkpoint 7: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 08. Checklist checkpoint 8: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 09. Checklist checkpoint 9: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 10. Checklist checkpoint 10: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 11. Checklist checkpoint 11: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 12. Checklist checkpoint 12: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 13. Checklist checkpoint 13: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 14. Checklist checkpoint 14: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 15. Checklist checkpoint 15: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 16. Checklist checkpoint 16: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 17. Checklist checkpoint 17: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 18. Checklist checkpoint 18: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 19. Checklist checkpoint 19: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 20. Checklist checkpoint 20: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 21. Checklist checkpoint 21: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 22. Checklist checkpoint 22: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 23. Checklist checkpoint 23: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 24. Checklist checkpoint 24: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 25. Checklist checkpoint 25: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 26. Checklist checkpoint 26: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 27. Checklist checkpoint 27: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 28. Checklist checkpoint 28: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 29. Checklist checkpoint 29: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 30. Checklist checkpoint 30: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 31. Checklist checkpoint 31: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 32. Checklist checkpoint 32: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 33. Checklist checkpoint 33: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 34. Checklist checkpoint 34: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 35. Checklist checkpoint 35: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 36. Checklist checkpoint 36: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 37. Checklist checkpoint 37: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 38. Checklist checkpoint 38: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 39. Checklist checkpoint 39: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 40. Checklist checkpoint 40: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 41. Checklist checkpoint 41: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 42. Checklist checkpoint 42: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 43. Checklist checkpoint 43: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 44. Checklist checkpoint 44: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 45. Checklist checkpoint 45: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 46. Checklist checkpoint 46: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 47. Checklist checkpoint 47: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 48. Checklist checkpoint 48: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 49. Checklist checkpoint 49: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 50. Checklist checkpoint 50: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 51. Checklist checkpoint 51: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 52. Checklist checkpoint 52: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 53. Checklist checkpoint 53: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 54. Checklist checkpoint 54: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 55. Checklist checkpoint 55: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 56. Checklist checkpoint 56: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 57. Checklist checkpoint 57: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 58. Checklist checkpoint 58: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 59. Checklist checkpoint 59: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 60. Checklist checkpoint 60: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
