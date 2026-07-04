import { useState, useMemo } from "react"
import { Clock, Calendar, Network, ArrowUpDown } from "lucide-react"
import { Topbar } from "@/components/topbar"
import { Card } from "@/components/card"
import { Skeleton } from "@/components/skeleton"
import { ErrorState, EmptyState } from "@/components/states"
import { Badge, prioridadeTone, ProgressBar } from "@/components/badge"
import { useClusters } from "@/lib/hooks"
import { formatInt, formatPct, horaLabel, diaSemanaLabel } from "@/lib/utils"

type SortMode = "incidentes" | "critico"

function violacaoTone(pct: number | null) {
  if (pct == null) return "neutral" as const
  if (pct >= 5) return "high" as const
  if (pct >= 2) return "med" as const
  return "low" as const
}

export default function PadroesPage() {
  const { data, loading, error, reload, version } = useClusters()
  const [sort, setSort] = useState<SortMode>("incidentes")

  const ordenados = useMemo(() => {
    if (!data) return []
    return [...data.clusters].sort((a, b) =>
      sort === "incidentes"
        ? b.total_incidentes - a.total_incidentes
        : (b.pct_violacao_ola ?? 0) - (a.pct_violacao_ola ?? 0),
    )
  }, [data, sort])

  return (
    <>
      <Topbar
        title="Padrões"
        subtitle="Agrupamentos de comportamento — K-Means"
        value={data ? `${data.total_clusters} clusters encontrados` : undefined}
        onRefresh={reload}
        refreshing={loading}
      />
      <div className="flex-1 space-y-5 p-6">
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--color-muted)]">
                {loading ? "Carregando padrões..." : `${ordenados.length} clusters identificados`}
              </p>
              <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1 text-xs">
                <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-[var(--color-muted-2)]" />
                <button
                  onClick={() => setSort("incidentes")}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                    sort === "incidentes"
                      ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                      : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                  }`}
                >
                  Mais incidentes
                </button>
                <button
                  onClick={() => setSort("critico")}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                    sort === "critico"
                      ? "bg-[var(--color-risk-high-soft)] text-[var(--color-risk-high)]"
                      : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                  }`}
                >
                  Mais crítico
                </button>
              </div>
            </div>

            {!data ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-44 w-full" />
                ))}
              </div>
            ) : ordenados.length === 0 ? (
              <EmptyState message="Nenhum cluster identificado ainda." />
            ) : (
              <div key={version} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {ordenados.map((c, i) => (
                  <Card key={c.cluster_id} index={i} hover className="flex flex-col">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-xs font-semibold text-[var(--color-accent)]">
                        #{c.cluster_id}
                      </span>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {c.grupo_nome && <Badge tone="accent">{c.grupo_nome}</Badge>}
                        {c.prioridade_label && (
                          <Badge tone={prioridadeTone(c.prioridade_label)}>
                            {c.prioridade_label}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="min-h-[2.5rem] text-sm leading-relaxed text-[var(--color-foreground)]">
                      {c.descricao ?? "Padrão sem descrição"}
                    </p>

                    <div className="mt-3 flex items-center gap-4 text-xs text-[var(--color-muted)]">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                        {horaLabel(c.hora_predominante)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                        {diaSemanaLabel(c.dia_semana_predominante)}
                      </span>
                    </div>

                    <div className="mt-4 flex items-end justify-between border-t border-[var(--color-border)] pt-3">
                      <div>
                        <p className="text-[11px] text-[var(--color-muted-2)]">Incidentes</p>
                        <p className="tnum text-xl font-semibold text-[var(--color-foreground)]">
                          {formatInt(c.total_incidentes)}
                        </p>
                      </div>
                      <div className="w-28">
                        <div className="mb-1 flex items-center justify-between text-[11px]">
                          <span className="text-[var(--color-muted-2)]">Violação OLA</span>
                          <span
                            className="tnum font-medium"
                            style={{
                              color:
                                violacaoTone(c.pct_violacao_ola) === "high"
                                  ? "var(--color-risk-high)"
                                  : violacaoTone(c.pct_violacao_ola) === "med"
                                    ? "var(--color-risk-med)"
                                    : "var(--color-risk-low)",
                            }}
                          >
                            {formatPct(c.pct_violacao_ola)}
                          </span>
                        </div>
                        <ProgressBar
                          value={Math.min((c.pct_violacao_ola ?? 0) * 10, 100)}
                          tone={violacaoTone(c.pct_violacao_ola)}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
