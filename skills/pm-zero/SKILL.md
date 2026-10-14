---
name: pm-zero
description: >-
  Guides product requirements through agreement, MRD, design and a clickable demo;
  resumes saved product projects. Use for product exploration or explicit pm-zero
  requests, not unrelated coding or isolated document review.
---

# pm-zero 产品引导

帮助用户作出当前最重要的产品判断，并在已授权范围内推进下一步。默认会话内引导；不创建定时任务。

## 进入与恢复

- 从 idea 澄清或设计完整产品（如“设计一个得物购物 Agent”）进入项目流程；明确制作单份 Flow、修改指定文件或独立审查仍用对应 forge。含义不明只询问一次，不接管框架开发等无关任务。
- 先调用 `runtime_info {}` 核实运行版本、流程和品牌支持；工具缺失或不支持时说明缺口，可继续讨论，但不降级独立设计，也不声称已保存或通过。
- 新项目使用 `project_open`，显式指定默认 `workflow_id: "product-design-six-stage-v1"` 和品牌 `context`；仅用户主动选择细分流程时使用 `product-design-six-stage-stepped-v1` 与“项目类型 × 深度”模板；已有项目保持原流程，先用 `project_diagnose` 只读恢复阶段、终点、版本和决定。工具仓不承载产品事实。
- 恢复既有项目、读取原始记录、写入冲突或需要候选试改时，按需读[项目恢复与编辑](references/project-recovery.md)。
- 首次路径未明确时提出具体产品目录供用户选择。MCP 未加载报告 `manual_start_required`；版本不匹配提示更新插件并在新任务加载，不把仓内源码当运行版本。

## 建议优先

1. 先使用已有材料作出简短判断，区分事实、用户选择、假设与未知项。
2. 每次聚焦一个会改变方向的问题，说明其影响；不要把六项 brief 信息变成固定问卷。已解决和已否决内容不重复讨论。
3. 用户不知道答案时，给出两个具体场景或可丢弃探针。探针标为 exploration，不能登记为已确认基线。
4. 优先解决阻塞当前阶段的问题；低风险细节标注假设继续。六阶段遵循[六阶段协议](../../system/protocols/six-stage-product-workflow.md)，旧项目遵循冻结的八阶段、分步或原引导规则。
5. 用户明确改口时记录新决定及被替代项；沉默、模型推荐和工具执行授权不等于用户接受产品方向。

## 制作与确认

新项目：S1 目标与场景 → S2 MRD → S3 视觉方向 → S4 线框＋交互＋模型 → S5 高保真 → S6 Demo。终点默认 S6；“交互方案和线框”到 S4。制作、检查和必要审查在阶段内衔接；全链仅确认六次。默认正常主流程，空态、异常态及测试仅按用户请求纳入。
- 每轮以最新 revision 调 `stage_prepare`，只执行当前阶段的 `load_steps`，如实申报宿主能力。品牌、能力或工具受阻时处理当前缺口，禁止改走 legacy Flow/Demo 绕过确认。
- 有 `change_context` 时依据冻结范围和版本/验证基线续作，核对多次变更的共同约束；冲突先澄清，不能用最新一条静默覆盖旧范围。`blocked` 仍须处理阻塞，摘要不替代审查或确认。
- S1 以 `metadata.context` 保存品牌；后续保持一致。已回答内容直接整理；S3 可复用品牌规范，但仍交付本项目的应用方案并确认。resolver 仅做能力选择，不决定推进阶段。
- `artifact_register` 登记文件、依赖、制作者与实际执行来源；`decision_record` 保存取舍和答复。两者不自动确认产物；目标与场景在 S1 联合交付。
- 先给结论，图文按需呈现，模型和报告作附件，不以 JSON 作主入口；展示版本、关键选择和待确认事项后等待答复；整体计划的“PLEASE IMPLEMENT”不批量确认未展示阶段。S2/S4/S5/S6 必需产物须独立审查；审查计划在隔离上下文读取。S4 线框、规格和模型联合确认。
- `gate_confirm` 只记录用户明确确认的版本；达到所选终点即停止。旧 G1–G4 项目继续使用 brief_save、原双视角审查与 PRD 收尾，不自动迁移。
- 界面通过宿主浏览器验证，测试记录绑定具体产物 hash。缺少浏览器时可继续草稿，但不能报告 Demo 验收通过。

## 手动分步

仅用户主动选择细分流程时读取[手动分步规则](references/manual-steps.md)；普通六阶段不加载。

## 接住反馈

先用 `change_prepare` 展示目标、保留范围和影响，再在用户反馈已授权范围内 `change_apply`；不要求用户重复批准同一局部修改。扩大范围需重新讨论。

模型出现前按产物定位，之后可按稳定 screen/element ID 修改并生成新版本。实际文件与证据须支持保留范围；无法证明时保持待验证。重新审查受影响版本，不重做无关需求。

交付说明有效版本、绝对路径、验证范围、未解决假设，并建议一个下一步验证。完整链完成不代表产品市场假设已得到证明。
