import { useState } from "react"
import { Navigate } from "react-router-dom"
import { Users, Briefcase, Plus, Pencil, UserPlus } from "lucide-react"
import { Topbar } from "@/components/topbar"
import { Card } from "@/components/card"
import { Skeleton } from "@/components/skeleton"
import { ErrorState, EmptyState } from "@/components/states"
import { Badge } from "@/components/badge"
import { Toggle } from "@/components/toggle"
import { UsuarioModal } from "@/components/usuario-modal"
import { CargoModal } from "@/components/cargo-modal"
import { useAuth } from "@/lib/auth"
import { useUsuariosAdmin, useCargosGestao } from "@/lib/hooks"
import { api, getErrorMessage } from "@/lib/api"
import { cn, formatDate } from "@/lib/utils"
import type { UsuarioAdmin, Cargo } from "@/lib/types"

type Aba = "usuarios" | "cargos"

const ABAS: { value: Aba; label: string; icon: typeof Users }[] = [
  { value: "usuarios", label: "Usuários", icon: Users },
  { value: "cargos", label: "Cargos", icon: Briefcase },
]

export default function GestaoPage() {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/" replace />
  return <GestaoConteudo />
}

function GestaoConteudo() {
  const [aba, setAba] = useState<Aba>("usuarios")

  return (
    <>
      <Topbar title="Gestão" subtitle="Administração de usuários e cargos" />
      <div className="flex-1 space-y-5 p-6">
        <div className="flex flex-wrap gap-2">
          {ABAS.map(({ value, label, icon: Icon }) => {
            const active = aba === value
            return (
              <button
                key={value}
                onClick={() => setAba(value)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-foreground)]",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            )
          })}
        </div>

        {aba === "usuarios" && <AbaUsuarios />}
        {aba === "cargos" && <AbaCargos />}
      </div>
    </>
  )
}

function AbaUsuarios() {
  const { user } = useAuth()
  const { data, loading, error, reload } = useUsuariosAdmin()
  const { data: cargos } = useCargosGestao()
  const [modalAberto, setModalAberto] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioAdmin | null>(null)

  function abrirNovoUsuario() {
    setUsuarioEditando(null)
    setModalAberto(true)
  }

  function abrirEdicao(u: UsuarioAdmin) {
    setUsuarioEditando(u)
    setModalAberto(true)
  }

  if (error) return <ErrorState message={error} onRetry={reload} />

  return (
    <>
      <Card index={0}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Usuários cadastrados</h3>
          <button
            onClick={abrirNovoUsuario}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--color-foreground)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Novo usuário
          </button>
        </div>

        {loading && !data ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState message="Nenhum usuário cadastrado." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-muted)]">
                  <th className="pb-2 pr-4 font-medium">Usuário</th>
                  <th className="pb-2 pr-4 font-medium">Email</th>
                  <th className="pb-2 pr-4 font-medium">Cargo</th>
                  <th className="pb-2 pr-4 font-medium">Data de Cadastro</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium text-right">Editar</th>
                </tr>
              </thead>
              <tbody>
                {data.map((u) => (
                  <tr key={u.id} className="border-b border-[var(--color-border)]/60">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-3)] text-xs font-semibold text-[var(--color-accent)]">
                          {u.nome.charAt(0).toUpperCase()}
                        </div>
                        <p className="truncate font-medium text-[var(--color-foreground)]">{u.nome}</p>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-[var(--color-muted)]">{u.email}</td>
                    <td className="py-3 pr-4 text-[var(--color-muted)]">{u.cargo ?? "Sem cargo"}</td>
                    <td className="py-3 pr-4 text-[var(--color-muted)]">{formatDate(u.criado_em)}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={u.ativo ? "low" : "neutral"}>{u.ativo ? "Ativo" : "Inativo"}</Badge>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <button
                        onClick={() => abrirEdicao(u)}
                        title="Editar usuário"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <UsuarioModal
        open={modalAberto}
        usuario={usuarioEditando}
        cargos={cargos ?? []}
        podeEditarAdmin={usuarioEditando ? usuarioEditando.email !== user?.email : true}
        onClose={() => setModalAberto(false)}
        onSaved={reload}
      />
    </>
  )
}

function AbaCargos() {
  const { data, loading, error, reload } = useCargosGestao()
  const [modalAberto, setModalAberto] = useState(false)
  const [cargoEditando, setCargoEditando] = useState<Cargo | null>(null)
  const [alternandoId, setAlternandoId] = useState<number | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  function abrirNovoCargo() {
    setCargoEditando(null)
    setModalAberto(true)
  }

  function abrirEdicao(c: Cargo) {
    setCargoEditando(c)
    setModalAberto(true)
  }

  async function alternarAtivo(cargo: Cargo) {
    setErro(null)
    setAlternandoId(cargo.id)
    try {
      await api.patch(`/api/v1/gestao/cargos/${cargo.id}`, { ativo: !cargo.ativo })
      reload()
    } catch (err) {
      setErro(getErrorMessage(err))
    } finally {
      setAlternandoId(null)
    }
  }

  if (error) return <ErrorState message={error} onRetry={reload} />

  return (
    <>
      <Card index={0}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Cargos cadastrados</h3>
          <button
            onClick={abrirNovoCargo}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--color-foreground)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            <Plus className="h-3.5 w-3.5" />
            Novo cargo
          </button>
        </div>

        {erro && <p className="mb-3 text-xs text-[var(--color-risk-high)]">{erro}</p>}

        {loading && !data ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState message="Nenhum cargo cadastrado." />
        ) : (
          <div className="flex flex-col gap-2">
            {data.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-4 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-medium text-[var(--color-foreground)]">{c.nome}</span>
                  <Badge tone={c.ativo ? "low" : "neutral"}>{c.ativo ? "Ativo" : "Inativo"}</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Toggle
                    checked={c.ativo}
                    onChange={() => alternarAtivo(c)}
                    disabled={alternandoId === c.id}
                    label={c.ativo ? "Desativar cargo" : "Ativar cargo"}
                  />
                  <button
                    onClick={() => abrirEdicao(c)}
                    title="Editar cargo"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <CargoModal
        open={modalAberto}
        cargo={cargoEditando}
        onClose={() => setModalAberto(false)}
        onSaved={reload}
      />
    </>
  )
}
