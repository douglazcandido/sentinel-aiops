import type { ReactNode } from "react"

// Referências às CSS variables do tema, para os gráficos mudarem de cor
// automaticamente no toggle claro/escuro (var() em atributos SVG funciona
// nos navegadores modernos).
export const CHART_COLORS = {
  accent: "var(--color-accent)",
  accent2: "var(--color-accent-2)",
  high: "var(--color-risk-high)",
  med: "var(--color-risk-med)",
  low: "var(--color-risk-low)",
  grid: "var(--color-border)",
  axis: "var(--color-muted-2)",
  muted: "var(--color-muted)",
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

/** Shared tooltip wrapper used across all charts. */
export function ChartTooltip({
  title,
  rows,
}: {
  title: string
  rows: { label: string; value: ReactNode; color?: string }[]
}) {
  return (
    <div className="rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-surface-2)] px-3 py-2 shadow-xl">
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
