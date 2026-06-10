# Dewu HIFI Golden Reference

本参考样本解释 Dewu 高保真产物为什么应该接近真实 App 截图，而不是只满足页面结构。

## Canonical Sample

- HTML: `_workspace/test-cases/dewu-tab-wireframe-smoke-20260523/dewu-four-tabs-hifi-v4.html`
- Test: `_workspace/test-cases/dewu-tab-wireframe-smoke-20260523/run-four-tabs-hifi-v4-tests.cjs`
- Long screenshot/detail proof: `_workspace/test-cases/dewu-tab-wireframe-smoke-20260523/dewu-scroll-detail-hifi-v1.html`
- Long screenshot/detail test: `_workspace/test-cases/dewu-tab-wireframe-smoke-20260523/run-scroll-detail-hifi-v1-tests.cjs`
- General HIFI validator: `skills/dewu/tests/validate-hifi-surface.cjs`

## Baseline Metrics

该样本相对旧版紧凑产物的关键差异：

- 使用 `393x852` 截图证据内部坐标，而不是被手机壳 padding 压缩后的内部画布。
- 四屏均保留顶部 `得物App` App chrome。
- 可见文字、字号、line clamp、模块 top/height 和底栏基线都可由 Playwright 验证。
- CSS 和 class 词汇更丰富，能表达频道、商品、工具、个人中心等不同 surface。
- 有稳定视觉素材入口，图像承担页面主视觉，不依赖纯渐变占位。
- 四个底部 Tab 各自是不同业务 surface，不是同一个组件列表换标题。
- 底部 Tab active 保持黑色中性色，Teal 留给顶部频道下划线和少量强调。
- 长截图按固定 viewport + 真实可滚动 scroll-content/scroll-inner 建模，避免把下滑内容缩进单屏或裁切成不可滚动长块。
- 内容详情页使用 Type 2 push surface：无底部 Tab，大图轮播、商品推荐条、正文话题、评论区和底部互动栏都有独立锚点。

## Usage

生成任意 Dewu 高保真页面时，迁移以上视觉质量特征；不要迁移“四屏”这个输出形态，除非用户明确要求底部四 Tab 定位页。
