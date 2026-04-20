import type {
  AdvancedStatsData,
  AppSetting,
  DashboardData,
  Fine,
  FineFormInput,
  FundLedgerItem,
  FundSummary,
  GoalEvent,
  MatchFormInput,
  MatchResultInput,
  MatchRosterInput,
  MatchWithDetails,
  Player,
  PlayerFormInput,
  PlayerProfile,
  Vote,
  VoteType,
  VoteWindow,
} from "@/lib/types"
import { requireSupabase, supabase } from "@/lib/supabase"

type SupabaseResult<T> = {
  data: T | null
  error: { message: string } | null
}

function unwrap<T>({ data, error }: SupabaseResult<T>) {
  if (error) {
    throw new Error(error.message)
  }

  return data as T
}

const playerColumns =
  "id, auth_user_id, nombre, apodo, posicion, foto_url, fecha_alta, activo, created_at, updated_at"

const matchDetailSelect = `
  id,
  fecha,
  equipo_a_score,
  equipo_b_score,
  mvp_player_id,
  gol_de_la_fecha_player_id,
  estado,
  votacion_abre,
  votacion_cierra,
  notas,
  created_at,
  updated_at,
  mvp:players!matches_mvp_player_id_fkey(${playerColumns}),
  gol_de_la_fecha:players!matches_gol_de_la_fecha_player_id_fkey(${playerColumns}),
  match_players(
    id,
    match_id,
    player_id,
    equipo,
    goles,
    asistencias,
    calificacion,
    presente,
    players(${playerColumns})
  ),
  goal_events(
    id,
    match_id,
    player_id,
    descripcion,
    video_url,
    created_at,
    players(${playerColumns})
  )
`

export async function getPlayers() {
  const client = requireSupabase()
  const result = await client
    .from("player_profiles")
    .select("*")
    .order("nombre", { ascending: true })

  return unwrap<PlayerProfile[]>(result as SupabaseResult<PlayerProfile[]>)
}

export async function getMatches() {
  const client = requireSupabase()
  const result = await client
    .from("matches")
    .select(matchDetailSelect)
    .order("fecha", { ascending: false })

  return unwrap<MatchWithDetails[]>(result as SupabaseResult<MatchWithDetails[]>)
}

export async function getMatch(matchId: string) {
  const client = requireSupabase()
  const result = await client
    .from("matches")
    .select(matchDetailSelect)
    .eq("id", matchId)
    .single()

  return unwrap<MatchWithDetails>(result as SupabaseResult<MatchWithDetails>)
}

export async function getDashboardData(): Promise<DashboardData> {
  const [players, matches, fund] = await Promise.all([
    getPlayers(),
    getMatches(),
    getFundSummary(),
  ])

  const rankings = [...players].sort((a, b) => b.puntos - a.puntos)
  const latestMatch =
    matches.find((match) => match.estado === "jugado" || match.estado === "cerrado") ??
    null
  const nextMatch =
    [...matches]
      .reverse()
      .find((match) => match.estado === "pendiente" && match.fecha >= today()) ?? null
  const recentMvp = latestMatch?.mvp_player_id
    ? players.find((player) => player.id === latestMatch.mvp_player_id) ?? null
    : null
  const goalOfWeek = latestMatch?.gol_de_la_fecha_player_id
    ? players.find((player) => player.id === latestMatch.gol_de_la_fecha_player_id) ?? null
    : null

  return {
    players,
    rankings,
    matches,
    fund,
    latestMatch,
    nextMatch,
    recentMvp,
    goalOfWeek,
  }
}

export async function isCurrentUserAdmin() {
  if (!supabase) {
    return false
  }

  const result = await supabase.rpc("is_admin")
  return Boolean(unwrap<boolean>(result as SupabaseResult<boolean>))
}

export async function claimPlayer(playerId: string) {
  const client = requireSupabase()
  const result = await client.rpc("claim_player", {
    target_player_id: playerId,
  })

  return unwrap<Player>(result as SupabaseResult<Player>)
}

export async function getFundSummary() {
  const client = requireSupabase()
  const result = await client.from("fund_summary").select("*").maybeSingle()
  const fund = unwrap<FundSummary | null>(result as SupabaseResult<FundSummary | null>)

  return fund ?? {
    fondo_acumulado: 0,
    aportes: 0,
    partidos_con_aportes: 0,
  }
}

export async function getFundLedger() {
  const client = requireSupabase()
  const result = await client
    .from("fund_ledger")
    .select("*")
    .order("fecha", { ascending: false })

  return unwrap<FundLedgerItem[]>(result as SupabaseResult<FundLedgerItem[]>)
}

export async function createFine(input: FineFormInput) {
  const client = requireSupabase()
  const result = await client
    .from("fines")
    .insert({
      player_id: input.player_id,
      match_id: cleanOptional(input.match_id),
      motivo: input.motivo.trim(),
      monto: input.monto,
      pagada: input.pagada ?? false,
      fecha: input.fecha || new Date().toISOString().slice(0, 10),
    })
    .select("*")
    .single()

  return unwrap<Fine>(result as SupabaseResult<Fine>)
}

export async function updateFinePaid(fineId: string, pagada: boolean) {
  const client = requireSupabase()
  const result = await client
    .from("fines")
    .update({ pagada })
    .eq("id", fineId)
    .select("*")
    .single()

  return unwrap<Fine>(result as SupabaseResult<Fine>)
}

export async function getSettings() {
  const client = requireSupabase()
  const result = await client.from("app_settings").select("*").order("key")

  return unwrap<AppSetting[]>(result as SupabaseResult<AppSetting[]>)
}

export async function updateSetting(key: string, value: unknown) {
  const client = requireSupabase()
  const result = await client
    .from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() })
    .select("*")
    .single()

  return unwrap<AppSetting>(result as SupabaseResult<AppSetting>)
}

export async function getAdvancedStats(): Promise<AdvancedStatsData> {
  const client = requireSupabase()
  const [players, advanced, achievements, elo, chemistry] = await Promise.all([
    getPlayers(),
    client.from("player_advanced_stats").select("*"),
    client.from("achievements").select("*").order("fecha", { ascending: false }),
    client.from("elo_ratings").select("*").order("elo", { ascending: false }),
    client.from("player_chemistry").select("*").order("partidos_juntos", { ascending: false }),
  ])

  return {
    players,
    advanced: unwrap(advanced as SupabaseResult<AdvancedStatsData["advanced"]>),
    achievements: unwrap(achievements as SupabaseResult<AdvancedStatsData["achievements"]>),
    elo: unwrap(elo as SupabaseResult<AdvancedStatsData["elo"]>),
    chemistry: unwrap(chemistry as SupabaseResult<AdvancedStatsData["chemistry"]>),
  }
}

export async function getPlayerProfile(playerId: string) {
  const client = requireSupabase()
  const [profileResult, historyResult] = await Promise.all([
    client.from("player_profiles").select("*").eq("id", playerId).single(),
    client
      .from("match_players")
      .select(
        `
        id,
        match_id,
        player_id,
        equipo,
        goles,
        asistencias,
        calificacion,
        presente,
        matches(
          id,
          fecha,
          equipo_a_score,
          equipo_b_score,
          estado,
          mvp_player_id,
          gol_de_la_fecha_player_id
        )
      `
      )
      .eq("player_id", playerId)
      .order("created_at", { ascending: false }),
  ])

  return {
    profile: unwrap<PlayerProfile>(profileResult as SupabaseResult<PlayerProfile>),
    history: unwrap<Record<string, unknown>[]>(
      historyResult as SupabaseResult<Record<string, unknown>[]>
    ),
  }
}

export async function createPlayer(input: PlayerFormInput) {
  const client = requireSupabase()
  const result = await client
    .from("players")
    .insert({
      nombre: input.nombre.trim(),
      apodo: cleanOptional(input.apodo),
      posicion: cleanOptional(input.posicion),
      foto_url: cleanOptional(input.foto_url),
    })
    .select("*")
    .single()

  return unwrap<Player>(result as SupabaseResult<Player>)
}

export async function updatePlayer(playerId: string, input: PlayerFormInput) {
  const client = requireSupabase()
  const result = await client
    .from("players")
    .update({
      nombre: input.nombre.trim(),
      apodo: cleanOptional(input.apodo),
      posicion: cleanOptional(input.posicion),
      foto_url: cleanOptional(input.foto_url),
    })
    .eq("id", playerId)
    .select("*")
    .single()

  return unwrap<Player>(result as SupabaseResult<Player>)
}

export async function uploadPlayerMedia(file: File, folder: "players" | "goals") {
  const client = requireSupabase()
  const extension = file.name.split(".").pop() ?? "bin"
  const path = `${folder}/${crypto.randomUUID()}.${extension}`
  const upload = await client.storage.from("player-media").upload(path, file, {
    upsert: false,
    cacheControl: "31536000",
  })

  unwrap(upload as SupabaseResult<{ path: string }>)

  const { data } = client.storage.from("player-media").getPublicUrl(path)
  return data.publicUrl
}

export async function createMatch(input: MatchFormInput) {
  const client = requireSupabase()
  const result = await client
    .from("matches")
    .insert(input)
    .select("*")
    .single()

  return unwrap<MatchWithDetails>(result as SupabaseResult<MatchWithDetails>)
}

export async function updateMatch(matchId: string, input: MatchFormInput) {
  const client = requireSupabase()
  const result = await client
    .from("matches")
    .update(input)
    .eq("id", matchId)
    .select("*")
    .single()

  return unwrap<MatchWithDetails>(result as SupabaseResult<MatchWithDetails>)
}

export async function updateMatchResult(matchId: string, input: MatchResultInput) {
  const client = requireSupabase()
  const result = await client
    .from("matches")
    .update(input)
    .eq("id", matchId)
    .select("*")
    .single()

  return unwrap<MatchWithDetails>(result as SupabaseResult<MatchWithDetails>)
}

export async function deleteMatch(matchId: string) {
  const client = requireSupabase()
  const result = await client.rpc("delete_match", {
    target_match_id: matchId,
  })

  unwrap<null>(result as SupabaseResult<null>)
}

export async function saveMatchRoster(matchId: string, roster: MatchRosterInput[]) {
  const client = requireSupabase()
  const result = await client.rpc("save_match_roster", {
    target_match_id: matchId,
    roster,
  })

  unwrap<null>(result as SupabaseResult<null>)
}

export async function createGoalEvent(input: {
  match_id: string
  player_id: string
  descripcion: string
  minuto?: number | null
  video_url?: string
}) {
  const client = requireSupabase()
  const result = await client
    .from("goal_events")
    .insert({
      match_id: input.match_id,
      player_id: input.player_id,
      descripcion: input.descripcion.trim(),
      minuto: input.minuto ?? null,
      video_url: cleanOptional(input.video_url),
    })
    .select("*")
    .single()

  return unwrap<GoalEvent>(result as SupabaseResult<GoalEvent>)
}

export async function getVotingMatches() {
  const matches = await getMatches()

  return matches.filter((match) => match.estado === "jugado")
}

export async function getVoteWindow(matchId: string) {
  const client = requireSupabase()
  const result = await client.rpc("voting_window", {
    match_date: await getMatchDate(matchId),
  })

  const rows = unwrap<VoteWindow[]>(result as SupabaseResult<VoteWindow[]>)
  return rows[0] ?? null
}

export async function getVotesForPlayer(matchId: string, voterPlayerId: string) {
  const client = requireSupabase()
  const result = await client
    .from("votes")
    .select("*")
    .eq("match_id", matchId)
    .eq("voter_player_id", voterPlayerId)

  return unwrap<Vote[]>(result as SupabaseResult<Vote[]>)
}

export async function castVote(input: {
  match_id: string
  voter_player_id: string
  voted_player_id: string
  type: VoteType
}) {
  const client = requireSupabase()
  const result = await client.from("votes").insert(input).select("*").single()

  return unwrap<Vote>(result as SupabaseResult<Vote>)
}

export async function closeVoting(matchId: string) {
  const client = requireSupabase()
  const result = await client.rpc("close_match_voting", {
    target_match_id: matchId,
  })

  return unwrap<MatchWithDetails>(result as SupabaseResult<MatchWithDetails>)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

async function getMatchDate(matchId: string) {
  const client = requireSupabase()
  const result = await client
    .from("matches")
    .select("fecha")
    .eq("id", matchId)
    .single()
  const row = unwrap<{ fecha: string }>(result as SupabaseResult<{ fecha: string }>)

  return row.fecha
}

function cleanOptional(value?: string) {
  const trimmed = value?.trim()

  return trimmed ? trimmed : null
}
