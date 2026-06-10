# Dewu Screenshot Evidence Pack v1.0.12

本文件把用户上传的得物截图转成可生成、可验收的证据基线。它是证据包，不是 HTML 模板；后续生成页面应从这些 surface/module 规则推导，而不是复制某个 demo。

## Priority

截图事实优先级最高，仅覆盖设计语言、视觉规范和页面结构样式：

`uploaded screenshots > screenshot-evidence-pack.md > tab-surfaces.md > ds-spec.lock.md > ds-pack/* > research/dewu-research.md > external dewu-interaction-design`

不覆盖仓库协议、发布边界、隐私边界、工具接口、测试运行方式或截图无法证明的业务事实。

## Source Geometry

- v1.0.7 四张单屏源图尺寸均为 `1179x2556`。
- v1.0.8 五张新增源图宽度均为 `1179px`，归一化后仍是 `393 CSS px @3x`；高度分别为：
  - 社区 Feed 长截图：`1179x5735`，约 `393x1911.7 CSS px @3x`。
  - 购买商品流长截图：`1179x4781`，约 `393x1593.7 CSS px @3x`。
  - 我页长截图：`1179x3455`，约 `393x1151.7 CSS px @3x`。
  - 探索基线截图：`1179x2556`，约 `393x852 CSS px @3x`。
  - 内容详情长截图：`1179x5174`，约 `393x1724.7 CSS px @3x`。
- 单屏 viewport 归一化基准仍为 `393x852 CSS px @3x`。
- 高保真截图吸收任务默认生成 App screenshot surface：`.phone-screen` 内部坐标必须等效 `393x852`。
- v1.0.9 起，长截图必须按“固定 `393x852` viewport + 固定高度可滚动 `.scroll-content` + 承载长内容的 `.scroll-inner`”建模；动态测试必须验证 `scrollHeight > clientHeight` 且设置 `scrollTop` 后实际变化。
- v1.0.10 起，`我` 页 profile-dashboard 按长截图重新锚定：深 Teal 资料区高度收敛到 `188-202px`，白色圆角 dashboard 从该区间后直接开始；`profile-body` 滚动视口约 `580-594px`，下方模块靠紧排列，不能用 grid/min-height stretch 拉散。
- v1.0.11 起，MODE_DEMO 也必须以可见 rendered DOM 承载截图 grammar：不得用 hidden evidence、`<template>` 证据块、display:none 证据、`.tabbarx` 等别名通过规则；HUD 和控制台只能在手机外部，不能改变手机内部字体、间距、状态栏、底栏或滚动模型。
- v1.0.12 起，新增截图吸收必须先完成 intake 表、negative fixture/readiness check 和 rendered-DOM 验收链接，再生成 proof artifact；demo 只能用于验收，不能反向成为规则来源。
- `.scroll-content` 自身不得用超长 `min-height` 假装长截图；长内容高度必须落在内层 `.scroll-inner` 或等效内容容器上。
- 主 Tab 长页滚动视口应扣除 App chrome、搜索/频道和底部 Tab；内容详情页滚动视口应扣除状态栏和底部互动栏。
- 不得把长截图压缩成单屏，也不得让手机壳/展示 rail 改变内部坐标。
- 外层手机壳、展示 rail 或 canvas 可以存在，但不得通过 padding、border 或缩放吃掉内部坐标。若要展示设备包装，应包装在外层，内部 UI 仍按 `393x852` 布局。
- 四张截图都有顶部 App chrome：状态栏 + 居中 `得物App` 标识。高保真复刻不得省略。

## Global Evidence

- 底部 Tab 固定 `得物 / 购买 / 探索 / 我`，四等分。
- 底栏 active 使用黑色或 `--n140`；Teal 只用于顶部下划线和少量强调，不染底栏 active。
- 底栏 icon 是 stroke-only 线框风格；不要用生成式填充图标、emoji 或纯文字。
- 红色只用于小红点或数字 badge，例如探索 Tab 的 `3`。
- 手机内部任何 surface 不得横向滚动；红点、badge、箭头、头像和绝对定位元素不得撑宽容器。
- 上传页面的字体、字号、行高、换行、截断、可见行数和模块间距都是事实证据；不能只吸收结构和颜色。
- 可交互 Demo 的可见 `.phone-screen` 是验收对象；不能把截图证据藏在不可见 DOM 里，也不能让 demo shell/HUD 的通用样式覆盖 Dewu 手机内部 DS。

## New Screenshot Intake Template

每次用户新增 Dewu 截图，先补本表或等效 evidence 记录，再生成 demo/proof artifact。

| Field | Required Evidence |
|---|---|
| `source id` | 图片文件名、上传顺序或用户标注 |
| `source size` | 原图宽高，例如 `1179x2556` |
| `CSS viewport` | 归一化 CSS 宽高和倍率，例如 `393x852 @3x` |
| `scroll state` | 单屏、长截图、下滑后状态、详情页长内容、局部滚动状态 |
| `surface type` | 得物 Feed、购买商品流、探索工具入口、我页 dashboard、内容详情等 |
| `visible text` | Tab、标题、商品名、按钮、meta、评论等可见文字逐字表 |
| `module grammar` | 模块层级、顺序、复用边界和禁止外推项 |
| `typography footprint` | font-size、line-height、font-weight、margin/padding、line clamp、单行截断 |
| `spacing anchors` | 模块 top/height、滚动 viewport、gap、padding、底栏/状态栏/图标/badge 基线 |
| `image/icon rules` | 图片比例、视频角标、stroke-only icon、红点、数字 badge、overlay |
| `negative fixture` | 本批截图新增或复用的失败样例，必须能抓住本轮最大风险 |
| `rendered-DOM test` | preflight/validator/Playwright 测试入口，必须检查可见 DOM 与 computed style |
| `non-evidence` | 截图不能证明、不得写成规则的业务事实 |

若某字段缺失，应先补证据或写明无法证明，不得用 demo 视觉结果反推规则。

## 得物 Tab Evidence

Surface grammar：社区推荐瀑布流。

- 顶部搜索词：`香奈儿1957香水`。
- 顶部频道：`推荐 / 极光街 / 夏日焕颜术 / 灵感 / 关注 / 穿搭`。
- `推荐` active，active 字号约 `18-20px`，inactive 约 `16-17px`，active 下划线使用 `--accent`。
- 频道后直接进入双列 Feed，不插入品牌背书 chip、热帖 chip 或功能入口行。
- Feed 卡以图片为视觉主角；边界轻，瀑布流高度自适应，不允许文本区撑出大空白。
- Feed 标题最多 2 行；作者/点赞 meta 单行截断。
- 点赞统一为右侧 thumbs-up 描边 icon，不混用 heart。
- 截图可见文字包括：
  - `当田曦薇遇上朦胧破碎感✨解锁新风格！`
  - `度假的意义，就是把烦恼丢进海里🌊`
  - `这谁？你要能猜对，高低有点东西`
  - `寒汐熵`
  - `sbzesmsjh`
  - `得物小懂王`

### 得物 Tab Long Feed Evidence

新增长截图显示的是页面向下滚动后的社区 Feed，但顶部搜索、频道和底部 Tab 仍保持 App 真实截图语言。

- 搜索词：`摩哈云游戏机二代`。
- 顶部频道：`推荐 / 极光街 / 楠檀入驻 / 灵感 / 关注 / 穿搭`，第 3 位仍是运营活动展示位。
- Feed 内容继续双列瀑布流，卡片高度由图片比例和标题/作者 meta 决定；不得统一卡高。
- Feed 卡可包含视频角标，例如右上角白色播放三角，作为 `.video-marker` 模块沉淀。
- 标题字号约 `15px`，最多 2 行；作者/点赞 meta 约 `12px`，单行。
- 所有点赞仍是右侧 thumbs-up 描边 icon，不切换为 heart。
- 截图可见文字包括：
  - `宽松灰T配热裤，慵懒里带着点小性感`
  - `纯欲风蕾丝眼罩✨仙气氛围感拍照神器`
  - `女大大胆穿搭｜穿高跟鞋进公园，主打一个“舒服又吸睛”`
  - `Vlog｜二旬老人健身日依旧离不开冰饮`
  - `idle叶舒华受豆舞台直拍！`
  - `谁懂啊！和对象宅家 情侣睡衣太好磕了💕`

## 购买 Tab Evidence

Surface grammar：交易频道 + 宫格 + 信任背书 + 商品网格。

- 搜索词：`夜魔extreme se`。
- 交易频道：`推荐 / 潮玩 / 男装 / 美妆 / 鞋类 / 女装 / 三 分类`。
- 最后一项不是裸 `分类`，而是带三横线/菜单图标感的 `三 分类`。
- 频道栏、宫格、信任背书行和商品区必须紧凑，不得只校验“有 7 个 Tab、10 个入口、2 列商品”。
- 频道宫格入口以商品/礼物/品牌缩略图为主，不用抽象线框方块替代。
- 宫格第一项文案必须是 `100%必中抽奖`，不是 `必抽奖`。
- 商品区双列，商品图/品牌图主导；标题最多 2 行；价格、付款人数密度接近截图。
- 截图可见文字包括：
  - `100%必中抽奖`
  - `天天低价`
  - `礼物指南`
  - `品牌专区`
  - `疯狂折扣`
  - `星宇宙`
  - `星愿森林`
  - `全球购`
  - `品牌特卖`
  - `全部频道`
  - `先鉴别后发货的开创者`
  - `Apple AirTag 内置扬声器`
  - `ROG 夜魔 全透经典复刻`

### 购买 Tab Long Product Evidence

新增长截图显示购买页商品区继续向下延展，仍保持交易 surface，不转为社区 Feed。

- 搜索词：`香奈儿1957发财水`。
- 交易频道仍为：`推荐 / 潮玩 / 男装 / 美妆 / 鞋类 / 女装 / 三 分类`。
- 频道宫格入口以商品/礼物/品牌缩略图为主，新截图可见入口：
  - `100%必中抽奖`
  - `天天低价`
  - `礼物指南`
  - `限时补贴`
  - `疯狂折扣`
  - `星宇宙`
  - `品牌专区`
  - `星愿森林`
  - `精选手机`
  - `全部频道`
- 信任背书行可见：`先鉴别后发货的开创者`、`得物荣获人民网“匠心服务奖”`。
- 商品卡模块：
  - 双列网格，左右卡片之间只有极细分割和留白，不做厚卡片边框。
  - 商品图高度约 `126-150px`，主体为白底商品图。
  - 商品标题约 `15px`，最多 2 行。
  - 价格约 `13px`，中性黑，付款/浏览/关注人数约 `13px` 灰色。
  - 标签、评分、关注信息可在标题上方或下方出现，但密度必须接近截图。
- 截图可见文字包括：
  - `Apple AirPods Max 2 国行全`
  - `Apple AirPods Pro 3 入耳`
  - `EVANLEY 电子驱蚊器 智`
  - `好奇蜜斯纯欲风蕾丝内衣`
  - `Crocs Crush Clog 泡芙时`
  - `充电器好物人气榜`
  - `JELLYCAT 害羞系列 邦尼`
  - `NBA特刊杂志 2025年9月`
  - `徕芬`
  - `星动猫 表带 苹果Watch S`

## 探索 Tab Evidence

Surface grammar：工具入口列表。

- 页面标题 `探索` 在状态栏后快速出现；不要把标题块做成大 hero。
- 主体为 5 个列表入口：`消息中心 / 鉴别服务 / 玩一玩 / 买卖闲置 / 得有钱·借钱`。
- 第一行带红色数字 badge `3`；最后一行可带红点。
- 普通行高度约 `74-82px`；消息中心行约 `82-92px`。
- 入口标题约 `19px`，说明文字约 `13px`，说明单行截断。
- 截图可见文字逐字保留：
  - `您有未读的客服消息`
  - `专业鉴别 | 你有一次免费识图鉴别机会即将过期`
  - `免费好礼 | 星愿森林 免费领好礼`
  - `闲置估价 | 看看你的宝贝还能卖多少?`
  - `最高20万 | 最快30秒到账`

## 我 Tab Evidence

Surface grammar：个人资料头 + 工具 dashboard。

- 顶部是深 Teal 资料区，含状态栏 App pill、客服/菜单图标、头像、昵称、等级、签名、统计。
- 资料区高度在长截图基线中约 `188-202px`；不要折叠，也不要沿用过高 header 导致下方整体下移。
- `profile-body` 紧接资料区；不得用负 margin 覆盖或折叠。
- 创作中心高度约 `66-76px`，不是大卡片。
- 订单模块五项：`待付款 / 待发货 / 待收货 2 / 评价 1 / 退款/售后 1`。
- 资产 tile 高约 `44-52px`，两列紧凑。
- 订单五项、资产四 tile、省钱神券四项和服务八宫格必须使用黑色 stroke-only 线框图标；缺图标或混入填充图标都是截图吸收失败。
- 钱包模块是四列纯数字/文本资产摘要，不使用入口图标：`3 / ¥0 / 可领¥150 / ¥1*万` 对应 `优惠券 / 余额 / 随心省 / 借钱`。
- 资料昵称必须来自 Dewu 昵称池；截图基线默认 `道u_5dbd337a7a...`，不得随意生成 freeform 昵称。昵称字号约 `18px`、行高约 `22px`，不要放大成页面标题。
- dashboard 模块主标题（如 `钱包`、`省钱神券`、`出售`）约 `16px`、中重字重；不得沿用 18-20px 大标题。
- 截图可见文字包括：
  - `道u_5dbd337a7a...`
  - `未设置签名`
  - `获赞与收藏 0`
  - `关注 14`
  - `粉丝 0`
  - `创作中心`
  - `钱包`
  - `省钱神券`

### 我 Tab Long Dashboard Evidence

新增长截图显示个人中心继续向下滚动后的模块，必须作为可复用 dashboard grammar 吸收。

- 顶部 profile header 仍可见，维持 `188-202px` 高度；不要为了显示更多模块而压扁资料区，也不要用 `214px+` 的旧宽松 header 把 dashboard 整体推迟。
- `profile-body` 固定为约 `580-594px` 的真实滚动视口；滚动内容必须在 `.profile-scroll-inner` 或等效内层容器中自然堆叠。
- `.profile-scroll-inner` 必须是紧凑纵向 stack，推荐 `flex-direction: column` + `8px` 左右 gap；禁止使用 grid + 过大 min-height 让模块自动拉伸。
- 模块高度锚点：
  - `creator-card`: `66-76px`
  - `order-module`: `104-116px`
  - `wallet-module`: `90-104px`
  - `coupon-module`: `84-96px`
  - `seller-module`: `96-112px`
  - `service-module`: `112-132px`
- 已有模块后继续出现：
  - `出售 ↔ 切换商家版`：四列数据 `无法动销 / 订单待发货 / 入仓待寄出 / 入仓待出价`，数值均可为 `0`。
  - 8 宫格服务入口：`免费领券 / 星愿森林 / 签到有奖 / 必中抽奖 / 高价回收 / 免费鉴别 / 0元抽奖 / 领120元券`。
- 这些 lower dashboard 模块可以在个人中心其他子页复用，但必须保持：
  - 白色模块卡，浅灰页面背景。
  - 模块标题约 `16px`。
  - 入口图标为黑色 stroke-only 线框。
  - 4 列栅格，文字约 `13-14px`，不要扩成大卡片。
  - 服务八宫格 row gap 约 `8-12px`，出售和下方服务模块都不能留下大片空白。

## 内容详情页 Evidence

Surface grammar：社区 Feed 点击后的 Type 2 内容详情页。

- 详情页不是四 Tab 主页面：不得出现底部 `得物 / 购买 / 探索 / 我` Tab。
- 顶部仍保留状态栏和居中 `得物App` App chrome。
- 首屏以大图轮播为主：`.detail-hero` 高度约 `600-632px`，图上 overlay 包含：
  - 左上返回圆按钮。
  - 顶部居中页码，例如 `1/8`。
  - 右上分享 icon。
- hero 下方是商品推荐条 `.detail-product-strip`，高度约 `72-84px`，可包含两个商品卡、`新` badge、补贴 chip、收藏 icon 和 `4件 >`。
- 作者行 `.detail-author`：头像、昵称、右侧 `+关注` Teal 按钮。
- 标题 `.detail-title` 约 `18px`，正文 `.detail-copy` 约 `16px`，正文中的 @ 提及和 # 话题使用 Teal。
- 中段模块顺序：标题/正文/话题 → 活动行 → 时间地点/不喜欢 → 评论标题 → 评论输入 → 社区公约 → 评论列表。
- 底部 `.detail-actionbar` 固定在 viewport 底部，高度约 `50-58px`，包含输入框、点赞、收藏、评论数。
- 截图可见文字包括：
  - `LIANG李昂`
  - `谁懂啊！和对象宅家 情侣睡衣太好磕了💕`
  - `高甜情侣宅家穿搭`
  - `#夏日反光计划`
  - `#TheSimpsons辛普森一家`
  - `活动 · 费小力出大片`
  - `共 3 条评论`
  - `社区公约`
  - `说点什么...`

## Validation Anchors

截图级 artifact 必须提供可测的坐标锚点，而不是只写字号：

- `.phone-screen` width/height
- `.app-status` height
- `.top-tabs` height
- `.feed-grid` columns
- `.commerce-tabs` height
- `.channel-grid` height
- `.trust-row` height
- `.product-media` height
- `.utility-list` padding/top rhythm
- `.utility-row` height
- `.profile-top` height
- `.profile-body` viewport height
- `.creator-card` height
- `.tile` height
- `.order-module` height
- `.wallet-module` height
- `.seller-module` height
- `.service-module` height
- `.module-head h3` font-size/line-height
- `.profile-name` nickname font-size/line-height and allowed value
- `.profile-scroll-inner` display/gap/min-height
- `.order-grid` / `.profile-tiles` / `.wallet-grid` / `.coupon-grid` / `.service-grid` icon counts
- `.tabbar` height
- `.scroll-content` fixed viewport height（长截图）
- `.scroll-inner` min-height / content height（长截图）
- `.detail-hero` height
- `.detail-product-strip` height
- `.detail-actionbar` height/position
- `.seller-module` / `.service-grid` presence
- `.video-marker` presence
- `.product-media` long-list height

这些锚点由 Dewu brand preflight `B23-B42` 和 HIFI surface validator 共同验证；其中 `B33-B36` 覆盖真实滚动、购买顶部逐字/节奏、typography footprint 和我页 lower dashboard 可滚动访问；`B37-B40` 覆盖 profile-dashboard header/body 坐标、非 grid stretch、线框图标完整性和服务宫格密度；`B41-B42` 覆盖昵称池和全页面 typography footprint。
