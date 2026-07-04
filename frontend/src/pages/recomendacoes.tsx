import { useState } from "react"
import { Users, Clock, Package, Lightbulb, type LucideIcon } from "lucide-react"
import { Topbar } from "@/components/topbar"
import { Card } from "@/components/card"
import { Skeleton } from "@/components/skeleton"
import { ErrorState, EmptyState } from "@/components/states"
import { Badge, prioridadeTone } from "@/components/badge"
import { useRecomendacoes } from "@/lib/hooks"
import type { TipoRecomendacao } from "@/lib/types"

type Filtro = TipoRecomendacao | "todas"

const FILTROS: { value: Filtro; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "equipe", label: "Equipe" },
  { value: "janela_critica", label: "Janela Crítica" },
  { value: "produto_recorrente", label: "Produto Recorrente" },
]

const TIPO_ICON: Record<TipoRecomendacao, LucideIcon> = {
  equipe: Users,
  janela_critica: Clock,
  produto_recorrente: Package,
}

const TIPO_LABEL: Record<TipoRecomendacao, string> = {
  equipe: "Equipe",
  janela_critica: "Janela Crítica",
  produto_recorrente: "Produto Recorrente",
}

export default function RecomendacoesPage() {
  const [filtro, setFiltro] = useState<Filtro>("todas")
  const { data, loading, error, reload, version } = useRecomendacoes(filtro)

  return (
    <>
      <Topbar
        title="Recomendações"
        subtitle="Sugestões geradas por regras de negócio"
        value={data ? `${data.total} sugestões geradas` : undefined}
        onRefresh={reload}
        refreshing={loading}
      />
      <div className="flex-1 space-y-5 p-6">
        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => {
            const active = filtro === f.value
            return (
              <button
                key={f.value}
                onClick={() => setFiltro(f.value)}
                className={`rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-foreground)]"
                }`}
              >
                {f.label}
              </button>
            )
          })}
        </div>

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !data ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : data.recomendacoes.length === 0 ? (
          <EmptyState message="Nenhuma recomendação gerada para este filtro ainda." />
        ) : (
          <div key={`${filtro}-${version}`} className="grid animate-fade grid-cols-1 gap-4 lg:grid-cols-2">
            {data.recomendacoes.map((rec, i) => {
              const Icon = TIPO_ICON[rec.tipo] ?? Lightbulb
              return (
                <Card key={rec.id} index={i} hover className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
                        {rec.titulo}
                      </h3>
                      <Badge tone="neutral">{TIPO_LABEL[rec.tipo]}</Badge>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted)]">
                      {rec.descricao}
                    </p>
                    {(rec.grupo_nome || rec.prioridade) && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {rec.grupo_nome && <Badge tone="accent">{rec.grupo_nome}</Badge>}
                        {rec.prioridade && (
                          <Badge tone={prioridadeTone(rec.prioridade)}>{rec.prioridade}</Badge>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
