---
id: contract-evidence-grading-protocol
title: Evidence grading protocol
tags: [contract, evidence, grading, product-claims]
created: 2026-05-20
updated: 2026-07-10
status: active
version: 1.1.0
publish_scope: public
lifecycle: stable
external_readiness: ready_for_brand_review
brand_review_status: pending_brand_review
source_lineage: magi-product/lead-pm-prompt.md
---

# Evidence Grading Protocol

本文件是 pm-zero 对 A–E 证据等级定义的唯一正文。其他 skill/reference 只能引用并补充阶段或严重度适配，不得重定义等级。

## Canonical Grades

| Grade | Meaning | Acceptable use |
|---|---|---|
| A | 直接的一方证据，如用户访谈、生产数据、客服工单、正式实验或用户提供的可审计产物 | 在相关且仍有效时可支撑重大决策 |
| B | 有明确来源的可信外部证据，如权威市场报告、竞品官方文档或公共 benchmark | 来源与适用范围清楚时可支撑决策 |
| C | 从已接受产物、数据或多个较弱信号推导出的结论 | 可支撑方向，但必须写出推导来源与假设 |
| D | 直接支持有限的专家判断或类比 | 可指导探索，不得独自关闭重大决策 |
| E | 未验证的假设、直觉、占位论断或来源未知的陈述 | 重大投入前必须标注并验证，不得作为重大决策唯一依据 |

## Hard Constraints

- 证据等级必须出现在产物中，不得只留在私有推理。
- E 级不得作为重大产品决策的唯一依据；D 级不得独自关闭重大决策。
- 数字必须附具体来源，或标为 `assumption - pending live validation`；不得把无来源论断伪装成数据支持。
- Derived 数字或结论必须点名其所依据的已接受产物、数据或决策记录。

流水线阶段适配与来源标注格式见 `evidence-grading-stage-application.md`；仅在产出 Idea/MRD、交互稿、Demo 或 PRD 时追加读取，独立审查不预载。
