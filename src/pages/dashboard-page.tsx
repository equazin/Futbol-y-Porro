import { Link } from "react-router-dom"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { CalendarDays, Coins, Medal, Shirt, Trophy } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { EmptyState } from "@/components/empty-state"
import { Leaderboard } from "@/components/leaderboard"
import { MatchCard } from "@/components/match-card"
import { StatCard } from "@/components/stat-card"
import { useAsyncData } from "@/hooks/use-async-data"
import { POINTS, PRIZES } from "@/lib/domain"
import { formatMoney, formatNumber, formatShortDate } from "@/lib/format"
import { getDashboardData } from "@/lib/data"
import stadiumHero from "@/assets/stadium-hero.jpg"

const chartConfig = {
  goles: {
    label: "Goles",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function DashboardPage() {
  const { data, error, loading } = useAsyncData(getDashboardData, [])

  if (loading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>No se pudo cargar Supabase</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!data) {
    return null
  }

  const chartData = data.matches
    .filter((match) => match.estado !== "pendiente")
    .slice(0, 8)
    .reverse()
    .map((match) => ({
      fecha: formatShortDate(match.fecha),
      goles: match.equipo_a_score + match.equipo_b_score,
    }))

  return (
    <div className="flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-[2rem] border bg-primary p-5 text-primary-foreground shadow-xl sm:p-8">
        <img
          src={stadiumHero}
          alt="Estadio iluminado"
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-primary via-primary/90 to-primary/35" />
        <div className="pitch-pattern absolute inset-0 opacity-35" />
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="animate-rise-in max-w-2xl">
            <Badge className="mb-4 bg-accent text-accent-foreground hover:bg-accent">
              Domingo, potrero y tabla anual
            </Badge>
            <h1 className="text-4xl font-black tracking-tighter sm:text-6xl">
              Gestión rápida para decidir todo desde la cancha.
            </h1>
            <p className="mt-4 max-w-xl text-primary-foreground/80">
              Partidos, votos, ranking, fondo común y premios en una app mobile-first.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="secondary" size="lg">
                <Link to="/admin">Cargar partido</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="bg-primary-foreground/10">
                <Link to="/votacion">Ir a votación</Link>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Prize icon={Trophy} label={PRIZES[0].place} value={PRIZES[0].reward} />
            <Prize icon={Medal} label={PRIZES[1].place} value={PRIZES[1].reward} />
            <Prize icon={Shirt} label={PRIZES[2].place} value={PRIZES[2].reward} />
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Fondo acumulado" value={formatMoney(data.fund.fondo_acumulado)} detail={`${data.fund.aportes} aportes registrados`} />
        <StatCard title="Jugadores" value={data.players.length} detail="plantel activo" />
        <StatCard title="Partidos" value={data.matches.length} detail="historial completo" />
        <StatCard title="Sistema de puntos" value={`+${POINTS.mvp}`} detail="bonus por MVP" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <div className="flex flex-col gap-6">
          {data.latestMatch ? (
            <MatchCard match={data.latestMatch} />
          ) : (
            <EmptyState
              title="Todavía no hay partidos jugados"
              description="Cuando cierres o marques un partido como jugado aparecerá acá."
            />
          )}
          <Card className="bg-card/86">
            <CardHeader>
              <CardTitle>Goles por partido</CardTitle>
              <CardDescription>Evolución reciente de rendimiento colectivo.</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length ? (
                <ChartContainer config={chartConfig} className="h-56 w-full">
                  <AreaChart data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="fecha" tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      dataKey="goles"
                      type="natural"
                      fill="var(--color-goles)"
                      fillOpacity={0.22}
                      stroke="var(--color-goles)"
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <EmptyState title="Sin gráfico todavía" description="Cargá resultados para ver tendencia." />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="bg-card/86">
            <CardHeader>
              <CardTitle>Top 10 ranking</CardTitle>
              <CardDescription>Calculado con asistencia, goles, asistencias y premios.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.rankings.length ? (
                <Leaderboard players={data.rankings} />
              ) : (
                <EmptyState title="Ranking vacío" description="Agregá jugadores y partidos para empezar." />
              )}
            </CardContent>
          </Card>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Highlight
              icon={CalendarDays}
              title="Próximo partido"
              value={data.nextMatch ? formatShortDate(data.nextMatch.fecha) : "Sin fecha"}
            />
            <Highlight
              icon={Coins}
              title="MVP reciente"
              value={data.recentMvp?.apodo ?? data.recentMvp?.nombre ?? "Pendiente"}
            />
            <Highlight
              icon={Trophy}
              title="Gol de la fecha"
              value={data.goalOfWeek?.apodo ?? data.goalOfWeek?.nombre ?? "Pendiente"}
            />
          </div>
        </div>
      </section>
    </div>
  )
}

function Prize({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy
  label: string
  value: string
}) {
  return (
    <div className="rounded-3xl bg-primary-foreground/12 p-4 backdrop-blur">
      <Icon className="mb-6" />
      <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/65">{label}</p>
      <p className="font-black">{value}</p>
    </div>
  )
}

function Highlight({
  icon: Icon,
  title,
  value,
}: {
  icon: typeof Trophy
  title: string
  value: string
}) {
  return (
    <Card className="bg-card/86">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary">
          <Icon />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="truncate text-lg font-black">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-72 animate-pulse rounded-[2rem] bg-muted" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-32 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Cargando datos reales desde Supabase... {formatNumber(0)}
      </p>
    </div>
  )
}
