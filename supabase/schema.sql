-- FPS Personal Database v0.5.2 schema

create table if not exists public.fps_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  share_community boolean not null default false,
  server_updated_at timestamptz not null default now(),
  revision bigint not null default 1,
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

create or replace function public.fps_records_stamp_server_meta()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.server_updated_at := clock_timestamp();
  new.updated_at := new.server_updated_at;
  if tg_op = 'INSERT' then
    new.revision := 1;
  else
    new.revision := old.revision + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists fps_records_stamp_server_meta on public.fps_records;
create trigger fps_records_stamp_server_meta
before insert or update on public.fps_records
for each row execute function public.fps_records_stamp_server_meta();

create or replace function public.sync_fps_record(
  p_id text,
  p_payload jsonb,
  p_share_community boolean default false,
  p_base_revision bigint default 0,
  p_deleted boolean default false
)
returns table (
  applied boolean,
  current_revision bigint,
  current_server_updated_at timestamptz,
  current_deleted_at timestamptz,
  current_payload jsonb,
  current_share_community boolean
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.fps_records%rowtype;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  if coalesce(p_base_revision, 0) <= 0 then
    insert into public.fps_records (
      user_id, id, payload, deleted_at, share_community
    )
    values (
      v_uid,
      p_id,
      coalesce(p_payload, '{}'::jsonb),
      case when p_deleted then clock_timestamp() else null end,
      coalesce(p_share_community, false)
    )
    on conflict (user_id, id) do nothing
    returning * into v_row;

    if found then
      return query
      select true, v_row.revision, v_row.server_updated_at, v_row.deleted_at, v_row.payload, v_row.share_community;
      return;
    end if;
  else
    update public.fps_records
       set payload = coalesce(p_payload, '{}'::jsonb),
           deleted_at = case when p_deleted then clock_timestamp() else null end,
           share_community = coalesce(p_share_community, false)
     where user_id = v_uid
       and id = p_id
       and revision = p_base_revision
    returning * into v_row;

    if found then
      return query
      select true, v_row.revision, v_row.server_updated_at, v_row.deleted_at, v_row.payload, v_row.share_community;
      return;
    end if;
  end if;

  select *
    into v_row
    from public.fps_records
   where user_id = v_uid
     and id = p_id;

  if found then
    return query
    select false, v_row.revision, v_row.server_updated_at, v_row.deleted_at, v_row.payload, v_row.share_community;
  else
    return query
    select false, 0::bigint, null::timestamptz, null::timestamptz, '{}'::jsonb, false;
  end if;
end;
$$;

revoke all on function public.sync_fps_record(text,jsonb,boolean,bigint,boolean) from public;
grant execute on function public.sync_fps_record(text,jsonb,boolean,bigint,boolean) to authenticated;

drop function if exists public.community_weapon_stats(integer);

create or replace function public.community_weapon_stats(
  min_samples integer default 20,
  min_contributors integer default 5
)
returns table (
  game text,
  weapon text,
  contributor_count bigint,
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
      r.user_id,
      nullif(r.payload->>'game','') as game,
      nullif(r.payload->>'weapon','') as weapon,
      case
        when coalesce(r.payload->>'kills','') ~ '^[0-9]+$'
          then (r.payload->>'kills')::bigint
        else 0
      end as kills,
      case
        when coalesce(r.payload->>'deaths','') ~ '^[0-9]+$'
          then (r.payload->>'deaths')::bigint
        else 0
      end as deaths
    from public.fps_records r
    where r.deleted_at is null
      and r.share_community is true
  )
  select
    c.game,
    c.weapon,
    count(distinct c.user_id)::bigint as contributor_count,
    count(*)::bigint as sample_size,
    coalesce(sum(c.kills),0)::bigint as kills,
    coalesce(sum(c.deaths),0)::bigint as deaths,
    round(
      coalesce(sum(c.kills),0)::numeric
      / nullif(coalesce(sum(c.deaths),0)::numeric,0),
      2
    ) as kd
  from clean c
  where c.game is not null
    and c.weapon is not null
  group by c.game, c.weapon
  having count(*) >= greatest(coalesce(min_samples,20),20)
     and count(distinct c.user_id) >= greatest(coalesce(min_contributors,5),5)
  order by count(*) desc, c.game, c.weapon
  limit 100;
$function$;

revoke all on function public.community_weapon_stats(integer,integer) from public;
grant execute on function public.community_weapon_stats(integer,integer) to anon, authenticated;
