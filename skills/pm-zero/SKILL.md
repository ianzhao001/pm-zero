---
name: pm-zero
description: >-
  Guides product requirements through agreement, design and a clickable demo;
  resumes saved product projects. Use for product exploration or explicit pm-zero
  requests, not unrelated coding or isolated document review.
---

# pm-zero 产品引导

帮助用户作出当前最重要的产品判断，并在已授权范围内推进下一步。默认会话内引导；不创建定时任务。

## 进入与恢复

- idea 澄清或完整产品设计进入项目流程；单份 Flow、指定文件修改或独立审查用对应 forge。含义不明只问一次，不接管无关框架开发。
- 先用 `runtime_info {}` 核实运行版本、流程和品牌；工具不足可讨论，但说明缺口，不降级独立设计或声称已保存、通过。
- 新项目用 `project_open` 显式指定 workflow/context：默认 `product-design-six-stage-v1`；用户选快速模式用 `product-design-quick-v1`；主动选细分才用 `product-design-six-stage-stepped-v1` 及模板。已有项目先 `project_diagnose` 恢复原流程、版本和决定，不自动迁移。工具仓不承载产品事实。
- 恢复既有项目、读取原始记录、写入冲突或需要候选试改时，按需读[项目恢复与编辑](references/project-recovery.md)。
- 首次路径未明确时提出具体产品目录供用户选择。MCP 未加载报告 `manual_start_required`；版本不匹配提示更新插件并在新任务加载，不把仓内源码当运行版本。

## 建议优先

1. 先使用已有材料作出简短判断，区分事实、用户选择、假设与未知项。
2. 标准模式每次聚焦一个方向问题；快速模式遵循已保存的单轮五问检查点，不重复已知项。
3. 用户不知道答案时，给出两个具体场景或可丢弃探针。探针标为 exploration，不能登记为已确认基线。
4. 优先处理当前阻塞，低风险缺口标假设继续。按流程只加载[六阶段协议](../../system/protocols/six-stage-product-workflow.md)或[快速协议](../../system/protocols/quick-product-workflow.md)；旧项目遵循冻结规则。
5. 用户明确改口时记录新决定及被替代项；沉默、模型推荐和工具执行授权不等于用户接受产品方向。

## 制作与确认

标准：目标与场景→MRD→视觉方向→线框＋交互＋模型→高保真→Demo，S1–S6；默认 S6，“线框与交互”到 S4。快速：澄清→高保真→Demo，S1–S3，默认 S3。分别六次/三次确认；阶段内制作、检查、修订衔接。默认正常主流程，异常及对应测试按用户请求纳入。
- 以最新 revision 调 `stage_prepare`，只执行当前 `load_steps`，如实申报能力。`await_clarification` 按快速协议记录答复；其他阻塞处理当前缺口，禁止改走 legacy 绕过确认。
- 有 `change_context` 时按冻结范围与版本/验证基线续作，核对共同约束；冲突说明阻塞，不用最新反馈静默覆盖旧范围，摘要不替代审查与确认。
- S1 用 `metadata.context` 保存品牌并保持一致；已有答案直接复用。标准 S3 确认品牌应用，快速模式随高保真统一确认。resolver 不决定阶段推进。
- `artifact_register` 登记文件、依赖、制作者与实际执行来源；`decision_record` 保存取舍和答复。两者不自动确认产物；目标与场景在 S1 联合交付。
- 先给短结论、版本与待确认点，图按需展示不限数量，模型及报告作附件。整体“PLEASE IMPLEMENT”不确认未展示成果。按冻结流程独立审查全部必需产物，在隔离上下文读取；标准 S4、快速 S2 联合确认。
- `gate_confirm` 只记录用户明确确认的版本；达到所选终点即停止。旧 G1–G4 项目继续使用 brief_save、原双视角审查与 PRD 收尾，不自动迁移。
- 界面通过宿主浏览器验证，测试记录绑定具体产物 hash。缺少浏览器时可继续草稿，但不能报告 Demo 验收通过。

## 手动分步

仅主动选择细分流程才读[手动分步规则](references/manual-steps.md)。

## 接住反馈

先用 `change_prepare` 展示目标、保留范围和影响，再在用户反馈已授权范围内 `change_apply`；不要求用户重复批准同一局部修改。扩大范围需重新讨论。

模型出现前按产物定位，之后可按稳定 screen/element ID 修改并生成新版本。实际文件与证据须支持保留范围；无法证明时保持待验证。重新审查受影响版本，不重做无关需求。

交付说明有效版本、绝对路径、验证范围、未解决假设，并建议一个下一步验证。完整链完成不代表产品市场假设已得到证明。
