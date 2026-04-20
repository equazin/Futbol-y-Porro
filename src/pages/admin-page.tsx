import { type FormEvent, useState } from "react"
import { Save, Video } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/empty-state"
import { MediaUpload } from "@/components/media-upload"
import { PlayerAvatar } from "@/components/player-avatar"
import { useAsyncData } from "@/hooks/use-async-data"
import {
  createGoalEvent,
  createMatch,
  getMatches,
  getPlayers,
  saveMatchRoster,
  updateMatch,
} from "@/lib/data"
import { playerLabel } from "@/lib/domain"
import type {
  MatchRosterInput,
  MatchStatus,
  MatchWithDetails,
  PlayerProfile,
  TeamCode,
} from "@/lib/types"

type RosterDraft = Record<string, MatchRosterInput>

export function AdminPage() {
  const playersState = useAsyncData(getPlayers, [])
  const matchesState = useAsyncData(getMatches, [])
  const [pending, setPending] = useState(false)
  const [roster, setRoster] = useState<RosterDraft>({})

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const selectedRoster = Object.values(roster).filter((item) => item.presente)

    if (!selectedRoster.length) {
      toast.error("Seleccioná al menos un jugador.")
      return
    }

    setPending(true)

    try {
      const match = await createMatch({
        fecha: String(form.get("fecha")),
        equipo_a_score: Number(form.get("equipo_a_score") ?? 0),
        equipo_b_score: Number(form.get("equipo_b_score") ?? 0),
        estado: String(form.get("estado") ?? "jugado") as MatchStatus,
      })

      await saveMatchRoster(match.id, selectedRoster)
      toast.success("Partido cargado con estadísticas.")
      setRoster({})
      event.currentTarget.reset()
      await matchesState.reload()
      await playersState.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el partido.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Admin</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Carga rápida</h1>
          <p className="text-muted-foreground">Diseñado para completar el domingo desde el celular.</p>
        </div>
        <Card className="bg-card/86">
          <CardHeader>
            <CardTitle>Nuevo partido</CardTitle>
            <CardDescription>Crear partido, equipos y estadísticas individuales.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <FieldSet>
                <FieldLegend>Resultado</FieldLegend>
                <FieldGroup className="grid gap-4 sm:grid-cols-4">
                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="fecha">Fecha</FieldLabel>
                    <Input id="fecha" name="fecha" type="date" required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="equipo_a_score">Equipo A</FieldLabel>
                    <Input id="equipo_a_score" name="equipo_a_score" type="number" min={0} defaultValue={0} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="equipo_b_score">Equipo B</FieldLabel>
                    <Input id="equipo_b_score" name="equipo_b_score" type="number" min={0} defaultValue={0} />
                  </Field>
                  <Field className="sm:col-span-4">
                    <FieldLabel htmlFor="estado">Estado</FieldLabel>
                    <select
                      id="estado"
                      name="estado"
                      defaultValue="jugado"
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="jugado">Jugado</option>
                      <option value="cerrado">Cerrado</option>
                    </select>
                  </Field>
                </FieldGroup>
              </FieldSet>

              <FieldSet>
                <FieldLegend>Jugadores</FieldLegend>
                {playersState.loading ? (
                  <div className="h-56 animate-pulse rounded-2xl bg-muted" />
                ) : playersState.data?.length ? (
                  <div className="flex flex-col gap-3">
                    {playersState.data.map((player) => (
                      <RosterRow
                        key={player.id}
                        player={player}
                        value={roster[player.id]}
                        onChange={(nextValue) =>
                          setRoster((current) => ({
                            ...current,
                            [player.id]: nextValue,
                          }))
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState title="Sin jugadores" description="Primero cargá jugadores desde Plantel." />
                )}
              </FieldSet>

              <Button disabled={pending || !playersState.data?.length} size="lg">
                <Save data-icon="inline-start" />
                Guardar partido
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <GoalEventPanel matchesState={matchesState} players={playersState.data ?? []} />
        <Card className="bg-card/86">
          <CardHeader>
            <CardTitle>Últimos cargados</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {matchesState.data?.slice(0, 5).map((match) => (
              <div key={match.id} className="flex items-center justify-between rounded-2xl border bg-background/70 p-3">
                <div>
                  <p className="font-bold">{match.fecha}</p>
                  <p className="text-sm text-muted-foreground">
                    {match.equipo_a_score}-{match.equipo_b_score}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{match.estado}</Badge>
                  <MatchEditButton
                    match={match}
                    players={playersState.data ?? []}
                    onSaved={async () => {
                      await matchesState.reload()
                      await playersState.reload()
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function MatchEditButton({
  match,
  players,
  onSaved,
}: {
  match: MatchWithDetails
  players: PlayerProfile[]
  onSaved: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [roster, setRoster] = useState<RosterDraft>(() =>
    Object.fromEntries(
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
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)

    try {
      await updateMatch(match.id, {
        fecha: String(form.get("fecha")),
        equipo_a_score: Number(form.get("equipo_a_score") ?? 0),
        equipo_b_score: Number(form.get("equipo_b_score") ?? 0),
        estado: String(form.get("estado") ?? "jugado") as MatchStatus,
      })
      await saveMatchRoster(match.id, Object.values(roster))
      toast.success("Partido actualizado.")
      setOpen(false)
      await onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" type="button">
          Editar
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>Editar partido</SheetTitle>
          <SheetDescription>Corregí resultado, estado y estadísticas.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
          <FieldSet>
            <FieldGroup className="grid gap-4 sm:grid-cols-4">
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor={`fecha-${match.id}`}>Fecha</FieldLabel>
                <Input id={`fecha-${match.id}`} name="fecha" type="date" defaultValue={match.fecha} required />
              </Field>
              <Field>
                <FieldLabel>Equipo A</FieldLabel>
                <Input name="equipo_a_score" type="number" min={0} defaultValue={match.equipo_a_score} />
              </Field>
              <Field>
                <FieldLabel>Equipo B</FieldLabel>
                <Input name="equipo_b_score" type="number" min={0} defaultValue={match.equipo_b_score} />
              </Field>
              <Field className="sm:col-span-4">
                <FieldLabel>Estado</FieldLabel>
                <select name="estado" defaultValue={match.estado} className="h-10 rounded-md border bg-background px-3 text-sm">
                  <option value="pendiente">Pendiente</option>
                  <option value="jugado">Jugado</option>
                  <option value="cerrado">Cerrado</option>
                </select>
              </Field>
            </FieldGroup>
          </FieldSet>
          <div className="flex flex-col gap-3">
            {players.map((player) => (
              <RosterRow
                key={player.id}
                player={player}
                value={roster[player.id]}
                onChange={(nextValue) =>
                  setRoster((current) => ({
                    ...current,
                    [player.id]: nextValue,
                  }))
                }
              />
            ))}
          </div>
          <Button disabled={pending}>Guardar edición</Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function RosterRow({
  player,
  value,
  onChange,
}: {
  player: PlayerProfile
  value?: MatchRosterInput
  onChange: (value: MatchRosterInput) => void
}) {
  const draft =
    value ??
    ({
      player_id: player.id,
      equipo: "A",
      goles: 0,
      asistencias: 0,
      calificacion: null,
      presente: false,
    } satisfies MatchRosterInput)

  function update(next: Partial<MatchRosterInput>) {
    onChange({ ...draft, ...next })
  }

  return (
    <div className="grid gap-3 rounded-2xl border bg-background/70 p-3 sm:grid-cols-[auto_1fr]">
      <div className="flex items-center gap-3">
        <Checkbox
          checked={draft.presente}
          onCheckedChange={(checked) => update({ presente: checked === true })}
        />
        <PlayerAvatar player={player} className="size-10" />
        <div className="min-w-0">
          <p className="truncate font-bold">{player.apodo ?? player.nombre}</p>
          <p className="text-xs text-muted-foreground">{player.posicion ?? "Sin posición"}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <select
          aria-label={`Equipo de ${player.nombre}`}
          value={draft.equipo}
          onChange={(event) => update({ equipo: event.target.value as TeamCode })}
          className="h-9 rounded-md border bg-background px-2 text-sm"
        >
          <option value="A">A</option>
          <option value="B">B</option>
        </select>
        <Input
          aria-label={`Goles de ${player.nombre}`}
          type="number"
          min={0}
          value={draft.goles}
          onChange={(event) => update({ goles: Number(event.target.value) })}
        />
        <Input
          aria-label={`Asistencias de ${player.nombre}`}
          type="number"
          min={0}
          value={draft.asistencias}
          onChange={(event) => update({ asistencias: Number(event.target.value) })}
        />
        <Input
          aria-label={`Calificación de ${player.nombre}`}
          type="number"
          min={1}
          max={10}
          step={0.5}
          placeholder="1-10"
          value={draft.calificacion ?? ""}
          onChange={(event) =>
            update({
              calificacion: event.target.value ? Number(event.target.value) : null,
            })
          }
        />
        <Badge variant={draft.presente ? "default" : "secondary"} className="justify-center">
          {draft.presente ? "Presente" : "Ausente"}
        </Badge>
      </div>
    </div>
  )
}

function GoalEventPanel({
  matchesState,
  players,
}: {
  matchesState: {
    data: MatchWithDetails[] | null
    reload: () => Promise<void>
  }
  players: PlayerProfile[]
}) {
  const [pending, setPending] = useState(false)
  const [videoUrl, setVideoUrl] = useState("")

  async function handleGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)

    try {
      await createGoalEvent({
        match_id: String(form.get("match_id")),
        player_id: String(form.get("player_id")),
        descripcion: String(form.get("descripcion")),
        video_url: videoUrl,
      })
      toast.success("Gol registrado.")
      event.currentTarget.reset()
      setVideoUrl("")
      await matchesState.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar el gol.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className="bg-card/86">
      <CardHeader>
        <CardTitle>Gol de la fecha PRO</CardTitle>
        <CardDescription>Descripción y video opcional para la votación.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleGoal} className="flex flex-col gap-4">
          <FieldSet>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="goal-match">Partido</FieldLabel>
                <select id="goal-match" name="match_id" required className="h-10 rounded-md border bg-background px-3 text-sm">
                  <option value="">Elegir partido</option>
                  {matchesState.data?.map((match) => (
                    <option key={match.id} value={match.id}>
                      {match.fecha}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="goal-player">Jugador</FieldLabel>
                <select id="goal-player" name="player_id" required className="h-10 rounded-md border bg-background px-3 text-sm">
                  <option value="">Elegir jugador</option>
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {playerLabel(player)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="descripcion">Descripción</FieldLabel>
                <Textarea id="descripcion" name="descripcion" required placeholder="Zapatazo al ángulo..." />
              </Field>
              <Field>
                <FieldLabel htmlFor="video_url">Video URL</FieldLabel>
                <Input
                  id="video_url"
                  name="video_url"
                  type="url"
                  value={videoUrl}
                  onChange={(event) => setVideoUrl(event.target.value)}
                  placeholder="https://..."
                />
              </Field>
              <MediaUpload folder="goals" accept="video/mp4,video/webm" onUploaded={setVideoUrl} />
              <Button disabled={pending}>
                <Video data-icon="inline-start" />
                Guardar gol
              </Button>
            </FieldGroup>
          </FieldSet>
        </form>
      </CardContent>
    </Card>
  )
}
