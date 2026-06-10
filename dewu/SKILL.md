---
skill_id: dewu
name: dewu
description: >-
  Private Dewu / POIZON context pack with design tokens, tab surfaces, HIFI evidence, examples, PRD glossary, and brand-specific validators. Use only after an explicit Dewu trigger.
namespace: DW
version: 1.0.13
trigger:
  - 得物
  - Dewu
  - POIZON
publish_scope: private-mirror
lifecycle: active
---

# dewu

得物品牌 context pack。它只提供品牌数据、设计系统、术语、示例和校验扩展，不包含通用执行流程。

## 触发说明

本 pack 不应由用户单独触发。`design-forge` 或 `prd-forge` 在用户消息或 mode 声明命中 `brand-meta.yaml` 的 triggers 后，才允许加载本 pack。

## 加载契约

遵循 `../../system/protocols/context-package-protocol.md`：

- `brand-meta.yaml`
- `ds-pack/tokens.css`
- `ds-pack/components.md`
- `ds-pack/layout.md`
- `ds-pack/tab-surfaces.md`
- `ds-pack/screenshot-evidence-pack.md`
- `ds-pack/screenshot-absorption-runbook.md`
- `ds-pack/hifi-surface-baseline.md`
- `ds-pack/hifi-four-tab-anatomy.md`
- `ds-pack/motion-overrides.md`
- `ds-pack/ds-spec.lock.md`
- `examples/hifi-prompt-contract.md`
- `examples/hifi-golden-reference.md`
- `research/dewu-research.md`
- `feedback/interaction-feedback-patterns.dewu.md`
- `prd-pack/glossary.md`
- `prd-pack/safety-examples.md`
- `preflight-rules/brand.mjs`
- `preflight-rules/brand.py`

## 版本

- v1.0.13 (2026-05-24): 补齐 discoverable `description`，明确本包只能在显式 Dewu trigger 后作为 context pack 加载。
- v1.0.12 (2026-05-24): 固化 Dewu 截图吸收一次完成 runbook；新增 readiness check，要求先完成 evidence intake、negative fixture、validator 和 rendered-DOM 验收，再生成 proof artifact 或 demo。
- v1.0.11 (2026-05-23): 新增 Dewu demo rendered-DOM contract；禁止通过 hidden evidence、`.tabbarx` 或不可见模板绕过校验，MODE_DEMO 的可见手机内部必须直接使用截图 grammar、真实 `.tabbar` 和可滚动 surface。
- v1.0.10 (2026-05-23): 将「我」页截图级复原沉淀为 profile-dashboard grammar；新增 B37-B42 质量门，约束 profile header/body 坐标、dashboard 非 grid stretch、订单/资产/券/服务线框图标完整性、钱包纯数字文本结构、昵称池、全页面 typography footprint 和服务宫格紧凑间距。
- v1.0.9 (2026-05-23): 修复长截图 proof artifact 的真实滚动模型；新增 B33-B36 质量门，要求 scroll-content 可实际滚动、购买顶部文字/频道逐字一致、typography footprint 校验和我页 lower dashboard 可滚动访问。
- v1.0.8 (2026-05-23): 吸收长截图和内容详情页证据：固定 393x852 viewport + scroll-content 高度、滚动 Feed/购买商品流/我页 lower dashboard 模块、Type 2 内容详情页 grammar，并新增 B27-B32 质量门。
- v1.0.7 (2026-05-23): 建立截图证据包与 B23-B26 截图级质量门；四 Tab HIFI golden reference 升级到 393x852 内部坐标 v4，验证字体、文字、模块高度和可测坐标锚点。
- v1.0.6 (2026-05-23): 吸收四 Tab v3 回归问题：购买页分类 icon/间距、上传截图 typography/spacing 优先、手机内部无横向滚动、我页 header 不折叠，并新增对应 preflight 负例。
- v1.0.5 (2026-05-23): 新增 Dewu HIFI Surface Baseline、稳定 prompt contract 和通用高保真质量门；将四 Tab 好看样例降格为 golden reference,不再把四屏形态作为高保真默认形态。
- v1.0.4 (2026-05-23): 吸收四张得物 Tab 截图为设计语言实证基线；新增截图事实优先规则、推荐 Tab anti-hallucination 约束和对应 preflight 负例。
- v1.0.3 (2026-05-22): 吸收上传版中 Dewu 强相关的 DS、社区承接、业务态压缩和品牌 preflight 约束，仍保持 private-mirror 边界。
- v1.0.2 (2026-05-21): 收窄品牌包边界，移除包内 shared-core 副本；通用原子、页面状态、动效与 PRD 风险规则回收到 public skills / system core。
- v1.0.1 (2026-05-14): 补齐 DS Pack Interface v1.1 metadata 与可选 motion override。
