import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Abbreviate large numbers: 122543 -> "122,5K" (pt-BR style). */
export function abbreviateNumber(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return "—"
  const abs = Math.abs(value)
  if (abs >= 1_000_000) {
    return formatDecimal(value / 1_000_000, 1) + "M"
  }
  if (abs >= 1_000) {
    return formatDecimal(value / 1_000, 1) + "K"
  }
  return formatInt(value)
}

function formatDecimal(value: number, digits: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

export function formatInt(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return "—"
  return Math.round(value).toLocaleString("pt-BR")
}

export function formatPct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || isNaN(value)) return "—"
  return (
    value.toLocaleString("pt-BR", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }) + "%"
  )
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  // Extrai o prefixo YYYY-MM-DD diretamente: `new Date("YYYY-MM-DD")` interpreta a
  // string como UTC, o que desloca a data em -1 dia em fusos horários negativos.
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (match) {
    const [, y, m, d] = match
    return `${d}/${m}/${y}`
  }
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
const DIAS_CURTO = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]

export function diaSemanaLabel(n: number | null | undefined): string {
  if (n === null || n === undefined || n < 0 || n > 6) return "—"
  return DIAS[n]
}

export function diaSemanaCurto(n: number | null | undefined): string {
  if (n === null || n === undefined || n < 0 || n > 6) return "—"
  return DIAS_CURTO[n]
}

export function horaLabel(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—"
  return `${String(n).padStart(2, "0")}h`
}

const MESES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
]

export function mesLabel(mes: number): string {
  if (mes < 1 || mes > 12) return String(mes)
  return MESES[mes - 1]
}
