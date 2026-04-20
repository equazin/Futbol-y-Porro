create extension if not exists "pgcrypto";

do $$ begin
  create type public.match_status as enum ('pendiente', 'jugado', 'cerrado');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.team_code as enum ('A', 'B');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.vote_type as enum ('mvp', 'goal');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  nombre text not null check (char_length(trim(nombre)) >= 2),
  apodo text,
  posicion text,
  foto_url text,
  fecha_alta date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  fecha date not null unique,
  equipo_a_score integer not null default 0 check (equipo_a_score >= 0),
  equipo_b_score integer not null default 0 check (equipo_b_score >= 0),
  mvp_player_id uuid references public.players(id) on delete set null,
  gol_de_la_fecha_player_id uuid references public.players(id) on delete set null,
  estado public.match_status not null default 'pendiente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  equipo public.team_code not null,
  goles integer not null default 0 check (goles >= 0),
  asistencias integer not null default 0 check (asistencias >= 0),
  calificacion numeric(3,1) check (calificacion between 1 and 10),
  presente boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, player_id)
);

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  monto integer not null default 1000 check (monto >= 0),
  fecha date not null default current_date,
  created_at timestamptz not null default now(),
  unique (match_id, player_id)
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  voter_player_id uuid not null references public.players(id) on delete cascade,
  voted_player_id uuid not null references public.players(id) on delete cascade,
  type public.vote_type not null,
  created_at timestamptz not null default now(),
  unique (match_id, voter_player_id, type),
  check (voter_player_id <> voted_player_id)
);

create table if not exists public.goal_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  descripcion text not null check (char_length(trim(descripcion)) >= 4),
  video_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.fines (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  match_id uuid references public.matches(id) on delete set null,
  motivo text not null check (char_length(trim(motivo)) >= 3),
  monto integer not null check (monto > 0),
  pagada boolean not null default false,
  fecha date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value)
values
  ('voting_window_hours', '48'::jsonb),
  ('contribution_amount', '1000'::jsonb),
  ('prizes', '{"first":100000,"second":50000,"third_to_fifth":"remera"}'::jsonb)
on conflict (key) do nothing;

create index if not exists idx_matches_fecha on public.matches (fecha desc);
create index if not exists idx_matches_estado on public.matches (estado);
create index if not exists idx_match_players_match on public.match_players (match_id);
create index if not exists idx_match_players_player on public.match_players (player_id);
create index if not exists idx_contributions_match on public.contributions (match_id);
create index if not exists idx_votes_match_type on public.votes (match_id, type);
create index if not exists idx_goal_events_match on public.goal_events (match_id);
create index if not exists idx_fines_player on public.fines (player_id);
create index if not exists idx_fines_match on public.fines (match_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists players_touch_updated_at on public.players;
create trigger players_touch_updated_at
before update on public.players
for each row execute function public.touch_updated_at();

drop trigger if exists matches_touch_updated_at on public.matches;
create trigger matches_touch_updated_at
before update on public.matches
for each row execute function public.touch_updated_at();

drop trigger if exists match_players_touch_updated_at on public.match_players;
create trigger match_players_touch_updated_at
before update on public.match_players
for each row execute function public.touch_updated_at();

create or replace function public.get_setting_int(setting_key text, fallback integer)
returns integer
language sql
stable
as $$
  select coalesce((select (value #>> '{}')::integer from public.app_settings where key = setting_key), fallback);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_admins aa
    where aa.user_id = auth.uid()
  );
$$;

create or replace function public.current_player_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.players p
  where p.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.claim_player(target_player_id uuid)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed public.players;
begin
  if auth.uid() is null then
    raise exception 'Debe iniciar sesion para vincular un jugador.';
  end if;

  if exists (select 1 from public.players where auth_user_id = auth.uid()) then
    raise exception 'Este usuario ya tiene un jugador vinculado.';
  end if;

  update public.players
  set auth_user_id = auth.uid()
  where id = target_player_id
    and auth_user_id is null
  returning * into claimed;

  if claimed.id is null then
    raise exception 'Jugador no disponible para vincular.';
  end if;

  return claimed;
end;
$$;

revoke execute on function public.claim_player(uuid) from public, anon;
grant execute on function public.claim_player(uuid) to authenticated;

create or replace function public.voting_window(match_date date)
returns table (opens_at timestamptz, closes_at timestamptz)
language sql
stable
as $$
  select
    (date_trunc('week', match_date::timestamp) + interval '7 days')::timestamptz as opens_at,
    (
      date_trunc('week', match_date::timestamp) + interval '7 days' +
      make_interval(hours => public.get_setting_int('voting_window_hours', 48))
    )::timestamptz as closes_at;
$$;

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
      and now() >= vw.opens_at
      and now() < vw.closes_at
  );
$$;

create or replace function public.is_match_participant(target_match_id uuid, target_player_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.match_players mp
    where mp.match_id = target_match_id
      and mp.player_id = target_player_id
      and mp.presente
  );
$$;

create or replace function public.validate_vote()
returns trigger
language plpgsql
as $$
begin
  if new.voter_player_id = new.voted_player_id then
    raise exception 'No puede votarse a si mismo.';
  end if;

  if not public.is_vote_window_open(new.match_id) then
    raise exception 'La ventana de votacion no esta abierta.';
  end if;

  if not public.is_match_participant(new.match_id, new.voter_player_id) then
    raise exception 'Solo pueden votar jugadores que participaron.';
  end if;

  if not public.is_match_participant(new.match_id, new.voted_player_id) then
    raise exception 'Solo se puede votar a jugadores que participaron.';
  end if;

  return new;
end;
$$;

drop trigger if exists votes_validate_before_write on public.votes;
create trigger votes_validate_before_write
before insert or update on public.votes
for each row execute function public.validate_vote();

create or replace function public.sync_contribution_from_presence()
returns trigger
language plpgsql
as $$
begin
  if new.presente then
    insert into public.contributions (match_id, player_id, monto, fecha)
    values (
      new.match_id,
      new.player_id,
      public.get_setting_int('contribution_amount', 1000),
      (select fecha from public.matches where id = new.match_id)
    )
    on conflict (match_id, player_id) do update
      set monto = excluded.monto,
          fecha = excluded.fecha;
  else
    delete from public.contributions
    where match_id = new.match_id
      and player_id = new.player_id;
  end if;

  return new;
end;
$$;

drop trigger if exists match_players_sync_contribution on public.match_players;
create trigger match_players_sync_contribution
after insert or update of presente on public.match_players
for each row execute function public.sync_contribution_from_presence();

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
group by p.id;

create or replace view public.fund_summary as
select
  coalesce(sum(monto), 0)::integer as fondo_acumulado,
  coalesce(count(*), 0)::integer as aportes,
  coalesce(count(distinct match_id), 0)::integer as partidos_con_aportes
from public.contributions;

create or replace view public.player_profiles as
select
  p.*,
  r.puntos,
  r.partidos_jugados,
  r.goles,
  r.asistencias,
  r.mvp_count,
  r.gol_fecha_count,
  r.promedio_calificacion
from public.players p
left join public.rankings r on r.player_id = p.id;

create or replace view public.player_advanced_stats as
with ranked_matches as (
  select
    mp.player_id,
    m.fecha,
    mp.goles,
    mp.asistencias,
    mp.calificacion,
    row_number() over (partition by mp.player_id order by m.fecha desc) as rn
  from public.match_players mp
  join public.matches m on m.id = mp.match_id
  where mp.presente and m.estado in ('jugado', 'cerrado')
),
recent as (
  select
    player_id,
    coalesce(sum(goles) filter (where rn <= 3), 0)::integer as goles_ultimos_3,
    coalesce(sum(asistencias) filter (where rn <= 3), 0)::integer as asistencias_ultimos_3,
    round(avg(calificacion) filter (where rn <= 3 and calificacion is not null), 2) as promedio_ultimos_3
  from ranked_matches
  group by player_id
),
latest_break as (
  select
    player_id,
    min(rn) filter (where goles = 0) as first_no_goal_rn
  from ranked_matches
  group by player_id
)
select
  p.id as player_id,
  coalesce(recent.goles_ultimos_3, 0) as goles_ultimos_3,
  coalesce(recent.asistencias_ultimos_3, 0) as asistencias_ultimos_3,
  recent.promedio_ultimos_3,
  coalesce(greatest(coalesce(latest_break.first_no_goal_rn, 4) - 1, 0), 0)::integer as racha_goleadora,
  case
    when coalesce(recent.goles_ultimos_3, 0) >= 3 then 'Jugador en racha'
    when coalesce(recent.asistencias_ultimos_3, 0) >= 3 then 'Socio ideal'
    when coalesce(recent.promedio_ultimos_3, 0) >= 8 then 'Nivel alto'
    else 'Regular'
  end as estado_forma
from public.players p
left join recent on recent.player_id = p.id
left join latest_break on latest_break.player_id = p.id;

create or replace view public.achievements as
select
  gen_random_uuid() as id,
  mp.player_id,
  mp.match_id,
  'hat-trick'::text as type,
  'Hat-trick'::text as titulo,
  'Convirtio 3 o mas goles en un partido.'::text as descripcion,
  m.fecha
from public.match_players mp
join public.matches m on m.id = mp.match_id
where mp.goles >= 3 and mp.presente
union all
select
  gen_random_uuid(),
  m.mvp_player_id,
  m.id,
  'mvp',
  'MVP',
  'Elegido jugador del partido.',
  m.fecha
from public.matches m
where m.mvp_player_id is not null
union all
select
  gen_random_uuid(),
  m.gol_de_la_fecha_player_id,
  m.id,
  'gol-fecha',
  'Gol de la fecha',
  'Ganador de la votacion al mejor gol.',
  m.fecha
from public.matches m
where m.gol_de_la_fecha_player_id is not null;

create or replace view public.elo_ratings as
select
  r.player_id,
  (1000 + (r.puntos * 10) + (r.partidos_jugados * 2))::integer as elo,
  case
    when r.partidos_jugados = 0 then 'Sin ranking'
    when (1000 + (r.puntos * 10) + (r.partidos_jugados * 2)) >= 1400 then 'Elite'
    when (1000 + (r.puntos * 10) + (r.partidos_jugados * 2)) >= 1200 then 'Competitivo'
    else 'En crecimiento'
  end as tier
from public.rankings r;

create or replace view public.player_chemistry as
select
  least(a.player_id, b.player_id) as player_a_id,
  greatest(a.player_id, b.player_id) as player_b_id,
  count(*)::integer as partidos_juntos,
  count(*) filter (
    where
      (a.equipo = 'A' and m.equipo_a_score > m.equipo_b_score)
      or
      (a.equipo = 'B' and m.equipo_b_score > m.equipo_a_score)
  )::integer as victorias_juntos,
  round(
    100.0 * count(*) filter (
      where
        (a.equipo = 'A' and m.equipo_a_score > m.equipo_b_score)
        or
        (a.equipo = 'B' and m.equipo_b_score > m.equipo_a_score)
    ) / nullif(count(*), 0),
    1
  ) as win_rate
from public.match_players a
join public.match_players b
  on b.match_id = a.match_id
  and b.equipo = a.equipo
  and b.player_id <> a.player_id
join public.matches m on m.id = a.match_id
where a.presente and b.presente and m.estado in ('jugado', 'cerrado')
group by least(a.player_id, b.player_id), greatest(a.player_id, b.player_id);

create or replace view public.fund_ledger as
select
  c.id,
  c.match_id,
  c.player_id,
  p.nombre,
  p.apodo,
  c.monto,
  c.fecha,
  'aporte'::text as tipo,
  null::boolean as pagada
from public.contributions c
join public.players p on p.id = c.player_id
union all
select
  f.id,
  f.match_id,
  f.player_id,
  p.nombre,
  p.apodo,
  f.monto,
  f.fecha,
  'multa'::text,
  f.pagada
from public.fines f
join public.players p on p.id = f.player_id;

create or replace function public.close_match_voting(target_match_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  winner_mvp uuid;
  winner_goal uuid;
  updated_match public.matches;
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede cerrar la votacion.';
  end if;

  select v.voted_player_id
  into winner_mvp
  from public.votes v
  join public.match_players mp
    on mp.match_id = v.match_id and mp.player_id = v.voted_player_id
  where v.match_id = target_match_id and v.type = 'mvp'
  group by v.voted_player_id, mp.goles, mp.asistencias, mp.calificacion
  order by count(*) desc, mp.goles desc, mp.asistencias desc, mp.calificacion desc nulls last
  limit 1;

  select v.voted_player_id
  into winner_goal
  from public.votes v
  join public.match_players mp
    on mp.match_id = v.match_id and mp.player_id = v.voted_player_id
  where v.match_id = target_match_id and v.type = 'goal'
  group by v.voted_player_id, mp.goles, mp.asistencias, mp.calificacion
  order by count(*) desc, mp.goles desc, mp.asistencias desc, mp.calificacion desc nulls last
  limit 1;

  update public.matches
  set mvp_player_id = winner_mvp,
      gol_de_la_fecha_player_id = winner_goal,
      estado = 'cerrado'
  where id = target_match_id
  returning * into updated_match;

  if updated_match.id is null then
    raise exception 'Partido no encontrado.';
  end if;

  return updated_match;
end;
$$;

revoke execute on function public.close_match_voting(uuid) from public, anon;
grant execute on function public.close_match_voting(uuid) to authenticated;

create or replace function public.save_match_roster(
  target_match_id uuid,
  roster jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede cargar equipos.';
  end if;

  for item in select * from jsonb_array_elements(roster)
  loop
    insert into public.match_players (
      match_id,
      player_id,
      equipo,
      goles,
      asistencias,
      calificacion,
      presente
    )
    values (
      target_match_id,
      (item ->> 'player_id')::uuid,
      (item ->> 'equipo')::public.team_code,
      coalesce((item ->> 'goles')::integer, 0),
      coalesce((item ->> 'asistencias')::integer, 0),
      nullif(item ->> 'calificacion', '')::numeric,
      coalesce((item ->> 'presente')::boolean, true)
    )
    on conflict (match_id, player_id) do update
      set equipo = excluded.equipo,
          goles = excluded.goles,
          asistencias = excluded.asistencias,
          calificacion = excluded.calificacion,
          presente = excluded.presente;
  end loop;
end;
$$;

revoke execute on function public.save_match_roster(uuid, jsonb) from public, anon;
grant execute on function public.save_match_roster(uuid, jsonb) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('player-media', 'player-media', true, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'])
on conflict (id) do nothing;

alter table public.players enable row level security;
alter table public.app_admins enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.contributions enable row level security;
alter table public.votes enable row level security;
alter table public.goal_events enable row level security;
alter table public.fines enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "admins read admins" on public.app_admins;
create policy "admins read admins" on public.app_admins for select using (public.is_admin());

drop policy if exists "admins manage admins" on public.app_admins;
create policy "admins manage admins" on public.app_admins
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public read players" on public.players;
create policy "public read players" on public.players for select using (true);

drop policy if exists "authenticated manage players" on public.players;
create policy "admins manage players" on public.players
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public read matches" on public.matches;
create policy "public read matches" on public.matches for select using (true);

drop policy if exists "authenticated manage matches" on public.matches;
create policy "admins manage matches" on public.matches
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public read match players" on public.match_players;
create policy "public read match players" on public.match_players for select using (true);

drop policy if exists "authenticated manage match players" on public.match_players;
create policy "admins manage match players" on public.match_players
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public read contributions" on public.contributions;
create policy "public read contributions" on public.contributions for select using (true);

drop policy if exists "authenticated manage contributions" on public.contributions;
create policy "admins manage contributions" on public.contributions
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists "participants read votes" on public.votes;
create policy "participants read votes" on public.votes for select using (true);

drop policy if exists "authenticated vote" on public.votes;
create policy "authenticated vote" on public.votes
for insert with check (
  auth.role() = 'authenticated'
  and exists (
    select 1 from public.players p
    where p.id = voter_player_id
      and p.auth_user_id = auth.uid()
  )
);

drop policy if exists "public read goals" on public.goal_events;
create policy "public read goals" on public.goal_events for select using (true);

drop policy if exists "authenticated manage goals" on public.goal_events;
create policy "admins manage goals" on public.goal_events
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public read fines" on public.fines;
create policy "public read fines" on public.fines for select using (true);

drop policy if exists "admins manage fines" on public.fines;
create policy "admins manage fines" on public.fines
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public read settings" on public.app_settings;
create policy "public read settings" on public.app_settings for select using (true);

drop policy if exists "authenticated manage settings" on public.app_settings;
create policy "admins manage settings" on public.app_settings
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public read player media" on storage.objects;
create policy "public read player media" on storage.objects
for select using (bucket_id = 'player-media');

drop policy if exists "authenticated upload player media" on storage.objects;
create policy "authenticated upload player media" on storage.objects
for insert with check (bucket_id = 'player-media' and auth.role() = 'authenticated');

drop policy if exists "authenticated update player media" on storage.objects;
create policy "authenticated update player media" on storage.objects
for update using (bucket_id = 'player-media' and auth.role() = 'authenticated')
with check (bucket_id = 'player-media' and auth.role() = 'authenticated');
