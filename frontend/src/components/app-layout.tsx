import { useState } from "react"
import { Outlet } from "react-router-dom"
import { Moon, Sun, UserRound } from "lucide-react"
import { Sidebar, SIDEBAR_COLLAPSED_W, SIDEBAR_EXPANDED_W } from "./sidebar"
import { NotificationCenter } from "./notification-bell"
import { PerfilPanel } from "./perfil-panel"
import { useTema } from "@/lib/tema"

export function AppLayout() {
  const { tema, alternarTema } = useTema()
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(true)
  const [perfilOpen, setPerfilOpen] = useState(false)
  const expanded = pinned || hovered
  const marginLeft = expanded ? SIDEBAR_EXPANDED_W : SIDEBAR_COLLAPSED_W

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Global top bar */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-topbar)] px-5">
        <div className="flex items-center gap-3">
          <img
            src={tema === "light" ? "/logo-sentinel-topo-light.svg" : "/logo-sentinel-topo.svg"}
            alt="Sentinel"
            className="h-10 w-auto"
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={alternarTema}
            title={tema === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
          >
            {tema === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>
          <NotificationCenter />
          <button
            type="button"
            onClick={() => setPerfilOpen(true)}
            title="Perfil"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
          >
            <UserRound className="h-[18px] w-[18px]" />
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <Sidebar
        expanded={expanded}
        pinned={pinned}
        onHoverChange={setHovered}
        onPinnedChange={setPinned}
      />

      <PerfilPanel open={perfilOpen} onClose={() => setPerfilOpen(false)} />

      {/* Main content */}
      <div
        className="flex min-h-screen flex-col pt-16 transition-[margin] duration-200"
        style={{ marginLeft }}
      >
        <Outlet />
      </div>
    </div>
  )
}
