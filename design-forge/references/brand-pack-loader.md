# Context Pack 加载器

当用户显式点名 context pack 时读取本参考。public `design-forge` 默认只使用 Neutral DS；没有触发词时不得读取、摘抄或仿写任何 private-mirror pack。

加载顺序：

1. 从 context pack 读取 `brand-meta.yaml`。
2. 用用户消息或 mode 声明匹配 `triggers`；只有明确命中时才继续。
3. 加载 `ds-pack/tokens.css`、`ds-pack/components.md` 和 `ds-pack/layout.md`。
   - 如果 context pack 提供 `ds-pack/hifi-surface-baseline.md`，且用户要求高保真、好看、真实 App 质感、Open Design 产物或同样 prompt 稳定生成同类页面，必须同时加载该文件。
   - 如果 context pack 提供稳定 prompt contract，且用户强调复现、稳定、一致或“同样的 prompts”，必须用该 contract 固定 `mode / surface / page_count / entry_context / primary_action` 后再生成。
4. 将 tokens 注入生成样式块顶部。
5. 用 pack metadata 替换中性占位值。
6. 在通用规则之后注册 `preflight-rules`。

不得因为任务“看起来像”过去的项目就加载 context pack。加载必须依赖显式 trigger 文本；引用旧产物做审计、迁移或泄漏扫描时，也不等于激活该 pack。

## Public 默认边界

- 未命中 context pack 前，示例、模板、mode 声明、检查清单和最终输出都必须保持中性。
- 不把 private pack 的研究结论、tab 名、签名、token、业务名词或品牌检测规则复制进 public 默认模板。
- 不在 public 模板里预留“替换成某品牌”的具体私有占位；需要品牌化时通过 pack metadata 注入。
- 泄漏扫描命中 private pack 词汇时，先判断是否属于明确加载后的品牌产物；默认模板命中视为失败。

## 分离边界

- `components.md` 只能覆盖 token、圆角、局部状态和品牌组件偏好；按钮 nowrap、可访问性、原子职责仍来自 `methodology/atom-defaults.md`。
- `layout.md` 只能覆盖品牌 tab 顺序、品牌页面映射和 layout exception；Type 1/Type 2、Feed/List、Sheet/CTA 等通用方法仍来自 `interaction-feedback-patterns.md`。
- PRD glossary、research、feedback 不在普通 UI 任务默认加载。
- 已退役真实品牌不得作为多品牌 fixture 恢复；需要第二品牌时使用 fictional/sanitized package。
