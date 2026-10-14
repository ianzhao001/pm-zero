# 八阶段产品工作流

适用既有 `product-design-eight-stage-v1` 快照；新项目用[六阶段协议](six-stage-product-workflow.md)。旧 `product-design-stepped-v1` 按需读[分步协议](stepped-product-workflow.md)：模板、独立产物、单步确认后另行选择；不替代阶段确认。

## 进入与逐段推进

完整产品请求进入项目流程，单份设计/修改/审查保留 forge；歧义只问一次。先 runtime_info，再对用户选定目录以 workflow_id 调 project_open；旧项目按快照恢复。

约定用途、受众、平台、约束、成功标准及终点；goal_contract.metadata.target_stage 默认 S8，metadata.context 为品牌（缺省 none）。品牌绑定 S1，变更须正式重开，不静默切中性。

顺序：S1 目标约定 → S2 需求与场景 → S3 框定需求的 MRD → S4 风格/主视觉/配色 → S5 手绘线框 → S6 交互稿和 design_model → S7 视觉稿 → S8 可交互 Demo。到达所选终点即停止；新链没有 PRD。

每段展示版本、选择和待确认项；明确接受该版本才推进，改稿重新绑定审查。文档用 Markdown，设计板用图片或无脚本 SVG；S1–S7 不交付 HTML/JS 或可操作产品控件，不预做后续 Demo。

终点不省略前序：“交互方案和线框”到 S6，仍需 S1～S6。已有回答直接整理；复用品牌也须交付并确认 S4 应用。缺工具可讨论，但状态未保存、阶段未通过；独立文件不冒充阶段完成。

## 动态能力计划

按 project_read(resume) 当前阶段、有效输入及 revision 调 stage_prepare，仅执行返回计划。结果为 produce/review/await_confirmation/blocked/completed。改稿用 revise，不自行选后续阶段；resolver --stage 不推进项目。

context 来自被动 stage_context；stage_provider 负责生产。品牌资料按阶段/审查对象读取，计入 hash、回执和预算。品牌、必需能力、宿主或安装版本缺失须阻塞，不切 legacy；仅独立请求及旧项目用旧 route。

只申报实际宿主能力。不读未登记 Skill、不自动安装；静态材料不套旧 HTML/HIFI 规则。S8 执行适用品牌验证，证据绑定产物版本。

按阶段选最小能力组合，注明负责人、理由、依赖；指定 provider 仍检查兼容性。必需能力缺失/冲突则阻塞，可选缺失报告影响，不静默替代。

仅执行当前 load_steps，遵循[加载协议](skill-loading-protocol.md)。阶段内交接不加 Gate：业务建模→MRD，视觉方向→配色，Demo→独立浏览器验证；素材先完成再整合。改选生成新计划版本，保留历史来源。

## 登记与确认

登记、读取回执、资产与证据遵循共同加载的[阶段执行契约](stage-execution-contract.md)。

S3/S6/S7/S8 每个必需产物需独立同版本审查；--purpose review 仅加载审查能力。S6 交互稿和模型联合确认。

## 修改与恢复

先 change_prepare 绑定准确 entry_artifact 和预计版本，再按已授权范围 change_apply。模型出现前使用 artifact 范围，之后可按 SC/EL 稳定标识修改。保持用户确认的范围，不直接覆盖已确认源文件。

失效按实际依赖传播：S4 视觉方向变化影响 S7/S8；S5 线框变化影响 S6/S7/S8；需求范围变化回到 MRD 及下游。终点变化须重开 S1 并复核依赖，正文未改可复用；不能直接编辑派生状态。

恢复只读有效产物、待确认版本、阻塞与必要记录。交付列绝对路径、终点、验证及未决项；中间终点不算全链完成。
