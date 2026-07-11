// ===== Auth =====
export interface LoginResponse {
  access_token: string
  token_type: string
  nome: string
  email: string
  is_admin: boolean
  tem_foto: boolean
  cargo: string | null
}

export interface Usuario {
  nome: string
  email: string
  is_admin: boolean
  tem_foto: boolean
  cargo: string | null
}

// ===== Perfil =====
export interface Cargo {
  id: number
  nome: string
  ativo: boolean
}

// ===== Gestão =====
export interface UsuarioAdmin {
  id: number
  nome: string
  email: string
  cargo: string | null
  is_admin: boolean
  ativo: boolean
  tem_foto: boolean
  criado_em: string
}

// ===== Histórico =====
export interface KpisGerais {
  total_incidentes: number
  pct_aberto_automaticamente: number
  pct_sem_intervencao: number
  total_violacoes_ola: number
  total_no_kpi: number
  periodo_inicio: string
  periodo_fim: string
}

export interface VolumePorHora {
  hora: number
  total_incidentes: number
}

export interface VolumePorDiaSemana {
  dia_semana: number
  dia_label: string
  total_incidentes: number
}

export interface VolumeDiario {
  data: string
  prioridade_codigo: number
  prioridade_label: string
  total_incidentes: number
  total_no_kpi: number
}

export interface ViolacaoDiario {
  data: string
  prioridade_codigo: number
  prioridade_label: string
  total_violacoes: number
  total_no_kpi: number
}

export interface VolumePorGrupo {
  grupo_nome: string
  total_incidentes: number
  total_no_kpi: number
  total_violacoes: number
  pct_sem_intervencao: number
}

export interface HistoricoData {
  kpis_gerais: KpisGerais
  volume_por_hora: VolumePorHora[]
  volume_por_dia_semana: VolumePorDiaSemana[]
  volume_diario: VolumeDiario[]
  violacoes_diario: ViolacaoDiario[]
  volume_por_grupo: VolumePorGrupo[]
}

// ===== Previsão =====
export interface PrevisaoPonto {
  data_referencia: string
  horizonte_dias: number
  total_previsto: number
  limite_inferior: number | null
  limite_superior: number | null
}

export interface PrevisaoData {
  d1: PrevisaoPonto
  d7: PrevisaoPonto[]
}

// ===== Risco OLA =====
export type ClasseRisco = 'Baixo' | 'Medio' | 'Alto'

export interface DistribuicaoRisco {
  classe_risco: ClasseRisco
  quantidade: number
}

export interface KpiOla {
  ano: number
  prioridade_codigo: number
  prioridade_label: string
  violacoes_acumuladas: number
  total_no_kpi: number
  pct_atingimento_meta: number | null
  faixa_meta: string | null
  violacoes_projetadas_ano: number | null
  pct_projetado_meta: number | null
}

export interface FeatureImportance {
  feature: string
  importancia: number
  ranking: number
}

export interface RiscoData {
  distribuicao_risco: DistribuicaoRisco[]
  kpis_ola: KpiOla[]
  feature_importance: FeatureImportance[]
}

export interface EvolucaoMensal {
  ano: number
  mes: number
  mes_label: string
  prioridade_codigo: number
  prioridade_label: string
  violacoes_mes: number
  violacoes_acumuladas: number
  limite_melhor_faixa: number
}

export interface EvolucaoViolacoes {
  evolucao: EvolucaoMensal[]
  anos_disponiveis: number[]
}

export interface Cluster {
  cluster_id: number
  descricao: string | null
  grupo_nome: string | null
  prioridade_label: string | null
  hora_predominante: number | null
  dia_semana_predominante: number | null
  total_incidentes: number
  pct_violacao_ola: number | null
}

export interface ClustersData {
  clusters: Cluster[]
  total_clusters: number
}

// ===== Recomendações =====
export type TipoRecomendacao = 'equipe' | 'janela_critica' | 'produto_recorrente'

export interface Recomendacao {
  id: number
  tipo: TipoRecomendacao
  prioridade: string | null
  grupo_nome: string | null
  titulo: string
  descricao: string
}

export interface RecomendacoesData {
  recomendacoes: Recomendacao[]
  total: number
}

// ===== Envelope =====
export interface ApiEnvelope<T> {
  sucesso: boolean
  mensagem: string
  data: T
}
