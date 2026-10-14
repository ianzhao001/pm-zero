# 手动分步

仅用户主动选择的细分项目按[分步协议](../../../system/protocols/stepped-product-workflow.md)执行。`await_selection` 仅展示候选，收到明确选择才调用 `step_select`；只生成当前 `workflow_step_id` 的独立文件。展示产物版本，取得明确答复后 `step_confirm`；确认后停止，须再次选择才继续，不能从整体授权、沉默或上次选择推断。`await_step_confirmation` 等待步骤确认，`await_confirmation` 等待阶段确认。读取、恢复与 diagnose 不选择步骤。总览见 `.pm-zero/step-overview.md`；已确认内容返工先展示影响，再按本次范围答复调用 `change_apply`。

