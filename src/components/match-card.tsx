import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlayerAvatar } from "@/components/player-avatar"
import { playerLabel, scoreLabel } from "@/lib/domain"
import { formatDate } from "@/lib/format"
import type { MatchWithDetails } from "@/lib/types"

type MatchCardProps = {
  match: MatchWithDetails
}

export function MatchCard({ match }: MatchCardProps) {
  const teamA = match.match_players.filter((item) => item.equipo === "A" && item.presente)
  const teamB = match.match_players.filter((item) => item.equipo === "B" && item.presente)

  return (
    <Card className="overflow-hidden bg-card/86 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="capitalize">{formatDate(match.fecha)}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {teamA.length + teamB.length} jugadores confirmados
          </p>
        </div>
        <Badge variant={match.estado === "cerrado" ? "default" : "secondary"}>
          {match.estado}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl bg-muted/60 p-4 text-center">
          <TeamStack label="Equipo A" players={teamA.map((item) => item.players).filter(isPlayer)} />
          <div>
            <p className="text-3xl font-black tracking-tighter">
              {scoreLabel(match.equipo_a_score, match.equipo_b_score)}
            </p>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">final</p>
          </div>
          <TeamStack label="Equipo B" players={teamB.map((item) => item.players).filter(isPlayer)} />
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <Award label="MVP" player={match.mvp} />
          <Award label="Gol fecha" player={match.gol_de_la_fecha} />
        </div>
        <Link className="text-sm font-semibold text-primary hover:underline" to="/partidos">
          Ver historial completo
        </Link>
      </CardContent>
    </Card>
  )
}

function TeamStack({
  label,
  players,
}: {
  label: string
  players: NonNullable<MatchWithDetails["match_players"][number]["players"]>[]
}) {
  return (
    <div className="min-w-0">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <div className="flex justify-center -space-x-2">
        {players.slice(0, 4).map((player) => (
          <PlayerAvatar key={player.id} player={player} className="size-8 border-2 border-card" />
        ))}
      </div>
    </div>
  )
}

function isPlayer(
  player: MatchWithDetails["match_players"][number]["players"]
): player is NonNullable<MatchWithDetails["match_players"][number]["players"]> {
  return Boolean(player)
}

function Award({
  label,
  player,
}: {
  label: string
  player?: MatchWithDetails["mvp"]
}) {
  return (
    <div className="rounded-xl bg-background/70 p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="font-bold">{player ? playerLabel(player) : "Sin definir"}</p>
    </div>
  )
}
