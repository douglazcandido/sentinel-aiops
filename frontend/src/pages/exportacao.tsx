import { useState } from 'react'
import * as XLSX from 'xlsx'
import { Download, FileText, Table, CheckSquare, Square, Loader2 } from 'lucide-react'
import { Topbar } from '@/components/topbar'
import { Card, CardHeader } from '@/components/card'
import { useHistorico } from '@/lib/hooks'
import { usePrevisao } from '@/lib/hooks'
import { useRisco } from '@/lib/hooks'
import { useClusters } from '@/lib/hooks'
import { useRecomendacoes } from '@/lib/hooks'

// =========================================================
// Tipos e configuração dos datasets disponíveis
// =========================================================

type DatasetKey =
  | 'kpis_gerais'
  | 'volume_hora'
  | 'volume_dia'
  | 'volume_mensal'
  | 'violacoes_mensal'
  | 'volume_grupo'
  | 'previsao'
  | 'risco_kpis'
  | 'risco_distribuicao'
  | 'feature_importance'
  | 'clusters'
  | 'recomendacoes'

interface DatasetConfig {
  key: DatasetKey
  label: string
  descricao: string
  frente: string
}

const DATASETS: DatasetConfig[] = [
  { key: 'kpis_gerais', label: 'KPIs Gerais', descricao: 'Totais e percentuais do período completo', frente: 'Histórico' },
  { key: 'volume_hora', label: 'Volume por Hora', descricao: 'Distribuição de incidentes por hora do dia (0-23)', frente: 'Histórico' },
  { key: 'volume_dia', label: 'Volume por Dia da Semana', descricao: 'Distribuição de incidentes por dia da semana', frente: 'Histórico' },
  { key: 'volume_mensal', label: 'Volume Diário por Prioridade', descricao: 'Série histórica diária segmentada por prioridade', frente: 'Histórico' },
  { key: 'violacoes_mensal', label: 'Violações OLA Diárias', descricao: 'Violações de OLA por dia e prioridade', frente: 'Histórico' },
  { key: 'volume_grupo', label: 'Volume por Equipe', descricao: 'Totais, KPIs e violações por grupo/equipe', frente: 'Histórico' },
  { key: 'previsao', label: 'Previsão de Volume', descricao: 'Previsões D+1 e D+7 geradas pelo NeuralProphet', frente: 'Previsão' },
  { key: 'risco_distribuicao', label: 'Distribuição de Risco', descricao: 'Contagem de incidentes por classe de risco (Baixo/Médio/Alto)', frente: 'Risco OLA' },
  { key: 'risco_kpis', label: 'KPIs de Meta OLA', descricao: 'Atingimento de meta por ano e prioridade', frente: 'Risco OLA' },
  { key: 'feature_importance', label: 'Explicabilidade do Modelo', descricao: 'Importância de cada variável no Random Forest', frente: 'Risco OLA' },
  { key: 'clusters', label: 'Perfis de Clusters', descricao: 'Padrões identificados pelo K-Means (8 clusters)', frente: 'Padrões' },
  { key: 'recomendacoes', label: 'Recomendações', descricao: 'Sugestões práticas geradas por regras de negócio', frente: 'Recomendações' },
]

const FRENTES = ['Histórico', 'Previsão', 'Risco OLA', 'Padrões', 'Recomendações']

// =========================================================
// Utilitários de exportação
// =========================================================

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      headers.map((h) => {
        const v = r[h]
        const s = v === null || v === undefined ? '' : String(v)
        return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
      }).join(','),
    ),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function exportXLSX(sheets: { name: string; rows: Record<string, unknown>[] }[], filename: string) {
  const wb = XLSX.utils.book_new()
  sheets.forEach(({ name, rows }) => {
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31))
  })
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

// =========================================================
// Componente principal
// =========================================================

export default function ExportacaoPage() {
  const [selecionados, setSelecionados] = useState<Set<DatasetKey>>(new Set())
  const [exportando, setExportando] = useState(false)

  const { data: historico } = useHistorico()
  const { data: previsao } = usePrevisao()
  const { data: risco } = useRisco()
  const { data: clusters } = useClusters()
  const { data: recomendacoes } = useRecomendacoes()

  function toggleDataset(key: DatasetKey) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function toggleFrente(frente: string) {
    const keys = DATASETS.filter((d) => d.frente === frente).map((d) => d.key)
    const todosSelecionados = keys.every((k) => selecionados.has(k))
    setSelecionados((prev) => {
      const next = new Set(prev)
      keys.forEach((k) => (todosSelecionados ? next.delete(k) : next.add(k)))
      return next
    })
  }

  function selecionarTodos() {
    if (selecionados.size === DATASETS.length) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(DATASETS.map((d) => d.key)))
    }
  }

  function buildRows(key: DatasetKey): Record<string, unknown>[] {
    switch (key) {
      case 'kpis_gerais':
        return historico ? [historico.kpis_gerais as unknown as Record<string, unknown>] : []
      case 'volume_hora':
        return historico?.volume_por_hora ?? []
      case 'volume_dia':
        return historico?.volume_por_dia_semana ?? []
      case 'volume_mensal':
        return historico?.volume_diario ?? []
      case 'violacoes_mensal':
        return historico?.violacoes_diario ?? []
      case 'volume_grupo':
        return historico?.volume_por_grupo ?? []
      case 'previsao':
        return previsao ? [previsao.d1, ...previsao.d7] : []
      case 'risco_distribuicao':
        return risco?.distribuicao_risco ?? []
      case 'risco_kpis':
        return risco?.kpis_ola ?? []
      case 'feature_importance':
        return risco?.feature_importance ?? []
      case 'clusters':
        return clusters?.clusters ?? []
      case 'recomendacoes':
        return recomendacoes?.recomendacoes ?? []
      default:
        return []
    }
  }

  function handleExportCSV() {
    if (!selecionados.size) return
    setExportando(true)
    setTimeout(() => {
      selecionados.forEach((key) => {
        const config = DATASETS.find((d) => d.key === key)!
        const rows = buildRows(key)
        if (rows.length) exportCSV(rows, `sentinel_${key}`)
      })
      setExportando(false)
    }, 100)
  }

  function handleExportXLSX() {
    if (!selecionados.size) return
    setExportando(true)
    setTimeout(() => {
      const sheets = Array.from(selecionados)
        .map((key) => {
          const config = DATASETS.find((d) => d.key === key)!
          return { name: config.label, rows: buildRows(key) }
        })
        .filter((s) => s.rows.length > 0)
      if (sheets.length) exportXLSX(sheets, 'sentinel_exportacao')
      setExportando(false)
    }, 100)
  }

  const totalSelecionados = selecionados.size
  const todosSelecionados = totalSelecionados === DATASETS.length

  return (
    <>
      <Topbar
        title="Exportação de dados"
        subtitle="Selecione os datasets e escolha o formato de exportação"
      />
      <div className="flex-1 space-y-5 p-6">

        {/* Barra de ação */}
        <Card index={0}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={selecionarTodos}
                className="flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
              >
                {todosSelecionados
                  ? <CheckSquare className="h-4 w-4 text-[var(--color-accent)]" />
                  : <Square className="h-4 w-4" />
                }
                {todosSelecionados ? 'Desmarcar todos' : 'Selecionar todos'}
              </button>
              {totalSelecionados > 0 && (
                <span className="text-xs text-[var(--color-muted-2)]">
                  {totalSelecionados} de {DATASETS.length} selecionados
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportCSV}
                disabled={!totalSelecionados || exportando}
                className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] transition-all hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Exportar CSV
              </button>
              <button
                onClick={handleExportXLSX}
                disabled={!totalSelecionados || exportando}
                className="flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-background)] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Exportar Excel
              </button>
            </div>
          </div>
        </Card>

        {/* Datasets agrupados por frente */}
        {FRENTES.map((frente, fi) => {
          const datasets = DATASETS.filter((d) => d.frente === frente)
          const keys = datasets.map((d) => d.key)
          const todosFrente = keys.every((k) => selecionados.has(k))
          const algumaFrente = keys.some((k) => selecionados.has(k))

          return (
            <Card key={frente} index={fi + 1}>
              <CardHeader
                title={frente}
                subtitle={`${datasets.length} datasets disponíveis`}
                icon={<Download className="h-4 w-4" />}
                action={
                  <button
                    onClick={() => toggleFrente(frente)}
                    className="text-xs text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-colors"
                  >
                    {todosFrente ? 'Desmarcar frente' : 'Selecionar frente'}
                  </button>
                }
              />
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {datasets.map((dataset) => {
                  const selecionado = selecionados.has(dataset.key)
                  const rows = buildRows(dataset.key)
                  const temDados = rows.length > 0

                  return (
                    <button
                      key={dataset.key}
                      onClick={() => toggleDataset(dataset.key)}
                      className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
                        selecionado
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                          : 'border-[var(--color-border)] bg-[var(--color-surface-2)] hover:border-[var(--color-accent)]/50'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {selecionado
                          ? <CheckSquare className="h-4 w-4 text-[var(--color-accent)]" />
                          : <Square className="h-4 w-4 text-[var(--color-muted)]" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--color-foreground)]">
                          {dataset.label}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--color-muted-2)]">
                          {dataset.descricao}
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-muted)]">
                          {temDados ? `${rows.length} registro${rows.length !== 1 ? 's' : ''}` : 'Carregando...'}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </Card>
          )
        })}
      </div>
    </>
  )
}
