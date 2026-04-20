import { Link } from "react-router-dom"
import { CalendarDays, ChevronRight, CircleDollarSign, Medal, Trophy, Vote } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CompetitiveRanking } from "@/components/competitive-ranking"
import { EmptyState } from "@/components/empty-state"
import { MatchCard } from "@/components/match-card"
import { PlayerAvatar } from "@/components/player-avatar"
import { useAuth } from "@/components/auth-provider"
import { useAsyncData } from "@/hooks/use-async-data"
import { POINTS } from "@/lib/domain"
import { formatDate, formatMoney, formatShortDate } from "@/lib/format"
import { getDashboardData } from "@/lib/data"
import { getCurrentPlayer, getJornadaState } from "@/lib/jornada"
import type { MatchWithDetails, PlayerProfile } from "@/lib/types"

export function DashboardPage() {
  const { user } = useAuth()
  const { data, error, loading } = useAsyncData(getDashboardData, [])

  if (loading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>No se pudo cargar Supabase</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!data) {
    return null
  }

  const jornada = getJornadaState(data)
  const currentPlayer = getCurrentPlayer(data.players, user?.id)
  const topPlayers = data.rankings.slice(0, 3)
  const presentPlayers =
    jornada.match?.match_players
      .filter((item) => item.presente && item.players)
      .map((item) => item.players as PlayerProfile) ?? []

  return (
    <div className="flex flex-col gap-5">
      <section className="scoreboard overflow-hidden rounded-2xl border border-foreground p-4 shadow-xl sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div className="animate-rise-in">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge className="bg-accent text-accent-foreground hover:bg-accent">
                {jornada.label}
              </Badge>
              {jornada.match ? (
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-background/60">
                  {formatShortDate(jornada.match.fecha)}
                </span>
              ) : null}
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-none tracking-tight text-pretty sm:text-6xl">
              Mi Domingo
            </h1>
            <p className="mt-3 max-w-xl text-sm text-background/70 sm:text-base">
              {jornada.title}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild variant="secondary" size="lg">
                <Link to={jornada.actionHref}>
                  {jornada.actionLabel}
                  <ChevronRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-background/25 bg-background/10 text-background hover:bg-background/20 hover:text-background">
                <Link to="/publico">Ver tabla</Link>
              </Button>
            </div>
          </div>

          <JornadaScoreboard match={jornada.match} topPlayers={topPlayers} />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Signal
          icon={Trophy}
          label="Tu estado"
          value={currentPlayer ? currentPlayer.apodo ?? currentPlayer.nombre : "Sin vincular"}
          detail={currentPlayer ? `${currentPlayer.puntos} pts en tabla` : "Inicia sesion y vincula jugador"}
        />
        <Signal
          icon={CalendarDays}
          label="Jornada"
          value={jornada.match ? formatDate(jornada.match.fecha) : "Sin fecha"}
          detail={jornada.match ? `${presentPlayers.length} presentes` : "Crea el primer partido"}
        />
        <Signal
          icon={CircleDollarSign}
          label="Caja"
          value={formatMoney(data.fund.fondo_acumulado)}
          detail={`${data.fund.aportes} aportes registrados`}
        />
        <Signal
          icon={Vote}
          label="Regla MVP"
          value={`+${POINTS.mvp}`}
          detail="bonus al cerrar votacion"
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col gap-5">
          <SectionHeader eyebrow="Accion pendiente" title="Lo proximo que importa" />
          <ActionPanel
            currentPlayer={currentPlayer}
            match={jornada.match}
            actionHref={jornada.actionHref}
            actionLabel={jornada.actionLabel}
          />
          {jornada.match ? (
            <MatchCard match={jornada.match} />
          ) : (
            <EmptyState title="No hay domingo activo" description="Crea una jornada pendiente para que el grupo tenga una referencia semanal." />
          )}
        </div>

        <div className="flex flex-col gap-5">
          <SectionHeader eyebrow="Tabla anual" title="Top competitivo" />
          <CompetitiveRanking players={data.rankings} limit={10} />
        </div>
      </section>
    </div>
  )
}

function JornadaScoreboard({
  match,
  topPlayers,
}: {
  match: MatchWithDetails | null
  topPlayers: PlayerProfile[]
}) {
  if (match) {
    return (
      <div className="rounded-2xl bg-background/10 p-4 text-background">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-background/55">
          Marcador
        </p>
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
          <TeamCount label="Equipo A" count={match.match_players.filter((item) => item.presente && item.equipo === "A").length} />
          <div>
            <p className="text-5xl font-black tracking-tight tabular-nums">
              {match.equipo_a_score}-{match.equipo_b_score}
            </p>
            <p className="text-xs text-background/50">{match.estado}</p>
          </div>
          <TeamCount label="Equipo B" count={match.match_players.filter((item) => item.presente && item.equipo === "B").length} />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-background/10 p-4 text-background">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-background/55">
        Top 3
      </p>
      <div className="mt-4 flex flex-col gap-3">
        {topPlayers.length ? (
          topPlayers.map((player, index) => (
            <div key={player.id} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-sm font-black">{index + 1}</span>
                <PlayerAvatar player={player} className="size-9 border border-background/20" />
                <span className="truncate font-bold">{player.apodo ?? player.nombre}</span>
              </div>
              <span className="font-black tabular-nums">{player.puntos}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-background/65">La tabla se activa con el primer resultado.</p>
        )}
      </div>
    </div>
  )
}

function TeamCount({ label, count }: { label: string; count: number }) {
  return (
    <div className="min-w-0 rounded-xl bg-background/10 p-3">
      <p className="text-xs text-background/55">{label}</p>
      <p className="text-3xl font-black tabular-nums">{count}</p>
    </div>
  )
}

function Signal({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Trophy
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <Icon className="mb-4 size-5 text-primary" />
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-2xl font-black">{value}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

function ActionPanel({
  currentPlayer,
  match,
  actionHref,
  actionLabel,
}: {
  currentPlayer: PlayerProfile | null
  match: MatchWithDetails | null
  actionHref: string
  actionLabel: string
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Pendiente
          </p>
          <h2 className="mt-1 text-2xl font-black">
            {currentPlayer ? "Juga tu parte" : "Vincula tu jugador"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {currentPlayer
              ? "La app prioriza tu proximo paso en la jornada."
              : "Entra con magic link y reclama tu perfil para votar sin elegirte manualmente."}
          </p>
        </div>
        <Medal className="size-6 text-accent" />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <MiniStep active label="1" value={match ? "Jornada lista" : "Crear fecha"} />
        <MiniStep active={Boolean(match?.estado !== "pendiente")} label="2" value="Resultado" />
        <MiniStep active={Boolean(match?.mvp_player_id)} label="3" value="Premios" />
      </div>
      <Button asChild className="mt-4 w-full" size="lg">
        <Link to={actionHref}>{actionLabel}</Link>
      </Button>
    </div>
  )
}

function MiniStep({ active, label, value }: { active: boolean; label: string; value: string }) {
  return (
    <div className={active ? "rounded-xl bg-secondary p-3" : "rounded-xl bg-muted p-3 text-muted-foreground"}>
      <p className="text-xs font-black">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  )
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      <h2 className="text-2xl font-black tracking-tight">{title}</h2>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-72 animate-pulse rounded-2xl bg-muted" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-28 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  )
}
