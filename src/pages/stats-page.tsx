import { Activity, Award, Flame, Handshake, Shield } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/empty-state"
import { PlayerAvatar } from "@/components/player-avatar"
import { StatCard } from "@/components/stat-card"
import { useAsyncData } from "@/hooks/use-async-data"
import { getAdvancedStats } from "@/lib/data"
import { playerLabel } from "@/lib/domain"
import { formatAverage } from "@/lib/format"

export function StatsPage() {
  const { data, error, loading } = useAsyncData(getAdvancedStats, [])

  if (loading) {
    return <div className="h-96 animate-pulse rounded-3xl bg-muted" />
  }

  if (error || !data) {
    return <EmptyState title="No se pudieron cargar estadísticas" description={error ?? "Sin datos."} />
  }

  const playerById = new Map(data.players.map((player) => [player.id, player]))
  const topScorer = [...data.players].sort((a, b) => b.goles - a.goles)[0]
  const bestAverage = [...data.players]
    .filter((player) => player.promedio_calificacion != null)
    .sort((a, b) => (b.promedio_calificacion ?? 0) - (a.promedio_calificacion ?? 0))[0]
  const hotPlayer = [...data.advanced].sort((a, b) => b.racha_goleadora - a.racha_goleadora)[0]
  const hotPlayerProfile = hotPlayer ? playerById.get(hotPlayer.player_id) : undefined

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Stats PRO</p>
        <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Rendimiento avanzado</h1>
        <p className="text-muted-foreground">Goleadores, promedio, rachas, ELO, química y logros.</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard title="Goleador" value={topScorer?.apodo ?? topScorer?.nombre ?? "-"} detail={`${topScorer?.goles ?? 0} goles`} />
        <StatCard title="Mejor promedio" value={bestAverage?.apodo ?? bestAverage?.nombre ?? "-"} detail={formatAverage(bestAverage?.promedio_calificacion)} />
        <StatCard title="Jugador en racha" value={hotPlayerProfile?.apodo ?? hotPlayerProfile?.nombre ?? "-"} detail={`${hotPlayer?.racha_goleadora ?? 0} partidos marcando`} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card/86">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield />
              Ranking ELO
            </CardTitle>
            <CardDescription>Lectura competitiva calculada desde puntos y actividad.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {data.elo.slice(0, 10).map((rating, index) => {
              const player = playerById.get(rating.player_id)
              return (
                <div key={rating.player_id} className="flex items-center justify-between rounded-2xl border bg-background/70 p-3">
                  <div className="flex items-center gap-3">
                    <span className="font-black">{index + 1}</span>
                    {player ? <PlayerAvatar player={player} className="size-10" /> : null}
                    <div>
                      <p className="font-bold">{player ? playerLabel(player) : "Jugador"}</p>
                      <p className="text-xs text-muted-foreground">{rating.tier}</p>
                    </div>
                  </div>
                  <Badge>{rating.elo}</Badge>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card className="bg-card/86">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity />
              Estado de forma
            </CardTitle>
            <CardDescription>Últimos tres partidos y racha goleadora.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {data.advanced.map((stat) => {
              const player = playerById.get(stat.player_id)
              return (
                <div key={stat.player_id} className="grid gap-3 rounded-2xl border bg-background/70 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="flex items-center gap-3">
                    {player ? <PlayerAvatar player={player} className="size-10" /> : null}
                    <div>
                      <p className="font-bold">{player ? playerLabel(player) : "Jugador"}</p>
                      <p className="text-xs text-muted-foreground">{stat.estado_forma}</p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stat.goles_ultimos_3}G · {stat.asistencias_ultimos_3}A · racha {stat.racha_goleadora}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card/86">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Handshake />
              Química
            </CardTitle>
            <CardDescription>Duplas que mejor funcionan juntas.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {data.chemistry.slice(0, 10).map((chemistry) => {
              const a = playerById.get(chemistry.player_a_id)
              const b = playerById.get(chemistry.player_b_id)
              return (
                <div key={`${chemistry.player_a_id}-${chemistry.player_b_id}`} className="rounded-2xl border bg-background/70 p-3">
                  <p className="font-bold">
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

        <Card className="bg-card/86">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award />
              Logros
            </CardTitle>
            <CardDescription>Hat-tricks, MVPs y goles de la fecha.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {data.achievements.slice(0, 12).map((achievement) => {
              const player = playerById.get(achievement.player_id)
              return (
                <div key={achievement.id} className="flex items-center gap-3 rounded-2xl border bg-background/70 p-3">
                  <Flame />
                  <div>
                    <p className="font-bold">{achievement.titulo}</p>
                    <p className="text-sm text-muted-foreground">
                      {player ? playerLabel(player) : "Jugador"} · {achievement.descripcion}
                    </p>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
