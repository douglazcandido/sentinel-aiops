import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface KpiCardProps {
  label: string
  value: ReactNode
  icon: ReactNode
  hint?: ReactNode
  tone?: "accent" | "high" | "med" | "low"
  index?: number
  title?: string
}

const TONE_MAP: Record<NonNullable<KpiCardProps["tone"]>, { bg: string; fg: string }> = {
  accent: { bg: "var(--color-accent-soft)", fg: "var(--color-accent)" },
  high: { bg: "var(--color-risk-high-soft)", fg: "var(--color-risk-high)" },
  med: { bg: "var(--color-risk-med-soft)", fg: "var(--color-risk-med)" },
  low: { bg: "var(--color-risk-low-soft)", fg: "var(--color-risk-low)" },
}

export function KpiCard({
  label,
  value,
  icon,
  hint,
  tone = "accent",
  index,
  title,
}: KpiCardProps) {
  const colors = TONE_MAP[tone]
  return (
    <div
      className="group relative animate-enter"
      style={{ animationDelay: index !== undefined ? `${index * 70}ms` : undefined }}
    >
      {/* Hover glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px -z-10 rounded-xl bg-[var(--color-glow-blue)] opacity-0 blur-sm transition-opacity duration-500 ease-in-out group-hover:opacity-[0.22]"
      />

      <div
        title={title}
        className={cn(
          "relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5",
          "transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--color-glow-blue)]/22",
          "hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)]",
        )}
      >
        {/* Top accent line */}
        <div
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{ background: colors.fg }}
        />

        <div className="flex items-start justify-between gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
            {label}
          </span>
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110"
            style={{ background: colors.bg, color: colors.fg }}
          >
            {icon}
          </span>
        </div>
        <div className="tnum mt-3 text-3xl font-semibold tracking-tight text-[var(--color-foreground)]">
          {value}
        </div>
        {hint && (
          <div className="mt-2 text-xs text-[var(--color-muted)]">{hint}</div>
        )}
      </div>
    </div>
  )
}
