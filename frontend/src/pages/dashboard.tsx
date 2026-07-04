import { useCallback, useMemo } from "react"
import { Link } from "react-router-dom"
import {
  Database,
  UserX,
  OctagonAlert,
  TrendingUp,
  Network,
  Target,
  Lightbulb,
  ArrowRight,
  Clock,
  Calendar,
  RefreshCw,
} from "lucide-react"
import { KpiCard } from "@/components/kpi-card"
import { Card, CardHeader } from "@/components/card"
import { KpiSkeleton, Skeleton } from "@/components/skeleton"
import { Badge, prioridadeTone, ProgressBar } from "@/components/badge"
import { AnimatedNumber } from "@/components/animated-number"
import { useHistorico, usePrevisao, useClusters, useRisco, useRecomendacoes } from "@/lib/hooks"
import {
  formatInt,
  formatPct,
  formatDate,
  horaLabel,
  diaSemanaLabel,
} from "@/lib/utils"
import { useAuth } from "@/lib/auth"

function useUser() {
  return useAuth()
}

function getCurrentDateFormatted(): string {
  const raw = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

export default function DashboardPage() {
  const { user } = useUser()
  const hist = useHistorico()
  const prev = usePrevisao()
  const clusters = useClusters()
  const risco = useRisco("todos")
  const recs = useRecomendacoes("todas")

  const k = hist.data?.kpis_gerais

  const clusterCritico = useMemo(() => {
    if (!clusters.data?.clusters.length) return null
    return [...clusters.data.clusters].sort(
      (a, b) => (b.pct_violacao_ola ?? 0) - (a.pct_violacao_ola ?? 0),
    )[0]
  }, [clusters.data])

  const kpiCritico = useMemo(() => {
    const withMeta = risco.data?.kpis_ola.filter((k) => k.pct_atingimento_meta != null) ?? []
    if (!withMeta.length) return null
    return [...withMeta].sort(
      (a, b) => (a.pct_atingimento_meta ?? 0) - (b.pct_atingimento_meta ?? 0),
    )[0]
  }, [risco.data])

  const recDestaque = recs.data?.recomendacoes[0] ?? null
  const firstName = user?.nome?.split(" ")[0] ?? "Usuário"

  const refreshingAll = hist.loading || prev.loading || clusters.loading || risco.loading || recs.loading
  const reloadAll = useCallback(() => {
    hist.reload()
    prev.reload()
    clusters.reload()
    risco.reload()
    recs.reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col gap-5 p-5">
        {/* Welcome card */}
        <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 shadow-[0_4px_20px_-6px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0">
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-px -z-10 rounded-full bg-[var(--color-glow-blue)] opacity-[0.35] blur-sm"
              />
              <img
                src="/usuario-generico.svg"
                alt="Usuário"
                className="h-10 w-10 rounded-full border border-[var(--color-glow-blue)]/45 bg-[var(--color-surface-3)] object-cover"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-foreground)]">
                Olá, {firstName}
              </p>
              <p className="text-[11px] text-[var(--color-muted)]">
                {getCurrentDateFormatted()}
              </p>
            </div>
          </div>
          {k && (
            <button
              type="button"
              onClick={reloadAll}
              disabled={refreshingAll}
              title="Atualizar dados"
              className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-xs text-[var(--color-muted)] transition-colors hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)] disabled:cursor-wait"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-[var(--color-accent)] ${refreshingAll ? "animate-spin-slow" : ""}`}
              />
              <span>
                Atualizado em{" "}
                <span className="text-[var(--color-foreground)]">{formatDate(k.periodo_fim)}</span>
              </span>
            </button>
          )}
        </div>
        {/* KPIs */}
        <div key={hist.version} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {!k ? (
            Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
          ) : (
            <>
              <KpiCard
                index={0}
                label="Total de Incidentes"
                icon={<Database className="h-4 w-4" />}
                value={<AnimatedNumber value={k.total_incidentes} format={formatInt} />}
                hint="Histórico completo"
              />
              <KpiCard
                index={1}
                tone="accent"
                label="Sem Intervenção"
                icon={<UserX className="h-4 w-4" />}
                value={<AnimatedNumber value={k.pct_sem_intervencao} format={formatPct} />}
                hint="Automação sem ação humana"
              />
              <KpiCard
                index={2}
                tone="high"
                label="Violações OLA"
                icon={<OctagonAlert className="h-4 w-4" />}
                value={<AnimatedNumber value={k.total_violacoes_ola} format={formatInt} />}
                hint={`${formatInt(k.total_no_kpi)} no KPI`}
              />
              <KpiCard
                index={3}
                tone="low"
                label="Previsão D+1"
                icon={<TrendingUp className="h-4 w-4" />}
                value={
                  prev.data ? (
                    <AnimatedNumber value={prev.data.d1.total_previsto} format={formatInt} />
                  ) : (
                    "—"
                  )
                }
                hint={
                  prev.data ? `Para ${formatDate(prev.data.d1.data_referencia)}` : "Sem previsão"
                }
              />
            </>
          )}
        </div>

        {/* Detail cards */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Cluster crítico */}
          <Card index={0} className="flex flex-col">
            <CardHeader
              title="Cluster de maior risco"
              icon={<Network className="h-4 w-4" />}
              action={
                <Link
                  to="/padroes"
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-muted)] transition-all hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
                >
                  Ver padrões
                  <ArrowRight className="h-3 w-3" />
                </Link>
              }
            />
            {!clusters.data ? (
              <Skeleton className="h-32 w-full" />
            ) : !clusterCritico ? (
              <p className="text-sm text-[var(--color-muted)]">Sem clusters disponíveis.</p>
            ) : (
              <div key={clusters.version} className="flex flex-1 flex-col animate-fade">
                <p className="text-sm leading-relaxed text-[var(--color-foreground)]">
                  {clusterCritico.descricao ?? `Cluster #${clusterCritico.cluster_id}`}
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-[var(--color-muted)]">
                  <span className="flex items-center gap-1.5 rounded-lg bg-[var(--color-surface-2)] px-2.5 py-1.5">
                    <Clock className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                    {horaLabel(clusterCritico.hora_predominante)}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-lg bg-[var(--color-surface-2)] px-2.5 py-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                    {diaSemanaLabel(clusterCritico.dia_semana_predominante)}
                  </span>
                </div>
                <div className="mt-auto flex items-end justify-between border-t border-[var(--color-border)] pt-4 mt-4">
                  <div>
                    <p className="text-[11px] text-[var(--color-muted-2)]">Incidentes</p>
                    <p className="tnum text-2xl font-bold text-[var(--color-foreground)]">
                      {formatInt(clusterCritico.total_incidentes)}
                    </p>
                  </div>
                  <Badge tone="high">{formatPct(clusterCritico.pct_violacao_ola)} violação</Badge>
                </div>
              </div>
            )}
          </Card>

          {/* KPI meta crítico */}
          <Card index={1} className="flex flex-col">
            <CardHeader
              title="Meta OLA mais crítica"
              icon={<Target className="h-4 w-4" />}
              action={
                <Link
                  to="/risco"
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-muted)] transition-all hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
                >
                  Ver riscos
                  <ArrowRight className="h-3 w-3" />
                </Link>
              }
            />
            {!risco.data ? (
              <Skeleton className="h-32 w-full" />
            ) : !kpiCritico ? (
              <p className="text-sm text-[var(--color-muted)]">Sem KPIs de meta.</p>
            ) : (
              <div key={risco.version} className="flex flex-1 flex-col animate-fade">
                <div className="flex items-center gap-2">
                  <span className="tnum text-sm font-semibold text-[var(--color-foreground)]">
                    {kpiCritico.ano}
                  </span>
                  <Badge tone={prioridadeTone(kpiCritico.prioridade_label)}>
                    {kpiCritico.prioridade_label}
                  </Badge>
                </div>
                <div className="mt-4 rounded-xl bg-[var(--color-surface-2)] p-4">
                  <p className="text-[11px] text-[var(--color-muted-2)]">Atingimento da meta</p>
                  <div className="tnum mt-1 text-4xl font-bold text-[var(--color-foreground)]">
                    {formatPct(kpiCritico.pct_atingimento_meta, 0)}
                  </div>
                  <ProgressBar value={kpiCritico.pct_atingimento_meta ?? 0} className="mt-3" />
                </div>
                {kpiCritico.faixa_meta && (
                  <p className="mt-auto border-t border-[var(--color-border)] pt-4 mt-4 text-xs text-[var(--color-muted)]">
                    Faixa: {kpiCritico.faixa_meta}
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* Recomendação destaque */}
          <Card index={2} className="flex flex-col">
            <CardHeader
              title="Recomendação em destaque"
              icon={<Lightbulb className="h-4 w-4" />}
              action={
                <Link
                  to="/recomendacoes"
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-muted)] transition-all hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
                >
                  Ver todas
                  <ArrowRight className="h-3 w-3" />
                </Link>
              }
            />
            {!recs.data ? (
              <Skeleton className="h-32 w-full" />
            ) : !recDestaque ? (
              <p className="text-sm text-[var(--color-muted)]">Nenhuma recomendação gerada.</p>
            ) : (
              <div key={recs.version} className="flex flex-1 flex-col animate-fade">
                <h4 className="text-sm font-semibold text-[var(--color-foreground)]">
                  {recDestaque.titulo}
                </h4>
                <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-[var(--color-muted)]">
                  {recDestaque.descricao}
                </p>
                <div className="mt-auto flex flex-wrap gap-1.5 border-t border-[var(--color-border)] pt-4 mt-4">
                  {recDestaque.grupo_nome && <Badge tone="accent">{recDestaque.grupo_nome}</Badge>}
                  {recDestaque.prioridade && (
                    <Badge tone={prioridadeTone(recDestaque.prioridade)}>
                      {recDestaque.prioridade}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
