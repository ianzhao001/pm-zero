# Boss-distilled-mock Reviewer Role

Status: mock
Behavior inherited from: generic-critic
Limitations: mock role only validates interface pluggability and must not be used as real boss-style judgment.

## Status

**Mock 角色,仅用于验证协议插拔接口**。不代表真实 boss 风格。

## Behavior

- 行为完全等同 generic-critic
- 唯一区别:role.md 顶部声明"假装是 boss 视角"
- 输出 review-record 时,reviewer 字段填 `boss-distilled-mock`

## Future

真做 boss-distilled 角色需要:

- 用户提供老板风格样本(过去汇报反馈、偏好等)
- 单独定义明确的角色需求与验收样例

## Cross-reference

- 角色协议:system/protocols/reviewer-role-protocol.md
- 路由:system/protocols/stage-review-mode-router.md MODE_INTERACTIVE_DEMO
