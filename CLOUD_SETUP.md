# 云同步状态（v0.5.1）

Supabase 项目已经创建并接入前端。

- Project ref: `annugdqxrauzsbltegrg`
- Region: Tokyo (`ap-northeast-1`)
- 数据表：`public.fps_records`
- RLS：已启用，原始记录只能由当前登录用户读写
- 社区统计：`community_weapon_stats()`，只返回主动贡献的聚合结果，最小样本门槛为 5
- 前端：使用 publishable key；仓库中没有 secret/service_role key
- 本地优先：未登录或离线时继续使用 localStorage
- 删除同步：tombstone 防止旧设备重新带回已删除记录

## 还需在 Supabase Dashboard 完成的 Auth 设置

当前连接器不能修改 Auth Provider 或 Redirect URL，因此这两项需要在 Dashboard 手动打开：

1. Auth → Providers / Sign In Methods → 启用 **Anonymous Sign-Ins**
2. Auth → URL Configuration：
   - Site URL：`https://sawolfmiracle.github.io/fps-personal-database/`
   - Redirect URLs：`https://sawolfmiracle.github.io/fps-personal-database/**`

完成后把 `cloud-config.js` 中：
```js
anonymousAuth: false,
emailMagicLink: false
```
改为：
```js
anonymousAuth: true,
emailMagicLink: true
```

## 已验证的安全边界

- `fps_records` 已启用 RLS，并存在 SELECT / INSERT / UPDATE / DELETE 四条“仅本人”策略。
- `anon` 角色直接读取 `fps_records` 会被 PostgreSQL 拒绝。
- `anon` 角色可调用社区聚合函数，但只会得到聚合结果，不返回 user_id 或原始 payload。
- Publishable key 允许公开出现在浏览器；secret/service_role key 不得进入前端。
