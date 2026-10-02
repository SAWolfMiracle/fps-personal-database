# 云同步状态（v0.5.2）

当前已完成：
- Tokyo Supabase + RLS。
- guest 与每个 user_id 的本地 workspace 分离。
- guest 数据只在用户明确点击“合并到当前账号”时复制；guest 副本保留。
- 草稿按 workspace 独立保存。
- “复制上一局”用于快速复用游戏 / 模式 / 地图 / 角色 / 装备配置。
- 服务端维护 revision 与 server_updated_at；客户端使用 base revision 写入，不再用设备时钟决定谁覆盖谁。
- 并发冲突不静默覆盖，会保留“同步冲突”副本。
- 删除会等 5 秒撤销窗口结束后再自动同步。
- 社区统计要求至少 5 位不同贡献者且累计 20 局。
- Supabase JS 固定到 2.117.2，不再跟随浮动 @2。

## Auth 尚需手动配置

在 Supabase Dashboard：
1. Authentication → Providers / Sign In Methods → 开启 Anonymous Sign-Ins。
2. 开启 Manual Linking（匿名身份绑定邮箱需要）。
3. Authentication → URL Configuration：
   - Site URL: https://sawolfmiracle.github.io/fps-personal-database/
   - Redirect URLs: https://sawolfmiracle.github.io/fps-personal-database/**

完成后，在 cloud-config.js 加上并设为 true：
- anonymousAuth
- emailMagicLink
- manualLinking

## 安全边界

- 原始 fps_records 行仍由 RLS 按 auth.uid() 隔离。
- anon 角色不能直接 SELECT fps_records。
- community_weapon_stats 是有意公开的 SECURITY DEFINER 聚合入口，只读取显式 share_community=true 的记录，并强制 5 人 / 20 局最低门槛。
- 前端只能放 publishable key；不能放 secret/service_role。
