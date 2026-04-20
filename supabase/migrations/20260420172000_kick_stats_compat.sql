alter table public.players
add column if not exists activo boolean not null default true;

alter table public.matches
add column if not exists votacion_abre timestamptz,
add column if not exists votacion_cierra timestamptz,
add column if not exists notas text;

alter table public.goal_events
add column if not exists minuto integer check (minuto is null or minuto >= 0);

alter table public.contributions
add column if not exists pagado boolean not null default true;

create index if not exists idx_goal_events_player on public.goal_events (player_id);

create or replace function public.is_vote_window_open(target_match_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.matches m
    cross join lateral public.voting_window(m.fecha) vw
    where m.id = target_match_id
      and m.estado = 'jugado'
      and now() >= coalesce(m.votacion_abre, vw.opens_at)
      and now() < coalesce(m.votacion_cierra, vw.closes_at)
  );
$$;

create or replace view public.rankings as
select
  p.id as player_id,
  coalesce(count(mp.id) filter (where mp.presente and m.estado in ('jugado', 'cerrado')), 0)::integer as partidos_jugados,
  coalesce(sum(mp.goles) filter (where mp.presente and m.estado in ('jugado', 'cerrado')), 0)::integer as goles,
  coalesce(sum(mp.asistencias) filter (where mp.presente and m.estado in ('jugado', 'cerrado')), 0)::integer as asistencias,
  coalesce(count(m.id) filter (where m.mvp_player_id = p.id and m.estado in ('jugado', 'cerrado')), 0)::integer as mvp_count,
  coalesce(count(m.id) filter (where m.gol_de_la_fecha_player_id = p.id and m.estado in ('jugado', 'cerrado')), 0)::integer as gol_fecha_count,
  round(avg(mp.calificacion) filter (where mp.presente and mp.calificacion is not null and m.estado in ('jugado', 'cerrado')), 2) as promedio_calificacion,
  (
    coalesce(count(mp.id) filter (where mp.presente and m.estado in ('jugado', 'cerrado')), 0) +
    coalesce(sum(mp.goles * 2) filter (where mp.presente and m.estado in ('jugado', 'cerrado')), 0) +
    coalesce(sum(mp.asistencias) filter (where mp.presente and m.estado in ('jugado', 'cerrado')), 0) +
    coalesce(count(m.id) filter (where m.mvp_player_id = p.id and m.estado in ('jugado', 'cerrado')), 0) * 5 +
    coalesce(count(m.id) filter (where m.gol_de_la_fecha_player_id = p.id and m.estado in ('jugado', 'cerrado')), 0) * 3
  )::integer as puntos
from public.players p
left join public.match_players mp on mp.player_id = p.id
left join public.matches m on m.id = mp.match_id
where p.activo
group by p.id;

create or replace function public.delete_match(target_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede eliminar partidos.';
  end if;

  delete from public.matches where id = target_match_id;
end;
$$;

revoke execute on function public.delete_match(uuid) from public, anon;
grant execute on function public.delete_match(uuid) to authenticated;
