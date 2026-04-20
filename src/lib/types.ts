export type MatchStatus = "pendiente" | "jugado" | "cerrado"
export type TeamCode = "A" | "B"
export type VoteType = "mvp" | "goal"

export type Player = {
  id: string
  auth_user_id: string | null
  nombre: string
  apodo: string | null
  posicion: string | null
  foto_url: string | null
  fecha_alta: string
  activo?: boolean
  created_at?: string
  updated_at?: string
}

export type Ranking = {
  player_id: string
  puntos: number
  partidos_jugados: number
  goles: number
  asistencias: number
  mvp_count: number
  gol_fecha_count: number
  promedio_calificacion: number | null
}

export type PlayerProfile = Player & Ranking

export type Match = {
  id: string
  fecha: string
  equipo_a_score: number
  equipo_b_score: number
  mvp_player_id: string | null
  gol_de_la_fecha_player_id: string | null
  estado: MatchStatus
  votacion_abre?: string | null
  votacion_cierra?: string | null
  notas?: string | null
  created_at?: string
  updated_at?: string
}

export type MatchPlayer = {
  id: string
  match_id: string
  player_id: string
  equipo: TeamCode
  goles: number
  asistencias: number
  calificacion: number | null
  presente: boolean
  players?: Player | null
}

export type GoalEvent = {
  id: string
  match_id: string
  player_id: string
  descripcion: string
  minuto?: number | null
  video_url: string | null
  created_at: string
  players?: Player | null
}

export type Vote = {
  id: string
  match_id: string
  voter_player_id: string
  voted_player_id: string
  type: VoteType
  created_at: string
}

export type FundSummary = {
  fondo_acumulado: number
  aportes: number
  partidos_con_aportes: number
}

export type FundLedgerItem = {
  id: string
  match_id: string | null
  player_id: string
  nombre: string
  apodo: string | null
  monto: number
  fecha: string
  tipo: "aporte" | "multa"
  pagada: boolean | null
}

export type Fine = {
  id: string
  player_id: string
  match_id: string | null
  motivo: string
  monto: number
  pagada: boolean
  fecha: string
  created_at: string
}

export type AppSetting = {
  key: string
  value: unknown
  updated_at: string
}

export type PlayerAdvancedStats = {
  player_id: string
  goles_ultimos_3: number
  asistencias_ultimos_3: number
  promedio_ultimos_3: number | null
  racha_goleadora: number
  estado_forma: string
}

export type Achievement = {
  id: string
  player_id: string
  match_id: string
  type: string
  titulo: string
  descripcion: string
  fecha: string
}

export type EloRating = {
  player_id: string
  elo: number
  tier: string
}

export type Chemistry = {
  player_a_id: string
  player_b_id: string
  partidos_juntos: number
  victorias_juntos: number
  win_rate: number | null
}

export type AdvancedStatsData = {
  players: PlayerProfile[]
  advanced: PlayerAdvancedStats[]
  achievements: Achievement[]
  elo: EloRating[]
  chemistry: Chemistry[]
}

export type MatchWithDetails = Match & {
  match_players: MatchPlayer[]
  goal_events?: GoalEvent[]
  mvp?: Player | null
  gol_de_la_fecha?: Player | null
}

export type VoteWindow = {
  opens_at: string
  closes_at: string
}

export type DashboardData = {
  players: PlayerProfile[]
  rankings: PlayerProfile[]
  matches: MatchWithDetails[]
  fund: FundSummary
  latestMatch: MatchWithDetails | null
  nextMatch: MatchWithDetails | null
  recentMvp: PlayerProfile | null
  goalOfWeek: PlayerProfile | null
}

export type MatchRosterInput = {
  player_id: string
  equipo: TeamCode
  goles: number
  asistencias: number
  calificacion: number | null
  presente: boolean
}

export type MatchFormInput = {
  fecha: string
  equipo_a_score: number
  equipo_b_score: number
  estado: MatchStatus
  notas?: string | null
}

export type MatchResultInput = MatchFormInput & {
  mvp_player_id?: string | null
  gol_de_la_fecha_player_id?: string | null
  votacion_abre?: string | null
  votacion_cierra?: string | null
}

export type PlayerFormInput = {
  nombre: string
  apodo?: string
  posicion?: string
  foto_url?: string
}

export type FineFormInput = {
  player_id: string
  match_id?: string
  motivo: string
  monto: number
  pagada?: boolean
  fecha?: string
}
