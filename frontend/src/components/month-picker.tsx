import { useEffect, useRef, useState } from "react"
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
const MESES_LABEL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

const ANOS_DISPONIVEIS = [2023, 2024, 2025]

export interface PeriodoFiltro {
  ano: number
  /** null = ano inteiro selecionado (sem mês específico) */
  mes: number | null
}

interface MonthPickerProps {
  value: PeriodoFiltro | null
  onChange: (value: PeriodoFiltro | null) => void
  /** Retorna os meses (1-12) com dados disponíveis para o ano informado. */
  mesesDisponiveis: (ano: number) => Set<number>
}

export function MonthPicker({ value, onChange, mesesDisponiveis }: MonthPickerProps) {
  const [open, setOpen] = useState(false)
  const [anoVisivel, setAnoVisivel] = useState(value?.ano ?? ANOS_DISPONIVEIS[ANOS_DISPONIVEIS.length - 1])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  const label = !value
    ? "Período completo"
    : value.mes
      ? `${MESES_LABEL[value.mes - 1]}/${value.ano}`
      : String(value.ano)

  const anoIndex = ANOS_DISPONIVEIS.indexOf(anoVisivel)
  const disponiveis = mesesDisponiveis(anoVisivel)

  function selecionarMes(mes: number) {
    if (!disponiveis.has(mes)) return
    onChange({ ano: anoVisivel, mes })
    setOpen(false)
  }

  function selecionarAno() {
    onChange({ ano: anoVisivel, mes: null })
    setOpen(false)
  }

  function limpar() {
    onChange(null)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
          "hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]",
          value
            ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
            : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-foreground)]",
        )}
      >
        <Calendar className="h-3.5 w-3.5" />
        {label}
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 z-20 mt-2 w-64 origin-top-right rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6)]",
            "animate-fade",
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setAnoVisivel(ANOS_DISPONIVEIS[Math.max(0, anoIndex - 1)])}
              disabled={anoIndex <= 0}
              className="rounded-md p-1 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)] disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={selecionarAno}
              title="Selecionar o ano inteiro"
              className={cn(
                "rounded-md px-2 py-0.5 text-sm font-semibold transition-colors",
                value?.ano === anoVisivel && value.mes === null
                  ? "bg-[var(--color-accent)] text-[var(--color-background)]"
                  : "text-[var(--color-foreground)] hover:bg-[var(--color-surface)]",
              )}
            >
              {anoVisivel}
            </button>
            <button
              type="button"
              onClick={() =>
                setAnoVisivel(ANOS_DISPONIVEIS[Math.min(ANOS_DISPONIVEIS.length - 1, anoIndex + 1)])
              }
              disabled={anoIndex >= ANOS_DISPONIVEIS.length - 1}
              className="rounded-md p-1 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)] disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {MESES_ABREV.map((m, i) => {
              const mes = i + 1
              const disponivel = disponiveis.has(mes)
              const selecionado = value?.ano === anoVisivel && value.mes === mes
              return (
                <button
                  key={m}
                  type="button"
                  disabled={!disponivel}
                  onClick={() => selecionarMes(mes)}
                  className={cn(
                    "rounded-md py-1.5 text-xs font-medium capitalize transition-colors",
                    selecionado
                      ? "bg-[var(--color-accent)] text-[var(--color-background)]"
                      : disponivel
                        ? "text-[var(--color-foreground)] hover:bg-[var(--color-surface)]"
                        : "cursor-not-allowed text-[var(--color-muted-2)] opacity-40",
                  )}
                >
                  {m}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={limpar}
            className={cn(
              "mt-3 w-full rounded-md border py-1.5 text-xs font-medium transition-colors",
              !value
                ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-foreground)]",
            )}
          >
            Período completo
          </button>
        </div>
      )}
    </div>
  )
}
