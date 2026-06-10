# Dewu Tab Surfaces Screenshot Baseline

本文件沉淀四张上传截图可证明的 Tab surface 设计语言。截图是事实证据：当本地 Dewu 规范与上传截图在设计语言、视觉规范或页面结构样式上冲突时，以截图为准。

## Priority

设计语言优先级：

1. uploaded screenshots
2. `skills/dewu/ds-pack/screenshot-evidence-pack.md`
3. `skills/dewu/ds-pack/ds-spec.lock.md`
4. `skills/dewu/ds-pack/*`
5. `skills/dewu/research/dewu-research.md`
6. external `dewu-interaction-design`

适用范围：Tab 结构、图标风格、字体、字号、行高、换行、截断、可见行数、模块间距、Feed 密度、卡片结构、颜色使用、角标/徽章是否出现、点赞样式、页面 surface 组织。

不适用范围：产品商业背景、仓库发布协议、manifest 规则、private-mirror 边界、测试运行方式，以及截图不能证明的业务事实。

截图只覆盖某个 surface 时，只在该 surface 内覆盖本地规则。例如本轮 `得物` 推荐 Tab 的截图基线不外推为 `购买`、`探索`、`我` 的内容结构。

## Shared Tab Baseline

- 底部 Tab 固定四等分：`得物 / 购买 / 探索 / 我`。
- 底部 icon 是 20px 左右的 stroke-only 线框 SVG 或真实线框资产；不使用填充块、拟物生成图、emoji、纯文字、CSS pseudo icon。
- 底部 active 使用 `--n140` 或等价黑色中性色；不使用 `--accent` 染色。
- Teal `--accent` 主要用于顶部 active 下划线、少量 chip/强调，不扩散到底栏 active。
- 红色只用于小红点、数字 badge、局部提醒，不作为大面积促销色。
- App Chrome 退后：白色/浅灰 surface、薄分割线、黑色内容字重，比装饰更克制。
- 上传截图中的字体、字号、行高、换行、截断和可见行数是事实证据；不能只吸收结构和颜色。
- 截图级 HIFI 默认按 `393x852 CSS px @3x` 内部 surface 归一化；手机壳只能包装，不能压缩内部坐标。
- 高保真吸收必须保留截图可见文字、关键模块 top/height、行高和可见行数；详见 `screenshot-evidence-pack.md`。
- 手机内部不得出现横向滚动条；只有外层画布/rail 可以横向滚动。

## 得物 Tab: Recommended Community Surface

截图事实：

- 页面为 Type 1 首页容器：顶部状态栏/品牌或搜索区、社区顶部频道、双列瀑布流、底部四 Tab。
- 顶部频道顺序固定：`推荐 / 极光街 / 运营活动 / 灵感 / 关注 / 穿搭`；运营活动展示名可以替换第 3 位，例如截图中的 `夏日焕颜术`，逻辑位置不变。
- 推荐页 active 是 `推荐`，字号明显大于 inactive，字重更强，底部使用 Teal 下划线。
- 顶部频道之后直接进入社区双列 Feed；截图没有品牌背书 chip row、热帖 chip row 或功能捷径行。
- Feed 是图片主视觉卡片：图片占据主要高度，标题位于图片下方，最多 2 行；作者/头像/点赞 meta 在底部压缩为单行。
- 点赞只使用一种右侧 thumbs-up 描边图标 + 数字；同屏不混用 heart。
- Feed 卡片不出现 `AUTH`、`NEW` 等截图中没有的角标。
- Feed 高度由图片和文本自适应，不为统一卡高制造大块空白区域。

## 购买 Tab: Commerce Surface

截图事实：

- 顶部仍有搜索区，但频道是交易类目：`推荐 / 潮玩 / 男装 / 美妆 / 鞋类 / 女装 / 分类`。
- `分类` 是带三横线/菜单图标感的最后频道项，不是裸文字 Tab；频道栏的左右边距、baseline、gap 和字号需按截图吸收。
- 主体是频道入口网格和商品/权益/活动商品卡，不是社区评论流。
- 商品图或品牌图是卡片视觉主角，价格和付款人数用中性色表达。
- 频道宫格、信任背书行和商品卡必须保持截图中的紧凑纵向节奏；不得只保证“有 10 个入口、2 列商品”而忽略间距。
- `得物` 社区推荐页的双列 Feed 规则不直接外推为购买页信息架构；购买页可使用商品网格和频道宫格。

## 探索 Tab: Utility Surface

截图事实：

- 页面标题为 `探索`，不是社区瀑布流。
- 主体是消息中心、鉴别服务、玩一玩、买卖闲置、得有钱/借钱等功能入口卡片。
- 入口以单列或分组列表组织：左侧标题与说明，右侧小图、箭头、红点或数字 badge。
- `探索` 的底栏 icon 可出现红色数字 badge，例如 `3`；红色仍局限于 badge。

## 我 Tab: Profile Dashboard Surface

截图事实：

- 顶部是个人资料区，使用深色/Teal 氛围背景、头像、昵称、等级、关注/粉丝等数据。
- 下方是白色卡片化 dashboard：创作中心、订单、想要/我有/足迹/关注、钱包、省钱神券等模块。
- 图标仍以黑色线框为主，信息密度偏工具型，不是内容 Feed。
- 昵称必须来自 Dewu 昵称池，截图基线默认 `道u_5dbd337a7a...`；昵称和模块标题都按截图收敛，不能放大。
- 钱包模块是纯数字/文本资产摘要，不是图标宫格；省钱神券、出售和服务宫格需紧凑排列，不能留下大片空白。
- 底栏 `我` active 仍保持黑色/中性色，不使用 Teal。
- 资料头部不得被下方 dashboard 折叠或覆盖；头像、昵称、等级、签名和关注/粉丝数据必须完整可见。

## Anti-Hallucination Rules

- 不得在 `得物` 推荐 Tab 中凭空添加 `先鉴别后发货`、`今日热帖`、`穿搭灵感` 等截图没有的 chip row。
- 不得给社区 Feed 卡添加 `AUTH` / `NEW` 标签，除非用户另给截图或明确要求。
- 不得混用点赞图标；推荐 Feed 统一 thumbs-up。
- 不得把 `dewu-interaction-design` 的抽象结构覆盖截图事实。
