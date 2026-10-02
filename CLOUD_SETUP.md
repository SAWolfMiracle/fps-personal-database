# 云同步启用说明（v0.5）

前端已实现本地优先、Supabase 云同步、RLS 用户隔离、删除 tombstone 与可选匿名社区聚合。仓库默认保持云端关闭。

1. 创建 Supabase 项目，获取 Project URL 与 Publishable key（或 legacy anon key）。
2. 在 SQL Editor 执行 `supabase/schema.sql`。
3. 如需“匿名云身份”，在 Auth 中启用 Anonymous Sign-Ins。
4. 邮箱魔法链接需要把 GitHub Pages 网址加入允许的 redirect URL。
5. 编辑根目录 `cloud-config.js`：

```js
window.FPS_CLOUD_CONFIG = {
  enabled: true,
  supabaseUrl: "https://<project-ref>.supabase.co",
  publishableKey: "<publishable-key>"
};
```

不要把 `service_role` 或其他秘密密钥写进前端。

数据边界：
- 未配置或未登录：只写 localStorage。
- 登录后：原始记录进入共享 PostgreSQL，但 RLS 强制只允许当前用户访问自己的行。
- “匿名贡献社区统计”默认关闭。
- 开启后，公共接口只返回至少 5 条样本的聚合结果，不返回 user_id 或单条原始记录。
- 删除用 soft-delete tombstone 同步，降低旧设备把已删记录重新带回的风险。
- 匿名身份无法跨设备找回；多设备同步请使用邮箱魔法链接。
