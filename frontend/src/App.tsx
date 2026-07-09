import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '@/lib/auth'
import { AppLayout } from '@/components/app-layout'
import LoginPage from '@/pages/login'
import DashboardPage from '@/pages/dashboard'
import HistoricoPage from '@/pages/historico'
import PrevisaoPage from '@/pages/previsao'
import RiscoPage from '@/pages/risco'
import PadroesPage from '@/pages/padroes'
import RecomendacoesPage from '@/pages/recomendacoes'
import ExportacaoPage from '@/pages/exportacao'

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/historico" element={<HistoricoPage />} />
        <Route path="/previsao" element={<PrevisaoPage />} />
        <Route path="/risco" element={<RiscoPage />} />
        <Route path="/padroes" element={<PadroesPage />} />
        <Route path="/recomendacoes" element={<RecomendacoesPage />} />
        <Route path="/exportacao" element={<ExportacaoPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
