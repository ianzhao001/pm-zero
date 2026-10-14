# Preflight Core

`preflight-core` 只包含规则注册辅助能力，不包含产品、视觉系统或文档专属规则。

JavaScript API：

- `lineOf(text, index)`
- `matches(text, regexp)`
- `inferMode(html)`
- `RuleRegistry`
- `runChecks(html, file, modeArg, registry)`

Python API：

- `Issue`
- `RuleRegistry`
- `add_issue`
- `exit_code`

## ASCII 接口表

```text
+------------------+-------------------------------+------------------------------+-----------------------------+
| Runtime          | Function/Class                | Inputs                       | Return/Structure            |
+------------------+-------------------------------+------------------------------+-----------------------------+
| engine.mjs       | lineOf                        | text, index                  | 1-based line number         |
| engine.mjs       | matches                       | text, RegExp                 | array of RegExp matches     |
| engine.mjs       | inferMode                     | html                         | flow/demo/unknown           |
| engine.mjs       | RuleRegistry.register         | group, rules[]               | registry                    |
| engine.mjs       | RuleRegistry.rulesFor         | mode                         | ordered rule functions      |
| engine.mjs       | runChecks                     | html, file, modeArg, registry| result object               |
| python_engine.py | Issue                         | check_id, level, location... | dataclass with to_dict()    |
| python_engine.py | RuleRegistry.register         | group, rules                 | registry                    |
| python_engine.py | RuleRegistry.rules_for        | mode                         | ordered rule functions      |
| python_engine.py | add_issue                     | issues, id, level, detail    | appends Issue               |
| python_engine.py | exit_code                     | issues                       | 0/1/2                       |
+------------------+-------------------------------+------------------------------+-----------------------------+
```

规则注册：

```text
JavaScript: new RuleRegistry().register("common", rules).register("demo", rules)
Python:     RuleRegistry().register("common", rules).register("brand", rules)
```

## Parity 契约

Parity 规则在两个 runtime 中必须使用相同 id、severity、触发语义和修复建议。若产物类型只存在于一个 runtime，可以保留单端规则。

当前单端规则组：

- design-only：`C*`、`F*`、`D*`、`V*`
- PRD-only：`P*`
- context design：`B*`
- context PRD：`BR*`

规则位于消费它们的 skill 或 context pack 中。rule id 必须稳定，并按检查面添加前缀：

- `C*`：通用产物检查
- `F*`：flow 检查
- `D*`：demo 检查
- `V*`：版本检查
- `P*`：PRD 检查
- `B*`：context-pack 检查
