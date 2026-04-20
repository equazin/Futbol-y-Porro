import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Crown, Goal, Lock, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/empty-state"
import { PlayerAvatar } from "@/components/player-avatar"
import { useAuth } from "@/components/auth-provider"
import { useAsyncData } from "@/hooks/use-async-data"
import {
  castVote,
  claimPlayer,
  closeVoting,
  getVoteWindow,
  getVotesForPlayer,
  getVotingMatches,
} from "@/lib/data"
import { playerLabel } from "@/lib/domain"
import type { MatchWithDetails, Player, Vote, VoteType, VoteWindow } from "@/lib/types"

export function VotingPage() {
  const { user } = useAuth()
  const { data: matches, error, loading, reload } = useAsyncData(getVotingMatches, [])
  const [matchId, setMatchId] = useState("")
  const [voterId, setVoterId] = useState("")
  const [votes, setVotes] = useState<Vote[]>([])
  const [windowInfo, setWindowInfo] = useState<VoteWindow | null>(null)
  const [pending, setPending] = useState(false)

  const activeMatchId = matchId || matches?.[0]?.id || ""
  const selectedMatch = matches?.find((match) => match.id === activeMatchId) ?? null
  const participants = useMemo(() => getParticipants(selectedMatch), [selectedMatch])
  const linkedPlayer = participants.find((player) => player.auth_user_id === user?.id) ?? null
  const activeVoterId = voterId || linkedPlayer?.id || ""
  const selectedVoter = participants.find((player) => player.id === activeVoterId) ?? null
  const hasMvpVote = votes.some((vote) => vote.type === "mvp")
  const hasGoalVote = votes.some((vote) => vote.type === "goal")
  const completed = hasMvpVote && hasGoalVote

  useEffect(() => {
    if (!activeMatchId || !activeVoterId) {
      return
    }

    let active = true

    Promise.all([getVotesForPlayer(activeMatchId, activeVoterId), getVoteWindow(activeMatchId)])
      .then(([nextVotes, nextWindow]) => {
        if (active) {
          setVotes(nextVotes)
          setWindowInfo(nextWindow)
        }
      })
      .catch((loadError) => {
        toast.error(loadError instanceof Error ? loadError.message : "No se pudo cargar votos.")
      })

    return () => {
      active = false
    }
  }, [activeMatchId, activeVoterId])

  async function handleVote(votedPlayerId: string, type: VoteType) {
    if (!activeMatchId || !activeVoterId) {
      toast.error("Elegi partido y votante.")
      return
    }

    setPending(true)

    try {
      await castVote({
        match_id: activeMatchId,
        voter_player_id: activeVoterId,
        voted_player_id: votedPlayerId,
        type,
      })
      setVotes(await getVotesForPlayer(activeMatchId, activeVoterId))
      toast.success(type === "mvp" ? "Voto MVP registrado." : "Voto gol registrado.")
    } catch (voteError) {
      toast.error(voteError instanceof Error ? voteError.message : "No se pudo votar.")
    } finally {
      setPending(false)
    }
  }

  async function handleCloseVoting() {
    if (!activeMatchId) {
      return
    }

    setPending(true)

    try {
      await closeVoting(activeMatchId)
      toast.success("Votacion cerrada y premios guardados.")
      await reload()
    } catch (closeError) {
      toast.error(closeError instanceof Error ? closeError.message : "No se pudo cerrar la votacion.")
    } finally {
      setPending(false)
    }
  }

  async function handleClaimPlayer() {
    if (!activeVoterId) {
      return
    }

    setPending(true)

    try {
      await claimPlayer(activeVoterId)
      toast.success("Jugador vinculado a tu usuario.")
    } catch (claimError) {
      toast.error(claimError instanceof Error ? claimError.message : "No se pudo vincular el jugador.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
      <section className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Boleta</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
            Votacion de la fecha
          </h1>
          <p className="text-muted-foreground">
            Dos decisiones: MVP y Gol de la fecha. Una vez por jugador.
          </p>
        </div>

        {!user ? (
          <Alert>
            <Lock />
            <AlertTitle>Necesitas iniciar sesion</AlertTitle>
            <AlertDescription>
              Entra con magic link para votar y vincular tu perfil de jugador.
            </AlertDescription>
          </Alert>
        ) : null}

        <Card className="scoreboard border-foreground">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3 text-background">
              <span>Tu boleta</span>
              <Badge className={completed ? "bg-accent text-accent-foreground" : "bg-background/15 text-background hover:bg-background/15"}>
                {completed ? "Completa" : "Pendiente"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-background">
            <div className="grid gap-3 sm:grid-cols-2">
              <Selector
                label="Partido"
                value={activeMatchId}
                onChange={(value) => {
                  setMatchId(value)
                  setVoterId("")
                  setVotes([])
                  setWindowInfo(null)
                }}
                options={(matches ?? []).map((match) => ({
                  value: match.id,
                  label: match.fecha,
                }))}
              />
              <Selector
                label="Votante"
                value={activeVoterId}
                onChange={(value) => {
                  setVoterId(value)
                  setVotes([])
                  setWindowInfo(null)
                }}
                options={participants.map((player) => ({
                  value: player.id,
                  label: playerLabel(player),
                }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <ProgressTile done={hasMvpVote} icon={Crown} label="MVP" />
              <ProgressTile done={hasGoalVote} icon={Goal} label="Gol" />
            </div>

            {windowInfo ? (
              <div className="rounded-xl bg-background/10 p-3 text-sm text-background/75">
                <p>Abre: {new Date(windowInfo.opens_at).toLocaleString("es-AR")}</p>
                <p>Cierra: {new Date(windowInfo.closes_at).toLocaleString("es-AR")}</p>
              </div>
            ) : null}

            {selectedVoter && !selectedVoter.auth_user_id ? (
              <Button variant="secondary" disabled={!user || pending} onClick={handleClaimPlayer}>
                <ShieldCheck data-icon="inline-start" />
                Vincular este jugador a mi usuario
              </Button>
            ) : null}

            <Button
              variant="outline"
              disabled={!activeMatchId || pending}
              onClick={handleCloseVoting}
              className="border-background/25 bg-background/10 text-background hover:bg-background/20 hover:text-background"
            >
              <CheckCircle2 data-icon="inline-start" />
              Cerrar votacion
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        {loading ? <div className="h-80 animate-pulse rounded-2xl bg-muted" /> : null}
        {error ? <EmptyState title="No se pudo cargar" description={error} /> : null}
        {!loading && !matches?.length ? (
          <EmptyState title="No hay votaciones abiertas" description="Marca un partido como jugado para abrir la boleta." />
        ) : null}
        {selectedMatch ? (
          <>
            <CandidateGroup
              title="Equipo A"
              players={participants.filter((player) => player.team === "A")}
              voterId={activeVoterId}
              hasMvpVote={hasMvpVote}
              hasGoalVote={hasGoalVote}
              pending={pending || !user}
              onVote={handleVote}
            />
            <CandidateGroup
              title="Equipo B"
              players={participants.filter((player) => player.team === "B")}
              voterId={activeVoterId}
              hasMvpVote={hasMvpVote}
              hasGoalVote={hasGoalVote}
              pending={pending || !user}
              onVote={handleVote}
            />
          </>
        ) : (
          !loading && <EmptyState title="Elegi un partido" description="Despues selecciona quien esta votando." />
        )}
      </section>
    </div>
  )
}

type Candidate = Player & {
  team: "A" | "B"
  goals: number
  assists: number
  rating: number | null
}

function getParticipants(match: MatchWithDetails | null): Candidate[] {
  return (
    match?.match_players
      .filter((item) => item.presente && item.players)
      .map((item) => ({
        ...item.players!,
        team: item.equipo,
        goals: item.goles,
        assists: item.asistencias,
        rating: item.calificacion,
      }))
      .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.nombre.localeCompare(b.nombre)) ?? []
  )
}

function Selector({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-bold text-background">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-xl border border-background/20 bg-background/10 px-3 text-sm text-background"
      >
        <option value="">Seleccionar</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function ProgressTile({
  done,
  icon: Icon,
  label,
}: {
  done: boolean
  icon: typeof Crown
  label: string
}) {
  return (
    <div className={done ? "rounded-xl bg-accent p-3 text-accent-foreground" : "rounded-xl bg-background/10 p-3 text-background"}>
      <Icon className="mb-3 size-5" />
      <p className="text-xs font-bold uppercase tracking-[0.18em]">{label}</p>
      <p className="text-sm font-black">{done ? "Votado" : "Pendiente"}</p>
    </div>
  )
}

function CandidateGroup({
  title,
  players,
  voterId,
  hasMvpVote,
  hasGoalVote,
  pending,
  onVote,
}: {
  title: string
  players: Candidate[]
  voterId: string
  hasMvpVote: boolean
  hasGoalVote: boolean
  pending: boolean
  onVote: (playerId: string, type: VoteType) => Promise<void>
}) {
  return (
    <Card className="overflow-hidden bg-card">
      <CardHeader className="border-b bg-foreground text-background">
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <Badge className="bg-background/15 text-background hover:bg-background/15">
            {players.length} candidatos
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-3 sm:p-4">
        {players.length ? (
          players.map((player) => (
            <VoteRow
              key={player.id}
              player={player}
              isSelf={player.id === voterId}
              hasMvpVote={hasMvpVote}
              hasGoalVote={hasGoalVote}
              pending={pending}
              onVote={onVote}
            />
          ))
        ) : (
          <EmptyState title="Sin jugadores" description="Asigna presentes a este equipo desde Admin." />
        )}
      </CardContent>
    </Card>
  )
}

function VoteRow({
  player,
  isSelf,
  hasMvpVote,
  hasGoalVote,
  pending,
  onVote,
}: {
  player: Candidate
  isSelf: boolean
  hasMvpVote: boolean
  hasGoalVote: boolean
  pending: boolean
  onVote: (playerId: string, type: VoteType) => Promise<void>
}) {
  return (
    <div className="grid gap-3 rounded-xl border bg-background/75 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <PlayerAvatar player={player} className="size-12" />
        <div className="min-w-0">
          <p className="truncate text-base font-black">{playerLabel(player)}</p>
          <p className="text-xs text-muted-foreground">
            {isSelf ? "No podes votarte" : `${player.goals}G · ${player.assists}A · ${player.rating ?? "-"} prom`}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={hasMvpVote ? "secondary" : "default"}
          disabled={pending || isSelf || hasMvpVote}
          onClick={() => onVote(player.id, "mvp")}
        >
          <Crown data-icon="inline-start" />
          MVP
        </Button>
        <Button
          variant={hasGoalVote ? "secondary" : "outline"}
          disabled={pending || isSelf || hasGoalVote}
          onClick={() => onVote(player.id, "goal")}
        >
          <Goal data-icon="inline-start" />
          Gol
        </Button>
      </div>
    </div>
  )
}
