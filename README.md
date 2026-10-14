# pm-zero

pm-zero 是本地运行的产品工作流组件，帮助产品经理从目标澄清、MRD、设计方案走到可交互 Demo。Agent 宿主负责推理和工具执行；pm-zero 提供阶段计划、版本记录、独立评审、用户确认和跨会话恢复。

## 快速开始

需要 Node.js 24+、npm，以及支持本地 stdio MCP 的 Agent 宿主。

```sh
git clone https://github.com/ianzhao001/pm-zero.git
cd pm-zero
npm ci --no-audit --no-fund
# 目标目录必须不存在，并位于源码仓外。
node scripts/release/build.mjs ../pm-zero-base
# 或生成一个带公共品牌的独立部署：
node scripts/release/build.mjs ../pm-zero-jd --brand jd
node ../pm-zero-jd/mcp/diagnose.mjs --expected-context jd
```

将宿主配置为运行生成目录中的 `mcp/server.mjs`。Codex 插件宿主可注册完整生成目录；其他 MCP 宿主使用绝对脚本路径，具体注册方式见宿主文档。不要同时暴露基础包和品牌组合包。

首次对话可说：“帮我澄清一个产品想法，以 Demo 为终点，每阶段先评审再由我确认。”创建品牌项目时明确选择 `context: "jd"` 或 `"dewu"`；通用项目选择 `"none"`。项目目录放在部署目录之外。

## 能力与边界

- 默认六阶段：需求共识、MRD、设计方向、线框与交互、视觉设计、Demo；支持可选分步模板和旧项目恢复。
- 按需加载 Skill 与品牌规则，资源和脚本不作为提示正文预读。
- 版本绑定的审查与确认；修改前评估影响，保留未受影响的已确认内容。
- 随仓提供得物、京东公共品牌包；每个部署只启用一个品牌，外置同品牌私有包优先。
- 本机运行，无内置模型服务。浏览器、外部工具与品牌脚本依赖由宿主或开发者准备。

工程检查验证接口和安装行为，不代替真实产品验收，也不表示已经证明 token 或耗时改善。

## 使用与扩展

| 主题 | 文档 |
|---|---|
| 安装、宿主配置、更新和回滚 | [安装指南](docs/installation.md) |
| 公共品牌与本地私有覆盖 | [品牌使用](docs/brands.md) |
| 品牌规则、资产、Skill、脚本接口 | [开发规范](docs/private-brand-pack-guide.md) |
| 从旧版独立 Skill 迁移 | [迁移说明](docs/migration.md) |
| 本版变化与限制 | [更新说明](CHANGELOG.md) |

本仓是发行源码，`release-files.json` 固定本版文件及哈希。私有品牌源请放在仓库外；不要修改生成的部署。运行 `npm test` 验证独立构建、品牌隔离与私有覆盖。

## 许可

代码与本文档采用 [MIT](LICENSE)。公共品牌包是社区维护的实现建议，不代表品牌官方规范或背书，不包含品牌字体文件、商标素材或用户截图。独立演示图片与原创向量素材的来源、许可和修改说明见 [资产声明](system/shared/demo-assets/LICENSES.md)。
