import { type FormEvent, type ReactNode, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronRight, Goal, Save, Shield, Video } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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
} from "@/lib/data"
import { playerLabel } from "@/lib/domain"
import { formatDate } from "@/lib/format"
import { isoToday } from "@/lib/jornada"
import type {
  MatchRosterInput,
  MatchStatus,
  MatchWithDetails,
  PlayerProfile,
} from "@/lib/types"

type RosterDraft = Record<string, MatchRosterInput>
type StepId = "resultado" | "planteles" | "stats" | "revision"

const steps: { id: StepId; label: string }[] = [
  { id: "resultado", label: "Resultado" },
  { id: "planteles", label: "Equipos" },
  { id: "stats", label: "Stats" },
  { id: "revision", label: "Publicar" },
]

export function AdminPage() {
  const playersState = useAsyncData(getPlayers, [])
  const matchesState = useAsyncData(getMatches, [])
  const [step, setStep] = useState<StepId>("resultado")
  const [pending, setPending] = useState(false)
  const [matchDraft, setMatchDraft] = useState({
    fecha: nextSundayDate(),
    equipo_a_score: 0,
    equipo_b_score: 0,
    estado: "jugado" as MatchStatus,
  })
  const [roster, setRoster] = useState<RosterDraft>({})
  const selectedRoster = useMemo(
    () => Object.values(roster).filter((item) => item.presente),
    [roster]
  )
  const teamA = selectedRoster.filter((item) => item.equipo === "A")
  const teamB = selectedRoster.filter((item) => item.equipo === "B")

  async function handlePublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedRoster.length) {
      toast.error("Selecciona al menos un jugador.")
      setStep("planteles")
      return
    }

    setPending(true)

    try {
      const match = await createMatch(matchDraft)
      await saveMatchRoster(match.id, selectedRoster)
      toast.success("Jornada publicada.")
      setRoster({})
      setStep("resultado")
      setMatchDraft({
        fecha: nextSundayDate(),
        equipo_a_score: 0,
        equipo_b_score: 0,
        estado: "jugado",
      })
      await matchesState.reload()
      await playersState.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo publicar la jornada.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Admin</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
            Cerrar Domingo
          </h1>
          <p className="text-muted-foreground">
            Un flujo corto para resultado, equipos, estadisticas y publicacion.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-3 shadow-sm">
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${((steps.findIndex((item) => item.id === step) + 1) / steps.length) * 100}%` }}
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {steps.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setStep(item.id)}
                className={
                  item.id === step
                    ? "rounded-xl bg-foreground px-2 py-2 text-xs font-black text-background"
                    : "rounded-xl bg-muted px-2 py-2 text-xs font-bold text-muted-foreground"
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handlePublish}>
          {step === "resultado" ? (
            <WizardPanel title="1. Resultado y estado">
              <FieldSet>
                <FieldGroup className="grid gap-4 sm:grid-cols-4">
                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="fecha">Fecha</FieldLabel>
                    <Input
                      id="fecha"
                      type="date"
                      required
                      value={matchDraft.fecha}
                      onChange={(event) => setMatchDraft((current) => ({ ...current, fecha: event.target.value }))}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="equipo_a_score">Equipo A</FieldLabel>
                    <Input
                      id="equipo_a_score"
                      type="number"
                      min={0}
                      value={matchDraft.equipo_a_score}
                      onChange={(event) => setMatchDraft((current) => ({ ...current, equipo_a_score: Number(event.target.value) }))}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="equipo_b_score">Equipo B</FieldLabel>
                    <Input
                      id="equipo_b_score"
                      type="number"
                      min={0}
                      value={matchDraft.equipo_b_score}
                      onChange={(event) => setMatchDraft((current) => ({ ...current, equipo_b_score: Number(event.target.value) }))}
                    />
                  </Field>
                  <Field className="sm:col-span-4">
                    <FieldLabel htmlFor="estado">Estado</FieldLabel>
                    <select
                      id="estado"
                      value={matchDraft.estado}
                      onChange={(event) => setMatchDraft((current) => ({ ...current, estado: event.target.value as MatchStatus }))}
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="jugado">Jugado</option>
                      <option value="cerrado">Cerrado</option>
                    </select>
                  </Field>
                </FieldGroup>
              </FieldSet>
              <StepActions onNext={() => setStep("planteles")} />
            </WizardPanel>
          ) : null}

          {step === "planteles" ? (
            <WizardPanel title="2. Presentes y equipos">
              {playersState.loading ? (
                <div className="h-56 animate-pulse rounded-2xl bg-muted" />
              ) : playersState.data?.length ? (
                <div className="flex flex-col gap-3">
                  {playersState.data.map((player) => (
                    <RosterRow
                      key={player.id}
                      player={player}
                      value={roster[player.id]}
                      mode="team"
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
                <EmptyState title="Sin jugadores" description="Primero carga jugadores desde Plantel." />
              )}
              <StepActions onBack={() => setStep("resultado")} onNext={() => setStep("stats")} />
            </WizardPanel>
          ) : null}

          {step === "stats" ? (
            <WizardPanel title="3. Goles, asistencias y calificaciones">
              {selectedRoster.length ? (
                <div className="flex flex-col gap-3">
                  {selectedRoster.map((draft) => {
                    const player = playersState.data?.find((item) => item.id === draft.player_id)
                    if (!player) {
                      return null
                    }

                    return (
                      <RosterRow
                        key={player.id}
                        player={player}
                        value={draft}
                        mode="stats"
                        onChange={(nextValue) =>
                          setRoster((current) => ({
                            ...current,
                            [player.id]: nextValue,
                          }))
                        }
                      />
                    )
                  })}
                </div>
              ) : (
                <EmptyState title="No hay presentes" description="Volve a equipos y selecciona quienes jugaron." />
              )}
              <StepActions onBack={() => setStep("planteles")} onNext={() => setStep("revision")} />
            </WizardPanel>
          ) : null}

          {step === "revision" ? (
            <WizardPanel title="4. Revision final">
              <div className="grid gap-3 sm:grid-cols-2">
                <ReviewTile label="Fecha" value={formatDate(matchDraft.fecha)} />
                <ReviewTile label="Marcador" value={`${matchDraft.equipo_a_score}-${matchDraft.equipo_b_score}`} />
                <ReviewTile label="Equipo A" value={`${teamA.length} jugadores`} />
                <ReviewTile label="Equipo B" value={`${teamB.length} jugadores`} />
              </div>
              <div className="rounded-2xl border bg-background/70 p-4 text-sm text-muted-foreground">
                Publicar crea el partido, guarda planteles y deja la jornada visible para votar,
                ranking y caja. Para premios finales, abri el detalle del partido despues de publicar.
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => setStep("stats")}>
                  Volver
                </Button>
                <Button disabled={pending || !selectedRoster.length} size="lg" className="sm:flex-1">
                  <Save data-icon="inline-start" />
                  Publicar Jornada
                </Button>
              </div>
            </WizardPanel>
          ) : null}
        </form>
      </section>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        <SummaryPanel
          matchDraft={matchDraft}
          selectedRoster={selectedRoster}
          teamA={teamA.length}
          teamB={teamB.length}
        />
        <GoalEventPanel matchesState={matchesState} players={playersState.data ?? []} />
        <RecentMatches matches={matchesState.data ?? []} />
      </aside>
    </div>
  )
}

function WizardPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="bg-card shadow-sm">
      <CardHeader className="border-b">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 p-4 sm:p-5">{children}</CardContent>
    </Card>
  )
}

function StepActions({ onBack, onNext }: { onBack?: () => void; onNext?: () => void }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {onBack ? (
        <Button type="button" variant="outline" onClick={onBack}>
          Volver
        </Button>
      ) : null}
      {onNext ? (
        <Button type="button" className="sm:flex-1" onClick={onNext}>
          Siguiente
          <ChevronRight data-icon="inline-end" />
        </Button>
      ) : null}
    </div>
  )
}

function RosterRow({
  player,
  value,
  mode,
  onChange,
}: {
  player: PlayerProfile
  value?: MatchRosterInput
  mode: "team" | "stats"
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
    <div className="grid gap-3 rounded-2xl border bg-background/75 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="flex min-w-0 items-center gap-3">
        {mode === "team" ? (
          <Checkbox
            checked={draft.presente}
            onCheckedChange={(checked) => update({ presente: checked === true })}
          />
        ) : null}
        <PlayerAvatar player={player} className="size-10" />
        <div className="min-w-0">
          <p className="truncate font-black">{player.apodo ?? player.nombre}</p>
          <p className="text-xs text-muted-foreground">{player.posicion ?? "Sin posicion"}</p>
        </div>
      </div>
      {mode === "team" ? (
        <div className="grid grid-cols-2 gap-2">
          <TeamButton active={draft.presente && draft.equipo === "A"} onClick={() => update({ equipo: "A", presente: true })}>
            Equipo A
          </TeamButton>
          <TeamButton active={draft.presente && draft.equipo === "B"} onClick={() => update({ equipo: "B", presente: true })}>
            Equipo B
          </TeamButton>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="G" value={draft.goles} min={0} onChange={(value) => update({ goles: value })} />
          <NumberField label="A" value={draft.asistencias} min={0} onChange={(value) => update({ asistencias: value })} />
          <NumberField label="Prom" value={draft.calificacion ?? ""} min={1} max={10} step={0.5} onChange={(value) => update({ calificacion: value || null })} />
        </div>
      )}
    </div>
  )
}

function TeamButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "rounded-xl bg-foreground px-3 py-2 text-sm font-black text-background" : "rounded-xl bg-muted px-3 py-2 text-sm font-bold text-muted-foreground"}
    >
      {children}
    </button>
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
    <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
      {label}
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="h-10 text-base font-black tabular-nums text-foreground"
      />
    </label>
  )
}

function SummaryPanel({
  matchDraft,
  selectedRoster,
  teamA,
  teamB,
}: {
  matchDraft: { fecha: string; equipo_a_score: number; equipo_b_score: number; estado: MatchStatus }
  selectedRoster: MatchRosterInput[]
  teamA: number
  teamB: number
}) {
  const totalGoals = selectedRoster.reduce((sum, item) => sum + item.goles, 0)

  return (
    <div className="scoreboard rounded-2xl border border-foreground p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-background/55">
            Resumen sticky
          </p>
          <p className="text-2xl font-black text-background">{matchDraft.equipo_a_score}-{matchDraft.equipo_b_score}</p>
        </div>
        <Shield className="size-7 text-accent" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-background">
        <SummaryMetric label="A/B" value={`${teamA}/${teamB}`} />
        <SummaryMetric label="Goles" value={String(totalGoals)} />
        <SummaryMetric label="Estado" value={matchDraft.estado} />
      </div>
    </div>
  )
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background/10 p-2">
      <p className="text-[0.65rem] font-bold uppercase text-background/55">{label}</p>
      <p className="truncate text-lg font-black text-background">{value}</p>
    </div>
  )
}

function ReviewTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-background/70 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
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
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Goal className="size-5" />
          Gol de la fecha
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleGoal} className="flex flex-col gap-3">
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
                <FieldLabel htmlFor="descripcion">Descripcion</FieldLabel>
                <Textarea id="descripcion" name="descripcion" required placeholder="Zapatazo al angulo..." />
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

function RecentMatches({ matches }: { matches: MatchWithDetails[] }) {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle>Ultimos domingos</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {matches.slice(0, 5).map((match) => (
          <Link
            key={match.id}
            to={`/partidos/${match.id}`}
            className="flex items-center justify-between rounded-xl border bg-background/75 p-3 hover:bg-muted"
          >
            <div>
              <p className="font-bold">{match.fecha}</p>
              <p className="text-sm text-muted-foreground">{match.equipo_a_score}-{match.equipo_b_score}</p>
            </div>
            <Badge>{match.estado}</Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}

function nextSundayDate() {
  const date = new Date()
  const distance = (7 - date.getDay()) % 7 || 7
  date.setDate(date.getDate() + distance)

  return date.toISOString().slice(0, 10) || isoToday()
}
