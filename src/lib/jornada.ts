import type { DashboardData, FundLedgerItem, MatchWithDetails, PlayerProfile } from "@/lib/types"

export type JornadaStatus =
  | "sin-partido"
  | "programado"
  | "dia-partido"
  | "jugado"
  | "votacion-abierta"
  | "cerrado"

export type JornadaState = {
  status: JornadaStatus
  match: MatchWithDetails | null
  label: string
  title: string
  actionLabel: string
  actionHref: string
  tone: "idle" | "ready" | "live" | "vote" | "closed"
}

export function getJornadaState(data: DashboardData): JornadaState {
  const today = isoToday()
  const active =
    data.nextMatch ??
    data.matches.find((match) => match.estado === "jugado") ??
    data.latestMatch

  if (!active) {
    return {
      status: "sin-partido",
      match: null,
      label: "Liga sin fecha",
      title: "Crea el proximo domingo para arrancar la semana.",
      actionLabel: "Crear jornada",
      actionHref: "/admin",
      tone: "idle",
    }
  }

  if (active.estado === "cerrado") {
    return {
      status: "cerrado",
      match: active,
      label: "Jornada cerrada",
      title: "Resultado publicado, ranking actualizado y premios definidos.",
      actionLabel: "Ver ranking",
      actionHref: "/publico",
      tone: "closed",
    }
  }

  if (active.estado === "jugado") {
    const votingOpen = isVotingOpen(active)

    return {
      status: votingOpen ? "votacion-abierta" : "jugado",
      match: active,
      label: votingOpen ? "Votacion abierta" : "Partido jugado",
      title: votingOpen
        ? "Vota MVP y Gol de la fecha antes del cierre."
        : "Carga premios o abre la votacion para cerrar el domingo.",
      actionLabel: votingOpen ? "Votar ahora" : "Cargar premios",
      actionHref: votingOpen ? "/votacion" : `/partidos/${active.id}`,
      tone: votingOpen ? "vote" : "live",
    }
  }

  const status = active.fecha === today ? "dia-partido" : "programado"

  return {
    status,
    match: active,
    label: status === "dia-partido" ? "Hoy se juega" : "Proximo domingo",
    title:
      status === "dia-partido"
        ? "Arma equipos, confirma presentes y deja la jornada lista."
        : "La semana esta programada. Revisa confirmados y ranking.",
    actionLabel: status === "dia-partido" ? "Cerrar domingo" : "Ver jornada",
    actionHref: status === "dia-partido" ? "/admin" : "/partidos",
    tone: status === "dia-partido" ? "live" : "ready",
  }
}

export function getCurrentPlayer(players: PlayerProfile[], userId?: string | null) {
  if (!userId) {
    return null
  }

  return players.find((player) => player.auth_user_id === userId) ?? null
}

export function getPlayerBalance(ledger: FundLedgerItem[], playerId?: string | null) {
  if (!playerId) {
    return { paid: 0, due: 0, latest: null as FundLedgerItem | null }
  }

  return ledger
    .filter((item) => item.player_id === playerId)
    .reduce(
      (summary, item) => {
        if (item.tipo === "multa" && !item.pagada) {
          summary.due += item.monto
        } else {
          summary.paid += item.monto
        }

        summary.latest ??= item
        return summary
      },
      { paid: 0, due: 0, latest: null as FundLedgerItem | null }
    )
}

export function isVotingOpen(match: MatchWithDetails) {
  if (match.votacion_abre && match.votacion_cierra) {
    const now = Date.now()
    return now >= new Date(match.votacion_abre).getTime() && now < new Date(match.votacion_cierra).getTime()
  }

  return match.estado === "jugado" && !match.mvp_player_id && !match.gol_de_la_fecha_player_id
}

export function isoToday() {
  return new Date().toISOString().slice(0, 10)
}
