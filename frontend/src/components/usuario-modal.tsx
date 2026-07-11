import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { createPortal } from "react-dom"
import { Camera, Check, Loader2, UserCircle, X } from "lucide-react"
import { CardHeader } from "@/components/card"
import { Toggle } from "@/components/toggle"
import { useAvatarUrlAdmin } from "@/lib/hooks"
import { api, getErrorMessage } from "@/lib/api"
import { cn, formatDate } from "@/lib/utils"
import type { Cargo, UsuarioAdmin } from "@/lib/types"

const MIMES_ACEITOS = ["image/jpeg", "image/png", "image/webp"]
const TAMANHO_MAXIMO_FOTO = 2 * 1024 * 1024
const ANIMACAO_MS = 300

interface UsuarioModalProps {
  open: boolean
  /** null = modo criação de um novo usuário */
  usuario: UsuarioAdmin | null
  cargos: Cargo[]
  /** false para o próprio usuário logado, para não permitir remover a própria permissão de admin */
  podeEditarAdmin: boolean
  onClose: () => void
  onSaved: () => void
}

export function UsuarioModal({ open, usuario, cargos, podeEditarAdmin, onClose, onSaved }: UsuarioModalProps) {
  const modoEdicao = usuario !== null

  // ---- Entrada/saída animada ----
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

  // ---- Campos do formulário ----
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [confirmarSenha, setConfirmarSenha] = useState("")
  const [cargoId, setCargoId] = useState<number | "">("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [ativo, setAtivo] = useState(true)

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const salvandoRef = useRef(false)
  salvandoRef.current = salvando

  // ---- Foto (em modo criação, o upload só é enviado após o usuário ser criado) ----
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fotoErro, setFotoErro] = useState<string | null>(null)
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [fotoVersao, setFotoVersao] = useState(0)
  const avatarUrl = useAvatarUrlAdmin(usuario?.id ?? null, usuario?.tem_foto ?? false, fotoVersao)

  // Reseta o formulário sempre que o modal abre (para um usuário diferente, ou para criar um novo).
  useEffect(() => {
    if (!open) return
    setNome(usuario?.nome ?? "")
    setEmail(usuario?.email ?? "")
    setSenha("")
    setConfirmarSenha("")
    setCargoId(cargos.find((c) => c.nome === usuario?.cargo)?.id ?? "")
    setIsAdmin(usuario?.is_admin ?? false)
    setAtivo(usuario?.ativo ?? true)
    setErro(null)
    setPreviewFile(null)
    setPreviewUrl(null)
    setFotoErro(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, usuario?.id])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function handleSelecionarArquivo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    setFotoErro(null)
    if (!MIMES_ACEITOS.includes(file.type)) {
      setFotoErro("Formato inválido. Use JPEG, PNG ou WEBP.")
      return
    }
    if (file.size > TAMANHO_MAXIMO_FOTO) {
      setFotoErro("A imagem excede o tamanho máximo de 2MB.")
      return
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  function cancelarPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewFile(null)
    setPreviewUrl(null)
    setFotoErro(null)
  }

  async function salvarFoto() {
    if (!previewFile || !usuario) return
    setEnviandoFoto(true)
    setFotoErro(null)
    try {
      const formData = new FormData()
      formData.append("file", previewFile)
      await api.post(`/api/v1/gestao/usuarios/${usuario.id}/foto`, formData, {
        headers: { "Content-Type": undefined },
      })
      cancelarPreview()
      setFotoVersao((v) => v + 1)
      onSaved()
    } catch (err) {
      setFotoErro(getErrorMessage(err))
    } finally {
      setEnviandoFoto(false)
    }
  }

  function fecharSeNaoSalvando() {
    if (!salvando) onClose()
  }

  const podeSalvar =
    nome.trim().length >= 2 && email.trim().length > 0 && (modoEdicao || senha.length >= 6)

  async function salvar() {
    setErro(null)

    if (nome.trim().length < 2) {
      setErro("Informe um nome com pelo menos 2 caracteres.")
      return
    }
    if (!email.trim()) {
      setErro("Informe um email válido.")
      return
    }

    const alterandoSenha = !modoEdicao || Boolean(senha || confirmarSenha)
    if (alterandoSenha) {
      if (senha.length < 6) {
        setErro(
          modoEdicao
            ? "A nova senha deve ter pelo menos 6 caracteres."
            : "A senha deve ter pelo menos 6 caracteres.",
        )
        return
      }
      if (senha !== confirmarSenha) {
        setErro("As senhas não conferem.")
        return
      }
    }

    setSalvando(true)
    try {
      if (modoEdicao && usuario) {
        await api.patch(`/api/v1/gestao/usuarios/${usuario.id}`, {
          nome,
          email,
          cargo_id: cargoId === "" ? null : cargoId,
          is_admin: isAdmin,
          ativo,
          ...(alterandoSenha ? { nova_senha: senha } : {}),
        })
      } else {
        const res = await api.post("/api/v1/gestao/usuarios", {
          nome,
          email,
          senha,
          cargo_id: cargoId === "" ? null : cargoId,
          is_admin: isAdmin,
          ativo,
        })

        const novoId = res.data?.data?.id
        if (previewFile && novoId) {
          try {
            const formData = new FormData()
            formData.append("file", previewFile)
            await api.post(`/api/v1/gestao/usuarios/${novoId}/foto`, formData, {
              headers: { "Content-Type": undefined },
            })
          } catch {
            // Não bloqueia a criação do usuário; a foto pode ser adicionada depois via edição.
          }
        }
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

  const inputClass =
    "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none transition-colors placeholder:text-[var(--color-muted-2)] focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/40"
  const labelClass = "mb-1.5 block text-xs font-medium text-[var(--color-muted)]"
  const toggleFieldClass = cn(inputClass, "flex items-center justify-between")

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
          "relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform",
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
          title={modoEdicao ? "Editar usuário" : "Novo usuário"}
          subtitle={
            modoEdicao
              ? "Foto, dados de acesso, cargo e permissões"
              : "Foto, dados de acesso, cargo e permissões para o novo usuário"
          }
        />

        <div className="flex flex-col gap-6 sm:flex-row">
          {/* Coluna 1: foto e metadados */}
          <div className="flex flex-col items-center text-center sm:w-[190px] sm:shrink-0">
            <div className="relative h-[140px] w-[140px]">
              {previewUrl || avatarUrl ? (
                <img
                  src={previewUrl ?? avatarUrl ?? undefined}
                  alt={nome || "Usuário"}
                  className="h-[140px] w-[140px] rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-3)] object-cover"
                />
              ) : (
                <div className="flex h-[140px] w-[140px] items-center justify-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-3)] text-3xl font-semibold text-[var(--color-accent)]">
                  {nome ? nome.charAt(0).toUpperCase() : <UserCircle className="h-12 w-12" />}
                </div>
              )}
              {!previewFile && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Trocar foto"
                  className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] text-[var(--color-muted)] transition-colors hover:text-[var(--color-accent)]"
                >
                  <Camera className="h-4 w-4" />
                </button>
              )}
            </div>

            <p className="mt-3 text-sm font-medium text-[var(--color-foreground)]">Foto de Perfil</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleSelecionarArquivo}
            />

            {previewFile && (
              <div className="mt-3 flex w-full gap-2">
                {modoEdicao && (
                  <button
                    type="button"
                    onClick={salvarFoto}
                    disabled={enviandoFoto}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-[var(--color-background)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {enviandoFoto ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin-slow" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Salvar
                  </button>
                )}
                <button
                  type="button"
                  onClick={cancelarPreview}
                  disabled={enviandoFoto}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg border border-[var(--color-risk-high)]/40 bg-[var(--color-risk-high-soft)] px-3 py-1.5 text-xs font-medium text-[var(--color-risk-high)] transition-colors hover:border-[var(--color-risk-high)] disabled:cursor-not-allowed disabled:opacity-60",
                    modoEdicao ? "flex-1" : "w-full",
                  )}
                >
                  <X className="h-3.5 w-3.5" />
                  Cancelar
                </button>
              </div>
            )}

            {fotoErro && <p className="mt-2 text-xs text-[var(--color-risk-high)]">{fotoErro}</p>}

            {modoEdicao && usuario && (
              <div className="mt-5 w-full border-t border-[var(--color-border)] pt-4 text-center">
                <p className="text-xs text-[var(--color-muted)]">Data de cadastro</p>
                <p className="text-sm font-semibold text-[var(--color-foreground)]">
                  {formatDate(usuario.criado_em)}
                </p>
              </div>
            )}
          </div>

          {/* Coluna 2: campos do formulário */}
          <div className="flex-1">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Nome completo</label>
                <input className={inputClass} value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className={labelClass}>Cargo</label>
                <select
                  className={inputClass}
                  value={cargoId}
                  onChange={(e) => setCargoId(e.target.value === "" ? "" : Number(e.target.value))}
                >
                  <option value="">Sem cargo</option>
                  {cargos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <div className={toggleFieldClass}>
                  <span className="text-[var(--color-muted)]">{ativo ? "Ativo" : "Inativo"}</span>
                  <Toggle checked={ativo} onChange={setAtivo} label="Usuário ativo" />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>Administrador</label>
                <div className={toggleFieldClass}>
                  <span className="text-[var(--color-muted)]">
                    {isAdmin ? "É administrador" : "Não é administrador"}
                  </span>
                  <Toggle
                    checked={isAdmin}
                    onChange={(v) => {
                      if (!podeEditarAdmin) return
                      if (!v && !window.confirm("Tem certeza que deseja remover a permissão de admin?")) return
                      if (v && !window.confirm("Tem certeza que deseja tornar este usuário um administrador?"))
                        return
                      setIsAdmin(v)
                    }}
                    disabled={!podeEditarAdmin}
                    label="Administrador"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>{modoEdicao ? "Nova senha" : "Senha"}</label>
                <input
                  type="password"
                  placeholder={modoEdicao ? "" : undefined}
                  className={inputClass}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Confirmar {modoEdicao ? "nova senha" : "senha"}</label>
                <input
                  type="password"
                  className={inputClass}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

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
            disabled={salvando || !podeSalvar}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-background)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {salvando && <Loader2 className="h-4 w-4 animate-spin-slow" />}
            {modoEdicao ? "Salvar Alterações" : "Criar Usuário"}
          </button>
        </div>
        {erro && <p className="mt-3 text-center text-xs text-[var(--color-risk-high)]">{erro}</p>}
      </div>
    </div>,
    document.body,
  )
}
