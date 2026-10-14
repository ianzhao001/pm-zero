# Version Block 契约

需要版本化的 HTML 产物必须以以下注释结尾：

```html
<!-- VERSION: vX.Y.Z -->
<!-- CHANGES: concise change summary -->
<!-- BASED ON: source filename, version, or prompt -->
```

文档产物应通过修订表表达同样信息：

| Date | Version | Changes | Based on |
|---|---|---|---|
| YYYY-MM-DD | vX.Y.Z | concise change summary | source filename, version, or prompt |

规则：

- 修改既有产物时递增版本号。
- 除非用户明确要求，否则不得覆盖用户提供的源产物。
- `BASED ON` 应为文件名、链接标签或版本 id，不得是本地绝对路径。
- version block 属于产物本身，不属于聊天回复。
