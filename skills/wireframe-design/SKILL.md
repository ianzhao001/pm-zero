---
name: wireframe-design
description: >-
  Design information architecture and clear static wireframes from a confirmed MRD; excludes product interactions and high-fidelity styling.
---

# 信息架构与线框

只执行当前阶段计划分配的能力；新项目加载与版本交接遵循[六阶段协议](../../system/protocols/six-stage-product-workflow.md)；旧项目按冻结流程恢复。

## 结构
- 从核心业务路径推导最小页面集合；每页写明用户任务、入口、信息优先级和出口。
- 页面与业务能力互相映射，指出缺失路径与重复页面；新增能力或范围必须先回 MRD。
- 用清晰网格、灰度块和真实或明确标注的中文示例文案呈现布局；正文至少 16px、注释至少 14px，手绘风格仅按用户明确偏好采用，不以颜色替代信息层级。
- 移动 App 线框以真实页面结构表达信息：390px 屏宽、系统状态栏、导航/返回、连续内容区域和固定底部操作；页面标题 24px，正文 16px，辅助信息 14px。商品以灰度几何缩略图配商品名/价格，避免把整页内容包成文档摘要卡。
- 按页面任务使用搜索、横排历史物品、双列商品、选择框、数量步进、开关或并排属性比较；助手使用覆盖底层页面的浮层，保留输入与明确提交位置。底部 Tab 遵循已有宿主结构，不新增业务范围。
- 每板最多两屏，以原始尺寸导出。各屏可根据内容自然增高，禁止缩小字体或隐藏超出内容以凑整屏。固定栏与浮层预留内容位置；长标题自动推低正文。
## 输出约束
交付单屏 PNG、总览 PNG、无脚本 SVG 与 Markdown 页面清单；箭头和注释说明路径，不嵌入可点击产品原型。导出前检查字迹、重叠、裁切和信息完整性。
## 交接
保留稳定页面名称与可追溯引用；把重要操作、待定状态和文案语义交给交互设计，不自行决定后台实现。共享布局知识只按计划读取，不照搬旧 HTML 画布产物形态。

静态导图可运行 `node skills/wireframe-design/scripts/render-wireframes.mjs <model.json> <output-dir>`，输出 SVG 和可截图 HTML；PNG 用宿主内置 Browser 截图。HTML 仅为本地导图中间文件，不制作产品交互、不作为 Demo 或用户主成果。

需要导图时按需读[展示模型](references/presentation-model.md)，用独立排版模型映射现有稳定 screen_id，不替代交互模型或重复业务正文。
