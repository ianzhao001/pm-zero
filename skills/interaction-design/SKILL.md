---
name: interaction-design
description: >-
  Specify static interaction flows, state transitions and a stable-ID design model from confirmed wireframes; does not build clickable prototypes.
---

# 交互与状态

只执行当前阶段计划分配的能力；新项目加载与版本交接遵循[六阶段协议](../../system/protocols/six-stage-product-workflow.md)；旧项目按冻结流程恢复。

## 行为规格
- 对每个核心操作写明触发、前置条件、反馈、状态变化和出口，包括正常主流程的返回、取消与关闭。
- 默认只覆盖正常主流程；空、错误等异常态及对应测试仅在用户明确请求时纳入。旧项目仍按原已确认范围。
- 可用性与无障碍分析聚焦任务中实际障碍；仅声明已检查的范围。
## 双产物
静态流程板与 Markdown 规格，以及遵循共享 schema 的 design_model JSON。screen_id/element_id 稳定，状态、来源引用和保留策略完整；新增页面先核对 MRD 范围，在同一 S4 联合产物中同步。
## 验收
核对主路径连通、已纳入范围的状态出口、元素与页面归属、模型与图稿一致。六阶段中与线框一同审查、一同确认；旧项目按冻结确认要求，未确认前不进入视觉稿。
只表达交互；用户交付不放脚本、HTML 或可操作产品控件。局部 HTML 仅为静态导图中间文件。
