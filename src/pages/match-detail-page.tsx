import { type FormEvent, useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Calendar, Goal, Save, Star, Trash2, Users } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/empty-state"
import { PlayerAvatar } from "@/components/player-avatar"
import { useAsyncData } from "@/hooks/use-async-data"
import {
  deleteMatch,
  getMatch,
  getPlayers,
  saveMatchRoster,
  updateMatchResult,
} from "@/lib/data"
import { playerLabel } from "@/lib/domain"
import { formatDate } from "@/lib/format"
import type { MatchRosterInput, MatchStatus, MatchWithDetails, PlayerProfile, TeamCode } from "@/lib/types"

type RosterDraft = Record<string, MatchRosterInput>

export function MatchDetailPage() {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const { data, error, loading, reload } = useAsyncData(
    async () => {
      if (!matchId) {
        throw new Error("Partido inválido.")
      }

      const [match, players] = await Promise.all([getMatch(matchId), getPlayers()])
      return { match, players }
    },
    [matchId]
  )
  const [roster, setRoster] = useState<RosterDraft>({})
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!data) {
      return
    }

    queueMicrotask(() => setRoster(buildRoster(data.match, data.players)))
  }, [data])

  if (loading) {
    return <div className="h-96 animate-pulse rounded-3xl bg-muted" />
  }

  if (error || !data) {
    return <EmptyState title="No se pudo cargar el partido" description={error ?? "Sin datos."} />
  }

  const teamA = Object.values(roster).filter((item) => item.presente && item.equipo === "A")
  const teamB = Object.values(roster).filter((item) => item.presente && item.equipo === "B")
  const presentPlayers = Object.values(roster).filter((item) => item.presente)
  const playersById = new Map(data.players.map((player) => [player.id, player]))

  async function handleSaveRoster() {
    if (!matchId) {
      return
    }

    setPending(true)

    try {
      await saveMatchRoster(matchId, Object.values(roster))
      toast.success("Planteles y estadísticas guardados.")
      await reload()
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "No se pudo guardar.")
    } finally {
      setPending(false)
    }
  }

  async function handleResult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!matchId) {
      return
    }

    const form = new FormData(event.currentTarget)
    setPending(true)

    try {
      await updateMatchResult(matchId, {
        fecha: String(form.get("fecha")),
        equipo_a_score: Number(form.get("equipo_a_score") ?? 0),
        equipo_b_score: Number(form.get("equipo_b_score") ?? 0),
        estado: String(form.get("estado") ?? "jugado") as MatchStatus,
        mvp_player_id: nullIfNone(String(form.get("mvp_player_id") ?? "")),
        gol_de_la_fecha_player_id: nullIfNone(String(form.get("gol_de_la_fecha_player_id") ?? "")),
        votacion_abre: nullIfNone(String(form.get("votacion_abre") ?? "")),
        votacion_cierra: nullIfNone(String(form.get("votacion_cierra") ?? "")),
        notas: nullIfNone(String(form.get("notas") ?? "")),
      })
      toast.success("Resultado y premios guardados.")
      await reload()
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "No se pudo guardar.")
    } finally {
      setPending(false)
    }
  }

  async function handleDelete() {
    if (!matchId || !window.confirm("¿Eliminar este partido y todos sus datos asociados?")) {
      return
    }

    setPending(true)

    try {
      await deleteMatch(matchId)
      toast.success("Partido eliminado.")
      navigate("/partidos")
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/partidos">
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
              Detalle de partido
            </p>
            <h1 className="text-2xl font-black capitalize tracking-tight sm:text-4xl">
              {formatDate(data.match.fecha)}
            </h1>
            <p className="text-sm text-muted-foreground">
              {presentPlayers.length} jugadores · estado {data.match.estado}
            </p>
          </div>
        </div>
        <Button variant="destructive" disabled={pending} onClick={handleDelete}>
          <Trash2 data-icon="inline-start" />
          Eliminar
        </Button>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <Card className="bg-card/86">
          <CardContent className="flex items-center gap-3 p-4">
            <Calendar />
            <div>
              <p className="text-sm text-muted-foreground">Marcador</p>
              <p className="text-2xl font-black">
                {data.match.equipo_a_score}-{data.match.equipo_b_score}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/86">
          <CardContent className="flex items-center gap-3 p-4">
            <Users />
            <div>
              <p className="text-sm text-muted-foreground">Equipo A / B</p>
              <p className="text-2xl font-black">
                {teamA.length}/{teamB.length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/86">
          <CardContent className="flex items-center gap-3 p-4">
            <Star />
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">MVP</p>
              <p className="truncate text-2xl font-black">
                {data.match.mvp ? data.match.mvp.apodo ?? data.match.mvp.nombre : "Pendiente"}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="planteles" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="planteles">Planteles & Stats</TabsTrigger>
          <TabsTrigger value="resultado">Resultado & Premios</TabsTrigger>
        </TabsList>

        <TabsContent value="planteles" className="mt-4 flex flex-col gap-4">
          <Card className="bg-card/86">
            <CardHeader>
              <CardTitle>Asignar equipos</CardTitle>
              <CardDescription>
                Inspirado en Kick Stats: tocá A, B o dejá sin equipo para ausente.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {data.players.map((player) => {
                const draft = roster[player.id]
                if (!draft) {
                  return null
                }

                return (
                  <div
                    key={player.id}
                    className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border bg-background/70 p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <PlayerAvatar player={player} className="size-10" />
                      <div className="min-w-0">
                        <p className="truncate font-bold">{player.apodo ?? player.nombre}</p>
                        <p className="text-xs text-muted-foreground">{player.posicion ?? "Sin posición"}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <TeamButton active={draft.presente && draft.equipo === "A"} onClick={() => setTeam(player.id, "A")}>
                        A
                      </TeamButton>
                      <TeamButton active={draft.presente && draft.equipo === "B"} onClick={() => setTeam(player.id, "B")}>
                        B
                      </TeamButton>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <TeamStatsCard label="Equipo A" players={teamA} playersById={playersById} update={updateRoster} />
            <TeamStatsCard label="Equipo B" players={teamB} playersById={playersById} update={updateRoster} />
          </div>

          <Button onClick={handleSaveRoster} disabled={pending} size="lg">
            <Save data-icon="inline-start" />
            Guardar planteles & stats
          </Button>
        </TabsContent>

        <TabsContent value="resultado" className="mt-4">
          <Card className="bg-card/86">
            <CardHeader>
              <CardTitle>Resultado, premios y votación</CardTitle>
              <CardDescription>
                Traído del flujo Kick Stats: marcador, estado, MVP, gol de la fecha y notas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResult}>
                <FieldSet>
                  <FieldGroup className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="fecha">Fecha</FieldLabel>
                      <Input id="fecha" name="fecha" type="date" defaultValue={data.match.fecha} required />
                    </Field>
                    <Field>
                      <FieldLabel>Estado</FieldLabel>
                      <select name="estado" defaultValue={data.match.estado} className="h-10 rounded-md border bg-background px-3 text-sm">
                        <option value="pendiente">Pendiente</option>
                        <option value="jugado">Jugado</option>
                        <option value="cerrado">Cerrado</option>
                      </select>
                    </Field>
                    <Field>
                      <FieldLabel>Equipo A</FieldLabel>
                      <Input name="equipo_a_score" type="number" min={0} defaultValue={data.match.equipo_a_score} />
                    </Field>
                    <Field>
                      <FieldLabel>Equipo B</FieldLabel>
                      <Input name="equipo_b_score" type="number" min={0} defaultValue={data.match.equipo_b_score} />
                    </Field>
                    <AwardSelect name="mvp_player_id" label="MVP del partido" value={data.match.mvp_player_id} players={presentPlayers} playersById={playersById} icon="star" />
                    <AwardSelect name="gol_de_la_fecha_player_id" label="Gol de la fecha" value={data.match.gol_de_la_fecha_player_id} players={presentPlayers.filter((item) => item.goles > 0)} playersById={playersById} icon="goal" />
                    <Field>
                      <FieldLabel>Votación abre</FieldLabel>
                      <Input name="votacion_abre" type="datetime-local" defaultValue={toDatetimeLocal(data.match.votacion_abre)} />
                    </Field>
                    <Field>
                      <FieldLabel>Votación cierra</FieldLabel>
                      <Input name="votacion_cierra" type="datetime-local" defaultValue={toDatetimeLocal(data.match.votacion_cierra)} />
                    </Field>
                    <Field className="sm:col-span-2">
                      <FieldLabel>Notas</FieldLabel>
                      <Textarea name="notas" defaultValue={data.match.notas ?? ""} placeholder="Clima, cancha, incidencias..." />
                    </Field>
                    <Button disabled={pending} size="lg" className="sm:col-span-2">
                      <Save data-icon="inline-start" />
                      Guardar resultado
                    </Button>
                  </FieldGroup>
                </FieldSet>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )

  function setTeam(playerId: string, team: TeamCode) {
    setRoster((current) => {
      const previous = current[playerId]
      const nextPresent = !(previous?.presente && previous.equipo === team)

      return {
        ...current,
        [playerId]: {
          ...previous,
          player_id: playerId,
          equipo: team,
          presente: nextPresent,
          goles: previous?.goles ?? 0,
          asistencias: previous?.asistencias ?? 0,
          calificacion: previous?.calificacion ?? null,
        },
      }
    })
  }

  function updateRoster(playerId: string, patch: Partial<MatchRosterInput>) {
    setRoster((current) => ({
      ...current,
      [playerId]: {
        ...current[playerId],
        ...patch,
      },
    }))
  }
}

function TeamButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-black text-primary-foreground shadow-sm"
          : "flex size-9 items-center justify-center rounded-xl bg-muted text-sm font-black text-muted-foreground"
      }
    >
      {children}
    </button>
  )
}

function TeamStatsCard({
  label,
  players,
  playersById,
  update,
}: {
  label: string
  players: MatchRosterInput[]
  playersById: Map<string, PlayerProfile>
  update: (playerId: string, patch: Partial<MatchRosterInput>) => void
}) {
  return (
    <Card className="bg-card/86">
      <CardHeader>
        <CardTitle>{label}</CardTitle>
        <CardDescription>{players.length} jugadores asignados</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {players.length ? (
          players.map((draft) => {
            const player = playersById.get(draft.player_id)
            if (!player) {
              return null
            }

            return (
              <div key={draft.player_id} className="rounded-2xl border bg-background/70 p-3">
                <div className="mb-3 flex items-center gap-2">
                  <PlayerAvatar player={player} className="size-9" />
                  <p className="font-bold">{playerLabel(player)}</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <NumberField label="Goles" value={draft.goles} min={0} onChange={(value) => update(draft.player_id, { goles: value })} />
                  <NumberField label="Asist." value={draft.asistencias} min={0} onChange={(value) => update(draft.player_id, { asistencias: value })} />
                  <NumberField label="Calif." value={draft.calificacion ?? ""} min={1} max={10} step={0.5} onChange={(value) => update(draft.player_id, { calificacion: value || null })} />
                </div>
              </div>
            )
          })
        ) : (
          <EmptyState title="Sin jugadores" description="Asigná jugadores desde el bloque superior." />
        )}
      </CardContent>
    </Card>
  )
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number | ""
  min: number
  max?: number
  step?: number
  onChange: (value: number) => void
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
      {label}
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="h-10 text-base font-black tracking-tight text-foreground"
      />
    </label>
  )
}

function AwardSelect({
  name,
  label,
  value,
  players,
  playersById,
  icon,
}: {
  name: string
  label: string
  value: string | null
  players: MatchRosterInput[]
  playersById: Map<string, PlayerProfile>
  icon: "star" | "goal"
}) {
  const Icon = icon === "star" ? Star : Goal

  return (
    <Field>
      <FieldLabel className="flex items-center gap-1">
        <Icon />
        {label}
      </FieldLabel>
      <Select name={name} defaultValue={value ?? "none"}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Sin definir" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="none">Sin definir</SelectItem>
            {players.map((draft) => {
              const player = playersById.get(draft.player_id)
              if (!player) {
                return null
              }

              return (
                <SelectItem key={player.id} value={player.id}>
                  {playerLabel(player)}
                  {icon === "goal" ? ` (${draft.goles} goles)` : ""}
                </SelectItem>
              )
            })}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}

function buildRoster(match: MatchWithDetails, players: PlayerProfile[]) {
  return Object.fromEntries(
    players.map((player) => {
      const current = match.match_players.find((item) => item.player_id === player.id)

      return [
        player.id,
        {
          player_id: player.id,
          equipo: current?.equipo ?? "A",
          goles: current?.goles ?? 0,
          asistencias: current?.asistencias ?? 0,
          calificacion: current?.calificacion ?? null,
          presente: current?.presente ?? false,
        } satisfies MatchRosterInput,
      ]
    })
  )
}

function nullIfNone(value: string) {
  return value && value !== "none" ? value : null
}

function toDatetimeLocal(value?: string | null) {
  if (!value) {
    return ""
  }

  return new Date(value).toISOString().slice(0, 16)
}
