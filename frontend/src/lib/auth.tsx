import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { api, TOKEN_KEY, USER_KEY, getErrorMessage } from "./api"
import { markLoginToastPending } from "./notifications"
import type { ApiEnvelope, LoginResponse, Usuario } from "./types"

interface AuthContextValue {
  user: Usuario | null
  isAuthenticated: boolean
  login: (email: string, senha: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readStoredUser(): Usuario | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as Usuario) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(() => readStoredUser())
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))

  const login = useCallback(async (email: string, senha: string) => {
    try {
      const res = await api.post<ApiEnvelope<LoginResponse>>("/api/v1/auth/login", {
        email,
        senha,
      })
      if (!res.data?.sucesso) {
        throw new Error(res.data?.mensagem || "Falha na autenticação.")
      }
      const data = res.data.data

      const { access_token, nome, email: userEmail } = data
      const usuario: Usuario = { nome, email: userEmail }
      localStorage.setItem(TOKEN_KEY, access_token)
      localStorage.setItem(USER_KEY, JSON.stringify(usuario))
      markLoginToastPending()
      setToken(access_token)
      setUser(usuario)
    } catch (err) {
      throw new Error(getErrorMessage(err))
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: Boolean(token), login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider")
  return ctx
}
