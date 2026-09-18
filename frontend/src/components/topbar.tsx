import type { ReactNode } from "react"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface TopbarProps {
  title: string
  subtitle?: string
  /** Muted prefix, e.g. "Última atualização:". Omit when `value` is a standalone phrase. */
  label?: string
  /** Emphasized info shown next to the refresh icon, e.g. a date or a count. */
  value?: string
  onRefresh?: () => void
  refreshing?: boolean
  /** Extra elements rendered on the right side, to the left of the refresh button (e.g. a filter trigger). */
  actions?: ReactNode
}

export function Topbar({ title, subtitle, label, value, onRefresh, refreshing, actions }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-[var(--color-border)] bg-[var(--color-background)]/85 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-0 sm:min-h-16">
      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold tracking-tight text-[var(--color-foreground)] sm:text-lg">
          {title}
        </h1>
        {subtitle && <p className="text-xs text-[var(--color-muted)]">{subtitle}</p>}
      </div>
      {(actions || value) && (
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {value && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={!onRefresh || refreshing}
              title="Atualizar dados"
              className={cn(
                "flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-muted)] transition-colors",
                "hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]",
                "disabled:cursor-wait disabled:hover:border-[var(--color-border)] disabled:hover:text-[var(--color-muted)]",
              )}
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5 text-[var(--color-accent)]", refreshing && "animate-spin-slow")}
              />
              <span>
                {label && <>{label} </>}
                <span className="text-[var(--color-foreground)]">{value}</span>
              </span>
            </button>
          )}
        </div>
      )}
    </header>
  )
}
