import { useEffect, useState } from "react"

export type Tema = "dark" | "light"

const STORAGE_KEY = "sentinel_tema"
const EVENTO_TEMA = "sentinel-tema-alterado"

function lerTema(): Tema {
  return (localStorage.getItem(STORAGE_KEY) as Tema) || "dark"
}

/**
 * Tema claro/escuro sem Provider: localStorage + atributo `data-theme` no <html>
 * são a fonte de verdade. Um evento customizado sincroniza todas as instâncias
 * do hook, para que logos e ícones reajam ao toggle disparado em outro componente.
 */
export function useTema() {
  const [tema, setTema] = useState<Tema>(lerTema)

  useEffect(() => {
    const sincronizar = () => setTema(lerTema())
    window.addEventListener(EVENTO_TEMA, sincronizar)
    return () => window.removeEventListener(EVENTO_TEMA, sincronizar)
  }, [])

  function alternarTema() {
    const novo: Tema = tema === "dark" ? "light" : "dark"
    document.documentElement.setAttribute("data-theme", novo)
    localStorage.setItem(STORAGE_KEY, novo)
    setTema(novo)
    window.dispatchEvent(new Event(EVENTO_TEMA))
  }

  return { tema, alternarTema }
}
