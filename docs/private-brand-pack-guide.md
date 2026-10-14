# 本地私有品牌包开发与部署

pm-zero 的通用基础组件负责工作流、阶段确认、审查、读取回执和校验。品牌包提供品牌规则、资产、工作流 Skill 与本地脚本；用户可保存在 GitHub 之外的本地目录。每个部署只组合一个品牌，项目仍须显式选择品牌 context。

本接口 API v1 支持默认六阶段、历史八阶段及分步工作流。已有仓内品牌构建保持兼容；默认通用构建不包含它们。旧独立 PRD/legacy route 没有自动适配外置品牌。MCP 服务、宿主原生插件和 hooks 不在本接口范围；安装不会运行品牌代码或安装依赖。

## 部署与启用

本指南适用于公开发行源码及生成的基础部署。

源仓库先构建通用包（Node.js 24+）：

```sh
npm ci --no-audit --no-fund
node scripts/release/build.mjs /absolute/deployments/pm-zero-base
```

通用包自身携带品牌工具，后续操作不需要源码仓。以下命令在通用包根目录执行，路径均换成自己的绝对路径：

```sh
node scripts/brand-pack/cli.mjs init /absolute/private-packs/acme --id acme
# 编辑生成的 brand-pack.json 和规则，再检查部署兼容性
node scripts/brand-pack/cli.mjs check /absolute/private-packs/acme --base /absolute/deployments/pm-zero-base
node scripts/brand-pack/cli.mjs install /absolute/private-packs/acme --base /absolute/deployments/pm-zero-base --dest /absolute/deployments/pm-zero-acme-v1
```

安装到宿主时选择新生成的完整部署包，具体注册方式遵循宿主当前的插件文档。用 `runtime_info` 确认 `supported_contexts` 包含 `acme`；创建六阶段项目时明确传入 `context: "acme"`，后续使用 `stage_prepare` 返回的加载步骤。无须编辑核心 manifest，也不要将通用包和组合包同时暴露给同一宿主。

```sh
node /absolute/deployments/pm-zero-acme-v1/mcp/diagnose.mjs --expected-context acme
```

源码构建也有组合快捷方式：

```sh
node scripts/release/build.mjs /absolute/deployments/pm-zero-acme-v1 --private-pack /absolute/private-packs/acme
```

所有目标目录必须不存在。升级时重新用新通用包和品牌源生成新目录，再切换宿主；回滚则切回保留的旧部署。项目目录独立保存，不由安装/卸载操作修改。既有确认、审查和读取回执不会因换包被自动授予。

## 同品牌私有优先

可选的公共品牌包采用相同 API，作为共享默认层；“公共”表示可共享的来源，不代表此工具已将其发布。私有层最后应用：

```sh
node scripts/brand-pack/cli.mjs install /absolute/private-packs/acme --public-pack /absolute/shared-packs/acme --base /absolute/deployments/pm-zero-base --dest /absolute/deployments/pm-zero-acme-v2
# 外部公共默认层使用上述 install --public-pack；随仓品牌使用 build --brand。
```

两层必须具有相同 `id`。不同品牌不能混装，已组合的部署不能作为新的基础包；每次从中性通用包重建。

| 冲突位置 | 确定性规则 |
|---|---|
| 相同相对文件路径 | 私有字节完全替换公共字节 |
| `context.entrypoint` | 私有值优先；上下文入口固定为根 `SKILL.md` |
| `context.artifacts.<产物>` | 私有记录整体替换该产物的 required/asset 清单；空数组可显式清空 |
| `providers[].replaces` | 私有声明整体替换同一能力提供者的公共声明 |
| 私有层未声明的字段/文件/产物/扩展 | 继承公共层 |

不拼接冲突正文，也不靠模型猜测哪段规则生效。含义相同的规则应使用稳定相对路径；若路径不同，需在私有产物清单中显式替换引用。工具检查结构和引用，不能自动理解自然语言冲突。私有层可以是仅含覆盖文件的补丁；独立安装时必须提供完整九类产物映射。`files: []` 可用于只改引用的覆盖层。

`local-brand-pack.lock.json` 记录层版本与 hash、实际文件来源、部署路径和覆盖清单；`build-info.json` 记录整体构建身份，`inventory.json` 校验整个部署。它们不保存品牌源的本机绝对路径，也不是发布者签名。

## 文件与元数据规范

由 `init` 生成最小可运行模板；机器可读接口见通用包中的 `scripts/brand-pack/schema.json`。结构示例：

```text
acme/
  brand-pack.json
  SKILL.md
  context/identity.md
  context/design.md
  assets/tokens.css
  providers/acme-visual/SKILL.md
  providers/acme-visual/render.mjs
```

`brand-pack.json` 必须声明 `schema_version: 1`、`core_api: 1`、`id`、三段 `version`、`files`、`context` 和 `providers`。id 使用小写字母、数字与连字符，品牌最长40字符。文件白名单是唯一复制来源；研究原稿、缓存、未声明文件不会进入部署。API 不兼容、资源缺失、重复标识和路径越界均阻止安装。

`context.artifacts` 使用稳定产物名称：`goal_contract`、`requirements_scenarios`、`mrd`、`visual_direction`、`wireframes`、`interaction_spec`、`design_model`、`visual_design`、`demo`。每项声明 `required_files` 与 `asset_files`。由基础组件映射到六/八阶段，不在私有包里另写一套阶段编号表。

Skill frontmatter 只包含两行发现元数据，顺序固定；正文按实际工作使用的语言编写：

```yaml
---
name: acme
description: Dependency-only Acme context. Load only when the project explicitly selects acme.
---
```

每个入口不超过60行/3500字符，description 不超过1024字符；整个合并品牌的发现元数据加部署入口路径总量不超过2048字符。每类产物品牌正文及每个私有 provider 正文不超过6000字符；安装还运行实际组合预算（单加载步骤上限12000字符及各阶段原有上限）。这是字符预算，不是真实 token 计费测量。

## 工作流 Skill 和本地脚本

私有 Skill 显式替换通用基础包已登记的一个 `stage_provider`，从 `runtime_info {"detail":"full"}` 的 capability_catalog.providers 选取目标 skill_id。将以下 BASE_PROVIDER_ID 替换为该实际 ID：

```json
{
  "id": "acme-visual",
  "replaces": "BASE_PROVIDER_ID",
  "entrypoint": "providers/acme-visual/SKILL.md",
  "required_files": ["providers/acme-visual/instructions.md"]
}
```

将该声明放入 `providers`，所有相关文件加入 `files`，入口 name 与 id 一致。id 必须带品牌前缀。安装器继承被替换提供者的能力、输入输出、宿主要求和共享执行协议；只有该品牌项目选择新实现，`none` 中性项目继续用通用实现。基础系统协议不能由品牌文件覆盖。

私有实现须履行全部继承能力，不能跳过独立审查、浏览器证据、用户确认或产物规范。说明书只描述差异、工具用法和输出约束；不要复制基础工作流。代码和资产不作为正文预读。同一个文件不能同时声明为正文和资产；每个 provider 目录内未列入入口/required_files 的白名单文件自动作为该 provider 的资产校验，包含脚本及其辅助模块的 hash。脚本部署到 `skills/acme-visual/`，上下文资源部署到 `skills/acme/`；在 Skill 内用相对路径定位自己的脚本，跨 Skill 资源通过阶段计划定位。包安装和 check 都不执行脚本，实际执行由宿主依任务决定；依赖由开发者在本机单独准备。

## 渐进披露与一致性

1. 发现层仅入口名称和描述；只在明确选择品牌后读取品牌正文。
2. 规则按产物拆分，小文件承载必须遵守的规则；原始调研留在源包的未声明目录。
3. CSS、图像、脚本登记为资产或白名单运行资源，按当前任务使用，不塞进提示正文。
4. 依赖 `stage_prepare` 的计划与 随部署包加载协议说明的 `readLoadStep(plan,{stepIndex,contextId,priorReceipts})` 适配器生成 hash 和上下文回执；新会话、独立审查者与验证会话重新读取。
5. 同一术语、token 名称与接口保留唯一正文；公共默认和私有覆盖使用相同逻辑键。
6. 更新包版本、运行结构/组合检查、审阅覆盖清单，再切换宿主；不要在已构建部署里手改文件。

这些约定沿用 [OpenAI Skills](https://learn.chatgpt.com/docs/build-skills)、[Claude Skills best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) 的元数据发现、按需加载资源、简短入口与可验证脚本原则。通过工程检查不代表真实宿主 token、耗时或产品质量已经改善。

## 本地边界与验收

品牌源建议存放仓库外；仓内仅使用忽略目录 `.pm-zero-local/`，该目录也被两条发布管线排除。init 生成忽略全部内容的 `.gitignore`；用户若需要独立私有版本管理，可按团队策略主动调整。不要使用 `git add -f` 将客户资料加入基础仓库。文件名检查不能替代内容审查或防泄漏工具。

安装拒绝软链接、路径穿越、隐藏路径、常见密钥文件和未登记嵌套入口；只复制白名单字节，不运行安装钩子。信任来源与运行脚本的权限仍由使用者管理，这不是恶意代码沙箱。

发布前在本机至少验证：无品牌包独立运行；同品牌公共/私有覆盖符合预期；生产与独立审查、九种模板的六/八阶段共450个分步计划按需读取；缺文件、超预算、不同品牌、未知能力、漂移安装包明确失败；脚本在真实宿主执行并交付合规产物。CLI `check --base` 验证22个默认阶段/审查计划及450个分步计划的预算和字节读取，真实执行与产品验收由项目另行完成。
