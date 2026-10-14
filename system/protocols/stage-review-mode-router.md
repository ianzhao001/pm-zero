# Stage Review Mode Router

## Three Modes

### MODE_FLOW

- 用途:常规阶段交付审查
- 触发:Task 完成 + 准备进入下阶段
- 输出:standard review-record YAML
- 角色:critic + advocate(默认)

### MODE_INTERACTIVE_DEMO

- 用途:self-applied case-study(用 pm-zero 协议审 pm-zero)
- 触发:case-study 启动
- 输出:review-record + case-study 文档
- 角色:可插入 mock reviewer(如 boss-distilled-mock)

### MODE_DOC

- 用途:纯文档审查(无可执行产物)
- 触发:协议文档独立修订
- 输出:简化 review-record(允许部分字段省略)
- 角色:仅 critic

## Routing Logic

- 如果 target 在 system/protocols/ → MODE_DOC 默认
- 如果 target 在 workspaces/*/ → MODE_INTERACTIVE_DEMO 默认
- 其他 → MODE_FLOW 默认
- 用户可显式指定覆盖默认

## Schema Compatibility

review-record-schema.md 的 mode 字段:

- 枚举:flow / interactive_demo / doc
- 默认:flow
