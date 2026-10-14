---
name: prd-forge
description: >-
  Create or revise structured product requirement documents from product context, designs, demos, and meeting notes. Use for PRD drafting or source-document editing; do not use for an independent critique, approval, or review-only request.
---

# PRD Forge

创建或修改结构化 PRD；入口只保留路由、按需加载和交付门，详细规则以直接引用的文件为准。

## 路由

- 先遵循 `../../system/protocols/skill-loading-protocol.md` 并使用 resolver 输出；不得凭品牌相似性自行加载 private context。
- `MODE: PRD_DRAFT | PRD_REVIEW | PRD_FINAL` 仅表示写作成熟度；`PRD_REVIEW` 不是独立审查意图，独立审查交给 `reviewer-forge`。
- `CONTEXT` 与 `MODE` 分离；按 resolver 的当前步骤读取；保持显式 context 与安装 profile 边界。

## 渐进式加载

只执行 resolver 的当前 `load_steps`：读取 required 和 selected optional，assets 用脚本复制或链接。入口不另设默认文件表；普通引用不授权递归预读。

字段、描述模板、DOCX、反馈、实现边界、多轨分别可请求 `--optional-rule prd-schema|prd-writing|prd-docx|prd-feedback|prd-rationale|prd-multi-track`（每次传一个 ID）；范围争议用 `prd-boundary`。context 缺失会改变用户目标时停止，不静默降为中性。

旧四阶段流水线才选择 `legacy-pipeline`；主动 G1–G4 引导遵循对应生产路由，不能混用阶段编号。未读取的依赖不得声称已加载。

## 出稿状态与流程

| 状态 | 放行条件 |
|---|---|
| PRD Draft | 主流程可理解，假设集中标注；允许非阻断问题 |
| Review Draft | 无阻断未知项，高风险模块含 AC 与异常路径 |
| Archive Draft | 规则、证据、owner、异常、后台映射和埋点闭环；未豁免问题为 0 |

1. 声明 PRD 类型、mode、context 与路由理由；收集背景、功能名、owner 和设计/交互来源，缺失项用安全假设继续并登记。
2. 按 schema lock 生成 1–8 章；功能需求使用 `Module | Evidence | Requirement Details`，截图表达布局，正文表达规则、字段、异常、配置和协作边界。
3. 保持正式业务文档：不写工具/模型/本地路径/过程笔记/内部 screen id；链接只写文件名、版本或用户提供的在线地址，未知 owner 写 `/`。
4. 业务安全与内容安全分线；截图覆盖走共享 manifest；表格单元格使用可读段落，不写字面换行标记。

## 校验与交付

- DOCX 运行 `python scripts/validate_prd.py <PRD.docx> [--strict] [--manifest screenshot_manifest.yaml]`；context 规则追加 `--brand-rules=<context-pack>/preflight-rules/brand.py`。
- 流水线 PRD 引用已确认的上游产物，并让 §5 元素表与 Demo `element-mapping.md` 互校；重大论断按系统 A–E 协议标级，不写实现选型。
- 最终报告章节/表格/图片/开放问题数、出稿状态、mode、context、加载文件、校验结果与输出路径。
