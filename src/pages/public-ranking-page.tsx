import { Download, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/empty-state"
import { Leaderboard } from "@/components/leaderboard"
import { useAsyncData } from "@/hooks/use-async-data"
import { getPlayers } from "@/lib/data"
import { downloadCsv, whatsappUrl } from "@/lib/domain"

export function PublicRankingPage() {
  const { data, error, loading } = useAsyncData(getPlayers, [])
  const rankings = data ? [...data].sort((a, b) => b.puntos - a.puntos) : []
  const publicUrl = `${window.location.origin}/publico`

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <section className="rounded-[2rem] border bg-primary p-6 text-primary-foreground sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary-foreground/70">
          Modo público
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-6xl">
          Ranking Fútbol y Porro
        </h1>
        <p className="mt-3 text-primary-foreground/75">
          Tabla visible para compartir sin entrar al panel admin.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild variant="secondary">
            <a href={whatsappUrl(`Ranking Fútbol y Porro: ${publicUrl}`)} target="_blank" rel="noreferrer">
              <Share2 data-icon="inline-start" />
              Compartir
            </a>
          </Button>
          <Button
            variant="outline"
            className="bg-primary-foreground/10"
            disabled={!rankings.length}
            onClick={() => downloadCsv("ranking-futbol-y-porro.csv", rankings)}
          >
            <Download data-icon="inline-start" />
            Excel
          </Button>
        </div>
      </section>

      <Card className="bg-card/86">
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>Puntos calculados automáticamente desde Supabase.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <div className="h-72 animate-pulse rounded-3xl bg-muted" /> : null}
          {error ? <EmptyState title="No se pudo cargar" description={error} /> : null}
          {!loading && rankings.length ? (
            <Leaderboard players={rankings} limit={50} />
          ) : (
            !loading && <EmptyState title="Ranking vacío" description="Aún no hay jugadores con puntos." />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
