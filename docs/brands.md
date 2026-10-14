# 公共品牌与私有覆盖

公共包位于 `brand-packs/dewu/`、`brand-packs/jd/`，仅按所选品牌组合到部署，基础包不加载全部品牌。

```sh
node scripts/release/build.mjs /absolute/deployments/dewu-v1 --brand dewu
node scripts/release/build.mjs /absolute/deployments/jd-v1 --brand jd
```

两包均提供九类产物映射、按阶段拆分的规则和设计 CSS。公共规范保留可复用设计语言，示例使用虚构数据，不依赖原始截图或内部资料。CSS 中的字体名称仅用于回退选择，不提供字体文件。

## 同品牌私有优先

私有源置于仓库外，声明与公共包相同的 id。只需覆盖的规则可以使用部分清单；使用与公共包相同的路径会替换该文件。例如 `rules/visual.md` 覆盖公共视觉正文。不同路径的自然语言冲突不会被自动识别，需显式替换资源引用。

```sh
node scripts/release/build.mjs /absolute/deployments/jd-private-v1 \
  --brand jd --private-pack /absolute/private-packs/jd
```

没有公共默认的新品牌，先用 `node scripts/brand-pack/cli.mjs init /absolute/private-packs/acme --id acme` 创建模板，填写规则，再运行：

```sh
node scripts/release/build.mjs /absolute/deployments/acme-v1 \
  --private-pack /absolute/private-packs/acme
```

公共层先应用，私有层最后应用。同路径文件替换；同产物资源记录及同一 provider 的声明整体替换，未声明部分继承。每部署一个品牌，不允许跨品牌混装。部署锁文件记录层版本、哈希和覆盖来源。

私有包可以提供工作流 Skill 与本地脚本，接口详见[开发规范](private-brand-pack-guide.md)。安装不执行脚本，不安装其依赖；运行时由宿主按任务调用。核心审查、用户确认与证据协议不属于品牌覆盖范围。
