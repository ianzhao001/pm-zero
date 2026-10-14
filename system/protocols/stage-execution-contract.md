# 阶段执行与证据契约

适用于阶段生产、独立审查和浏览器验证；阶段编号、必需产物与确认条件取自项目冻结流程。由 `load_steps` 显式加载本文，不为获取来源规则加载另一流程的全文。

- `artifact_register` 绑定实际文件、依赖版本和 `producer_id`。`execution` 保存 `plan_id`、`plan_hash`、`plan_version`、`stage_id`、`capability_assignments`（capability/skill_id）、`skills`（skill_id/version）、`read_receipts`（path/sha256/context）及 `input_artifacts`；输入须与 dependencies 一致。
- `selection` 保存 context、profile、purpose、capabilities、providers、host_capabilities。核心按项目快照重建计划，核对身份与全部必读文件回执；回执必须来自实际读取，不能补造。生产、审查和浏览器验证使用独立身份与上下文。
- `asset_files` 由读取器验证字节并返回 `asset_verified` hash，登记到 read_receipts；资产不计指令正文。取得验证器不代表已执行验证。
- 基础检查覆盖全部阶段；必需审查须独立且绑定同一产物版本。事实、用户选择、假设分别表达，开放问题注明阻塞阶段；用户选择不证明市场需求。
- Demo 必须有稳定标识映射、准确模型 hash、完整输出快照及独立浏览器证据。角色、工具或证据缺失时保持待验证，不因精简加载豁免质量门。
- `gate_confirm` 记录展示后用户明确接受的版本、原始答复与来源；整体授权、沉默、模型推荐和“先看看”不构成确认。合成验收只用标注的 fixture，不冒充真实共识。
