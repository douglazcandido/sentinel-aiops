import { NavLink, useLocation } from "react-router-dom"
import {
  LayoutGrid,
  BarChart3,
  TrendingUp,
  ShieldAlert,
  Network,
  Lightbulb,
  LogOut,
  Pin,
  PinOff,
} from "lucide-react"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"

export const SIDEBAR_COLLAPSED_W = 68
export const SIDEBAR_EXPANDED_W = 240

export const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/historico", label: "Histórico", icon: BarChart3 },
  { to: "/previsao", label: "Previsão", icon: TrendingUp },
  { to: "/risco", label: "Risco OLA", icon: ShieldAlert },
  { to: "/padroes", label: "Padrões", icon: Network },
  { to: "/recomendacoes", label: "Recomendações", icon: Lightbulb },
]

interface SidebarProps {
  expanded: boolean
  pinned: boolean
  onHoverChange: (v: boolean) => void
  onPinnedChange: (v: boolean) => void
}

export function Sidebar({ expanded, pinned, onHoverChange, onPinnedChange }: SidebarProps) {
  const { user, logout } = useAuth()
  useLocation()

  return (
    <aside
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] pt-16",
        "transition-[width] duration-200 ease-out",
      )}
      style={{ width: expanded ? SIDEBAR_EXPANDED_W : SIDEBAR_COLLAPSED_W }}
    >
      {/* Nav */}
      <nav className="mt-8 flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "relative flex h-10 items-center gap-3 overflow-hidden rounded-lg px-[10px] text-sm transition-colors",
                isActive
                  ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                  : "text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]",
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-[var(--color-accent)]" />
                )}
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span
                  className={cn(
                    "whitespace-nowrap transition-opacity duration-200",
                    expanded ? "opacity-100" : "opacity-0",
                  )}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer: pin + user + logout */}
      <div className="border-t border-[var(--color-border)] p-3">
        {/* Pin button */}
        <div className="flex items-center gap-3 overflow-hidden rounded-lg px-1 py-1.5">
          <button
            onClick={() => onPinnedChange(!pinned)}
            title={pinned ? "Desafixar sidebar" : "Fixar sidebar aberta"}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all",
              pinned
                ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                : "text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]",
            )}
          >
            {pinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
          </button>
          <span
            className={cn(
              "whitespace-nowrap text-xs text-[var(--color-muted)] transition-opacity duration-200",
              expanded ? "opacity-100" : "opacity-0",
            )}
          >
            {pinned ? "Fixado" : "Fixar menu"}
          </span>
        </div>

        {/* User */}
        <div className="mt-1 flex items-center gap-3 overflow-hidden rounded-lg px-1 py-1.5">
          <div className="relative h-8 w-8 shrink-0">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-px -z-10 rounded-full bg-[var(--color-glow-blue)] opacity-[0.22] blur-sm"
            />
            <img
              src="/usuario-generico.svg"
              alt="Usuário"
              className="h-8 w-8 rounded-full border border-[var(--color-glow-blue)]/22 bg-[var(--color-surface-3)] object-cover"
            />
          </div>
          <div
            className={cn(
              "min-w-0 flex-1 transition-opacity duration-200",
              expanded ? "opacity-100" : "opacity-0",
            )}
          >
            <p className="truncate text-xs font-medium text-[var(--color-foreground)]">
              {user?.nome || "Usuário"}
            </p>
            <p className="truncate text-[11px] text-[var(--color-muted-2)]">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Sair"
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-muted)] transition-all duration-200 hover:bg-[var(--color-risk-high-soft)] hover:text-[var(--color-risk-high)]",
              expanded ? "opacity-100" : "opacity-0",
            )}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
