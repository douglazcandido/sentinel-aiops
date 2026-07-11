import { useEffect, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export type Tone = "accent" | "high" | "med" | "low" | "neutral"

const TONE: Record<Tone, string> = {
  accent: "bg-[var(--color-accent-soft)] text-[var(--color-accent)]",
  high: "bg-[var(--color-risk-high-soft)] text-[var(--color-risk-high)]",
  med: "bg-[var(--color-risk-med-soft)] text-[var(--color-risk-med)]",
  low: "bg-[var(--color-risk-low-soft)] text-[var(--color-risk-low)]",
  neutral: "bg-[var(--color-surface-3)] text-[var(--color-muted)]",
}

export function Badge({
  children,
  tone = "neutral",
  className,
  icon,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
  icon?: ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium",
        TONE[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}

/** Maps a priority label to a tone. */
export function prioridadeTone(label?: string | null): Tone {
  if (!label) return "neutral"
  const l = label.toLowerCase()
  if (l.startsWith("alta") || l.startsWith("alto")) return "high"
  if (l.startsWith("med")) return "med"
  if (l.startsWith("baix")) return "low"
  return "accent"
}

/** Horizontal progress bar with semantic color by value or explicit tone. */
export function ProgressBar({
  value,
  tone,
  className,
}: {
  value: number // 0-100 (can exceed)
  tone?: Tone
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, value))
  const resolved: Tone =
    tone ?? (value >= 100 ? "low" : value >= 75 ? "med" : "high")
  const color =
    resolved === "low"
      ? "var(--color-risk-low)"
      : resolved === "med"
        ? "var(--color-risk-med)"
        : resolved === "high"
          ? "var(--color-risk-high)"
          : "var(--color-accent)"

  // Mount at 0% so the width transition below plays a fill-in animation on first render.
  const [filled, setFilled] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setFilled(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-3)]",
        className,
      )}
    >
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: filled ? `${pct}%` : "0%", background: color }}
      />
    </div>
  )
}
