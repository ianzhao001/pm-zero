---
name: reviewer-forge
description: >-
  Independently critique product briefs, MRDs, static designs, PRDs or demos and return evidence-linked findings without editing the artifact. Use for stage review, critique or approval-only requests; for review-and-fix, review before production.
---

# Reviewer Forge

独立找问题并给出放行建议；默认不直接修改被审材料。

## 路由与加载

- 遵循 `../../system/protocols/skill-loading-protocol.md`；context pack 可与本 workflow 组合，不构成 workflow 冲突。
- 六阶段用 `--stage S2|S4|S5|S6 --purpose review`，旧八阶段仍用 `S3|S6|S7|S8`，检查该阶段全部必需产物；新项目遵循[六阶段协议](../../system/protocols/six-stage-product-workflow.md)，旧项目按冻结协议，不加载生产 Skill，不把 MRD 当 PRD 强加开发章节。
- `MODE_BRIEF_REVIEW`、`MODE_DEMO_REVIEW`、`MODE_PRD_REVIEW` 分别审查方案概要、Demo/交互稿、PRD；不确定对象类型时先确认范围。
- 当前审查步骤的 required、selected optional 和模板由 resolver 唯一决定；不预读后续生产规则。
- 深入评分可请求 `--optional-rule review-dimensions`，格式样例用 `review-example`；补充条件后重新解析，不自行追加未计量正文。

## 执行

1. 声明 mode 或 stage、审查对象的准确版本/hash、context 与范围；按计划加载报告模板，分阶段流程用版本绑定 finding 记录。审查者必须不同于该版本制作者。
2. 逐条检查目标、证据、逻辑、范围、UX、可行性和商业边界；需要细化时请求 review-dimensions 后读取。
3. 每条 finding 标 🔴/🟠/🟡/🟢，并引用输入材料的具体位置；证据等级与严重度映射以两个 evidence 文件为准。
4. 汇总各级 finding 数与整体建议：放行 / 待修 / 阻断；不得为显得有用而虚构问题。

## 串行协作

- “审查并修改”先完成 reviewer 报告，再把紧凑 handoff（finding id、位置、严重度、修复验收）交给 `prd-forge` 或 `design-forge`；不得并行预载两个 workflow。
- Context 由 resolver 独立选择；只尊重所选 namespace，不合并多个 context 的 token 或例外。

## 交付门

- 每条 finding 必须有严重度与材料位置；重大决策若只由 E 级证据支撑，至少给出 🟠 finding。
- 最终报告 mode、context、finding 总数及分布、整体建议、加载文件；shared-core 仅从 `system/shared/context-package-core/preflight-core/` 使用。

范围源优先采用已确认 MRD；S4 联合检查线框、交互规格和模型的一致性。六阶段默认正常主流程，不因缺少未请求的空态或异常态提出阻断 finding，也不自动追加对应测试；旧项目按原已确认范围。先给短结论与关键证据，多图和多个要点按需展示，完整 finding/JSON 报告作为附件。
