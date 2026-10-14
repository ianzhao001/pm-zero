# Case-study Resolution Protocol

## Purpose

防止 case-study 沦为流水账文档。所有 case-study 发现项必须有明确的"修复 deadline",未在 deadline 内处理需升级或显式 deferred。

## Required Fields per Finding

每个 case-study finding 必须包含:

- `id`:唯一标识(例如 flaw-001)
- `severity`:critical / high / medium / low
- `discovered_at`:ISO 时间戳
- `target_resolution_date`:目标修复日期(基于 severity)
  - critical:7 天
  - high:30 天
  - medium:90 天
  - low:180 天
- `status`:open / in-progress / resolved / deferred
- `resolution_task_id`:关联的 Task ID(如 t29-001)

## Escalation Rules

- 距 target_resolution_date 还有 7 天且 status = open → STATE.md 红色提醒
- 超 target_resolution_date 且未 resolved → 必须 deferred 并写明理由
- deferred 的发现项,必须设新的 target_resolution_date

## STATE.md Integration

STATE.md 增加 `Case-study Findings Tracker` 一节,索引所有未 resolved 的 findings,按 target_resolution_date 排序。
