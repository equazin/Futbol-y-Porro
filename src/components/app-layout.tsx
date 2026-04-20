import { NavLink, Outlet } from "react-router-dom"
import { Trophy } from "lucide-react"
import { Toaster } from "@/components/ui/sonner"
import { AuthPanel } from "@/components/auth-panel"
import { Badge } from "@/components/ui/badge"
import { isSupabaseConfigured } from "@/lib/supabase"
import { ROUTES } from "@/lib/domain"
import { cn } from "@/lib/utils"

export function AppLayout() {
  return (
    <div className="min-h-svh overflow-x-hidden">
      <header className="sticky top-0 z-20 border-b bg-background/82 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-4">
          <NavLink to="/" className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Trophy />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-base font-black tracking-tight">
                Fútbol y Porro
              </span>
              <span className="hidden text-xs text-muted-foreground sm:block">
                Liga de domingo
              </span>
            </span>
          </NavLink>
          <div className="hidden lg:block">
            <AuthPanel />
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-3 pb-3 sm:px-4 lg:justify-center">
          {ROUTES.map((route) => (
            <NavLink
              key={route.href}
              to={route.href}
              className={({ isActive }) =>
                cn(
                  "rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground",
                  isActive &&
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                )
              }
            >
              {route.label}
            </NavLink>
          ))}
        </nav>
        <div className="mx-auto max-w-7xl px-3 pb-3 sm:px-4 lg:hidden">
          <AuthPanel />
        </div>
      </header>
      {!isSupabaseConfigured ? (
        <div className="mx-auto max-w-7xl px-3 pt-4 sm:px-4">
          <Badge variant="destructive">
            Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
          </Badge>
        </div>
      ) : null}
      <main className="mx-auto max-w-7xl px-3 py-5 sm:px-4 sm:py-8">
        <Outlet />
      </main>
      <Toaster richColors position="top-center" />
    </div>
  )
}
