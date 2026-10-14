# Mobile Craft — 移动端工艺基线

生产级移动端 H5/原型的通用工艺写法（品牌无关）。高保真或交付级产物应默认采用；品牌 token 值由激活的 DS Pack 提供。

## 1. hairline（0.5px 视觉分割线）

- retina 屏 1px 边框显粗；分割线用伪元素 + `transform: scaleY(0.5)`（2x）/ `scaleY(0.333333)`（3x），`transform-origin: 0 0`。
- 四边框版本：伪元素 `width/height: 200%/300%` + `scale(0.5/0.333)`，radius 同步乘倍。
- 列表项 bottom hairline 默认 `last-child` 不显示。
- 原型场景可直接写 `0.5px`；但不得用 1px 实线冒充 hairline 后声称像素级还原。

## 2. safe-area 适配

- 底部固定元素（TabBar、吸底 CTA）叠加 `env(safe-area-inset-bottom)`（含 `constant()` 兼容），用 `max()` 保底。
- TabBar 总高 = 内容栏高度 + safe-area inset，二者分开建模，不写含糊中间值。
- 顶部沉浸式布局按机型刘海高度做 `max()` 保底。
- 固定画布原型可用「内容栏 + home indicator 区」静态等价表达，但结构上仍要分层。

## 3. 文本溢出

- 单行省略：`overflow: hidden; text-overflow: ellipsis; white-space: nowrap`。
- 多行省略：`display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: N; overflow: hidden`。
- 禁止用 JS 截断字符串模拟省略号；截断策略写进 CSS，validator 检查真实溢出。

## 4. 无抖动首屏

- 依赖客户端状态（AB、localStorage、登录态）的首屏条件模块：CSS 先行定住首帧最终态，状态后同步；禁止「先渲染再闪变」。
- Demo 中涉及此类模块时，交互说明必须声明首帧策略。

## 5. 场景 token 纪律

- 遮罩、骨架屏、阴影、品牌色透明度变体等场景值统一走 CSS 变量（DS Pack 提供具体值），不在业务选择器新造透明度/hex。
- 暗黑模式（若任务要求）通过 `[data-theme]` 覆盖变量实现，不写第二套组件样式；默认浅色，opt-in。
