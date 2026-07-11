import { useState, useMemo } from "react"
import {
  Database,
  Bot,
  UserX,
  OctagonAlert,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts"
import { Topbar } from "@/components/topbar"
import { KpiCard } from "@/components/kpi-card"
import { Card, CardHeader } from "@/components/card"
import { KpiSkeleton, ChartSkeleton } from "@/components/skeleton"
import { ErrorState, EmptyState } from "@/components/states"
import { ProgressBar } from "@/components/badge"
import { CHART_COLORS, CHART_ANIMATION, chartStagger, axisProps, ChartTooltip } from "@/components/chart-theme"
import { AnimatedNumber } from "@/components/animated-number"
import { MonthPicker, type PeriodoFiltro } from "@/components/month-picker"
import { useHistorico } from "@/lib/hooks"
import {
  abbreviateNumber,
  cn,
  formatInt,
  formatPct,
  formatDate,
  diaSemanaCurto,
  mesLabel,
} from "@/lib/utils"
import type { VolumeMensal, ViolacaoMensal, VolumePorGrupo } from "@/lib/types"

const PRIORIDADE_CORES = [CHART_COLORS.high, CHART_COLORS.med, CHART_COLORS.accent, CHART_COLORS.low]

type GrupoCol = keyof VolumePorGrupo
type SortDir = "asc" | "desc"

const GRUPO_COLUNAS: { key: GrupoCol; label: string; alignRight: boolean }[] = [
  { key: "grupo_nome", label: "Grupo", alignRight: false },
  { key: "total_incidentes", label: "Incidentes", alignRight: true },
  { key: "total_no_kpi", label: "No KPI", alignRight: true },
  { key: "total_violacoes", label: "Violações", alignRight: true },
  { key: "pct_sem_intervencao", label: "Sem intervenção", alignRight: false },
]

/** Pivot monthly rows (split by priority) into chart points keyed by "Mês/AA". */
function pivotMensal<T extends { ano: number; mes: number; prioridade_label: string }>(
  rows: T[],
  valueKey: keyof T,
  selected: Set<string>,
): { points: Record<string, number | string>[]; prioridades: string[] } {
  const prioridades = Array.from(new Set(rows.map((r) => r.prioridade_label)))
  const map = new Map<string, Record<string, number | string>>()
  for (const r of rows) {
    if (selected.size && !selected.has(r.prioridade_label)) continue
    const key = `${mesLabel(r.mes)}/${String(r.ano).slice(2)}`
    const sortKey = r.ano * 100 + r.mes
    if (!map.has(key)) map.set(key, { label: key, _sort: sortKey })
    const obj = map.get(key)!
    obj[r.prioridade_label] = ((obj[r.prioridade_label] as number) || 0) + (r[valueKey] as number)
  }
  const points = Array.from(map.values()).sort((a, b) => (a._sort as number) - (b._sort as number))
  return { points, prioridades }
}

export default function HistoricoPage() {
  const { data, loading, error, reload, version } = useHistorico()
  const [prioMensal, setPrioMensal] = useState<Set<string>>(new Set())
  const [periodo, setPeriodo] = useState<PeriodoFiltro | null>(null)
  const [grupoSort, setGrupoSort] = useState<{ col: GrupoCol; dir: SortDir }>({
    col: "total_incidentes",
    dir: "desc",
  })

  const mesesPorAno = useMemo(() => {
    const map = new Map<number, Set<number>>()
    data?.volume_mensal.forEach((r) => {
      if (!map.has(r.ano)) map.set(r.ano, new Set())
      map.get(r.ano)!.add(r.mes)
    })
    return map
  }, [data])

  function toggleGrupoSort(col: GrupoCol) {
    setGrupoSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: col === "grupo_nome" ? "asc" : "desc" },
    )
  }

  const grupoOrdenado = useMemo(() => {
    if (!data) return []
    const { col, dir } = grupoSort
    const sinal = dir === "asc" ? 1 : -1
    return [...data.volume_por_grupo].sort((a, b) => {
      const va = a[col]
      const vb = b[col]
      const cmp = typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number)
      return cmp * sinal
    })
  }, [data, grupoSort])

  const prioridades = useMemo(
    () => (data ? Array.from(new Set(data.volume_mensal.map((r) => r.prioridade_label))) : []),
    [data],
  )

  function togglePrio(p: string) {
    setPrioMensal((prev) => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else next.add(p)
      return next
    })
  }

  const volumeMensalFiltrado = useMemo(() => {
    if (!data) return []
    if (!periodo) return data.volume_mensal
    return data.volume_mensal.filter(
      (r) => r.ano === periodo.ano && (periodo.mes === null || r.mes === periodo.mes),
    )
  }, [data, periodo])

  const violacoesMensalFiltrado = useMemo(() => {
    if (!data) return []
    if (!periodo) return data.violacoes_mensal
    return data.violacoes_mensal.filter(
      (r) => r.ano === periodo.ano && (periodo.mes === null || r.mes === periodo.mes),
    )
  }, [data, periodo])

  const volumeMensal = useMemo(
    () => (data ? pivotMensal<VolumeMensal>(volumeMensalFiltrado, "total_incidentes", prioMensal) : null),
    [data, volumeMensalFiltrado, prioMensal],
  )
  const violacoesMensal = useMemo(
    () =>
      data
        ? pivotMensal<ViolacaoMensal>(violacoesMensalFiltrado, "total_violacoes", prioMensal)
        : null,
    [data, violacoesMensalFiltrado, prioMensal],
  )

  const totalIncidentesPeriodo = useMemo(
    () =>
      periodo
        ? volumeMensalFiltrado.reduce((s, r) => s + r.total_incidentes, 0)
        : (data?.kpis_gerais.total_incidentes ?? 0),
    [periodo, volumeMensalFiltrado, data],
  )

  const maxHora = useMemo(
    () => (data ? Math.max(...data.volume_por_hora.map((h) => h.total_incidentes)) : 0),
    [data],
  )
  const maxDia = useMemo(
    () => (data ? Math.max(...data.volume_por_dia_semana.map((d) => d.total_incidentes)) : 0),
    [data],
  )

  const k = data?.kpis_gerais

  return (
    <>
      <Topbar
        title="Histórico"
        subtitle="Análise exploratória e agregações dos incidentes"
        label="Última atualização:"
        value={k ? formatDate(k.periodo_fim) : undefined}
        onRefresh={reload}
        refreshing={loading}
        actions={
          <MonthPicker
            value={periodo}
            onChange={setPeriodo}
            mesesDisponiveis={(ano) => mesesPorAno.get(ano) ?? new Set()}
          />
        }
      />
      <div className="flex-1 space-y-5 p-6">
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <>
            {/* KPIs */}
            <div key={`kpis-${version}`} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {!k ? (
                Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
              ) : (
                <>
                  <KpiCard
                    index={0}
                    label="Total de Incidentes"
                    icon={<Database className="h-4 w-4" />}
                    value={<AnimatedNumber value={totalIncidentesPeriodo} format={formatInt} />}
                    hint={
                      periodo
                        ? periodo.mes
                          ? `${mesLabel(periodo.mes)}/${periodo.ano}`
                          : `Ano de ${periodo.ano}`
                        : `${formatDate(k.periodo_inicio)} — ${formatDate(k.periodo_fim)}`
                    }
                  />
                  <KpiCard
                    index={1}
                    tone="accent"
                    label="Abertura Automática"
                    icon={<Bot className="h-4 w-4" />}
                    value={<AnimatedNumber value={k.pct_aberto_automaticamente} format={formatPct} />}
                    hint="Incidentes abertos por automação"
                  />
                  <KpiCard
                    index={2}
                    tone="med"
                    label="Sem Intervenção"
                    icon={<UserX className="h-4 w-4" />}
                    value={<AnimatedNumber value={k.pct_sem_intervencao} format={formatPct} />}
                    hint="Resolvidos sem ação humana"
                  />
                  <KpiCard
                    index={3}
                    tone="high"
                    label="Violações OLA"
                    icon={<OctagonAlert className="h-4 w-4" />}
                    value={<AnimatedNumber value={k.total_violacoes_ola} format={formatInt} />}
                    hint={`${formatInt(k.total_no_kpi)} incidentes no KPI`}
                  />
                </>
              )}
            </div>

            {/* Hora + Dia */}
            <div key={`hora-dia-${version}`} className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {!data ? (
                <>
                  <ChartSkeleton />
                  <ChartSkeleton />
                </>
              ) : (
                <>
                  <Card index={0}>
                    <CardHeader
                      title="Volume por hora do dia"
                      subtitle="Distribuição de incidentes em 24h"
                    />
                    {periodo && (
                      <p className="-mt-3 mb-3 text-[11px] text-[var(--color-muted-2)]">
                        Exibindo período completo — dados por hora e dia não são segmentados por mês
                      </p>
                    )}
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={data.volume_por_hora} margin={{ top: 8, right: 8 }}>
                        <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                        <XAxis
                          dataKey="hora"
                          {...axisProps}
                          tickFormatter={(h) => `${h}h`}
                          interval={1}
                        />
                        <YAxis {...axisProps} tickFormatter={(v) => abbreviateNumber(v)} width={42} />
                        <Tooltip
                          cursor={{ fill: "var(--color-accent-soft)", fillOpacity: 0.35 }}
                          content={({ active, payload }) =>
                            active && payload?.length ? (
                              <ChartTooltip
                                title={`${String(payload[0].payload.hora).padStart(2, "0")}:00h`}
                                rows={[
                                  {
                                    label: "Incidentes",
                                    value: formatInt(payload[0].value as number),
                                    color: CHART_COLORS.accent,
                                  },
                                ]}
                              />
                            ) : null
                          }
                        />
                        <Bar
                          dataKey="total_incidentes"
                          radius={[3, 3, 0, 0]}
                          animationDuration={CHART_ANIMATION.duration}
                          animationEasing={CHART_ANIMATION.easing}
                        >
                          {data.volume_por_hora.map((h, i) => (
                            <Cell
                              key={i}
                              fill={
                                h.total_incidentes >= maxHora * 0.85
                                  ? CHART_COLORS.accent
                                  : CHART_COLORS.accent2
                              }
                              fillOpacity={h.total_incidentes >= maxHora * 0.85 ? 1 : 0.45}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card index={1}>
                    <CardHeader
                      title="Volume por dia da semana"
                      subtitle="Segunda a Domingo"
                    />
                    {periodo && (
                      <p className="-mt-3 mb-3 text-[11px] text-[var(--color-muted-2)]">
                        Exibindo período completo — dados por hora e dia não são segmentados por mês
                      </p>
                    )}
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={data.volume_por_dia_semana} margin={{ top: 8, right: 8 }}>
                        <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                        <XAxis
                          dataKey="dia_semana"
                          {...axisProps}
                          tickFormatter={(d) => diaSemanaCurto(d)}
                        />
                        <YAxis {...axisProps} tickFormatter={(v) => abbreviateNumber(v)} width={42} />
                        <Tooltip
                          cursor={{ fill: "var(--color-accent-soft)", fillOpacity: 0.35 }}
                          content={({ active, payload }) =>
                            active && payload?.length ? (
                              <ChartTooltip
                                title={payload[0].payload.dia_label}
                                rows={[
                                  {
                                    label: "Incidentes",
                                    value: formatInt(payload[0].value as number),
                                    color: CHART_COLORS.accent,
                                  },
                                ]}
                              />
                            ) : null
                          }
                        />
                        <Bar
                          dataKey="total_incidentes"
                          radius={[3, 3, 0, 0]}
                          animationDuration={CHART_ANIMATION.duration}
                          animationEasing={CHART_ANIMATION.easing}
                        >
                          {data.volume_por_dia_semana.map((d, i) => (
                            <Cell
                              key={i}
                              fill={
                                d.total_incidentes >= maxDia * 0.85
                                  ? CHART_COLORS.accent
                                  : CHART_COLORS.accent2
                              }
                              fillOpacity={d.total_incidentes >= maxDia * 0.85 ? 1 : 0.45}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </>
              )}
            </div>

            {/* Mensal: volume + violações com filtro de prioridade */}
            {!data ? (
              <ChartSkeleton height={300} />
            ) : (
              <div key={`mensal-${version}`} className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <Card index={0}>
                  <CardHeader
                    title="Volume mensal por prioridade"
                    subtitle="Evolução temporal"
                    action={
                      <div className="flex flex-wrap gap-1.5">
                        {prioridades.map((p, i) => {
                          const active = prioMensal.size === 0 || prioMensal.has(p)
                          return (
                            <button
                              key={p}
                              onClick={() => togglePrio(p)}
                              className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors"
                              style={{
                                borderColor: active ? PRIORIDADE_CORES[i % 4] : "var(--color-border)",
                                color: active ? PRIORIDADE_CORES[i % 4] : "var(--color-muted)",
                                background: active
                                  ? `${PRIORIDADE_CORES[i % 4]}1a`
                                  : "transparent",
                              }}
                            >
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ background: PRIORIDADE_CORES[i % 4] }}
                              />
                              {p}
                            </button>
                          )
                        })}
                      </div>
                    }
                  />
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={volumeMensal!.points} margin={{ top: 8, right: 8 }}>
                      <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                      <XAxis dataKey="label" {...axisProps} />
                      <YAxis {...axisProps} tickFormatter={(v) => abbreviateNumber(v)} width={42} />
                      <Tooltip
                        content={({ active, payload, label }) =>
                          active && payload?.length ? (
                            <ChartTooltip
                              title={String(label)}
                              rows={payload.map((p) => ({
                                label: String(p.name),
                                value: formatInt(p.value as number),
                                color: p.color,
                              }))}
                            />
                          ) : null
                        }
                      />
                      {volumeMensal!.prioridades.map((p, i) =>
                        prioMensal.size === 0 || prioMensal.has(p) ? (
                          <Line
                            key={p}
                            type="monotone"
                            dataKey={p}
                            stroke={PRIORIDADE_CORES[i % 4]}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                            animationDuration={CHART_ANIMATION.duration}
                            animationEasing={CHART_ANIMATION.easing}
                            animationBegin={chartStagger(i)}
                          />
                        ) : null,
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </Card>

                <Card index={1}>
                  <CardHeader
                    title="Violações OLA mensais"
                    subtitle="Por prioridade ao longo do tempo"
                  />
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={violacoesMensal!.points} margin={{ top: 8, right: 8 }}>
                      <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                      <XAxis dataKey="label" {...axisProps} />
                      <YAxis {...axisProps} tickFormatter={(v) => abbreviateNumber(v)} width={42} />
                      <Tooltip
                        content={({ active, payload, label }) =>
                          active && payload?.length ? (
                            <ChartTooltip
                              title={String(label)}
                              rows={payload.map((p) => ({
                                label: String(p.name),
                                value: formatInt(p.value as number),
                                color: p.color,
                              }))}
                            />
                          ) : null
                        }
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 11, color: CHART_COLORS.muted }}
                        iconType="plainline"
                      />
                      {violacoesMensal!.prioridades.map((p, i) =>
                        prioMensal.size === 0 || prioMensal.has(p) ? (
                          <Line
                            key={p}
                            type="monotone"
                            dataKey={p}
                            stroke={PRIORIDADE_CORES[i % 4]}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                            animationDuration={CHART_ANIMATION.duration}
                            animationEasing={CHART_ANIMATION.easing}
                            animationBegin={chartStagger(i)}
                          />
                        ) : null,
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            )}

            {/* Volume por grupo */}
            {!data ? (
              <ChartSkeleton height={300} />
            ) : (
              <Card key={`grupo-${version}`} index={0}>
                <CardHeader
                  title="Volume por equipe / grupo"
                  subtitle={`Ordenado por ${
                    GRUPO_COLUNAS.find((c) => c.key === grupoSort.col)?.label
                  } (${grupoSort.dir === "asc" ? "crescente" : "decrescente"})`}
                />
                {data.volume_por_grupo.length === 0 ? (
                  <EmptyState message="Nenhum grupo encontrado." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-muted)]">
                          {GRUPO_COLUNAS.map((c) => {
                            const active = grupoSort.col === c.key
                            return (
                              <th
                                key={c.key}
                                className={cn(
                                  "pb-2 pr-4 font-medium",
                                  c.alignRight && "text-right",
                                  c.key === "pct_sem_intervencao" && "min-w-[160px]",
                                )}
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleGrupoSort(c.key)}
                                  className={cn(
                                    "inline-flex items-center gap-1 transition-colors hover:text-[var(--color-foreground)]",
                                    c.alignRight && "flex-row-reverse",
                                    active && "text-[var(--color-accent)]",
                                  )}
                                >
                                  {c.label}
                                  {active ? (
                                    grupoSort.dir === "asc" ? (
                                      <ArrowUp className="h-3 w-3" />
                                    ) : (
                                      <ArrowDown className="h-3 w-3" />
                                    )
                                  ) : (
                                    <ArrowUpDown className="h-3 w-3 opacity-40" />
                                  )}
                                </button>
                              </th>
                            )
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {grupoOrdenado.map((g, i) => (
                            <tr
                              key={g.grupo_nome + i}
                              className="border-b border-[var(--color-border)]/60 transition-colors hover:bg-[var(--color-surface-2)]"
                            >
                              <td className="py-2.5 pr-4 font-medium text-[var(--color-foreground)]">
                                {g.grupo_nome}
                              </td>
                              <td className="tnum py-2.5 pr-4 text-right text-[var(--color-foreground)]">
                                {formatInt(g.total_incidentes)}
                              </td>
                              <td className="tnum py-2.5 pr-4 text-right text-[var(--color-muted)]">
                                {formatInt(g.total_no_kpi)}
                              </td>
                              <td className="tnum py-2.5 pr-4 text-right text-[var(--color-risk-high)]">
                                {formatInt(g.total_violacoes)}
                              </td>
                              <td className="py-2.5">
                                <div className="flex items-center gap-2">
                                  <ProgressBar
                                    value={g.pct_sem_intervencao}
                                    tone="accent"
                                    className="flex-1"
                                  />
                                  <span className="tnum w-12 text-right text-xs text-[var(--color-muted)]">
                                    {formatPct(g.pct_sem_intervencao, 0)}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}
          </>
        )}
      </div>
    </>
  )
}
