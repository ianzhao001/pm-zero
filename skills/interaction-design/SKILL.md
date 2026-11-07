---
name: interaction-design
description: >-
  Specify static interaction flows and a stable-ID design model from the current workflow inputs; does not build clickable prototypes.
---

# 交互与状态

只执行当前阶段计划分配的能力；流程、加载与版本交接遵循计划已加载的阶段协议，按项目冻结流程恢复。

## 行为规格
- 对每个核心操作写明触发、前置条件、反馈、状态变化和出口，包括正常主流程的返回、取消与关闭。
- 默认只覆盖正常主流程；空、错误等异常态及对应测试仅在用户明确请求时纳入。旧项目仍按原已确认范围。
- 可用性与无障碍分析聚焦任务中实际障碍；仅声明已检查的范围。
## 产物
按计划生成产物：标准流程交付静态流程板、Markdown 规格与 design_model；快速 S2 仅从已确认 S1 场景与范围生成模型，操作用 action/states 表达，必要路径说明留在场景稿，不另做线框或交互规格。模型遵循共享 schema，screen_id/element_id 稳定，来源与保留策略完整。新增页面先核对当前范围源。
## 验收
核对主路径连通、已纳入范围的状态出口、元素与页面归属、模型与图稿一致。六阶段与线框联合确认；快速模式先登记模型，再制作高保真，两者在 S2 联合审查与确认；旧项目按冻结要求。
只表达交互；用户交付不放脚本、HTML 或可操作产品控件。局部 HTML 仅为静态导图中间文件。
