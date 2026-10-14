# Reverse-time Protocol Acknowledgment

## Purpose

实战中常发现"协议条款其实早就该有,但当时没写"。本机制允许追认这种条款,保持协议历史的诚实性。

## Mechanism

新增条款时,如果该条款"在更早的 Task 中已隐式遵守",可以标记:

```yaml
clause_id: cross-review-stance-third
acknowledged_in_task: t29-001
implicitly_followed_since: t28-mega
explicit_added_at: 2026-05-20
```

## Constraints

- 不允许追认"实际上没遵守过"的条款(诚实性原则)
- 追认必须有证据(指向具体 commit / review-record)
- 追认条款的实际生效日期 = explicit_added_at

## Application

- `cross-review-protocol.md` v1.1:第三 stance 选择规则,reverse-time acknowledged since t28-mega
