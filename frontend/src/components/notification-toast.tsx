import { useEffect, useRef, useState } from "react"
import { Lightbulb, X } from "lucide-react"
import { cn } from "@/lib/utils"

const AUTO_DISMISS_MS = 4000

interface NotificationToastProps {
  total: number
  onClose: () => void
  onVerRecomendacoes: () => void
}

export function NotificationToast({ total, onClose, onVerRecomendacoes }: NotificationToastProps) {
  const [visible, setVisible] = useState(false)
  const [paused, setPaused] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)
  const remainingRef = useRef(AUTO_DISMISS_MS)
  const closedRef = useRef(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const handleClose = () => {
    if (closedRef.current) return
    closedRef.current = true
    setVisible(false)
    setTimeout(() => onCloseRef.current(), 200)
  }

  // Entrance animation.
  useEffect(() => {
    const enter = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(enter)
  }, [])

  // Countdown driven by rAF (not a CSS transition) so it can be frozen mid-flight on hover
  // and resumed from the exact point it left off, without recomputing durations.
  useEffect(() => {
    if (paused) return
    let last = performance.now()
    let raf = 0

    const tick = (now: number) => {
      const dt = now - last
      last = now
      remainingRef.current -= dt

      if (remainingRef.current <= 0) {
        remainingRef.current = 0
        if (barRef.current) barRef.current.style.width = "0%"
        handleClose()
        return
      }

      if (barRef.current) {
        barRef.current.style.width = `${(remainingRef.current / AUTO_DISMISS_MS) * 100}%`
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused])

  const handleVerClick = () => {
    handleClose()
    onVerRecomendacoes()
  }

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={cn(
        "fixed right-5 top-[70px] z-[100] w-80 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)]",
        "transition-all duration-200",
        visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
          <Lightbulb className="h-4.5 w-4.5" />
        </span>
        <button type="button" onClick={handleVerClick} className="min-w-0 flex-1 text-left">
          <span className="block text-sm font-medium text-[var(--color-foreground)]">
            Você possui {total} {total === 1 ? "recomendação" : "recomendações"}
          </span>
          <span className="mt-0.5 block text-xs text-[var(--color-muted)]">Clique aqui para ver</span>
        </button>
        <button
          type="button"
          onClick={handleClose}
          title="Fechar"
          className="shrink-0 rounded-md p-1 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="h-1 w-full bg-[var(--color-surface-3)]">
        <div ref={barRef} className="h-full bg-[var(--color-accent)]" style={{ width: "100%" }} />
      </div>
    </div>
  )
}
