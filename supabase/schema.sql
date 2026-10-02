-- FPS Personal Database v0.5 — Supabase schema
create table if not exists public.fps_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  share_community boolean not null default false,
  server_updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists fps_records_user_updated_idx on public.fps_records (user_id, updated_at desc);
create index if not exists fps_records_community_idx on public.fps_records (share_community, deleted_at) where share_community is true;

alter table public.fps_records enable row level security;
revoke all on table public.fps_records from anon, authenticated;
grant select, insert, update, delete on table public.fps_records to authenticated;

drop policy if exists fps_records_select_own on public.fps_records;
create policy fps_records_select_own on public.fps_records for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists fps_records_insert_own on public.fps_records;
create policy fps_records_insert_own on public.fps_records for insert to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists fps_records_update_own on public.fps_records;
create policy fps_records_update_own on public.fps_records for update to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists fps_records_delete_own on public.fps_records;
create policy fps_records_delete_own on public.fps_records for delete to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create or replace function public.community_weapon_stats(min_samples integer default 5)
returns table (game text, weapon text, sample_size bigint, kills bigint, deaths bigint, kd numeric)
language sql stable security definer set search_path = ''
as $$
  select
    nullif(r.payload->>'game','') as game,
    nullif(r.payload->>'weapon','') as weapon,
    count(*) as sample_size,
    coalesce(sum((r.payload->>'kills')::bigint),0) as kills,
    coalesce(sum((r.payload->>'deaths')::bigint),0) as deaths,
    round(coalesce(sum((r.payload->>'kills')::numeric),0) / nullif(coalesce(sum((r.payload->>'deaths')::numeric),0),0),2) as kd
  from public.fps_records r
  where r.deleted_at is null and r.share_community is true
    and coalesce(r.payload->>'game','') <> '' and coalesce(r.payload->>'weapon','') <> ''
  group by r.payload->>'game', r.payload->>'weapon'
  having count(*) >= greatest(coalesce(min_samples,5),5)
  order by count(*) desc
  limit 100;
$$;

revoke all on function public.community_weapon_stats(integer) from public;
grant execute on function public.community_weapon_stats(integer) to anon, authenticated;
