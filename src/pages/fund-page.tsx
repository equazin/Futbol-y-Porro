import { type FormEvent, useState } from "react"
import { Download, Plus } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/empty-state"
import { StatCard } from "@/components/stat-card"
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
  const { data, error, loading, reload } = useAsyncData(getFundPageData, [])
  const [pending, setPending] = useState(false)

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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar la multa.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <section className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Fondo</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Caja común</h1>
          <p className="text-muted-foreground">Aportes automáticos, multas y export para Excel.</p>
        </div>
        {loading ? <div className="h-64 animate-pulse rounded-3xl bg-muted" /> : null}
        {error ? <EmptyState title="No se pudo cargar" description={error} /> : null}
        {data ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <StatCard title="Fondo acumulado" value={formatMoney(data.fund.fondo_acumulado)} />
              <StatCard title="Aportes" value={data.fund.aportes} />
              <StatCard title="Partidos con aportes" value={data.fund.partidos_con_aportes} />
            </div>
            <Card className="bg-card/86">
              <CardHeader>
                <CardTitle>Registrar multa</CardTitle>
                <CardDescription>Faltas, llegadas tarde o reglas internas.</CardDescription>
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
                        <Input id="motivo" name="motivo" required placeholder="Llegó tarde" />
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

      <section>
        <Card className="bg-card/86">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Movimientos</CardTitle>
              <CardDescription>Aportes y multas en orden cronológico.</CardDescription>
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
                <div key={`${item.tipo}-${item.id}`} className="grid gap-3 rounded-2xl border bg-background/70 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
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
