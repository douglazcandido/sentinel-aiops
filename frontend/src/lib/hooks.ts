import { useState, useEffect, useCallback, useRef } from "react"
import { fetchData, getErrorMessage } from "./api"
import type {
  HistoricoData,
  PrevisaoData,
  RiscoData,
  ClustersData,
  RecomendacoesData,
  TipoRecomendacao,
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
