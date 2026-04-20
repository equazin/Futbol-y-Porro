import { type FormEvent, useState } from "react"
import { Download, Plus, Wallet } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/empty-state"
import { useAuth } from "@/components/auth-provider"
import { useAsyncData } from "@/hooks/use-async-data"
import {
  createFine,
  getFundLedger,
  getFundSummary,
  getMatches,
  getPlayers,
  updateFinePaid,
} from "@/lib/data"
import { downloadCsv, playerLabel } from "@/lib/domain"
import { formatMoney, formatShortDate } from "@/lib/format"
import { getCurrentPlayer, getPlayerBalance } from "@/lib/jornada"

async function getFundPageData() {
  const [fund, ledger, players, matches] = await Promise.all([
    getFundSummary(),
    getFundLedger(),
    getPlayers(),
    getMatches(),
  ])

  return { fund, ledger, players, matches }
}

export function FundPage() {
  const { user } = useAuth()
  const { data, error, loading, reload } = useAsyncData(getFundPageData, [])
  const [pending, setPending] = useState(false)
  const currentPlayer = data ? getCurrentPlayer(data.players, user?.id) : null
  const balance = data ? getPlayerBalance(data.ledger, currentPlayer?.id) : null
  const pendingFines =
    data?.ledger.filter((item) => item.tipo === "multa" && !item.pagada).slice(0, 6) ?? []

  async function handleFine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)

    try {
      await createFine({
        player_id: String(form.get("player_id")),
        match_id: String(form.get("match_id") ?? ""),
        motivo: String(form.get("motivo")),
        monto: Number(form.get("monto") ?? 0),
        pagada: form.get("pagada") === "on",
        fecha: String(form.get("fecha") ?? ""),
      })
      toast.success("Multa registrada.")
      event.currentTarget.reset()
      await reload()
    } catch (fineError) {
      toast.error(fineError instanceof Error ? fineError.message : "No se pudo registrar la multa.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
      <section className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Caja</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Fondo comun</h1>
          <p className="text-muted-foreground">Primero tu estado, despues el ledger completo.</p>
        </div>
        {loading ? <div className="h-64 animate-pulse rounded-2xl bg-muted" /> : null}
        {error ? <EmptyState title="No se pudo cargar" description={error} /> : null}

        {data ? (
          <>
            <section className="scoreboard rounded-2xl border border-foreground p-4 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
                    Mi caja
                  </p>
                  <h2 className="mt-1 text-3xl font-black text-background">
                    {currentPlayer ? currentPlayer.apodo ?? currentPlayer.nombre : "Sin vincular"}
                  </h2>
                </div>
                <Wallet className="size-7 text-accent" />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-background">
                <MoneyTile label="Debes" value={formatMoney(balance?.due ?? 0)} />
                <MoneyTile label="Pagado" value={formatMoney(balance?.paid ?? 0)} />
                <MoneyTile label="Fondo" value={formatMoney(data.fund.fondo_acumulado)} />
              </div>
              <p className="mt-4 text-sm text-background/65">
                Ultimo movimiento: {balance?.latest ? `${formatShortDate(balance.latest.fecha)} · ${balance.latest.tipo}` : "sin movimientos propios"}
              </p>
            </section>

            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Registrar multa</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleFine}>
                  <FieldSet>
                    <FieldGroup>
                      <Field>
                        <FieldLabel>Jugador</FieldLabel>
                        <select name="player_id" required className="h-10 rounded-md border bg-background px-3 text-sm">
                          <option value="">Elegir jugador</option>
                          {data.players.map((player) => (
                            <option key={player.id} value={player.id}>
                              {playerLabel(player)}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field>
                        <FieldLabel>Partido opcional</FieldLabel>
                        <select name="match_id" className="h-10 rounded-md border bg-background px-3 text-sm">
                          <option value="">Sin partido</option>
                          {data.matches.map((match) => (
                            <option key={match.id} value={match.id}>
                              {match.fecha}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="motivo">Motivo</FieldLabel>
                        <Input id="motivo" name="motivo" required placeholder="Llego tarde" />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="monto">Monto</FieldLabel>
                        <Input id="monto" name="monto" type="number" min={1} required />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="fecha">Fecha</FieldLabel>
                        <Input id="fecha" name="fecha" type="date" />
                      </Field>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox name="pagada" />
                        Pagada
                      </label>
                      <Button disabled={pending}>
                        <Plus data-icon="inline-start" />
                        Agregar multa
                      </Button>
                    </FieldGroup>
                  </FieldSet>
                </form>
              </CardContent>
            </Card>
          </>
        ) : null}
      </section>

      <section className="flex flex-col gap-4">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Multas pendientes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {pendingFines.length ? (
              pendingFines.map((item) => (
                <div key={`${item.tipo}-${item.id}`} className="flex items-center justify-between gap-3 rounded-xl border bg-background/75 p-3">
                  <div>
                    <p className="font-black">{item.apodo ?? item.nombre}</p>
                    <p className="text-sm text-muted-foreground">{formatShortDate(item.fecha)} · {item.tipo}</p>
                  </div>
                  <Badge variant="secondary">{formatMoney(item.monto)}</Badge>
                </div>
              ))
            ) : (
              <EmptyState title="Nadie debe" description="Las multas impagas aparecen aca primero." />
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Movimientos</CardTitle>
              <p className="text-sm text-muted-foreground">Aportes y multas en orden cronologico.</p>
            </div>
            <Button
              variant="outline"
              disabled={!data?.ledger.length}
              onClick={() => data && downloadCsv("fondo-futbol-y-porro.csv", data.ledger)}
            >
              <Download data-icon="inline-start" />
              Excel
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {data?.ledger.length ? (
              data.ledger.map((item) => (
                <div key={`${item.tipo}-${item.id}`} className="grid gap-3 rounded-xl border bg-background/75 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="font-bold">{item.apodo ?? item.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatShortDate(item.fecha)} · {item.tipo}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.tipo === "aporte" ? "default" : "secondary"}>
                      {formatMoney(item.monto)}
                    </Badge>
                    {item.tipo === "multa" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await updateFinePaid(item.id, !item.pagada)
                          await reload()
                        }}
                      >
                        {item.pagada ? "Pagada" : "Debe"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="Sin movimientos" description="Los aportes aparecen al cargar presentes." />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function MoneyTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background/10 p-2">
      <p className="text-[0.65rem] font-bold uppercase text-background/55">{label}</p>
      <p className="truncate text-lg font-black text-background">{value}</p>
    </div>
  )
}
