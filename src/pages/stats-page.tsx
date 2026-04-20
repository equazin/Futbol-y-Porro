import { Activity, Award, Flame, Handshake, Shield } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/empty-state"
import { PlayerAvatar } from "@/components/player-avatar"
import { CompetitiveRanking } from "@/components/competitive-ranking"
import { useAsyncData } from "@/hooks/use-async-data"
import { getAdvancedStats } from "@/lib/data"
import { playerLabel } from "@/lib/domain"
import { formatAverage } from "@/lib/format"

export function StatsPage() {
  const { data, error, loading } = useAsyncData(getAdvancedStats, [])

  if (loading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-muted" />
  }

  if (error || !data) {
    return <EmptyState title="No se pudieron cargar estadisticas" description={error ?? "Sin datos."} />
  }

  const playerById = new Map(data.players.map((player) => [player.id, player]))
  const topScorer = maxBy(data.players, (player) => player.goles)
  const bestAverage = maxBy(
    data.players.filter((player) => player.promedio_calificacion != null),
    (player) => player.promedio_calificacion ?? 0
  )
  const hotPlayer = maxBy(data.advanced, (stat) => stat.racha_goleadora)
  const hotPlayerProfile = hotPlayer ? playerById.get(hotPlayer.player_id) : undefined

  return (
    <div className="flex flex-col gap-5">
      <section className="scoreboard rounded-2xl border border-foreground p-4 shadow-xl sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
          Central de rendimiento
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-background sm:text-6xl">
          Stats PRO
        </h1>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <HeroMetric label="Goleador" value={topScorer?.apodo ?? topScorer?.nombre ?? "-"} detail={`${topScorer?.goles ?? 0} goles`} />
          <HeroMetric label="Mejor promedio" value={bestAverage?.apodo ?? bestAverage?.nombre ?? "-"} detail={formatAverage(bestAverage?.promedio_calificacion)} />
          <HeroMetric label="En racha" value={hotPlayerProfile?.apodo ?? hotPlayerProfile?.nombre ?? "-"} detail={`${hotPlayer?.racha_goleadora ?? 0} partidos`} />
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-5" />
              Ranking anual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CompetitiveRanking players={[...data.players].sort((a, b) => b.puntos - a.puntos)} compact limit={12} />
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-5" />
              Forma reciente
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {data.advanced.map((stat) => {
              const player = playerById.get(stat.player_id)
              return (
                <div key={stat.player_id} className="grid gap-3 rounded-xl border bg-background/75 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    {player ? <PlayerAvatar player={player} className="size-10" /> : null}
                    <div className="min-w-0">
                      <p className="truncate font-black">{player ? playerLabel(player) : "Jugador"}</p>
                      <p className="text-xs text-muted-foreground">{stat.estado_forma}</p>
                    </div>
                  </div>
                  <div className="text-sm font-bold tabular-nums text-muted-foreground">
                    {stat.goles_ultimos_3}G · {stat.asistencias_ultimos_3}A · racha {stat.racha_goleadora}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Handshake className="size-5" />
              Quimica
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {data.chemistry.slice(0, 10).map((chemistry) => {
              const a = playerById.get(chemistry.player_a_id)
              const b = playerById.get(chemistry.player_b_id)
              return (
                <div key={`${chemistry.player_a_id}-${chemistry.player_b_id}`} className="rounded-xl border bg-background/75 p-3">
                  <p className="font-black">
                    {a ? playerLabel(a) : "Jugador"} + {b ? playerLabel(b) : "Jugador"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {chemistry.partidos_juntos} juntos · {chemistry.victorias_juntos} victorias · {chemistry.win_rate ?? 0}%
                  </p>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="size-5" />
              Logros
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {data.achievements.slice(0, 12).map((achievement) => {
              const player = playerById.get(achievement.player_id)
              return (
                <div key={achievement.id} className="flex items-center gap-3 rounded-xl border bg-background/75 p-3">
                  <Flame className="size-5 text-accent" />
                  <div className="min-w-0">
                    <p className="truncate font-black">{achievement.titulo}</p>
                    <p className="text-sm text-muted-foreground">
                      {player ? playerLabel(player) : "Jugador"} · {achievement.descripcion}
                    </p>
                  </div>
                  <Badge className="ml-auto">PRO</Badge>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function HeroMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl bg-background/10 p-3 text-background">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-background/55">{label}</p>
      <p className="mt-2 truncate text-2xl font-black">{value}</p>
      <p className="text-sm text-background/65">{detail}</p>
    </div>
  )
}

function maxBy<T>(items: T[], score: (item: T) => number) {
  return items.reduce<T | undefined>((best, item) => {
    if (!best || score(item) > score(best)) {
      return item
    }

    return best
  }, undefined)
}
