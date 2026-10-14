---
name: color-typography
description: >-
  Specify semantic colors, contrast and typography for an approved visual direction; produces a static palette and typography sheet.
---

# 色彩与字体

只执行当前阶段计划分配的能力；新项目加载与版本交接遵循[六阶段协议](../../system/protocols/six-stage-product-workflow.md)；旧项目按冻结流程恢复。

## 输入
读取本阶段视觉方向交接及选定品牌规范；无风格结论时先等待，不生成相互冲突的多套默认。
## 规则
- 色板区分主色、强调色、背景、文字、边框和语义状态；注明每个色值用途与允许组合，避免只有装饰色。
- 检查主要文字和控件的对比度；未验证的组合不得标为可访问性通过。
- 字体给出中文与拉丁字形、可用替代、字号层级、字重与行高；字体不可用时明确替代造成的变化。
- 已有品牌 token 优先复用；新增值需说明缺口，不能把其他品牌规则混进当前上下文。
## 输出
静态色板、排版样张和机器可读 token JSON，与视觉方向共同登记；不改变业务范围与页面结构。
