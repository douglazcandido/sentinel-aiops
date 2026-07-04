import { useMemo } from "react"
import { TrendingUp, TrendingDown, Minus, CalendarDays } from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import { Topbar } from "@/components/topbar"
import { Card, CardHeader } from "@/components/card"
import { ChartSkeleton, Skeleton } from "@/components/skeleton"
import { ErrorState } from "@/components/states"
import { CHART_COLORS, axisProps, ChartTooltip } from "@/components/chart-theme"
import { usePrevisao } from "@/lib/hooks"
import { formatInt, formatDate, formatDateShort } from "@/lib/utils"

export default function PrevisaoPage() {
  const { data, loading, error, reload, version } = usePrevisao()

  const mediaD7 = useMemo(() => {
    if (!data?.d7?.length) return 0
    return data.d7.reduce((s, p) => s + p.total_previsto, 0) / data.d7.length
  }, [data])

  const d1 = data?.d1
  const diffPct = d1 && mediaD7 ? ((d1.total_previsto - mediaD7) / mediaD7) * 100 : 0
  const acima = diffPct > 1
  const abaixo = diffPct < -1

  const chartData = useMemo(
    () =>
      data?.d7?.map((p) => ({
        label: formatDateShort(p.data_referencia),
        data: p.data_referencia,
        previsto: p.total_previsto,
        inferior: p.limite_inferior,
        superior: p.limite_superior,
        // banda renderizada como base + range empilhado
        base: p.limite_inferior ?? null,
        range:
          p.limite_inferior != null && p.limite_superior != null
            ? p.limite_superior - p.limite_inferior
            : null,
      })) ?? [],
    [data],
  )

  const temBanda = chartData.some((d) => d.range != null)

  return (
    <>
      <Topbar
        title="Previsão"
        subtitle="Projeção de volume de incidentes — modelo NeuralProphet"
        label="Última atualização:"
        value={d1 ? formatDate(d1.data_referencia) : undefined}
        onRefresh={reload}
        refreshing={loading}
      />
      <div className="flex-1 space-y-5 p-6">
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Card grande D+1 */}
            <Card index={0} className="lg:col-span-1">
              <CardHeader title="Previsão D+1" subtitle="Próximo dia" icon={<TrendingUp className="h-4 w-4" />} />
              {!d1 ? (
                <>
                  <Skeleton className="h-14 w-40" />
                  <Skeleton className="mt-4 h-4 w-48" />
                </>
              ) : (
                <div key={version} className="flex h-[calc(100%-3rem)] flex-col justify-center animate-fade">
                  <div className="tnum text-5xl font-semibold tracking-tight text-[var(--color-foreground)]">
                    {formatInt(d1.total_previsto)}
                  </div>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    incidentes previstos para {formatDate(d1.data_referencia)}
                  </p>

                  <div className="mt-4 flex items-center gap-2">
                    <span
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium"
                      style={{
                        background: acima
                          ? "var(--color-risk-high-soft)"
                          : abaixo
                            ? "var(--color-risk-low-soft)"
                            : "var(--color-surface-3)",
                        color: acima
                          ? "var(--color-risk-high)"
                          : abaixo
                            ? "var(--color-risk-low)"
                            : "var(--color-muted)",
                      }}
                    >
                      {acima ? (
                        <TrendingUp className="h-3.5 w-3.5" />
                      ) : abaixo ? (
                        <TrendingDown className="h-3.5 w-3.5" />
                      ) : (
                        <Minus className="h-3.5 w-3.5" />
                      )}
                      {Math.abs(diffPct).toFixed(1)}% {acima ? "acima" : abaixo ? "abaixo" : "na"} da média
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-[var(--color-muted-2)]">
                    Média prevista dos próximos 7 dias: {formatInt(mediaD7)}
                  </p>
                  {(d1.limite_inferior != null || d1.limite_superior != null) && (
                    <p className="tnum mt-1 text-xs text-[var(--color-muted-2)]">
                      Intervalo: {formatInt(d1.limite_inferior ?? 0)} — {formatInt(d1.limite_superior ?? 0)}
                    </p>
                  )}
                </div>
              )}
            </Card>

            {/* D+7 área */}
            <div className="lg:col-span-2">
              {!data ? (
                <ChartSkeleton height={300} />
              ) : (
                <Card key={version} index={1}>
                  <CardHeader
                    title="Previsão D+7"
                    subtitle={
                      temBanda
                        ? "Volume previsto com intervalo de confiança"
                        : "Volume previsto para os próximos 7 dias"
                    }
                    icon={<CalendarDays className="h-4 w-4" />}
                  />
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData} margin={{ top: 8, right: 12 }}>
                      <defs>
                        <linearGradient id="gradPrev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CHART_COLORS.accent} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={CHART_COLORS.accent} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                      <XAxis dataKey="label" {...axisProps} />
                      <YAxis {...axisProps} width={48} domain={["auto", "auto"]} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          const p = payload[0].payload
                          const rows = [
                            {
                              label: "Previsto",
                              value: formatInt(p.previsto),
                              color: CHART_COLORS.accent,
                            },
                          ]
                          if (p.inferior != null && p.superior != null) {
                            rows.push({
                              label: "Intervalo",
                              value: `${formatInt(p.inferior)} – ${formatInt(p.superior)}`,
                              color: CHART_COLORS.muted,
                            })
                          }
                          return <ChartTooltip title={formatDate(p.data)} rows={rows} />
                        }}
                      />
                      {/* banda de confiança (base invisível + range) */}
                      {temBanda && (
                        <>
                          <Area
                            dataKey="base"
                            stackId="band"
                            stroke="none"
                            fill="transparent"
                            isAnimationActive={false}
                          />
                          <Area
                            dataKey="range"
                            stackId="band"
                            stroke="none"
                            fill={CHART_COLORS.accent}
                            fillOpacity={0.1}
                            isAnimationActive={false}
                          />
                        </>
                      )}
                      <Area
                        type="monotone"
                        dataKey="previsto"
                        stroke={CHART_COLORS.accent}
                        strokeWidth={2.5}
                        fill="url(#gradPrev)"
                        dot={{ r: 3, fill: CHART_COLORS.accent }}
                        activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
