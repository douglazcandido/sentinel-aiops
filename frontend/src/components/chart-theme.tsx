import type { ReactNode } from "react"

export const CHART_COLORS = {
  accent: "#22d3ee",
  accent2: "#0ea5e9",
  high: "#f43f5e",
  med: "#f59e0b",
  low: "#10b981",
  grid: "#232a36",
  axis: "#5c6473",
  muted: "#8b94a3",
}

export const RISK_COLORS: Record<string, string> = {
  Baixo: CHART_COLORS.low,
  Medio: CHART_COLORS.med,
  Médio: CHART_COLORS.med,
  Alto: CHART_COLORS.high,
}

export const axisProps = {
  stroke: CHART_COLORS.axis,
  tick: { fill: CHART_COLORS.muted, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: CHART_COLORS.grid },
}

/** Shared entrance-animation timing for chart series (bars/lines/areas). */
export const CHART_ANIMATION = {
  duration: 900,
  easing: "ease-out" as const,
}

/** Stagger offset (ms) for the i-th series in a multi-series chart, for a sequential draw-in cadence. */
export function chartStagger(i: number, step = 140) {
  return i * step
}

/** Shared dark tooltip wrapper used across all charts. */
export function ChartTooltip({
  title,
  rows,
}: {
  title: string
  rows: { label: string; value: ReactNode; color?: string }[]
}) {
  return (
    <div className="rounded-lg border border-[var(--color-accent)]/40 bg-[#0c1119] px-3 py-2 shadow-xl">
      <p className="mb-1.5 text-xs font-semibold text-[var(--color-foreground)]">{title}</p>
      <div className="flex flex-col gap-1">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-[var(--color-muted)]">
              {r.color && (
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: r.color }}
                />
              )}
              {r.label}
            </span>
            <span className="tnum font-medium text-[var(--color-foreground)]">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
