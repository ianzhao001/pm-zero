# Mode 声明契约

当任务存在多个输出 mode 时，生成前必须声明当前 mode。声明固定为四行：

```text
MODE: <MODE_NAME>
REQUIRED: <必须加载的 references 或 checks>
DISABLED: <当前 mode 禁用的能力或假设>
AMBIGUITY: <输入不完整时的默认决策>
```

推荐 mode 名：

- 设计工作流：`MODE_FLOW`、`MODE_DEMO`、`MODE_PRODUCT_ADVICE`。
- PRD 工作流：`PRD_DRAFT`、`PRD_REVIEW`、`PRD_FINAL`。

## 设计 Mode 定义

- `MODE_FLOW`：静态多屏流程画布。必须表达屏幕、热点、箭头、页面状态和关键规格卡；禁止生成 demo shell、HUD、运行时路由或动效调试面板。
- `MODE_DEMO`：可点击交互原型。必须表达单手机壳、路由、反馈、HUD、事件日志和 reduced-motion fallback；禁止把多手机流程画布塞进 demo。
- `MODE_PRODUCT_ADVICE`：产品结构、交互策略、信息架构或评审建议。默认输出文字建议和必要结构草图；禁止默认为用户生成可运行原型。

## 歧义默认

- 用户说“流程图、页面流、交互图、信息流、线框流”时，默认 `MODE_FLOW`。
- 用户说“可点击、demo、原型、跑起来、交互演示”时，默认 `MODE_DEMO`。
- 用户同时要求 flow 与 demo 时，拆成两个产物，并在声明中写明当前先做哪一个。
- 用户说“帮我看、怎么改、产品建议、评审”且没有要求产物时，默认 `MODE_PRODUCT_ADVICE`。
- 用户给出现有 HTML、版本号、截图或“基于上一版继续”时，先加载反馈库，再选择最贴近用户目标的 mode。

## 规则

- 声明应靠近输出计划或产物头部。
- `REQUIRED` 必须写明具体 references、schemas 或 context packs。
- 当某个 mode 禁用动效、截图、实现或私有 context 时，`DISABLED` 必须明确写出。
- `AMBIGUITY` 必须写默认动作；若任务有安全默认值，不应等待确认。
- 任何私有 context pack 都必须由用户显式触发；通用 mode 声明不得默认携带私有研究、签名、tab、token 或品牌语义。

## 反馈库触发词

出现以下信号时，必须加载对应反馈模式或迭代规则：`继续迭代`、`基于上一版`、`保留`、`不要改动`、`最小修改`、`修复`、`优化这一版`、`v2/v3/vN`、`review`、`对比上传版`、`同步到 demo`、`同步到 flow`。
