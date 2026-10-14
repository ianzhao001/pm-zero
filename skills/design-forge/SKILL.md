---
name: design-forge
description: >-
  Create or revise mobile interaction flows, clickable demos, high-fidelity surfaces, and screenshot-led design artifacts. Use for authoring or iteration; do not use for independent review, approval, or UI business-code implementation.
---

# Design Forge

创建或迭代移动端 Flow、Demo 与高保真 surface；默认使用中文中性 Mobile DS，方法按 resolver 结果渐进加载。

## 路由

- 从 idea 澄清或设计完整产品先进入 pm-zero 项目流程；分阶段项目仅执行 stage_prepare 的当前计划。不得因品牌、能力或工具受阻把项目降级到本独立入口。明确的单份设计请求和原 G1–G4 项目仍按既有路线运行。
- 遵循 `../../system/protocols/skill-loading-protocol.md`；`artifact=flow|demo` 决定产物形态，`fidelity=standard|hifi|screenshot` 决定证据与质量层，`CONTEXT` 独立选择上下文。
- `MODE_FLOW` / `MODE_DEMO` 保持兼容；旧 `MODE_HIFI` 映射为 `artifact=flow, fidelity=hifi` 并提示弃用。显式“高保真可点击 Demo”必须得到 `artifact=demo, fidelity=hifi`。
- Flow 与 Demo 同时要求时串行生成并保持 screen/route 命名同步；独立找茬或放行交给 `reviewer-forge`。

## 渐进式加载

只执行 resolver 的当前 `load_steps`：读取 required 和 selected optional，assets 用脚本复制或链接。入口不另设默认文件表；普通引用不授权递归预读。

Flow/Demo/HIFI/截图规则由 artifact/fidelity 路由。反馈、素材、组件、视觉细节分别可请求 `--optional-rule design-feedback|asset-search|atom-defaults|visual-craft`（每次传一个 ID）；故事画布用 `story-canvas`。条件缺失时补充请求再解析，不扫描目录。

旧四阶段流水线才选择 `legacy-pipeline`；主动 G1–G4 引导遵循对应生产路由，不能混用阶段编号。未读取的依赖不得声称已加载。

## 执行边界

- 通用流程、证据 intake、原子职责与验收方法留在本 skill；品牌 token、surface grammar、术语、截图事实和加严阈值只来自选中的 context。
- Source-led 证据覆盖 neutral 留白、卡高和样式启发；不得让平台主题、Liquid Glass 或线框 recipe 覆盖截图/context。
- 迭代时保留未要求改变的信息架构、路由和文案；修改用户 HTML 默认新建单调递增版本并写版本块。
- Demo 必须有可见 route/state/HUD/log/feedback/reduced-motion；HIFI Demo 同时满足 Demo 与 HIFI 合约。
- 资产用 `scripts/materialize-design-assets.mjs` 机械复制或内联；asset 字节与 prompt 正文 token 分开记录。
- 位图/图标先按语义槽位运行 `scripts/prepare-demo-assets.mjs --context <context> --list` 与 `--slots <json> --output <dir>`；只检索返回的缺口。库存文件、示例数据与用途绑定，不能把参考截图入库。
- 明确需要组件起点时使用 `scripts/create-demo-from-library.mjs`，再适配已确认设计；模板不是品牌功能全集或高保真自动验收。PNG 由共享 `system/shared/browser/render-pages.mjs` 导出，先检查宿主浏览器缓存，内置浏览器用于实际验看。

## 校验与交付

- 运行 `scripts/preflight.mjs`；规则修改加 `--self-test`；文档修改运行 `scripts/check-doc-budget.mjs`。
- context 加 `--brand-rules=<module>`；HIFI/截图运行 `scripts/validate-rendered-layout.mjs <html> --screenshot=<png>`。
- 最终报告 artifact、fidelity、context、required/selected optional、asset files、content mode、校验结果与输出路径。

六阶段项目遵循[六阶段协议](../../system/protocols/six-stage-product-workflow.md)：S4 联合静态结构与交互，S5 静态高保真，S6 可交互 Demo。只加载当前计划的引用；旧独立路线引用中的 HTML、批次与异常规则不能覆盖当前流程。默认正常主流程；用户明确请求才生成空态、异常态及对应测试。静态阶段局部 HTML 只为导图，不作产品交互。展示用图稿与短结论，完整模型及报告作附件，禁止 JSON 主入口。
