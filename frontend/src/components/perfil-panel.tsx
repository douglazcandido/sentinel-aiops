import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { useAvatarUrl } from "@/lib/hooks"
import { cn } from "@/lib/utils"

const ANIMACAO_MS = 300

interface PerfilPanelProps {
  open: boolean
  onClose: () => void
}

export function PerfilPanel({ open, onClose }: PerfilPanelProps) {
  const { user, temFoto, avatarVersion } = useAuth()
  const avatarUrl = useAvatarUrl(temFoto, avatarVersion)

  const [rendered, setRendered] = useState(open)
  const [visible, setVisible] = useState(false)
  const rafRef = useRef(0)

  useEffect(() => {
    if (open) {
      setRendered(true)
      // Duplo rAF: garante que o navegador pinte o estado fechado antes de
      // aplicar o estado aberto, para a transição sempre disparar (evita abrir "seco").
      const raf1 = requestAnimationFrame(() => {
        const raf2 = requestAnimationFrame(() => setVisible(true))
        rafRef.current = raf2
      })
      rafRef.current = raf1
      return () => cancelAnimationFrame(rafRef.current)
    }
    setVisible(false)
    const t = setTimeout(() => setRendered(false), ANIMACAO_MS)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!rendered) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [rendered])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  if (!rendered) return null

  return createPortal(
    <div className="fixed inset-0 z-[200]">
      <div
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out will-change-[opacity]",
          visible ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          "absolute right-0 top-0 flex h-full w-full max-w-[280px] flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform",
          visible ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-end border-b border-[var(--color-border)] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            title="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center gap-4 px-6 py-10">
          <div className="relative h-28 w-28">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={user?.nome ?? "Usuário"}
                className="h-28 w-28 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-3)] object-cover"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-3)] text-2xl font-semibold text-[var(--color-accent)]">
                {user?.nome?.charAt(0).toUpperCase() ?? "U"}
              </div>
            )}
          </div>

          <div className="text-center">
            <p className="text-base font-medium text-[var(--color-foreground)]">{user?.nome ?? "Usuário"}</p>
            <p className="mt-0.5 text-sm text-[var(--color-muted)]">{user?.email}</p>
          </div>

          {user?.cargo && (
            <span className="rounded-lg bg-[var(--color-accent-soft)] px-3 py-1 text-xs font-medium text-[var(--color-accent)]">
              {user.cargo}
            </span>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
