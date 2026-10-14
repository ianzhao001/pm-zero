# 项目恢复与候选编辑

仅在恢复项目、追溯原始记录、写入冲突或候选试改时读取。先 project_diagnose，只按当前问题取材料。

- 写入受阻时按[恢复机制](../../../system/workflow-core/README.md#recovery-and-candidate-editing)预览动作，经用户明确确认再恢复；不根据锁龄清锁。`project_read` 会重建派生视图，诊断不会；恢复不选择或执行步骤。
- `pending_changes` 最多列五条当前待续变更；按 `detail_ref` 读取本阶段所需范围，超出时用 `index_ref` 查完整清单，不把摘要当原始反馈或确认。
- 仅在当前判断需要原始记录时调用 `project_read { view: "detail", detail: { type, id, version? } }`，按材料引用定点读取 brief、decision、artifact、gate 或 change；需要历史 Gate/change ID 时再读取 `index` 明细。不要为恢复会话加载全量历史正文，也不要截断关键决定。
- 每轮写入使用 resume 返回的最新 revision 和唯一 request_id；重试同一请求复用相同 ID 与内容。遇到 revision 或幂等冲突重新读取 resume，不覆盖。

需要先试改时，按[候选机制](../../../system/workflow-core/README.md#recovery-and-candidate-editing)建立副本，保留正式成果；预览后整批接受。导入版本待验证，分步项目需重新选步并正式登记，不能继承旧验证或自动确认。

