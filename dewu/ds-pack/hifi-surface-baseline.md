# Dewu HIFI Surface Baseline

本文件定义 Dewu 高保真页面的通用美观基线。它约束的是视觉质量和页面组织方式，不约束输出一定是四个底部 Tab 页面。

## Priority

当用户要求 Dewu 高保真原型、交互稿、页面设计或测试用例生成视觉产物时，必须加载本文件。

优先级：

1. 用户明确给出的截图或业务要求
2. `skills/dewu/ds-pack/screenshot-evidence-pack.md`
3. `skills/dewu/ds-pack/tab-surfaces.md`
4. 本文件
5. `skills/dewu/ds-pack/ds-spec.lock.md`
6. 其他 Dewu ds-pack 文件

## Output Shape

- 页面数量由任务决定：可以是单页、流程多页、四 Tab 页面或局部弹层，不得把四 Tab 样例外推成固定输出形态。
- 如果页面属于 App 主路径，并且用户未要求全屏沉浸或弹层，底部 Tab 仍按 `得物 / 购买 / 探索 / 我` 归属定位。
- 每个页面必须有明确业务 surface：社区、交易、探索工具、个人中心、商品详情、发布器、鉴别结果等，不得只换标题复用同一套卡片。

## Prompt Reproducibility Contract

同一个用户 prompt 在同一项目、同一上下文 pack 和同一输出 mode 下，应生成同一类页面，而不是每次换一套视觉语言。

- 生成前必须先锁定 `mode`、`surface`、`page_count`、`entry_context` 和 `primary_action`。
- 如果 prompt 未指定页面数量，不要默认生成四屏；按业务目标选择最小可解释页面数。
- 如果 prompt 指定“得物高保真”“Dewu 页面”“得物原型”等，必须加载本文件和 `tab-surfaces.md`。
- 如果 prompt 指定“和参考样例同样好看”，迁移的是素材密度、真实 App 尺寸、surface 差异和 chrome 克制，不迁移四屏数量。
- 复用 `skills/dewu/examples/hifi-prompt-contract.md` 的 prompt structure，把可变业务需求填入 slot，避免每次由模型自由重组需求。
- 当 prompt 命中“请生成四个tab定位下的页面（总共四个），全部高保真。”这类四 Tab 高保真定位页请求时，必须读取 `skills/dewu/ds-pack/hifi-four-tab-anatomy.md`，并以 golden reference 校准质量；不得强绑定复制 HTML，也不得只迁移抽象原则后生成低保真替代品。

## Visual Quality Rules

- 真实内容素材优先。高保真稿必须使用真实图片 URL、真实本地图片资产或用户提供图片；不得用内联 SVG 假图、纯渐变、抽象色块代替真实内容。只有测试占位 fixture 可以使用内联 SVG。
- 产品图、穿搭图、头像、品牌图或服务图必须成为页面主视觉。不得用大块渐变、抽象色块或纯 SVG 插图代替真实内容。
- App chrome 退后：顶部栏、底部栏、搜索栏和分割线应克制，内容图文承担视觉重量。
- 页面尺寸优先模拟真实 App 截图。截图级吸收以 `393x852 CSS px @3x` 作为内部坐标；普通 HIFI 可使用接近 `390x844` 的展示壳。不要用过窄的 `320px` shell 作为高保真默认。
- 上传截图的字体、字号、行高、换行、截断、可见行数和模块间距必须作为视觉事实吸收；不得只复刻页面结构。长截图还必须吸收滚动内容高度、模块重复密度和固定 viewport 下的 sticky/overlay 行为。
- 上传截图给出可见文字时，复刻模式必须逐字保留；同类生成可换内容，但必须保持 typographic footprint。
- 手机内部页面、滚动内容区、列表、卡片和个人中心头部不得产生横向滚动条或异常折叠。
- 信息密度接近真实 App：高保真主页面应包含足够的图文、价格、作者、服务说明、入口列表或 dashboard 模块，避免空白占位。
- 中英混排保留品牌真实感，例如 `Nike`、`Air Jordan`、`Supreme`，但页面主语言仍为中文。

## Surface Differentiation

- `得物` 社区页：顶部频道后直接进入双列图文 Feed；卡片以图片为主，标题最多两行，底部作者/点赞压缩。
- `购买` 交易页：频道、类目、权益、商品卡和价格是主结构；不复用社区 Feed 作为主体。
- `购买` 交易页：顶部 `分类` 频道带菜单图标；搜索区、频道栏、宫格、信任背书行和商品卡间距必须贴近截图。
- `探索` 工具页：消息、鉴别、玩一玩、闲置、金融等入口以列表或分组卡组织；不做瀑布流。
- `我` 页面：资料区、创作中心、订单、资产和工具 dashboard 是主结构；不做内容 Feed。
- 非 Tab 页面按业务 surface 选择结构：商品详情使用大图和底部 CTA，发布器突出输入和配置，鉴别结果突出结论和证据链。
- 社区内容详情页按 Type 2 push surface 处理：不带底部四 Tab，首屏大图轮播承担视觉重量，底部使用互动输入栏而不是主导航。

## Navigation Rules

- 底部 Tab active 使用黑色或 `--n140` 中性色；Teal 不用于底栏 active。
- 顶部频道 active 可使用 Teal 下划线，推荐页 active 必须是 `推荐`。
- 底栏 icon 必须是 stroke-only 线框 SVG 或真实线框资产，不得用 emoji、纯文字或填充块。

## Golden Reference

当前 Dewu HIFI golden reference 是：

- `_workspace/test-cases/dewu-tab-wireframe-smoke-20260523/dewu-four-tabs-hifi-v4.html`
- `_workspace/test-cases/dewu-tab-wireframe-smoke-20260523/dewu-scroll-detail-hifi-v1.html`（v1.0.9 长截图/内容详情页 proof artifact）

这些文件只作为截图证据链 proof artifact，不作为未来产物形态约束，也不作为强复制模板。关键可迁移特征是：真实素材密度、`393x852` 内部坐标、App chrome、长截图真实可滚动 `scroll-content + scroll-inner` 建模、可见文字/字体/模块高度可测、业务 surface 各自独立、底部 Tab 克制、详情页 Type 2 无底栏、页面模块丰富。四 Tab 页面结构的可迁移模块规范见 `skills/dewu/ds-pack/hifi-four-tab-anatomy.md`，截图事实细节见 `skills/dewu/ds-pack/screenshot-evidence-pack.md`。

## Validation

生成完成后可用以下脚本做质量回归，但该脚本是 skill 质量门，不是默认测试用例入口：

```bash
node skills/dewu/tests/validate-hifi-surface.cjs <html-file>
```

四 Tab 定位页还需要继续通过四 Tab 专项回归：

```bash
node _workspace/test-cases/dewu-tab-wireframe-smoke-20260523/run-four-tabs-hifi-v4-tests.cjs
NODE_PATH=/Users/ianzhao/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/ianzhao/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node _workspace/test-cases/dewu-tab-wireframe-smoke-20260523/run-scroll-detail-hifi-v1-tests.cjs
```
