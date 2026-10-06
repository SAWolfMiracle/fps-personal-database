# FPS 个人数据库

[打开网站](https://sawolfmiracle.github.io/fps-personal-database/)

## v0.6.0 收藏簿

在“收藏”页记录任意游戏的收藏品、任务物品、皮肤、武器、装备或自定义分类。

- 物品清单：游戏、名称、分类、目标数量、可选 HTTPS 图片链接、备注。
- 获取日志：每次获取的日期、数量、来源或地图、本次总花费、备注。
- 进度由获取数量累计，自动显示未获得、已获得或已集齐；支持搜索与筛选。
- 物品和获取记录都可删除并在提示期间撤销；共用现有本地优先、账号隔离、云同步及冲突副本机制。
- JSON 备份包含全部对局与收藏；对局 CSV、收藏 CSV 分别导出。旧 JSON 不带 kind 的记录继续作为对局。
- 收藏不参与对局分析或社区统计；社区仍强制至少 5 个不同用户、20 局。

收藏以 `kind: collection` 存入现有 `fps_records.payload`，沿用原有 RLS、修订号与删除标记，无新增公开权限。获取日志随所属物品一起同步；并发修改会保留冲突副本。

## 验证

```sh
node --test tests/collections.test.cjs
```

新数据库可执行 `supabase/schema.sql`；已有数据库执行 `supabase/migrations/*_collection_stats_isolation.sql`，为社区聚合显式排除收藏。
