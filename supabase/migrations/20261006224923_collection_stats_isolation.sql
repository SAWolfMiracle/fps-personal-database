-- Collection payloads are private inventory, not community match samples.
-- Preserve the 20-match / 5-user hard floor and existing function grants.
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
      and coalesce(r.payload->>'kind','match') = 'match'
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
