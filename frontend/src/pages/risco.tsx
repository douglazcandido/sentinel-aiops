import { useState, useMemo, useRef } from 'react'
import { ShieldAlert, Target, TrendingUp, TrendingDown, Brain } from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { Topbar } from '@/components/topbar'
import { Card, CardHeader } from '@/components/card'
import { Skeleton } from '@/components/skeleton'
import { ErrorState, EmptyState } from '@/components/states'
import { Badge, prioridadeTone, ProgressBar } from '@/components/badge'
import { RISK_COLORS, ChartTooltip } from '@/components/chart-theme'
import { useRisco } from '@/lib/hooks'
import { formatInt, formatPct } from '@/lib/utils'

const RISK_LABEL: Record<string, string> = { Baixo: 'Baixo', Medio: 'Médio', Alto: 'Alto' }

export default function RiscoPage() {
  const [ano, setAno] = useState<number | 'todos'>('todos')
  const { data, loading, error, reload } = useRisco(ano)

  const totalRisco = useMemo(
    () => data?.distribuicao_risco.reduce((s, d) => s + d.quantidade, 0) ?? 0,
    [data],
  )

  const anosRef = useRef<number[]>([])
  useMemo(() => {
    if (ano !== 'todos') return
    const anos = new Set<number>()
    data?.kpis_ola.forEach((k) => anos.add(k.ano))
    const lista = Array.from(anos).sort((a, b) => b - a)
    if (lista.length > 0) anosRef.current = lista
  }, [data, ano])
  const anosDisponiveis = anosRef.current

  // top 6 features para o gráfico (evita poluição visual com as de importância 0)
  const topFeatures = useMemo(
    () =>
      (data?.feature_importance ?? [])
        .filter((f) => f.importancia > 0)
        .slice(0, 6),
    [data],
  )

  return (
    <>
      <Topbar title="Risco OLA" subtitle="Classificação de risco e metas — Random Forest" />
      <div className="flex-1 space-y-5 p-6">
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              {/* Donut distribuição */}
              <Card index={0}>
                <CardHeader
                  title="Distribuição de risco"
                  subtitle="Classificação dos incidentes"
                  icon={<ShieldAlert className="h-4 w-4" />}
                />
                {loading || !data ? (
                  <Skeleton className="mx-auto h-52 w-52 rounded-full" />
                ) : data.distribuicao_risco.length === 0 ? (
                  <EmptyState message="Sem dados de risco." />
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={data.distribuicao_risco}
                          dataKey="quantidade"
                          nameKey="classe_risco"
                          cx="50%"
                          cy="50%"
                          innerRadius={62}
                          outerRadius={90}
                          paddingAngle={2}
                          strokeWidth={0}
                          isAnimationActive={false}
                        >
                          {data.distribuicao_risco.map((d) => (
                            <Cell key={d.classe_risco} fill={RISK_COLORS[d.classe_risco]} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) =>
                            active && payload?.length ? (
                              <ChartTooltip
                                title={`Risco ${RISK_LABEL[payload[0].payload.classe_risco] ?? payload[0].payload.classe_risco}`}
                                rows={[
                                  {
                                    label: 'Incidentes',
                                    value: formatInt(payload[0].value as number),
                                    color: RISK_COLORS[payload[0].payload.classe_risco],
                                  },
                                  {
                                    label: 'Proporção',
                                    value: formatPct(
                                      ((payload[0].value as number) / totalRisco) * 100,
                                    ),
                                  },
                                ]}
                              />
                            ) : null
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 flex flex-col gap-2">
                      {data.distribuicao_risco.map((d) => (
                        <div
                          key={d.classe_risco}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="flex items-center gap-2 text-[var(--color-muted)]">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ background: RISK_COLORS[d.classe_risco] }}
                            />
                            {RISK_LABEL[d.classe_risco] ?? d.classe_risco}
                          </span>
                          <span className="tnum font-medium text-[var(--color-foreground)]">
                            {formatInt(d.quantidade)}{' '}
                            <span className="text-xs text-[var(--color-muted-2)]">
                              ({formatPct((d.quantidade / totalRisco) * 100, 0)})
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Card>

              {/* KPIs OLA */}
              <Card index={1} className="lg:col-span-2">
                <CardHeader
                  title="KPIs de meta OLA"
                  subtitle="% acima de 100 indica superação da meta (menos violações que o limite aceitável)"
                  icon={<Target className="h-4 w-4" />}
                  action={
                    <select
                      value={String(ano)}
                      onChange={(e) =>
                        setAno(e.target.value === 'todos' ? 'todos' : Number(e.target.value))
                      }
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-xs text-[var(--color-foreground)] outline-none focus:border-[var(--color-accent)]"
                    >
                      <option value="todos">Todos os anos</option>
                      {anosDisponiveis.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  }
                />
                {loading || !data ? (
                  <div className="flex flex-col gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : data.kpis_ola.length === 0 ? (
                  <EmptyState message="Nenhum KPI de meta disponível para o período." />
                ) : (
                  <div className="flex flex-col gap-3">
                    {data.kpis_ola.map((kpi, i) => {
                      const pct = kpi.pct_atingimento_meta
                      const projetado = kpi.pct_projetado_meta
                      const diff =
                        pct != null && projetado != null ? projetado - pct : null
                      const piora = diff != null && diff < -2
                      const melhora = diff != null && diff > 2
                      return (
                        <div
                          key={`${kpi.ano}-${kpi.prioridade_codigo}-${i}`}
                          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="tnum text-sm font-semibold text-[var(--color-foreground)]">
                                {kpi.ano}
                              </span>
                              <Badge tone={prioridadeTone(kpi.prioridade_label)}>
                                {kpi.prioridade_label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-[var(--color-muted)]">
                              <span className="tnum">
                                {formatInt(kpi.violacoes_acumuladas)} viol. /{' '}
                                {formatInt(kpi.total_no_kpi)} KPI
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-3">
                            <ProgressBar value={pct ?? 0} className="flex-1" />
                            <span className="tnum w-14 text-right text-sm font-semibold text-[var(--color-foreground)]">
                              {formatPct(pct, 0)}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                            {kpi.faixa_meta && (
                              <span className="text-xs text-[var(--color-muted-2)]">
                                Faixa: {kpi.faixa_meta}
                              </span>
                            )}
                            {diff != null && (piora || melhora) && (
                              <span
                                className="flex items-center gap-1 text-xs font-medium"
                                style={{
                                  color: piora
                                    ? 'var(--color-risk-high)'
                                    : 'var(--color-risk-low)',
                                }}
                              >
                                {piora ? (
                                  <TrendingDown className="h-3.5 w-3.5" />
                                ) : (
                                  <TrendingUp className="h-3.5 w-3.5" />
                                )}
                                Projeção {formatPct(projetado, 0)} ({diff > 0 ? '+' : ''}
                                {diff.toFixed(0)} p.p.)
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            </div>

            {/* Feature Importance */}
            <Card index={2}>
              <CardHeader
                title="Explicabilidade do modelo"
                subtitle="Variáveis com maior influência na previsão de violação de OLA — Random Forest"
                icon={<Brain className="h-4 w-4" />}
              />
              {loading || !data ? (
                <Skeleton className="h-64 w-full" />
              ) : topFeatures.length === 0 ? (
                <EmptyState message="Dados de explicabilidade ainda não processados." />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={topFeatures.length * 48 + 24}>
                    <BarChart
                      data={topFeatures}
                      layout="vertical"
                      margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid
                        horizontal={false}
                        strokeDasharray="3 3"
                        stroke="var(--color-border)"
                      />
                      <XAxis
                        type="number"
                        tickFormatter={(v) => formatPct(v * 100, 1)}
                        tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                        axisLine={false}
                        tickLine={false}
                        domain={[0, 1]}
                      />
                      <YAxis
                        type="category"
                        dataKey="feature"
                        width={160}
                        tick={{ fontSize: 12, fill: 'var(--color-foreground)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: 'var(--color-surface-2)' }}
                        content={({ active, payload }) =>
                          active && payload?.length ? (
                            <ChartTooltip
                              title={payload[0].payload.feature}
                              rows={[
                                {
                                  label: 'Importância',
                                  value: formatPct((payload[0].value as number) * 100, 2),
                                  color: 'var(--color-accent)',
                                },
                                {
                                  label: 'Ranking',
                                  value: `#${payload[0].payload.ranking}`,
                                },
                              ]}
                            />
                          ) : null
                        }
                      />
                      <Bar
                        dataKey="importancia"
                        fill="var(--color-accent)"
                        radius={[0, 4, 4, 0]}
                        label={{
                          position: 'right',
                          formatter: (v: number) => formatPct(v * 100, 1),
                          fontSize: 11,
                          fill: 'var(--color-muted)',
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="mt-3 text-xs text-[var(--color-muted-2)]">
                    Valores representam a proporção de influência de cada variável na decisão do modelo.
                    Variáveis com importância zero foram omitidas.
                  </p>
                </>
              )}
            </Card>
          </>
        )}
      </div>
    </>
  )
}
