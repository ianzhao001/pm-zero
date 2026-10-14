# 线框展示模型

只在导出线框图时读取。模型用于纯静态布局，不替代交互 design_model 或 MRD；`screens[].id` 映射现有稳定 `screen_id`。业务文案和价格由项目模型提供，renderer 不内置品牌或业务样例。

```json
{
  "title": "购物助手核心流程",
  "screens": [{
    "id": "SC01", "title": "搭配方案",
    "nav": {"back": true, "title": "搭配方案"},
    "components": [
      {"kind": "intro", "title": "沿用已有物品", "body": "新增预算 ¥300", "caption": "示例商品"},
      {"kind": "product-list", "items": [{"name": "扩展配件", "price": "¥199", "caption": "补充接口", "visual": "box", "selected": true}]}
    ],
    "footer": {"label": "已选 1 件", "total": "¥199", "action": "加入模拟购物车"},
    "note": "正常主流程 · 示例价格"
  }],
  "links": []
}
```

每屏 390px 宽，最小高度 844px，内容多时自然增高。系统状态栏在顶部，导航标题 24px；长导航标题自动增高并推低正文。正文 16px，注释/辅助文案 14px；商品标题不能替代页面导航。内容以页面区域、分隔线和真实控件位置组织，卡片仅用于商品或消息等合理对象。每板最多两屏，不缩小整屏文字。

组件定义：

| kind | 字段与布局 |
| --- | --- |
| `search` | `placeholder`；圆角搜索输入位置 |
| `intro` | `title`、`body`、`caption`；页面说明，无摘要卡外框 |
| `history-strip` | `title`、最多 3 个 `items[{name,visual}]`；横排已购物品缩略图 |
| `product-grid` | `title`、`items[{name,price,caption,visual}]`；双列商品卡 |
| `product-list` | `title`、同上 `items`，`selected` 控制选择框；`quantity:true` 显示移除及数量步进，条目 `quantity` 默认 1 |
| `link-row` | `items` 文案数组；分隔行及箭头位置 |
| `toggles` | `title`、`items[{name,caption,enabled}]`；总开关和单条记录可复用 |
| `comparison` | 恰好 2 个商品 `items`，`rows[{label,values:[左值,右值]}]`；两列属性对齐 |

`visual` 为 `box`、`laptop` 或 `stand`，只是灰度几何缩略图，不表示真实商品图。其他值回落到通用盒形。旧 `blocks` 仍接受 `title/body/items/action` 简单文字，新增移动页面优先采用明确组件。

`footer{label,total,action}` 固定于屏底保留区；`tabs{items,active}` 表示宿主五主 Tab，`active` 为从 0 开始的索引。底部注释在控件区域之外。控件都是 SVG 图形，不执行任何产品行为。

`assistant{title,context,messages:[{role,text}],budgetLabel,budgets,selectedBudget,input,action}` 在底层页面上叠加灰度遮罩和底部浮层；`role:user` 为用户消息，其余为助手。最多 3 个预算快捷项；消息要保持简短，浮层须能容纳输入、快捷预算和明确应用按钮。图示必须区分已生效条件、草稿和提交后示例结果，不能把静态时间切片当作真实响应。

运行 `node skills/wireframe-design/scripts/render-wireframes.mjs <model.json> <new-output-dir>`。输出逐屏 SVG、两屏按原始尺寸排版的 board SVG、flow SVG、静态 `index.html` 及带源模型/renderer/产物 hash 的 `render-manifest.json`。ID 必须安全、唯一且不是 `flow` 或 `board-N`。文字统一转义；输出存在同名文件时拒绝覆盖，改用新版本目录。

用宿主内置 Browser 打开静态 HTML，检查中文可读性、控件位置、折行、重叠和裁切，再导出 PNG 并绑定 manifest hash。renderer 测试不能替代视觉验收。HTML 仅为本地导图中间文件，不作为产品交互或用户主入口。
