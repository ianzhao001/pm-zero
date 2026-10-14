---
name: demo-authoring
description: >-
  Implement the final clickable product Demo from confirmed interaction and visual artifacts; use only at the Demo stage of a staged project.
---

# Demo 制作

只执行当前阶段计划分配的能力；新项目加载与版本交接遵循[六阶段协议](../../system/protocols/six-stage-product-workflow.md)；旧项目按冻结流程恢复。

## 进入条件
只在当前流程的 Demo 阶段且所有前置确认有效时制作（六阶段 S6；旧八阶段 S8）。读取交互规格、design_model、视觉稿的准确版本；有参考 Demo 时按共享复用规则修改。
## 实现
- 实现正常核心任务闭环，空态与异常仅在用户明确请求时纳入，旧项目按原已确认范围，标注模拟数据与未接入服务；不把原型宣称为生产系统。
- HTML 用 data-screen-id/data-element-id 对应模型，保持页面、操作、文案和视觉基线。
- 动效和响应式只在阶段计划要求时加入，遵守 reduced-motion，不改变用户确认的功能。
- 修改保留范围必须可核查，输出包含 HTML、CSS、脚本和资产的完整清单，不遗漏外置文件。
- 先按当前计划中的素材目录与示例数据填齐语义槽位，运行 design-forge 的 `prepare-demo-assets.mjs` 取得本地副本及版本回执；仅对缺口定向检索，不重抓已命中图片。参考截图不属于可分发库存。
- 可复用 `create-demo-from-library.mjs` 的组件起点，但须适配已确认交互/视觉。共享 `render-pages.mjs` 原生导出；预热一次宿主浏览器缓存，局部修改定点复验后仍保留最终全量验收。
## 交接
运行共享 preflight，将实际输出、模型 hash、映射和已知限制交给独立浏览器验证能力；作者自检不等于独立验收。
共享 Demo 方法由计划按需读取，不递归加载整个旧 design-forge。
