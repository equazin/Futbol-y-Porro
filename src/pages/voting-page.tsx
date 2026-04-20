import { useEffect, useState } from "react"
import { CheckCircle2, Crown, Goal, Lock } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import type { MatchWithDetails, Vote, VoteType, VoteWindow } from "@/lib/types"

export function VotingPage() {
  const { user } = useAuth()
  const { data: matches, error, loading, reload } = useAsyncData(getVotingMatches, [])
  const [matchId, setMatchId] = useState("")
  const [voterId, setVoterId] = useState("")
  const [votes, setVotes] = useState<Vote[]>([])
  const [windowInfo, setWindowInfo] = useState<VoteWindow | null>(null)
  const [pending, setPending] = useState(false)

  const selectedMatch = matches?.find((match) => match.id === matchId) ?? null
  const participants =
    selectedMatch?.match_players
      .filter((item) => item.presente && item.players)
      .map((item) => item.players!)
      .sort((a, b) => a.nombre.localeCompare(b.nombre)) ?? []
  const hasMvpVote = votes.some((vote) => vote.type === "mvp")
  const hasGoalVote = votes.some((vote) => vote.type === "goal")
  const selectedVoter = participants.find((player) => player.id === voterId)

  useEffect(() => {
    if (!matchId || !voterId) {
      return
    }

    let active = true

    Promise.all([getVotesForPlayer(matchId, voterId), getVoteWindow(matchId)])
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
  }, [matchId, voterId])

  async function handleVote(votedPlayerId: string, type: VoteType) {
    if (!matchId || !voterId) {
      toast.error("Elegí partido y votante.")
      return
    }

    setPending(true)

    try {
      await castVote({
        match_id: matchId,
        voter_player_id: voterId,
        voted_player_id: votedPlayerId,
        type,
      })
      setVotes(await getVotesForPlayer(matchId, voterId))
      toast.success(type === "mvp" ? "Voto MVP registrado." : "Voto gol registrado.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo votar.")
    } finally {
      setPending(false)
    }
  }

  async function handleCloseVoting() {
    if (!matchId) {
      return
    }

    setPending(true)

    try {
      await closeVoting(matchId)
      toast.success("Votación cerrada y premios guardados.")
      await reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cerrar la votación.")
    } finally {
      setPending(false)
    }
  }

  async function handleClaimPlayer() {
    if (!voterId) {
      return
    }

    setPending(true)

    try {
      await claimPlayer(voterId)
      toast.success("Jugador vinculado a tu usuario.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo vincular el jugador.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <section className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Votación</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">MVP y Gol de la fecha</h1>
          <p className="text-muted-foreground">Una elección por jugador y por partido.</p>
        </div>

        {!user ? (
          <Alert>
            <Lock />
            <AlertTitle>Necesitás iniciar sesión</AlertTitle>
            <AlertDescription>Supabase Auth habilita escrituras y el backend valida los votos.</AlertDescription>
          </Alert>
        ) : null}

        <Card className="bg-card/86">
          <CardHeader>
            <CardTitle>Configurar voto</CardTitle>
            <CardDescription>Solo aparecen partidos en estado jugado.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Selector
              label="Partido"
              value={matchId}
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
              value={voterId}
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
            {windowInfo ? (
              <div className="rounded-2xl bg-muted/70 p-4 text-sm">
                <p>
                  Abre: <strong>{new Date(windowInfo.opens_at).toLocaleString("es-AR")}</strong>
                </p>
                <p>
                  Cierra: <strong>{new Date(windowInfo.closes_at).toLocaleString("es-AR")}</strong>
                </p>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Badge variant={hasMvpVote ? "default" : "secondary"}>
                {hasMvpVote ? "MVP votado" : "MVP pendiente"}
              </Badge>
              <Badge variant={hasGoalVote ? "default" : "secondary"}>
                {hasGoalVote ? "Gol votado" : "Gol pendiente"}
              </Badge>
            </div>
            {selectedVoter && !selectedVoter.auth_user_id ? (
              <Button variant="secondary" disabled={!user || pending} onClick={handleClaimPlayer}>
                Vincular este jugador a mi usuario
              </Button>
            ) : null}
            <Button variant="outline" disabled={!matchId || pending} onClick={handleCloseVoting}>
              <CheckCircle2 data-icon="inline-start" />
              Cerrar votación
            </Button>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="bg-card/86">
          <CardHeader>
            <CardTitle>Jugadores del partido</CardTitle>
            <CardDescription>El self-vote se bloquea en UI y también en PostgreSQL.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {loading ? <div className="h-80 animate-pulse rounded-3xl bg-muted" /> : null}
            {error ? <EmptyState title="No se pudo cargar" description={error} /> : null}
            {!loading && !matches?.length ? (
              <EmptyState title="No hay votaciones abiertas" description="Marcá un partido como jugado para votar." />
            ) : null}
            {selectedMatch ? (
              participants.map((player) => (
                <VoteRow
                  key={player.id}
                  player={player}
                  isSelf={player.id === voterId}
                  hasMvpVote={hasMvpVote}
                  hasGoalVote={hasGoalVote}
                  pending={pending || !user}
                  onVote={handleVote}
                />
              ))
            ) : (
              <EmptyState title="Elegí un partido" description="Después seleccioná quién está votando." />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
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
    <label className="flex flex-col gap-2 text-sm font-semibold">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-md border bg-background px-3 text-sm"
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

function VoteRow({
  player,
  isSelf,
  hasMvpVote,
  hasGoalVote,
  pending,
  onVote,
}: {
  player: NonNullable<MatchWithDetails["match_players"][number]["players"]>
  isSelf: boolean
  hasMvpVote: boolean
  hasGoalVote: boolean
  pending: boolean
  onVote: (playerId: string, type: VoteType) => Promise<void>
}) {
  return (
    <div className="grid gap-3 rounded-2xl border bg-background/70 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="flex items-center gap-3">
        <PlayerAvatar player={player} className="size-11" />
        <div className="min-w-0">
          <p className="truncate font-bold">{playerLabel(player)}</p>
          <p className="text-xs text-muted-foreground">{isSelf ? "No podés votarte" : player.posicion ?? "Jugador"}</p>
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
