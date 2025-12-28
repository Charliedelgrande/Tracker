import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  Activity,
  Dumbbell,
  Flame,
  Gauge,
  Goal,
  Settings,
  Weight,
} from 'lucide-react'

const nav = [
  { to: '/', label: 'Dashboard', icon: Gauge },
  { to: '/calories', label: 'Calories', icon: Flame },
  { to: '/weight', label: 'Weight', icon: Weight },
  { to: '/workouts', label: 'Workouts', icon: Activity },
  { to: '/exercises', label: 'Exercises', icon: Dumbbell },
  { to: '/goals', label: 'Goals', icon: Goal },
  { to: '/insights', label: 'Insights', icon: Activity },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function AppLayout() {
  const location = useLocation()
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur md:hidden">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <div className="text-sm font-semibold tracking-tight">TrackOS</div>
          <div className="text-xs text-muted-foreground">Offline-first</div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-4 md:py-6">
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="px-2 py-2 text-sm font-semibold tracking-tight">
              TrackOS
              <div className="text-xs font-normal text-muted-foreground">
                Offline-first, local-only
              </div>
            </div>
            <nav className="mt-2 grid gap-1">
              {nav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground',
                      isActive && 'bg-muted text-foreground',
                    )
                  }
                  end={n.to === '/'}
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-24 md:pb-0">
          <div
            key={location.pathname}
            className="animate-in fade-in slide-in-from-bottom-1 duration-200"
          >
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav (thumb-first) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/90 backdrop-blur md:hidden">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-5 px-2 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {[
            nav[0], // dashboard
            nav[1], // calories
            nav[2], // weight
            nav[3], // workouts
            nav[7], // settings
          ].map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-xs text-muted-foreground',
                  isActive && 'text-foreground',
                )
              }
            >
              <n.icon className="h-5 w-5" />
              <span className="leading-none">{n.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}


