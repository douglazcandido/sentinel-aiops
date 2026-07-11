import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Loader2, X } from "lucide-react"
import { CardHeader } from "@/components/card"
import { api, getErrorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { Cargo } from "@/lib/types"

const ANIMACAO_MS = 300

interface CargoModalProps {
  open: boolean
  /** null = modo criação de um novo cargo */
  cargo: Cargo | null
  onClose: () => void
  onSaved: () => void
}

export function CargoModal({ open, cargo, onClose, onSaved }: CargoModalProps) {
  const modoEdicao = cargo !== null

  // ---- Entrada/saída animada ----
  const [rendered, setRendered] = useState(open)
  const [visible, setVisible] = useState(false)
  const rafRef = useRef(0)

  useEffect(() => {
    if (open) {
      setRendered(true)
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
    const original = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = original
    }
  }, [rendered])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !salvandoRef.current) onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // ---- Campo do formulário ----
  const [nome, setNome] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const salvandoRef = useRef(false)
  salvandoRef.current = salvando

  useEffect(() => {
    if (!open) return
    setNome(cargo?.nome ?? "")
    setErro(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cargo?.id])

  function fecharSeNaoSalvando() {
    if (!salvando) onClose()
  }

  async function salvar() {
    if (nome.trim().length < 2) {
      setErro("Informe um nome com pelo menos 2 caracteres.")
      return
    }
    setErro(null)
    setSalvando(true)
    try {
      if (modoEdicao && cargo) {
        await api.patch(`/api/v1/gestao/cargos/${cargo.id}`, { nome: nome.trim() })
      } else {
        await api.post("/api/v1/gestao/cargos", { nome: nome.trim() })
      }
      onSaved()
      onClose()
    } catch (err) {
      setErro(getErrorMessage(err))
    } finally {
      setSalvando(false)
    }
  }

  if (!rendered) return null

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out will-change-[opacity]",
          visible ? "opacity-100" : "opacity-0",
        )}
        onClick={fecharSeNaoSalvando}
      />

      <div
        className={cn(
          "relative w-full max-w-sm overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform",
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0",
        )}
      >
        <button
          type="button"
          onClick={fecharSeNaoSalvando}
          title="Fechar"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
        >
          <X className="h-4 w-4" />
        </button>

        <CardHeader
          title={modoEdicao ? "Editar cargo" : "Novo cargo"}
          subtitle={modoEdicao ? "Altere o nome do cargo" : "Informe o nome do novo cargo"}
        />

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-muted)]">Nome do cargo</label>
          <input
            autoFocus
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") salvar()
            }}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none transition-colors placeholder:text-[var(--color-muted-2)] focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/40"
          />
        </div>

        {erro && <p className="mt-2 text-xs text-[var(--color-risk-high)]">{erro}</p>}

        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-[var(--color-border)] pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={fecharSeNaoSalvando}
            className="rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={salvando || nome.trim().length < 2}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-background)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {salvando && <Loader2 className="h-4 w-4 animate-spin-slow" />}
            Salvar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
