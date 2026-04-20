import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { PlayerAvatar } from "@/components/player-avatar"
import { formatAverage } from "@/lib/format"
import type { PlayerProfile } from "@/lib/types"

type LeaderboardProps = {
  players: PlayerProfile[]
  limit?: number
}

export function Leaderboard({ players, limit = 10 }: LeaderboardProps) {
  const visible = players.slice(0, limit)
  const maxPoints = Math.max(...visible.map((player) => player.puntos), 1)

  return (
    <div className="flex flex-col gap-3">
      {visible.map((player, index) => (
        <Link
          to={`/jugadores/${player.id}`}
          key={player.id}
          className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border bg-card/80 p-3 shadow-sm transition hover:-translate-y-0.5 hover:bg-card"
        >
          <div className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground">
            {index + 1}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <PlayerAvatar player={player} className="size-9" />
              <div className="min-w-0">
                <p className="truncate font-bold">{player.apodo ?? player.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  {player.goles} G · {player.asistencias} A · prom.{" "}
                  {formatAverage(player.promedio_calificacion)}
                </p>
              </div>
            </div>
            <Progress value={(player.puntos / maxPoints) * 100} className="mt-3 h-1.5" />
          </div>
          <Badge variant={index < 3 ? "default" : "secondary"}>{player.puntos} pts</Badge>
        </Link>
      ))}
    </div>
  )
}
