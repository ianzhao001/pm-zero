---
name: business-modeling
description: >-
  Model product actors, business objects, capabilities, core flows and MVP boundaries for a scoped MRD; use before interface design.
---

# 业务建模

只执行当前阶段计划分配的能力；新项目加载与版本交接遵循[六阶段协议](../../system/protocols/six-stage-product-workflow.md)；旧项目按冻结流程恢复。

## 输入与输出
读取已确认的需求与场景，输出 MRD 写作使用的业务模型和范围决定；不扩展到实现架构、数据库表或完整市场报告。
## 方法
- 列出参与角色、关键业务对象及关系，说明谁在何时对什么执行什么动作，以及结果归谁使用。
- 把场景归并为业务能力，选出一条端到端核心路径。每项能力必须说明支撑哪个场景。
- 界定核心业务规则、范围边界与责任；六阶段默认正常主流程，用户明确请求才建模异常或失败结果；区分已确认规则和需要用户决定的选项。
- 给出本次必需能力、明确不做的能力和排除理由。无法支撑成功标准的功能不自动加入。
- 商业分析仅处理任务明确需要的价值、成本或运营假设；未知数字写未知，不编造市场规模。
## 交接
提供角色与对象关系、能力清单、主流程、业务边界、非目标、验收依据和来源，交给 MRD 作者整合；内容冲突交回主控裁决。
