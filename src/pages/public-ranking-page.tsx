import { Download, Share2, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CompetitiveRanking } from "@/components/competitive-ranking"
import { EmptyState } from "@/components/empty-state"
import { MatchCard } from "@/components/match-card"
import { useAsyncData } from "@/hooks/use-async-data"
import { getDashboardData } from "@/lib/data"
import { downloadCsv, whatsappUrl } from "@/lib/domain"
import { formatShortDate } from "@/lib/format"

export function PublicRankingPage() {
  const { data, error, loading } = useAsyncData(getDashboardData, [])
  const rankings = data ? [...data.rankings] : []
  const publicUrl = `${window.location.origin}/publico`
  const updatedAt = data?.latestMatch?.fecha ?? data?.nextMatch?.fecha

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <section className="scoreboard overflow-hidden rounded-2xl border border-foreground p-4 shadow-xl sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mb-4 flex items-center gap-2 text-background/70">
              <Trophy className="size-5 text-accent" />
              <span className="text-xs font-bold uppercase tracking-[0.22em]">
                Ranking publico
              </span>
            </div>
            <h1 className="text-4xl font-black leading-none tracking-tight text-background sm:text-6xl">
              Fútbol y Porro
            </h1>
            <p className="mt-3 text-sm text-background/70 sm:text-base">
              Tabla anual, podio, premios y ultimo domingo listos para compartir.
            </p>
            {updatedAt ? (
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-background/45">
                Actualizado {formatShortDate(updatedAt)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <a href={whatsappUrl(`Ranking Fútbol y Porro: ${publicUrl}`)} target="_blank" rel="noreferrer">
                <Share2 data-icon="inline-start" />
                Compartir
              </a>
            </Button>
            <Button
              variant="outline"
              className="border-background/25 bg-background/10 text-background hover:bg-background/20 hover:text-background"
              disabled={!rankings.length}
              onClick={() => downloadCsv("ranking-futbol-y-porro.csv", rankings)}
            >
              <Download data-icon="inline-start" />
              Excel
            </Button>
          </div>
        </div>
      </section>

      {loading ? <div className="h-96 animate-pulse rounded-2xl bg-muted" /> : null}
      {error ? <EmptyState title="No se pudo cargar" description={error} /> : null}

      {!loading && data ? (
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <section>
            <CompetitiveRanking players={rankings} limit={50} />
          </section>
          <aside className="flex flex-col gap-4">
            {data.latestMatch ? (
              <MatchCard match={data.latestMatch} />
            ) : (
              <Card className="bg-card">
                <CardContent className="p-5">
                  <EmptyState title="Sin ultimo partido" description="El resumen aparece cuando se carga el primer resultado." />
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      ) : null}
    </div>
  )
}
