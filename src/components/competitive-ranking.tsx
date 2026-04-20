import { Link } from "react-router-dom"
import { Medal, Shield, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PlayerAvatar } from "@/components/player-avatar"
import { formatAverage } from "@/lib/format"
import type { PlayerProfile } from "@/lib/types"
import { cn } from "@/lib/utils"

type CompetitiveRankingProps = {
  players: PlayerProfile[]
  limit?: number
  compact?: boolean
}

export function CompetitiveRanking({
  players,
  limit = 10,
  compact = false,
}: CompetitiveRankingProps) {
  const visible = players.slice(0, limit)
  const podium = visible.slice(0, 3)
  const tableRows = compact ? visible : visible.slice(3)

  if (!visible.length) {
    return (
      <div className="rounded-2xl border border-dashed bg-background/70 p-5 text-sm text-muted-foreground">
        Todavia no hay puntos. Carga jugadores y resultados para abrir la tabla.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {!compact ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {podium.map((player, index) => (
            <PodiumPlayer key={player.id} player={player} place={index + 1} />
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border bg-background/75">
        <Table>
          <TableHeader>
            <TableRow className="bg-foreground text-background hover:bg-foreground">
              <TableHead className="w-12 text-background">#</TableHead>
              <TableHead className="text-background">Jugador</TableHead>
              <TableHead className="text-right text-background">Pts</TableHead>
              <TableHead className="hidden text-right text-background sm:table-cell">G</TableHead>
              <TableHead className="hidden text-right text-background sm:table-cell">A</TableHead>
              <TableHead className="hidden text-right text-background md:table-cell">Prom</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableRows.map((player, index) => {
              const place = compact ? index + 1 : index + 4

              return (
                <TableRow key={player.id} className="group">
                  <TableCell className="font-black tabular-nums">{place}</TableCell>
                  <TableCell>
                    <Link
                      to={`/jugadores/${player.id}`}
                      className="flex min-w-0 items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <PlayerAvatar player={player} className="size-9" />
                      <span className="min-w-0">
                        <span className="block truncate font-bold">
                          {player.apodo ?? player.nombre}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {player.mvp_count} MVP · {player.gol_fecha_count} gol fecha
                        </span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-right text-lg font-black tabular-nums">
                    {player.puntos}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">
                    {player.goles}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">
                    {player.asistencias}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">
                    {formatAverage(player.promedio_calificacion)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function PodiumPlayer({ player, place }: { player: PlayerProfile; place: number }) {
  return (
    <Link
      to={`/jugadores/${player.id}`}
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-foreground p-4 text-background shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        place === 1 && "sm:-mt-3"
      )}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-accent" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <PlayerAvatar player={player} className="size-12 border-2 border-background/20" />
          <div className="min-w-0">
            <p className="truncate text-lg font-black">{player.apodo ?? player.nombre}</p>
            <p className="text-xs text-background/65">{player.posicion ?? "Jugador"}</p>
          </div>
        </div>
        <Badge className="bg-accent text-accent-foreground hover:bg-accent">
          {place}°
        </Badge>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <MiniMetric icon={Shield} label="PTS" value={player.puntos} />
        <MiniMetric icon={TrendingUp} label="G" value={player.goles} />
        <MiniMetric icon={Medal} label="MVP" value={player.mvp_count} />
      </div>
    </Link>
  )
}

function MiniMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Shield
  label: string
  value: number
}) {
  return (
    <div className="rounded-xl bg-background/10 p-2">
      <Icon className="mb-2 size-4 text-accent" />
      <p className="text-[0.65rem] font-bold text-background/55">{label}</p>
      <p className="text-xl font-black tabular-nums">{value}</p>
    </div>
  )
}
