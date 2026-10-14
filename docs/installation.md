# 安装与更新

使用 Node.js 24+。在源码仓运行 `npm ci --no-audit --no-fund`，然后用 `node scripts/release/build.mjs /absolute/deployments/base-v1` 构建。构建会验证发行文件哈希，复制运行依赖并生成完整性清单。它不运行品牌代码。

## 宿主配置

Codex 插件宿主注册生成的完整目录，该目录提供 `.codex-plugin/plugin.json` 与 `.mcp.json`。通用 MCP 宿主可配置：

```json
{
  "mcpServers": {
    "pm-zero-workflow": {
      "command": "node",
      "args": ["/absolute/deployments/base-v1/mcp/server.mjs"]
    }
  }
}
```

注册方法以宿主当前文档为准。调用 `runtime_info` 核对可用品牌和能力，创建项目时显式传入绝对 `project_path`。宿主按阶段计划读取生成目录内的 Skill 和协议；只连接 MCP 不会自动赋予浏览器或文件编辑能力。

诊断：`node /absolute/deployments/base-v1/mcp/diagnose.mjs --expected-context none`。需要结构校验与品牌组合验证时，在源码目录运行 `npm test`。

## 目录分离

```text
pmzero/
  source/pm-zero/       # GitHub 源码
  private-packs/acme/   # 私有规则、资产和脚本
  deployments/base-v1/  # 生成的部署
  projects/example/    # 用户产物、状态和确认记录
```

仅更新源码目录。更新后重新安装锁定依赖，构建到新目录，完成诊断和真实宿主验证后切换宿主。构建拒绝覆盖已有目录；回滚时切回保留的旧部署。项目数据单独备份，回滚运行包不会撤销项目数据变化。

外置私有包不受普通 Git 更新影响，但新基础版本仍可能需要接口适配。已有项目保持冻结的流程，不因安装新版本自动迁移或重新授予确认。

## 可复现性

`release-files.json` 校验发行源码，`package-lock.json` 固定 npm 依赖；部署内的 `inventory.json` 和 `build-info.json` 校验文件、执行位及构建内容。它们是完整性记录，不是发布者签名。开发者修改发行源码后须重新生成发行清单，不能把修改后的目录冒充原发行版。
