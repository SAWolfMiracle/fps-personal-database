-- FPS Personal Database v0.5 cloud schema
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

create index if not exists fps_records_user_updated_idx
  on public.fps_records (user_id, updated_at desc);

create index if not exists fps_records_community_idx
  on public.fps_records (share_community, deleted_at)
  where share_community is true;

alter table public.fps_records enable row level security;

revoke all on table public.fps_records from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.fps_records to authenticated;

drop policy if exists fps_records_select_own on public.fps_records;
create policy fps_records_select_own
on public.fps_records
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists fps_records_insert_own on public.fps_records;
create policy fps_records_insert_own
on public.fps_records
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists fps_records_update_own on public.fps_records;
create policy fps_records_update_own
on public.fps_records
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists fps_records_delete_own on public.fps_records;
create policy fps_records_delete_own
on public.fps_records
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create or replace function public.community_weapon_stats(min_samples integer default 5)
returns table (
  game text,
  weapon text,
  sample_size bigint,
  kills bigint,
  deaths bigint,
  kd numeric
)
language sql
stable
security definer
set search_path = ''
as $function$
  with clean as (
    select
      nullif(r.payload->>'game','') as game,
      nullif(r.payload->>'weapon','') as weapon,
      case when coalesce(r.payload->>'kills','') ~ '^[0-9]+$'
        then (r.payload->>'kills')::bigint else 0 end as kills,
      case when coalesce(r.payload->>'deaths','') ~ '^[0-9]+$'
        then (r.payload->>'deaths')::bigint else 0 end as deaths
    from public.fps_records r
    where r.deleted_at is null and r.share_community is true
  )
  select
    c.game,
    c.weapon,
    count(*)::bigint as sample_size,
    coalesce(sum(c.kills),0)::bigint as kills,
    coalesce(sum(c.deaths),0)::bigint as deaths,
    round(
      coalesce(sum(c.kills),0)::numeric
      / nullif(coalesce(sum(c.deaths),0)::numeric,0),
      2
    ) as kd
  from clean c
  where c.game is not null and c.weapon is not null
  group by c.game, c.weapon
  having count(*) >= greatest(coalesce(min_samples,5),5)
  order by count(*) desc, c.game, c.weapon
  limit 100;
$function$;

revoke all on function public.community_weapon_stats(integer) from public;
grant execute on function public.community_weapon_stats(integer) to anon, authenticated;
