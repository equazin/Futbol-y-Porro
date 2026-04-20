import { NavLink, Outlet } from "react-router-dom"
import {
  BarChart3,
  CircleDollarSign,
  Home,
  Menu,
  Shield,
  Trophy,
  UserRound,
  Vote,
} from "lucide-react"
import { Toaster } from "@/components/ui/sonner"
import { AuthPanel } from "@/components/auth-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useAuth } from "@/components/auth-provider"
import { useAsyncData } from "@/hooks/use-async-data"
import { isCurrentUserAdmin } from "@/lib/data"
import { isSupabaseConfigured } from "@/lib/supabase"
import { PRIMARY_MOBILE_ROUTES, ROUTES, SECONDARY_ROUTES } from "@/lib/domain"
import { cn } from "@/lib/utils"

const mobileIcons = {
  "/": Home,
  "/partidos": Trophy,
  "/votacion": Vote,
  "/publico": BarChart3,
  "/jugadores": UserRound,
} as const

const secondaryIcons = {
  "/stats": BarChart3,
  "/fondo": CircleDollarSign,
  "/partidos": Trophy,
  "/admin": Shield,
  "/configuracion": Menu,
} as const

export function AppLayout() {
  const { user } = useAuth()
  const adminState = useAsyncData(isCurrentUserAdmin, [user?.id])
  const isAdmin = Boolean(adminState.data)
  const secondaryRoutes = SECONDARY_ROUTES.filter(
    (route) => isAdmin || (route.href !== "/admin" && route.href !== "/configuracion")
  )

  return (
    <div className="min-h-svh overflow-x-hidden">
      <header className="sticky top-0 z-30 border-b bg-background/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4 lg:py-3">
          <NavLink to="/" className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-foreground text-background shadow-sm">
              <Trophy className="size-5" />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-base font-black tracking-tight">
                Fútbol y Porro
              </span>
              <span className="hidden text-xs text-muted-foreground sm:block">
                Liga competitiva de domingo
              </span>
            </span>
          </NavLink>

          <nav className="hidden items-center gap-1 lg:flex">
            {ROUTES.filter(
              (route) => isAdmin || (route.href !== "/admin" && route.href !== "/configuracion")
            ).map((route) => (
              <NavPill key={route.href} href={route.href} label={route.label} />
            ))}
          </nav>

          <div className="hidden lg:block">
            <AuthPanel compact />
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden" aria-label="Abrir menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[88vw] max-w-sm overflow-y-auto" side="right">
              <SheetHeader>
                <SheetTitle>Menu de liga</SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-5">
                <AuthPanel />
                <div className="mt-5 grid gap-2">
                  {secondaryRoutes.map((route) => {
                    const Icon = secondaryIcons[route.href as keyof typeof secondaryIcons] ?? Menu

                    return (
                      <NavLink
                        key={`${route.href}-${route.label}`}
                        to={route.href}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 rounded-xl border bg-background p-3 text-sm font-bold transition hover:bg-muted",
                            isActive && "border-primary bg-secondary text-primary"
                          )
                        }
                      >
                        <Icon className="size-4" />
                        {route.label}
                      </NavLink>
                    )
                  })}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {!isSupabaseConfigured ? (
        <div className="mx-auto max-w-7xl px-3 pt-3 sm:px-4">
          <Badge variant="destructive">
            Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
          </Badge>
        </div>
      ) : null}

      <main className="bottom-safe mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-7 lg:pb-10">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/94 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {PRIMARY_MOBILE_ROUTES.map((route) => {
            const Icon = mobileIcons[route.href]

            return (
              <NavLink
                key={route.href}
                to={route.href}
                className={({ isActive }) =>
                  cn(
                    "flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[0.68rem] font-bold text-muted-foreground transition",
                    isActive && "bg-foreground text-background"
                  )
                }
              >
                <Icon className="size-4" />
                <span className="truncate">{route.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>

      <Toaster richColors position="top-center" />
    </div>
  )
}

function NavPill({ href, label }: { href: string; label: string }) {
  return (
    <NavLink
      to={href}
      className={({ isActive }) =>
        cn(
          "rounded-xl px-3 py-2 text-sm font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground",
          isActive && "bg-foreground text-background hover:bg-foreground hover:text-background"
        )
      }
    >
      {label}
    </NavLink>
  )
}
