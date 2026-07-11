import { useEffect, useRef, useState } from "react"
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const MIN_ISO = "2023-01-01"
const MAX_ISO = "2025-12-31"
const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
const MESES_LABEL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

export interface DateRange {
  inicio: string | null
  fim: string | null
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (value: DateRange) => void
  className?: string
}

interface MesVisivel {
  y: number
  m: number
}

interface Shortcut {
  label: string
  range: DateRange
}

const GRUPOS_ATALHO: Shortcut[][] = [
  [{ label: "Todo o período", range: { inicio: null, fim: null } }],
  [
    { label: "2025", range: { inicio: "2025-01-01", fim: "2025-12-31" } },
    { label: "2024", range: { inicio: "2024-01-01", fim: "2024-12-31" } },
    { label: "2023", range: { inicio: "2023-01-01", fim: "2023-12-31" } },
  ],
  [
    { label: "Último trimestre", range: { inicio: "2025-10-01", fim: "2025-12-31" } },
    { label: "Último mês", range: { inicio: "2025-12-01", fim: "2025-12-31" } },
  ],
]

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

function formatBR(iso: string): string {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

function mesmoIntervalo(a: DateRange, b: DateRange): boolean {
  return a.inicio === b.inicio && a.fim === b.fim
}

function ehAtalho(value: DateRange): boolean {
  return GRUPOS_ATALHO.some((g) => g.some((s) => mesmoIntervalo(s.range, value)))
}

function mesDe(iso: string | null): MesVisivel | null {
  if (!iso) return null
  const [y, m] = iso.split("-").map(Number)
  return { y, m }
}

function computeLabel(value: DateRange): string {
  for (const grupo of GRUPOS_ATALHO) {
    for (const s of grupo) {
      if (mesmoIntervalo(s.range, value)) return s.label
    }
  }
  if (value.inicio && value.fim) {
    return `${formatBR(value.inicio)} — ${formatBR(value.fim)}`
  }
  return "Todo o período"
}

/** Grade de 6x7 dias (começando na segunda) para o mês informado, calculada em UTC para evitar desvios de fuso. */
function buildGrid(y: number, m: number): { iso: string; day: number; inMonth: boolean }[] {
  const firstOfMonth = new Date(Date.UTC(y, m - 1, 1))
  const startDow = (firstOfMonth.getUTCDay() + 6) % 7
  const start = new Date(Date.UTC(y, m - 1, 1 - startDow))
  const cells: { iso: string; day: number; inMonth: boolean }[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(Date.UTC(y, m - 1, 1 - startDow + i))
    const iso = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
    cells.push({ iso, day: d.getUTCDate(), inMonth: d.getUTCMonth() + 1 === m })
  }
  return cells
}

function mesAnterior({ y, m }: MesVisivel): MesVisivel {
  return m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 }
}

function mesSeguinte({ y, m }: MesVisivel): MesVisivel {
  return m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 }
}

function antesDoMinimo({ y }: MesVisivel): boolean {
  return y < 2023
}

function depoisDoMaximo({ y }: MesVisivel): boolean {
  return y > 2025
}

function MiniCalendario({
  view,
  onNavigate,
  selected,
  extraDisabled,
  onSelect,
}: {
  view: MesVisivel
  onNavigate: (dir: -1 | 1) => void
  selected: string | null
  extraDisabled?: (iso: string) => boolean
  onSelect: (iso: string) => void
}) {
  const cells = buildGrid(view.y, view.m)
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate(-1)}
          disabled={antesDoMinimo(mesAnterior(view))}
          className="rounded-md p-1 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)] disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs font-semibold text-[var(--color-foreground)]">
          {MESES_LABEL[view.m - 1]}/{view.y}
        </span>
        <button
          type="button"
          onClick={() => onNavigate(1)}
          disabled={depoisDoMaximo(mesSeguinte(view))}
          className="rounded-md p-1 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)] disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1 text-[10px] text-[var(--color-muted-2)]">
            {w[0]}
          </div>
        ))}
        {cells.map((c) => {
          const foraDosLimites = c.iso < MIN_ISO || c.iso > MAX_ISO
          const disabled = foraDosLimites || (extraDisabled?.(c.iso) ?? false)
          const isSelected = selected === c.iso
          return (
            <button
              key={c.iso}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(c.iso)}
              className={cn(
                "rounded-md py-1 text-xs transition-colors",
                !c.inMonth && "opacity-40",
                disabled && "cursor-not-allowed opacity-30",
                isSelected
                  ? "bg-[var(--color-accent)] font-semibold text-[var(--color-accent-contrast)]"
                  : !disabled &&
                      "text-[var(--color-foreground)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]",
              )}
            >
              {c.day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [draftInicio, setDraftInicio] = useState<string | null>(value.inicio)
  const [draftFim, setDraftFim] = useState<string | null>(value.fim)
  const [leftView, setLeftView] = useState<MesVisivel>({ y: 2025, m: 11 })
  const [rightView, setRightView] = useState<MesVisivel>({ y: 2025, m: 12 })
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  useEffect(() => {
    if (!open) return
    setDraftInicio(value.inicio)
    setDraftFim(value.fim)
    setCustomOpen(!ehAtalho(value) && !!(value.inicio || value.fim))
    setLeftView(mesDe(value.inicio) ?? { y: 2025, m: 11 })
    setRightView(mesDe(value.fim) ?? { y: 2025, m: 12 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function selecionarAtalho(range: DateRange) {
    onChange(range)
    setOpen(false)
  }

  function selecionarInicio(iso: string) {
    const novoFim = draftFim && draftFim < iso ? null : draftFim
    setDraftInicio(iso)
    setDraftFim(novoFim)
    if (novoFim) {
      onChange({ inicio: iso, fim: novoFim })
      setOpen(false)
    }
  }

  function selecionarFim(iso: string) {
    if (!draftInicio || iso < draftInicio) return
    setDraftFim(iso)
    onChange({ inicio: draftInicio, fim: iso })
    setOpen(false)
  }

  const label = computeLabel(value)
  const ativo = !!(value.inicio || value.fim)

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
          "hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]",
          ativo
            ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
            : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-foreground)]",
        )}
      >
        <Calendar className="h-3.5 w-3.5" />
        {label}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 z-30 mt-2 origin-top-right rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6)]",
            "animate-fade",
            customOpen ? "w-[calc(100vw-2rem)] max-w-[520px]" : "w-64",
          )}
          style={{ transition: "opacity 150ms, transform 150ms" }}
        >
          <div className="flex flex-col">
            {GRUPOS_ATALHO.map((grupo, gi) => (
              <div
                key={gi}
                className={cn(
                  "flex flex-col gap-0.5 py-1.5",
                  gi > 0 && "border-t border-[var(--color-border)]",
                )}
              >
                {grupo.map((s) => {
                  const active = mesmoIntervalo(s.range, value)
                  return (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => selecionarAtalho(s.range)}
                      className={cn(
                        "rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition-colors",
                        active
                          ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                          : "text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]",
                      )}
                    >
                      {s.label}
                    </button>
                  )
                })}
              </div>
            ))}

            <div className="flex flex-col gap-0.5 border-t border-[var(--color-border)] pt-1.5">
              <button
                type="button"
                onClick={() => setCustomOpen((v) => !v)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition-colors",
                  customOpen
                    ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                    : "text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]",
                )}
              >
                Intervalo personalizado
              </button>
            </div>
          </div>

          {customOpen && (
            <div className="mt-2 flex flex-col gap-4 border-t border-[var(--color-border)] pt-3 sm:flex-row">
              <MiniCalendario
                view={leftView}
                onNavigate={(dir) => setLeftView(dir === -1 ? mesAnterior(leftView) : mesSeguinte(leftView))}
                selected={draftInicio}
                onSelect={selecionarInicio}
              />
              <MiniCalendario
                view={rightView}
                onNavigate={(dir) => setRightView(dir === -1 ? mesAnterior(rightView) : mesSeguinte(rightView))}
                selected={draftFim}
                extraDisabled={(iso) => !!draftInicio && iso < draftInicio}
                onSelect={selecionarFim}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
