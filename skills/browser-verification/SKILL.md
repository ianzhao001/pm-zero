---
name: browser-verification
description: >-
  Independently exercise a delivered Demo in an available browser, bind screenshots and behavior evidence to exact output versions, and report failures without editing the artifact.
---

# 浏览器验证

只执行当前阶段计划分配的能力；新项目加载与版本交接遵循[六阶段协议](../../system/protocols/six-stage-product-workflow.md)；旧项目按冻结流程恢复。

## 输入与身份
接收完整 Demo 输出清单、设计模型、验收标准和制作者身份。独立验证者不兼任该版本的制作者，不修改被测产物。
## 检查
- 使用宿主实际可用的浏览器能力打开真实输出；本地预览优先使用宿主内置浏览器。
- 逐步操作核心路径；只有用户明确纳入范围的空态与异常才执行对应测试，旧项目按原已确认范围，核对路由、状态、返回/取消和模拟边界；对照视觉基线检查溢出、裁切与关键元素。
- 截图和行为记录指向准确文件版本/hash；没有实际点击的路径不得报告通过。
- 工具缺失、页面无法运行或证据不完整时写 pending/fail 与原因，不能凭 HTML 阅读代替交互验收。
## 输出
按 [ValidationReport 契约](../../system/workflow-core/contracts/validation-report.schema.json) 生成 JSON 验证记录，绑定完整输出清单/hash、模型与修改基线；逐项记录真实结果，缺失检查写 skipped，不凭 renderer 自报通过。报告作为 independent-verification 文件登记，截图和操作记录写入检查详情。局部修改另检查目标与保留对象的实际视觉、交互影响。报告文件自身不纳入 subject.outputs，避免循环哈希。交给审查者与用户，不替用户确认。
