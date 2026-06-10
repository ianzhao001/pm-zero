## 八、可交互 Demo（iOS 26 动效系统）

> 本节仅在 MODE_DEMO 下生效。

当用户要求**可点击/可交互 Demo**时（而非静态线框画布），在遵守 {BRAND.name} DS 的同时，叠加以下 iOS 26 动效系统。

### 8.1 动效 Token（在 `:root` 中必须声明）

```css
--ease-ios:       cubic-bezier(0.32, 0.72, 0, 1);    /* push/pop — UIKit 默认 */
--ease-ios-emph:  cubic-bezier(0.20, 0.90, 0.10, 1); /* 模态强调，轻微过冲 */
--ease-ios-sheet: cubic-bezier(0.34, 0.98, 0.52, 1); /* 底部 Sheet 上滑 */
--ease-ios-tap:   cubic-bezier(0.25, 0.46, 0.20, 1); /* 按钮按下 */
--dur-xs: 180ms; --dur-s: 240ms; --dur-m: 400ms; --dur-l: 520ms;
```

### 8.2 持久化 Chrome 层（关键 — 导航栏 + 状态栏不参与滑动）

iOS 中状态栏和导航栏是**固定在内容之上的持久层**。内容在其下方滑动，Chrome 原地保持，仅交叉淡化标题/按钮。

```html
<div class="phone-screen" id="app">
  <div class="body-container" id="body-container"></div>  <!-- 屏幕在此滑动，z:1 -->
  <div class="chrome-layer"   id="chrome-layer"></div>    <!-- 导航栏+状态栏，z:10 -->
  <!-- 模态/Toast 附加于此，z:20+ -->
</div>
```

```css
.body-container { position:absolute; inset:0; overflow:hidden; z-index:1; }
.chrome-layer   { position:absolute; top:0; left:0; right:0; z-index:10; pointer-events:none; }
.chrome-layer > .chrome {
  pointer-events: auto;
  animation: ios-chrome-in var(--dur-s) var(--ease-ios) both;
}
.chrome-layer > .chrome.leaving {
  position:absolute; top:0; left:0; right:0;
  animation: ios-chrome-out var(--dur-xs) var(--ease-ios) forwards;
}
@keyframes ios-chrome-in  { from{opacity:0} to{opacity:1} }
@keyframes ios-chrome-out { from{opacity:1} to{opacity:0} }
.body {
  position:absolute; inset:0;
  display:flex; flex-direction:column; background:var(--n00);
  padding-top:94px;        /* 为 Chrome 预留空间（状态栏 48 + 导航栏 46）*/
  will-change: transform, opacity, filter;
}
.body.clear-chrome { padding-top:0; } /* 沉浸屏（地图/引导/刮奖）*/
```

**Liquid Glass（强制）** — 状态栏和导航栏须有 `backdrop-filter` 毛玻璃效果：

```css
.status-bar {
  background: rgba(255,255,255,.72);
  -webkit-backdrop-filter: blur(22px) saturate(180%);
  backdrop-filter:         blur(22px) saturate(180%);
}
.status-bar.dark { color:var(--n00); background: rgba(20,21,26,.55); }
.nav {
  background: rgba(255,255,255,.72);
  -webkit-backdrop-filter: blur(22px) saturate(180%);
  backdrop-filter:         blur(22px) saturate(180%);
}
.nav.clear { border-bottom:none; background: rgba(255,255,255,.32); }
```

每个屏幕注册为 `{ chrome, body, clearChrome? }`：

```js
Router.register('main', {
  chrome: () => `${StatusBar()}${Nav({ title:'...', left:'‹', onBack:"Router.back()" })}`,
  body:   () => `<scroll-body>...</scroll-body>`,
});
```

### 8.3 Push / Pop 动画（作用于 `.body`，非整屏）

```css
.body[data-dir="enter-right"] { animation: ios-push-in  var(--dur-m) var(--ease-ios) both; z-index:2;
  box-shadow:-18px 0 40px rgba(12,18,28,.14), -1px 0 0 rgba(12,18,28,.05); }
.body[data-dir="leave-left"]  { animation: ios-push-out var(--dur-m) var(--ease-ios) both; z-index:1; }
.body[data-dir="enter-left"]  { animation: ios-pop-in   var(--dur-m) var(--ease-ios) both; z-index:1; }
.body[data-dir="leave-right"] { animation: ios-pop-out  var(--dur-m) var(--ease-ios) both; z-index:2;
  box-shadow:-18px 0 40px rgba(12,18,28,.14), -1px 0 0 rgba(12,18,28,.05); }

@keyframes ios-push-in  { 0%{transform:translate3d(100%,0,0)}  100%{transform:translate3d(0,0,0)} }
@keyframes ios-push-out { 0%{transform:translate3d(0,0,0) scale(1); filter:brightness(1)}
                          100%{transform:translate3d(-26%,0,0) scale(.958); filter:brightness(.86)} }
@keyframes ios-pop-in   { 0%{transform:translate3d(-26%,0,0) scale(.958); filter:brightness(.86)}
                          100%{transform:translate3d(0,0,0) scale(1); filter:brightness(1)} }
@keyframes ios-pop-out  { 0%{transform:translate3d(0,0,0)}     100%{transform:translate3d(100%,0,0)} }
```

同级上下文内的轻量状态切换用 fade + 微缩放：

```css
.body[data-dir="enter-fade"] { animation: ios-fade-in  var(--dur-s) var(--ease-ios-emph) both; z-index:2; }
.body[data-dir="leave-fade"] { animation: ios-fade-out var(--dur-xs) var(--ease-ios) both; z-index:1; }
@keyframes ios-fade-in  { 0%{opacity:0; transform:scale(1.018)} 100%{opacity:1; transform:scale(1)} }
@keyframes ios-fade-out { 0%{opacity:1; transform:scale(1)}     100%{opacity:0; transform:scale(.988)} }
```

### 8.4 模态 · Sheet 毛玻璃

```css
.dim {
  position:absolute; inset:0;
  background:rgba(20,21,26,.32);
  backdrop-filter:blur(14px) saturate(150%);
  -webkit-backdrop-filter:blur(14px) saturate(150%);
  animation: ios-dim-in var(--dur-s) var(--ease-ios) both;
}
@keyframes ios-dim-in {
  0%  { opacity:0; backdrop-filter:blur(0) saturate(100%); }
  100%{ opacity:1; backdrop-filter:blur(14px) saturate(150%); }
}
.modal {
  position:absolute; left:20px; right:20px; top:50%;
  background:var(--n00); border-radius:18px;
  box-shadow:0 28px 56px rgba(12,18,28,.22), 0 4px 14px rgba(12,18,28,.08);
  animation: ios-modal-in var(--dur-m) var(--ease-ios-emph) both;
}
@keyframes ios-modal-in {
  0%  { opacity:0; transform:translateY(calc(-50% + 14px)) scale(.9); }
  55% { opacity:1; }
  100%{ opacity:1; transform:translateY(-50%) scale(1); }
}
```

始终在 `.remove()` 前运行显式 `leave` 动画，禁止硬切换。

### 8.5 Toast · Liquid Glass 胶囊

```css
.toast {
  position:absolute; left:50%;
  background:rgba(20,21,26,.72);
  backdrop-filter:blur(20px) saturate(180%);
  -webkit-backdrop-filter:blur(20px) saturate(180%);
  color:var(--n00); border-radius:999px; padding:11px 18px;
  box-shadow:0 10px 28px rgba(12,18,28,.22), inset 0 0 0 .5px rgba(255,255,255,.12);
  animation: ios-toast-in var(--dur-m) var(--ease-ios-emph) both;
}
@keyframes ios-toast-in {
  0%  { opacity:0; transform:translateX(-50%) translateY(14px) scale(.88); }
  55% { opacity:1; }
  100%{ opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
}
```

### 8.6 点击反馈

- 主 `.btn`：`scale(.96)` + `brightness(.95)`，`--ease-ios-tap`，180ms
- 大卡片/大点击区：`scale(.985)` + 轻微 `brightness(.97)`
- 导航返回按钮：`translateX(-2px) scale(.92) opacity(.45)`
- 永不使用 `linear` 缓动

### 8.7 彩屑动效（庆祝时刻）

40 颗粒子，0–320ms 随机延迟，`--drift` CSS 变量控制水平漂移，`cubic-bezier(0.23, 1, 0.32, 1)` easeOutCirc，720° 旋转，混合 3 种形状（圆形/方形/条形）。

### 8.8 动效编排时序

多步动画串联（如揭晓 → 跳转 → 彩屑 → 模态）时，用 80–120ms 间隔交错，防止效果相互抢占：

```js
Router.go('main', { fade: true });      // 240ms 淡入
setTimeout(() => confetti(), 80);       // 与淡入尾部叠加
setTimeout(() => openModal(html), 160); // 模态 spring 入场
```

### 8.9 无障碍

```css
@media (prefers-reduced-motion: reduce) {
  .screen, .modal, .dim, .toast, .confetti i {
    animation-duration: 1ms !important; animation-delay: 0 !important;
  }
}
```

### 8.10 设备框（轻量线框风）

```css
.phone-shell {
  width:320px; height:694px;
  border:1.5px solid var(--n140); border-radius:44px;
  background:var(--n00); padding:7px;
  box-shadow:0 2px 3px rgba(12,18,28,.08), 0 18px 36px rgba(12,18,28,.12);
}
.phone-shell::before {           /* Dynamic Island */
  content:""; position:absolute; top:12px; left:50%; transform:translateX(-50%);
  width:92px; height:24px; background:var(--n140); border-radius:999px; z-index:50;
}
.phone-screen {
  width:100%; height:100%;
  border:1px solid var(--n40); border-radius:36px;
  background:var(--n00); overflow:hidden; position:relative;
}
```

永不用 2px+ 深色边框或厚重黑色 Bezel — 保持线框图示语言。

手机内部滚动约束：`.phone-screen` 保持 `overflow:hidden`；页面内容区使用 `.content { flex:1; min-height:0; overflow-y:auto; }`，状态栏/导航栏留在 `.chrome-layer`，不能跟随正文滚动。

移动端字号密度：caption 9-10px、meta 10-11px、body 11-12px、card title 12-13px、nav title 16px、hero 20-24px。只有画布外标题和 HUD 标题可以大于该阶梯。

默认语言约束：未加载任何 context pack 时，Demo 的手机内页面、导航、按钮、Sheet、Toast、空态、HUD 标题和状态说明仍必须以中文为主；route id、日志键名、版本标识和 `Prototype Lab` 签名可保留少量英文。

### 8.11 右侧 HUD 控制台（可交互 Demo 必须含有）

每个可交互 Demo 都附带右侧 HUD 面板，把 Demo 变成可导航的产品走查工具。

布局：二列 CSS Grid，手机左/HUD 右，HUD `position: sticky; top: 48px`。

```css
.workbench {
  min-height:100vh;
  display:grid; grid-template-columns: 320px 340px;
  gap:34px; padding:48px;
  place-content:center;
  align-items:start;
}
.hud {
  position:sticky; top:48px;
  background:var(--n00); border:1px solid var(--n40); border-radius:10px;
  padding:18px; box-shadow:0 2px 6px rgba(0,0,0,.04);
  font-size:12px;
  max-height:calc(100vh - 96px); overflow-y:auto;
}
```

**必须包含的 6 个区块**（从上到下）：

1. **标题 + 副标题** — 功能名（PingFang SC 600）+ `INTERACTIVE · iOS 26 · {BRAND.name} DS`（monospace 大写）
2. **当前状态** — 当前屏幕 ID + 步骤标签，每次 `Router.go()` 更新
3. **状态字段** — 3–6 行 `.kv`，展示随用户操作实时变化的领域状态
4. **快速跳转** — 每个屏幕一个编号按钮；活跃屏accent填充，已访问accent描边
5. **控制按钮** — `← 返回` + `下一步 →`（填充黑）；`▶ 自动播放`（accent）+ `↻ 重置`
6. **事件日志** — 可滚动 monospace 日志，时间戳 + 操作标签 + 详情；最新在顶；上限 30 条

**行为合约**：
- 单一 `State` 对象是唯一数据源，绝不从 DOM 读取数据来驱动 HUD
- `updateHUD()` 在**每次状态变更和每次 `Router.go()`** 之后调用，幂等
- 快速跳转按钮调用 `Router.go(id, { jump: true })`，使用 `enter-fade`（传送感，非翻页感）
- `log(action, detail)` 在每个有意义的事件触发：`NAV` / `SHEET` / `TAP` / `COLOR` / `LIKE` / `RESET`。标签 ≤10 chars 全大写，详情 ≤30 chars
- 重置恢复初始状态 + 清空 `State.visited` + 跳转第一屏
- `autoplay()` 存储定时器于 `Flow._autoTimers`，点击切换播放/暂停

---

---

## Neutral Methodology Preservation Notes

The preceding section preserves the original interactive demo system mechanics with private terms replaced by DS Pack placeholders.
Use these notes as an execution index when loading the reference progressively.

- 01. Interactive demo checkpoint 1: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 02. Interactive demo checkpoint 2: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 03. Interactive demo checkpoint 3: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 04. Interactive demo checkpoint 4: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 05. Interactive demo checkpoint 5: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 06. Interactive demo checkpoint 6: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 07. Interactive demo checkpoint 7: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 08. Interactive demo checkpoint 8: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 09. Interactive demo checkpoint 9: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 10. Interactive demo checkpoint 10: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 11. Interactive demo checkpoint 11: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 12. Interactive demo checkpoint 12: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 13. Interactive demo checkpoint 13: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 14. Interactive demo checkpoint 14: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 15. Interactive demo checkpoint 15: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 16. Interactive demo checkpoint 16: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 17. Interactive demo checkpoint 17: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 18. Interactive demo checkpoint 18: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 19. Interactive demo checkpoint 19: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 20. Interactive demo checkpoint 20: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 21. Interactive demo checkpoint 21: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 22. Interactive demo checkpoint 22: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 23. Interactive demo checkpoint 23: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 24. Interactive demo checkpoint 24: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 25. Interactive demo checkpoint 25: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 26. Interactive demo checkpoint 26: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 27. Interactive demo checkpoint 27: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 28. Interactive demo checkpoint 28: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 29. Interactive demo checkpoint 29: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 30. Interactive demo checkpoint 30: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 31. Interactive demo checkpoint 31: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 32. Interactive demo checkpoint 32: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 33. Interactive demo checkpoint 33: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 34. Interactive demo checkpoint 34: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 35. Interactive demo checkpoint 35: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 36. Interactive demo checkpoint 36: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 37. Interactive demo checkpoint 37: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 38. Interactive demo checkpoint 38: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 39. Interactive demo checkpoint 39: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 40. Interactive demo checkpoint 40: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 41. Interactive demo checkpoint 41: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 42. Interactive demo checkpoint 42: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 43. Interactive demo checkpoint 43: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 44. Interactive demo checkpoint 44: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 45. Interactive demo checkpoint 45: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 46. Interactive demo checkpoint 46: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 47. Interactive demo checkpoint 47: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 48. Interactive demo checkpoint 48: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 49. Interactive demo checkpoint 49: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 50. Interactive demo checkpoint 50: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 51. Interactive demo checkpoint 51: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 52. Interactive demo checkpoint 52: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 53. Interactive demo checkpoint 53: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 54. Interactive demo checkpoint 54: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 55. Interactive demo checkpoint 55: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 56. Interactive demo checkpoint 56: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 57. Interactive demo checkpoint 57: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 58. Interactive demo checkpoint 58: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 59. Interactive demo checkpoint 59: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 60. Interactive demo checkpoint 60: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 61. Interactive demo checkpoint 61: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 62. Interactive demo checkpoint 62: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 63. Interactive demo checkpoint 63: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 64. Interactive demo checkpoint 64: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 65. Interactive demo checkpoint 65: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 66. Interactive demo checkpoint 66: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 67. Interactive demo checkpoint 67: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 68. Interactive demo checkpoint 68: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 69. Interactive demo checkpoint 69: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 70. Interactive demo checkpoint 70: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 71. Interactive demo checkpoint 71: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 72. Interactive demo checkpoint 72: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 73. Interactive demo checkpoint 73: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 74. Interactive demo checkpoint 74: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 75. Interactive demo checkpoint 75: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 76. Interactive demo checkpoint 76: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 77. Interactive demo checkpoint 77: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 78. Interactive demo checkpoint 78: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 79. Interactive demo checkpoint 79: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 80. Interactive demo checkpoint 80: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 81. Interactive demo checkpoint 81: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 82. Interactive demo checkpoint 82: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 83. Interactive demo checkpoint 83: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 84. Interactive demo checkpoint 84: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
- 85. Interactive demo checkpoint 85: keep the source structure, apply the active DS Pack only at render time, and do not inline private product knowledge in generic output.
