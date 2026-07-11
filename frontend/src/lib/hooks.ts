import { useState, useEffect, useCallback, useRef } from "react"
import { api, fetchData, getErrorMessage } from "./api"
import type {
  HistoricoData,
  PrevisaoData,
  RiscoData,
  ClustersData,
  RecomendacoesData,
  TipoRecomendacao,
  UsuarioAdmin,
  Cargo,
} from "./types"

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
  /** Bumped each time a fetch completes successfully; use as a React `key` to replay entrance animations on refresh. */
  version: number
}

/** Generic data hook that re-fetches whenever `path` or serialized `params` changes. */
function useApiData<T>(path: string, params?: Record<string, unknown>): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const [version, setVersion] = useState(0)
  const paramsKey = JSON.stringify(params ?? {})

  // Keep latest params without retriggering the effect on identity changes.
  const paramsRef = useRef(params)
  paramsRef.current = params

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    fetchData<T>(path, paramsRef.current)
      .then((d) => {
        if (active) {
          setData(d)
          setVersion((v) => v + 1)
        }
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, paramsKey, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  return { data, loading, error, reload, version }
}

export function useHistorico() {
  return useApiData<HistoricoData>("/api/v1/historico")
}

export function usePrevisao() {
  return useApiData<PrevisaoData>("/api/v1/previsao")
}

export function useRisco(ano?: number | "todos") {
  const params = ano && ano !== "todos" ? { ano } : undefined
  return useApiData<RiscoData>("/api/v1/risco", params)
}

export function useClusters() {
  return useApiData<ClustersData>("/api/v1/clusters")
}

export function useRecomendacoes(tipo?: TipoRecomendacao | "todas") {
  const params = tipo && tipo !== "todas" ? { tipo } : undefined
  return useApiData<RecomendacoesData>("/api/v1/recomendacoes", params)
}

/**
 * Busca uma foto de perfil via o client axios autenticado (o backend exige Bearer
 * token, que uma tag <img> comum não consegue enviar) e expõe um object URL.
 * `path` nulo desativa a busca (ex.: usuário sem foto). Incremente `versao` após
 * um upload para forçar o recarregamento.
 */
function useAvatarUrlFromPath(path: string | null, versao = 0): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!path) {
      setUrl(null)
      return
    }

    let active = true
    let objectUrl: string | null = null

    api
      .get(path, { responseType: "blob" })
      .then((res) => {
        if (!active) return
        objectUrl = URL.createObjectURL(res.data as Blob)
        setUrl(objectUrl)
      })
      .catch(() => {
        if (active) setUrl(null)
      })

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [path, versao])

  return url
}

/** Foto de perfil do usuário logado. */
export function useAvatarUrl(temFoto: boolean, versao = 0): string | null {
  return useAvatarUrlFromPath(temFoto ? "/api/v1/perfil/foto" : null, versao)
}

/** Foto de perfil de um usuário arbitrário, para a área de Gestão (somente admin). */
export function useAvatarUrlAdmin(usuarioId: number | null, temFoto: boolean, versao = 0): string | null {
  return useAvatarUrlFromPath(usuarioId != null && temFoto ? `/api/v1/gestao/usuarios/${usuarioId}/foto` : null, versao)
}

/** Lista de usuários para a área de Gestão (somente admin). */
export function useUsuariosAdmin() {
  return useApiData<UsuarioAdmin[]>("/api/v1/gestao/usuarios")
}

/** Todos os cargos (ativos e inativos) para a área de Gestão (somente admin). */
export function useCargosGestao() {
  return useApiData<Cargo[]>("/api/v1/gestao/cargos")
}

/** Polls the recomendações endpoint in the background to feed the notification bell. */
export function useNotificacoes(pollMs = 120_000) {
  const [data, setData] = useState<RecomendacoesData | null>(null)

  useEffect(() => {
    let active = true

    const load = () => {
      fetchData<RecomendacoesData>("/api/v1/recomendacoes")
        .then((d) => {
          if (active) setData(d)
        })
        .catch(() => {
          // Silent: the bell simply won't update until the next successful poll.
        })
    }

    load()
    const id = setInterval(load, pollMs)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [pollMs])

  return { data }
}
