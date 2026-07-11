import { useState, type FormEvent } from "react"
import { useNavigate, useLocation, Navigate } from "react-router-dom"
import { Loader2, AlertCircle, Mail, Lock } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { useTema } from "@/lib/tema"

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const { tema } = useTema()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const from = (location.state as { from?: string } | null)?.from || "/"

  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, senha)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao entrar.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-6">
      {/* Outer block with hover glow border */}
      <div className="group relative w-full max-w-5xl rounded-3xl animate-enter">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-px -z-10 rounded-3xl bg-[var(--color-glow-blue)] opacity-0 blur-sm transition-opacity duration-500 ease-in-out group-hover:opacity-[var(--glow-opacity)]"
        />
        <div className="flex min-h-[680px] overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-colors duration-500 ease-in-out hover:border-[var(--color-glow-blue)]/22">
          {/* Left column — hero image */}
          <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden rounded-l-3xl">
            <img
              src="/logo-locaweb.png"
              alt="Imagem de destaque"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>

          {/* Right column — form */}
          <div className="flex w-full lg:w-1/2 items-center justify-center px-8 py-12">
            <div className="w-full max-w-sm">
              {/* Logo + heading */}
              <div className="mb-10 flex flex-col items-center text-center">
                <img
                  src={tema === "light" ? "/logo-sentinel-light.svg" : "/logo-sentinel.svg"}
                  alt="Sentinel"
                  className="h-40 w-auto"
                />
                <p className="mt-4 text-sm text-[var(--color-muted)]">
                  Analytics Preditivo de Incidentes de TI
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-4">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-[var(--color-muted)]">E-mail</span>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-2)]" />
                      <input
                        type="email"
                        required
                        autoComplete="username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="voce@locaweb.com.br"
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] py-2.5 pl-9 pr-3 text-sm text-[var(--color-foreground)] outline-none transition-colors placeholder:text-[var(--color-muted-2)] focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/40"
                      />
                    </div>
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-[var(--color-muted)]">Senha</span>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-2)]" />
                      <input
                        type="password"
                        required
                        autoComplete="current-password"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] py-2.5 pl-9 pr-3 text-sm text-[var(--color-foreground)] outline-none transition-colors placeholder:text-[var(--color-muted-2)] focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/40"
                      />
                    </div>
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] py-2.5 text-sm font-semibold text-[var(--color-accent-contrast)] transition-all hover:bg-[var(--color-accent-2)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin-slow" />}
                    {loading ? "Entrando..." : "Entrar"}
                  </button>

                  {error && (
                    <div className="flex items-start gap-2 rounded-lg border border-[var(--color-risk-high)]/30 bg-[var(--color-risk-high-soft)] px-3 py-2 text-xs text-[var(--color-risk-high)]">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                </div>
              </form>

              <p className="mt-6 text-center text-xs text-[var(--color-muted-2)]">
                Acesso restrito · Sistema interno Locaweb
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
