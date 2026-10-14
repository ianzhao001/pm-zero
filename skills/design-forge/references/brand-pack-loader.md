# Context Pack Runtime Adapter

先调用 `../../../system/protocols/skill-loading-protocol.md` 定义的 resolver；本文件只补充 design-forge 的消费规则。不得手工扫描所有 pack、全文读取 route 配置或把品牌词出现等同于任务意图。

## 加载

1. 只接受 resolver 返回的 `context`、`required_files` 与 `forbidden_skills`；无 context 时保持 Neutral DS。
2. 依 resolver 顺序读取 metadata 与 mode-specific DS/PRD 文件，并在通用规则之后注册 context preflight rules。
3. HIFI/截图任务若 resolver 返回 `anchors.md` 或 `hifi-prompt-contract.md` 必须加载；稳定复现任务按 contract 固定 `mode / surface / page_count / entry_context / primary_action` 后再生成。
4. 普通 UI 不加载 PRD glossary、research、feedback 或 fixtures；引用、fixture、迁移和泄漏扫描中的 trigger 不激活 pack。

## Public 默认边界

- 未选中 context 前，示例、模板、mode、检查清单和输出保持中性。
- 不把 private pack 的研究、tab、签名、token、业务词或检测规则复制进 public 默认模板。
- 泄漏扫描命中 private 词汇时先判断是否属于 resolver 明确选中的 context；中性模板命中即失败。

## 分工

- `components.md` 只覆盖 token、圆角、局部状态和品牌偏好；nowrap、可访问性和原子职责仍来自通用 methodology。
- `layout.md` 只覆盖品牌 tab、页面映射和 layout exception；Type 1/Type 2、Feed/List、Sheet/CTA 等仍来自通用 references。
- 已退役真实品牌不得恢复为 fixture；多 context 测试使用 fictional/sanitized template，并由 resolver 分离输出，绝不合并 token 或 exceptions。
