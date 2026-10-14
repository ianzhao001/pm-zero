# Skill Runtime Loading Protocol

运行时唯一加载规则；authoring/migration 才读长协议。入口管触发与交付，resolver 管文件计划，schema 管结构，宿主管推理和读取。

## 路由

原始请求交宿主 resolver；不扫描全量 manifest/品牌目录。对话用 `--output plan`，核验用默认 full（hash、字符数、原因）。errors 或 optional budget fail 时停止。

- `WORKFLOW/MODE` 选能力；`artifact=flow|demo`、`fidelity=standard|hifi|screenshot` 独立。PRD/审查/设计用对应 forge；UI 业务代码/Design QA 仅选当前 profile 唯一 standalone `ui-code` provider。
- `CONTEXT` 独立，`none|neutral` 强制中性。profile 优先级 `--profile` > `PM_ZERO_PROFILE` > `pm-zero-agent`；跨 profile 返回 `profile_switch_required` 和空文件，不偷载。
- 旧 `MODE:HIFI` 映射 flow+hifi 并警告。品牌 alias 由 manifest 声明；alias 和 `legacy-full` 保持兼容，移除须迁移。
- fixture、示例、历史、迁移、泄漏扫描中的品牌词不触发 context；真实请求中带引号的品牌仍可触发，ASCII 按词边界匹配。
- 多 context 仅显式对比才返回隔离 `comparison_routes`，顶层 required 为空；不合并品牌 token/layout/rules，其余多命中停止。
- context 缺失时仅目标不变才可中性替代。共享规则来自 `system/shared/context-package-core/`，context 仅提供数据、覆盖和加严。

## 逐步披露

`load_steps` 是唯一正文计划，入口示例不授权预读。每步读 required_files 和 selected_optional_files；optional 按 predicate/`--optional-rule ID` 及 workflow/context scope 选择。无对应规则先补充请求再解析，不遍历引用树。

asset_files 仅 link/copy/inline，须与 canonical 字节一致，不计正文。所有文件遵守安全路径、profile、kind、composition、唯一 provider 与 forbidden_skills。

先审后改按 sequence 串行；仅交接 finding ID、位置、严重度、修复验收，生产在 `after=compact_findings` 后加载。顶层 required 为去重 union；后步复用 retained_context_files/retained_required_files，新上下文重读。

`readLoadStep(plan,{stepIndex,contextId,priorReceipts})` 返回当前正文和回执，仅证明已返回相应 hash，不证明理解。仅同一有效上下文且 hash 一致可复用；新会话、独立审查、压缩后换 contextId。适配器不负责清空宿主上下文。

## 预算与交付

默认 compact，与 legacy-full 规则等价。required、selected optional 增量、asset bytes 和工具返回分开统计；新增必要规则计预算。`chars/4` 为误差未校准的 token 代理，不是宿主实测。

记录 workflow、artifact、fidelity、context/profile、实际文件/hash、assets、content mode、validation。中性任务不披露私有品牌规则、token、路径、文案或事实；精简、复用和缺工具不豁免质量门。
