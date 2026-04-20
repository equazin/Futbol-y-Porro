import { lazy, Suspense, type ReactNode } from "react"
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { AppLayout } from "@/components/app-layout"

const AdminPage = lazy(() =>
  import("@/pages/admin-page").then((module) => ({ default: module.AdminPage }))
)
const DashboardPage = lazy(() =>
  import("@/pages/dashboard-page").then((module) => ({ default: module.DashboardPage }))
)
const MatchesPage = lazy(() =>
  import("@/pages/matches-page").then((module) => ({ default: module.MatchesPage }))
)
const MatchDetailPage = lazy(() =>
  import("@/pages/match-detail-page").then((module) => ({
    default: module.MatchDetailPage,
  }))
)
const FundPage = lazy(() =>
  import("@/pages/fund-page").then((module) => ({ default: module.FundPage }))
)
const PlayerProfilePage = lazy(() =>
  import("@/pages/player-profile-page").then((module) => ({
    default: module.PlayerProfilePage,
  }))
)
const PublicRankingPage = lazy(() =>
  import("@/pages/public-ranking-page").then((module) => ({
    default: module.PublicRankingPage,
  }))
)
const SettingsPage = lazy(() =>
  import("@/pages/settings-page").then((module) => ({ default: module.SettingsPage }))
)
const StatsPage = lazy(() =>
  import("@/pages/stats-page").then((module) => ({ default: module.StatsPage }))
)
const PlayersPage = lazy(() =>
  import("@/pages/players-page").then((module) => ({ default: module.PlayersPage }))
)
const VotingPage = lazy(() =>
  import("@/pages/voting-page").then((module) => ({ default: module.VotingPage }))
)

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <PageShell><DashboardPage /></PageShell> },
      { path: "partidos", element: <PageShell><MatchesPage /></PageShell> },
      { path: "partidos/:matchId", element: <PageShell><MatchDetailPage /></PageShell> },
      { path: "votacion", element: <PageShell><VotingPage /></PageShell> },
      { path: "jugadores", element: <PageShell><PlayersPage /></PageShell> },
      { path: "jugadores/:playerId", element: <PageShell><PlayerProfilePage /></PageShell> },
      { path: "stats", element: <PageShell><StatsPage /></PageShell> },
      { path: "fondo", element: <PageShell><FundPage /></PageShell> },
      { path: "admin", element: <PageShell><AdminPage /></PageShell> },
      { path: "configuracion", element: <PageShell><SettingsPage /></PageShell> },
      { path: "publico", element: <PageShell><PublicRankingPage /></PageShell> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-muted" />}>
      {children}
    </Suspense>
  )
}
