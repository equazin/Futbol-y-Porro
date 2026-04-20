import { Link } from "react-router-dom"
import { useState } from "react"
import { CalendarClock, Goal, Plus, Trophy } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/empty-state"
import { useAsyncData } from "@/hooks/use-async-data"
import { playerLabel, scoreLabel } from "@/lib/domain"
import { createMatch, getMatches } from "@/lib/data"
import { formatDate } from "@/lib/format"
import type { MatchWithDetails } from "@/lib/types"

export function MatchesPage() {
  const { data: matches, error, loading, reload } = useAsyncData(getMatches, [])
  const [pending, setPending] = useState(false)

  async function createNextSunday() {
    setPending(true)

    try {
      await createMatch({
        fecha: nextSundayDate(),
        equipo_a_score: 0,
        equipo_b_score: 0,
        estado: "pendiente",
      })
      toast.success("Próximo domingo creado.")
      await reload()
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : "No se pudo crear el partido.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Timeline</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Historial de partidos</h1>
          <p className="text-muted-foreground">Resultados, MVPs, goles de la fecha y planteles.</p>
        </div>
        <Button onClick={createNextSunday} disabled={pending}>
          <Plus data-icon="inline-start" />
          Nuevo domingo
        </Button>
      </div>

      {error ? <EmptyState title="No se pudo cargar" description={error} /> : null}
      {loading ? <div className="h-96 animate-pulse rounded-3xl bg-muted" /> : null}
      {!loading && matches?.length === 0 ? (
        <EmptyState title="Sin partidos" description="Cargá el primer domingo desde Admin." />
      ) : null}

      <div className="relative flex flex-col gap-4 before:absolute before:left-4 before:top-0 before:h-full before:w-px before:bg-border sm:before:left-6">
        {matches?.map((match) => <TimelineMatch key={match.id} match={match} />)}
      </div>
    </div>
  )
}

function nextSundayDate() {
  const date = new Date()
  const distance = (7 - date.getDay()) % 7 || 7
  date.setDate(date.getDate() + distance)

  return date.toISOString().slice(0, 10)
}

function TimelineMatch({ match }: { match: MatchWithDetails }) {
  return (
    <article className="relative pl-10 sm:pl-14">
      <div className="absolute left-0 top-6 flex size-8 items-center justify-center rounded-full border bg-background sm:size-12">
        <CalendarClock />
      </div>
      <Card className="bg-card/86">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="capitalize">{formatDate(match.fecha)}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {match.match_players.filter((item) => item.presente).length} presentes
            </p>
          </div>
          <Badge variant={match.estado === "cerrado" ? "default" : "secondary"}>
            {match.estado}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-3xl bg-muted/70 p-5 text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Resultado</p>
            <p className="text-5xl font-black tracking-tighter">
              {scoreLabel(match.equipo_a_score, match.equipo_b_score)}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Award icon={Trophy} label="MVP" value={match.mvp ? playerLabel(match.mvp) : "Pendiente"} />
            <Award
              icon={Goal}
              label="Gol de la fecha"
              value={match.gol_de_la_fecha ? playerLabel(match.gol_de_la_fecha) : "Pendiente"}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Team label="Equipo A" players={match.match_players.filter((item) => item.equipo === "A")} />
            <Team label="Equipo B" players={match.match_players.filter((item) => item.equipo === "B")} />
          </div>
          {match.goal_events?.length ? (
            <div className="rounded-2xl border bg-background/70 p-4">
              <p className="mb-3 font-bold">Goles registrados</p>
              <div className="flex flex-col gap-2">
                {match.goal_events.map((goal) => (
                  <p key={goal.id} className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {goal.players ? playerLabel(goal.players) : "Jugador"}
                    </span>
                    : {goal.descripcion}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
          <Link
            to={`/partidos/${match.id}`}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Abrir detalle estilo Kick Stats
          </Link>
        </CardContent>
      </Card>
    </article>
  )
}

function Award({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-background/70 p-4">
      <Icon />
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        <p className="font-black">{value}</p>
      </div>
    </div>
  )
}

function Team({
  label,
  players,
}: {
  label: string
  players: MatchWithDetails["match_players"]
}) {
  return (
    <div className="rounded-2xl border bg-background/70 p-4">
      <p className="mb-3 text-sm font-black">{label}</p>
      <div className="flex flex-col gap-2">
        {players.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
            <span className={!item.presente ? "text-muted-foreground line-through" : undefined}>
              {item.players ? playerLabel(item.players) : "Jugador"}
            </span>
            <span className="font-mono">
              {item.goles}G {item.asistencias}A
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
