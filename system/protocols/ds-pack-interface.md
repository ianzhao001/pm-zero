# DS Pack 接口

## 必需与可选文件

context pack 可以提供一个 design-system pack。该 pack 必须导出：

```text
brand-meta.yaml       - brand_name / placeholder_user / signature / triggers / version
ds-pack/tokens.css    - :root 变量
ds-pack/components.md - 使用共享命名的原子组件默认值
ds-pack/layout.md     - Tab 顺序、Feed 列数、页面状态、layout 例外
examples/*.html       - 可选示例
```

推荐的可选导出：

```text
ds-pack/motion-overrides.md - 通用 motion token 不足时的品牌动效说明
prd-pack/glossary.md        - PRD 术语表
prd-pack/safety-examples.md - PRD 安全示例
preflight-rules/brand.mjs   - 设计端加严规则
preflight-rules/brand.py    - PRD 端加严规则
```

## Token 最小集

`tokens.css` 必须定义：

```css
--accent
--accent-press or --accent-pressed
--accent-soft
--bg-primary
--bg-secondary
--text-primary
--text-secondary
--semantic-danger
--n00
--n-bg
--n20
--n40
--n80
--n100
--n140
```

可选 token 可以包括 success、warning、elevation、overlay、chart 或 motion 变量。若品牌仍使用旧 token 名，应为最小集提供 alias。

## Layout 例外

`layout.md` 可以声明 `exceptions` block：

```yaml
exceptions:
  - id: B-BRAND-01
    scope: design
    reason: 一句话说明通用规则为何需要局部例外。
    enforcement: 品牌规则改为检查什么。
```

例外规则必须是加严或局部替代检查，并且必须位于 context pack 内。不得为了某个品牌例外修改通用 skill。例外 id 必须匹配 `preflight-rules/brand.mjs` 或 `preflight-rules/brand.py` 导出的规则。

## Trigger 匹配

- `brand-meta.triggers` 是数组。
- 任一 trigger 命中即可激活 pack。
- CJK trigger 精确匹配且区分大小写。
- ASCII trigger 不区分大小写。
- 显式 `CONTEXT` / `--context` 可以指定 pack；`MODE` 不选择 context，除非 manifest 登记了短期 `legacy_mode_aliases`。
- 引用、fixture、泄漏扫描和历史文本中的 trigger 不激活 pack。
- 不得仅凭视觉相似性激活 pack。

## 加载顺序

通用 skill 加载顺序：

1. 把当前任务和显式 `CONTEXT` 交给 resolver；不要全文扫描所有 pack。
2. 只读取 resolver 当前 route / `load_steps` 返回的 `brand-meta.yaml` 与 mode-specific 文件。
3. 生成前解析必要 metadata；UI、HIFI、PRD、审查和 validation 各自只加载声明文件。
4. 在通用规则之后注册当前 context 的加严规则；不得加载其他 context。

## 多 Context

若多个 context pack 同时触发：

1. 若用户明确要求品牌对比，resolver 返回隔离的 `comparison_routes`，逐分支清空 context，不合并 token。
2. 普通生成中若多个 pack 命中，停止并要求用户选择一个 context。
3. 不得按加载顺序兜底，也不得把多个 pack 的 `tokens.css` 合并到同一个产物中。

## 约束

- 没有安装 context pack 时，通用 skill 仍必须可用。
- context pack 不得导入或复制通用 `SKILL.md` 工作流文本。
- shared contracts 不定义任何私有产品知识。
- 加载必须显式。
- context rules 可以增加更严格检查或声明局部例外，但不得压制通用错误。

## Brand / Generic 分离规则

Context pack 只能保存品牌或领域的局部事实:

- trigger、namespace、version、owner、publish scope;
- 品牌 token 值、tab 顺序、layout exception;
- 领域术语、研究、示例和品牌加严规则。

以下内容必须留在通用层:

- shared-core 引擎与 rule helper -> `system/shared/context-package-core/preflight-core/`;
- 原子组件职责、Type 1/Type 2 页面模型、Feed/List 密度、Sheet/CTA/动效策略 -> `skills/design-forge/`;
- PRD 章节、证据、验收、业务安全/内容安全分类 -> `skills/prd-forge/`;
- mock 或教学示例 -> fictional/sanitized package,不得恢复已退役真实品牌包。
