# Dewu Screenshot Absorption Runbook

本 runbook 约束 Dewu 截图吸收任务的执行顺序。它不是页面模板；它把截图证据转成可生成规则、可验收阈值和负例测试。

## Priority

截图事实在设计语言、视觉规范和页面结构上优先于 Dewu 旧规则。优先级为：

`uploaded screenshots > screenshot-evidence-pack.md > screenshot-absorption-runbook.md > tab-surfaces.md > ds-spec.lock.md > ds-pack/* > research/dewu-research.md > external dewu-interaction-design`

该优先级不覆盖仓库协议、发布边界、隐私边界、工具接口、测试运行方式或截图不能证明的业务事实。

## Failure Taxonomy

1. 只吸收结构，没有吸收字体、字号、行高、换行、可见行数、截断和模块间距。
2. 只检查 DOM 存在，没有检查 visible rendered DOM 和 computed style。
3. 使用 hidden evidence、不可见 `<template>`、display:none 证据块、`.tabbarx` 或别名 selector 绕过规则。
4. 手机壳或展示 rail 压缩 `393x852 CSS px` 内部坐标。
5. 长截图被缩放或裁切，真实滚动区没有 `scrollHeight > clientHeight`。
6. Feed/product 流到底后用 spacer、超长 min-height 或空白占位制造“还有内容”的假象。
7. 非当前 surface 复用错误字号，例如把推荐页字号复用到购买、探索、我或内容详情。
8. profile dashboard 被 grid/min-height/stretch 拉散，钱包、省钱神券、出售和服务宫格产生大片空白。
9. 购买顶部文字、频道、`三 分类`、宫格入口和信任背书行漂移。
10. 内容详情页错误保留底部 Tab，或缺 hero overlay、商品推荐条、作者关注行、评论区和底部互动栏。
11. Playwright 测试绕过 Dewu browser helper，回退系统 Chrome 后触发本机 Chrome 启动冲突。

## One-Pass Workflow

1. **Geometry first**：记录每张图的 source size、设备倍率、归一化 CSS viewport、是否长截图、可滚动内容高度。
2. **Surface classify**：标注 surface type、Tab active、Type 1/Type 2、scroll state、是否为详情 push。
3. **Visible text table**：列出可见文字。复刻上传截图时逐字一致；同类生成可换内容，但 footprint 必须一致。
4. **Module grammar**：把截图拆成可复用模块，例如社区 Feed、商品卡、信任背书、profile dashboard、评论区。
5. **Typography footprint**：记录 font-size、line-height、font-weight、margin/padding、clamp、meta 单行规则。
6. **Spacing anchors**：记录模块 top/height、滚动视口高度、图标尺寸、底栏基线、红点/badge 位置。
7. **Negative fixture first**：新增或扩展负例，让错误版本先失败。
8. **Validator update**：更新 brand preflight、HIFI validator 或 demo rendered-DOM test，覆盖 visible DOM、computed style、真实滚动、无横向溢出。
9. **Proof artifact last**：只有 evidence/runbook/validator/negative fixture 就绪后，才生成或更新 HTML proof artifact。
10. **Memory closeout**：把可复用经验写入 `.memory/` 和 journal，避免下轮重新踩坑。

## Intake Template

每批新截图进入 Dewu 时，必须在 `screenshot-evidence-pack.md` 或相邻证据文件中填写：

| Field | Required Content |
|---|---|
| `source id` | 图片文件名或用户上传顺序 |
| `source size` | 原图宽高，例如 `1179x2556` |
| `CSS viewport` | 归一化宽高和倍率，例如 `393x852 @3x` |
| `scroll state` | 单屏、下滑后、长截图、详情页长内容等 |
| `surface type` | 得物 Feed、购买商品流、探索工具列表、我页 dashboard、内容详情等 |
| `visible text` | 页面可见文字逐字表，含 Tab、标题、商品名、按钮、meta |
| `module grammar` | 可复用模块和层级顺序 |
| `typography footprint` | 字号、行高、字重、clamp、单行截断、字数密度 |
| `spacing anchors` | 模块 top/height、padding/gap、滚动 viewport、底栏/状态栏基线 |
| `icon/image rules` | 线框 icon、商品图、视频角标、红点、badge、overlay |
| `negative fixture` | 至少一个能抓住本轮风险的负例或 readiness check |
| `rendered-DOM test` | Playwright/validator 链接，必须检查可见 DOM 和 computed style |
| `non-evidence` | 截图不能证明、禁止外推的业务事实 |

## Validator Requirements

- `skills/dewu/preflight-rules/brand.mjs`：保留并扩展 B23+ 截图级规则。
- `skills/dewu/tests/run-negative-tests.sh`：新增负例必须进入 runner。
- `skills/dewu/tests/validate-hifi-surface.cjs`：HIFI surface 必须检查坐标、字号、行高、line-clamp、真实滚动和无横向溢出。
- `run-skill-detection-demo-tests.cjs`：MODE_DEMO 必须走可见 route，禁止 hidden evidence 和 selector alias。
- `skills/dewu/tests/check-screenshot-absorption-readiness.cjs`：每次新增截图吸收前后都要跑，确认 evidence/runbook/contract/validator 链路没有断。

## Definition of Done

- 新截图已经归一化 source size / CSS viewport / scroll state。
- evidence pack 已包含 visible text、module grammar、typography footprint 和 spacing anchors。
- 至少一个负例覆盖本轮最可能返工点。
- rendered-DOM 测试验证用户实际看到的手机内部，而不是隐藏模板。
- 长截图可真实滚动，feed/product 流到底自然停止，没有大片空白。
- proof artifact 或 demo 只作为验收载体，不作为规则来源。
- design-forge 只吸收通用方法；Dewu 私有 typography、spacing 和 surface grammar 留在本 skill。
