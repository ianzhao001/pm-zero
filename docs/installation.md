# 安装与更新

使用 Node.js 24+。在源码仓运行 `npm ci --no-audit --no-fund`，然后用 `node scripts/release/build.mjs /absolute/deployments/base-v0.3.0` 构建。构建会验证发行文件哈希，复制运行依赖并生成完整性清单。它不运行品牌代码。

## 宿主配置

Codex 插件宿主注册生成的完整目录，该目录提供 `.codex-plugin/plugin.json` 与 `.mcp.json`。通用 MCP 宿主可配置：

```json
{
  "mcpServers": {
    "pm-zero-workflow": {
      "command": "node",
      "args": ["/absolute/deployments/base-v0.3.0/mcp/server.mjs"]
    }
  }
}
```

注册方法以宿主当前文档为准。调用 `runtime_info` 核对可用品牌和能力，创建项目时显式传入绝对 `project_path`。宿主按阶段计划读取生成目录内的 Skill 和协议；只连接 MCP 不会自动赋予浏览器或文件编辑能力。

诊断：`node /absolute/deployments/base-v0.3.0/mcp/diagnose.mjs --expected-context none`。需要结构校验与品牌组合验证时，在源码目录运行 `npm test`。

## 启用快速模式

重新加载部署后，调用 `runtime_info` 核对运行版本及支持流程中是否包含 `product-design-quick-v1`。新项目明确要求“使用快速模式”，由宿主在 `project_open` 中指定该 `workflow_id`；通用项目使用 `context: "none"`，品牌项目使用已安装的品牌。快速模式默认交付 Demo，采用澄清、高保真、Demo 三个确认节点；最多一轮五问，图片按需且不限数量。

没有选择快速模式时仍默认六阶段。重新打开已有项目会沿用冻结流程，不能借此切换模式。

## 目录分离

```text
pmzero/
  source/pm-zero/       # GitHub 源码
  private-packs/acme/   # 私有规则、资产和脚本
  deployments/base-v0.3.0/  # 本次生成的部署
  deployments/base-v0.2.0/ # 保留的旧部署（如有）
  projects/example/    # 用户产物、状态和确认记录
```

仅更新源码目录。更新后重新安装锁定依赖，构建到新目录，完成诊断后切换宿主配置；重启 MCP 服务或在新会话重新加载插件，再以 `runtime_info` 和一个独立项目验证实际运行版本。仅更新源码不会替换已安装或已加载的运行包。

构建拒绝覆盖已有目录。回滚时切回保留的旧部署，例如 `base-v0.2.0`，并同样重新加载宿主。项目数据单独备份，回滚运行包不会撤销项目数据变化。v0.2.0 不支持快速流程，快速模式项目须保留支持 `product-design-quick-v1` 的部署来恢复，不转换为旧流程。

外置私有包不受普通 Git 更新影响，但新基础版本仍可能需要接口适配。已有项目保持冻结的流程，不因安装新版本自动迁移或重新授予确认。

## 可复现性

`release-files.json` 校验发行源码，`package-lock.json` 固定 npm 依赖；部署内的 `inventory.json` 和 `build-info.json` 校验文件、执行位及构建内容。它们是完整性记录，不是发布者签名。开发者修改发行源码后须重新生成发行清单，不能把修改后的目录冒充原发行版。
