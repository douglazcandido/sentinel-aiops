import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Bell, Lightbulb, X } from "lucide-react"
import { useNotificacoes } from "@/lib/hooks"
import {
  consumeLoginToastPending,
  playNotificationSound,
  readAckCount,
  writeAckCount,
} from "@/lib/notifications"
import { cn } from "@/lib/utils"
import { NotificationToast } from "./notification-toast"

export function NotificationCenter() {
  const { data } = useNotificacoes()
  const [open, setOpen] = useState(false)
  const [ackCount, setAckCount] = useState(readAckCount)
  const [toastTotal, setToastTotal] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const total = data?.total ?? 0
  const unread = total > ackCount

  // Fires once per login: shows a toast + chime only if there's something unread.
  useEffect(() => {
    if (!data) return
    if (consumeLoginToastPending() && data.total > ackCount) {
      setToastTotal(data.total)
      playNotificationSound()
    }
  }, [data, ackCount])

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  const acknowledge = () => {
    writeAckCount(total)
    setAckCount(total)
  }

  const handleVerRecomendacoes = () => {
    acknowledge()
    setOpen(false)
    navigate("/recomendacoes")
  }

  const handleExcluir = () => {
    acknowledge()
  }

  return (
    <>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          title="Notificações"
          className={cn(
            "relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors",
            "hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]",
          )}
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--color-risk-high)] ring-2 ring-[var(--color-topbar)]" />
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-11 z-50 w-72 animate-fade rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)]">
            <div className="border-b border-[var(--color-border)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
                Central de notificações
              </h3>
            </div>

            <div className="p-3">
              {unread ? (
                <div className="relative flex items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 pr-8">
                  <button
                    type="button"
                    onClick={handleVerRecomendacoes}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                      <Lightbulb className="h-4.5 w-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-[var(--color-foreground)]">
                        Você possui {total} {total === 1 ? "recomendação" : "recomendações"}
                      </span>
                      <span className="mt-0.5 block text-xs text-[var(--color-muted)]">
                        Clique aqui para ver
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExcluir}
                    title="Excluir notificação"
                    className="absolute right-1.5 top-1.5 rounded-md p-1 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-3)] hover:text-[var(--color-foreground)]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <p className="py-2 text-center text-sm text-[var(--color-muted)]">
                  Nenhuma notificação no momento.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {toastTotal !== null && (
        <NotificationToast
          total={toastTotal}
          onClose={() => setToastTotal(null)}
          onVerRecomendacoes={handleVerRecomendacoes}
        />
      )}
    </>
  )
}
