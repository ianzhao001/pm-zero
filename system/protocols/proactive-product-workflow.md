# 引导与交付规则

本文件保留原流程的历史阶段与恢复语义；默认新项目使用[六阶段协议](six-stage-product-workflow.md)。不得把本文旧编号重写为新项目编号。六阶段细分模板只复用适用的步骤控制规则。

## Brief

六项信息：target_user、core_problem、scenario、scope、non_goals、key_assumptions；补充可观察的 success_criteria。先从用户已有材料提取，不按字段逐个询问。

开放问题包含 id、question、why、blocks_gate、owner、status。先解决影响当前决定的问题；已关闭的问题在用户改口或出现新证据时才重新打开。不阻塞当前阶段的风险在 PRD 中保留。

证据采用系统 A–E 等级，D/E 不作为 G1 通过依据；可以明确降为不支持 Gate 的已知风险。用户选定试验方向不等于市场需求已证实。决定应保留被否选项和理由。

## 生产交接

以工具返回的 inputSchema 为准确接口，必要时读取 `../workflow-core/README.md`。生产路由示例：

```sh
node system/brand-registry/scripts/multi-context-resolver.mjs --input '澄清当前需求' --artifact brief --context none
node system/brand-registry/scripts/multi-context-resolver.mjs --input '制作交互规格' --artifact interaction_spec --context none
node system/brand-registry/scripts/multi-context-resolver.mjs --input '制作已确认方案' --artifact demo --context none
node system/brand-registry/scripts/multi-context-resolver.mjs --input '整理已确认方案' --artifact prd --context none
```

这些路径以安装包根目录为基准。不要依赖开发者机器的绝对路径。

交互规格产出页面、路由、状态、行为、异常与验收条件，同时按 `../workflow-core/contracts/design-model.schema.json` 生成 design_model。模型中 screen_id/element_id 在后续修改中保持稳定，Demo 用 data-screen-id/data-element-id 对应。PRD Markdown 用同一模型核对主流程、业务规则、异常与验收条件；正式产品正文不包含工具调用过程。

每次生产完成后将版本、hash、依赖、已知限制交给两个独立立场审查；汇总阻断发现，修复后让对应审查重新绑定版本。工具校验通过只能证明其覆盖的机械规则。

## 引导示例

“做一个社区投票功能”缺少目标时，先比较“发帖征求建议”“浏览轻互动”“管理员收集意见”，说明不同选择会改变入口和结果展示。用户选定目标后再聚焦规则。示例选项不是默认用户事实。

“不知道要哪种”时做两个局部探索；“先给我看一个”时把低成本草稿标为 exploration。理解已足够时直接推进，不为了表格完整追问无关细节。

纯 visual 修改默认只失效 Demo 与审查；改变交互规则影响规格、模型、Demo 与 PRD；改变用户问题或范围从 brief 传播。以 MCP 返回的实际依赖结果为准，不手工把 stale 改回 confirmed。
