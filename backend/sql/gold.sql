-- Camada Gold (Modelo Dimensional)
-- Duas frentes: historico_* e preditivo_*
-- Dims proprias, independentes do Silver

CREATE SCHEMA IF NOT EXISTS gold;

-- =========================================================
-- DIMENSOES PROPRIAS DO GOLD
-- =========================================================

CREATE TABLE IF NOT EXISTS gold.dim_prioridade (
    id BIGSERIAL PRIMARY KEY,
    codigo SMALLINT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    prazo_ola_horas SMALLINT,
    elegivel_kpi BOOLEAN NOT NULL
);

CREATE TABLE IF NOT EXISTS gold.dim_grupo (
    id BIGSERIAL PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE
);

-- =========================================================
-- FRENTE HISTORICA
-- Agregacoes sobre o Silver, alimentam o painel historico
-- =========================================================

-- KPIs gerais do topo do painel (4 cards)
CREATE TABLE IF NOT EXISTS gold.historico_kpis_gerais (
    id BIGSERIAL PRIMARY KEY,
    total_incidentes INTEGER NOT NULL,
    pct_aberto_automaticamente NUMERIC(5,2) NOT NULL,
    pct_sem_intervencao NUMERIC(5,2) NOT NULL,
    total_violacoes_ola INTEGER NOT NULL,
    total_no_kpi INTEGER NOT NULL,
    periodo_inicio DATE NOT NULL,
    periodo_fim DATE NOT NULL,
    gerado_em TIMESTAMP DEFAULT now()
);

-- Volume por hora do dia (0-23)
CREATE TABLE IF NOT EXISTS gold.historico_volume_hora (
    id BIGSERIAL PRIMARY KEY,
    hora SMALLINT NOT NULL UNIQUE,   -- 0-23
    total_incidentes INTEGER NOT NULL,
    gerado_em TIMESTAMP DEFAULT now()
);

-- Volume por dia da semana (0=Seg ... 6=Dom)
CREATE TABLE IF NOT EXISTS gold.historico_volume_dia_semana (
    id BIGSERIAL PRIMARY KEY,
    dia_semana SMALLINT NOT NULL, -- 0-6
    dia_label TEXT NOT NULL, -- Seg, Ter...Dom
    total_incidentes INTEGER NOT NULL,
    gerado_em TIMESTAMP DEFAULT now()
);

-- Volume mensal por prioridade (serie historica)
CREATE TABLE IF NOT EXISTS gold.historico_volume_mensal (
    id BIGSERIAL PRIMARY KEY,
    ano SMALLINT NOT NULL,
    mes SMALLINT NOT NULL,
    prioridade_id BIGINT NOT NULL REFERENCES gold.dim_prioridade (id),
    total_incidentes INTEGER NOT NULL,
    total_no_kpi INTEGER NOT NULL,
    gerado_em TIMESTAMP DEFAULT now(),
    UNIQUE (ano, mes, prioridade_id)
);

-- Violacoes de OLA por mes e prioridade
CREATE TABLE IF NOT EXISTS gold.historico_violacoes_mensal (
    id BIGSERIAL PRIMARY KEY,
    ano SMALLINT NOT NULL,
    mes SMALLINT NOT NULL,
    prioridade_id BIGINT NOT NULL REFERENCES gold.dim_prioridade (id),
    total_violacoes INTEGER NOT NULL,
    gerado_em TIMESTAMP DEFAULT now(),
    UNIQUE (ano, mes, prioridade_id)
);

-- Volume total por grupo/equipe
CREATE TABLE IF NOT EXISTS gold.historico_volume_grupo (
    id BIGSERIAL PRIMARY KEY,
    grupo_id BIGINT NOT NULL REFERENCES gold.dim_grupo (id),
    total_incidentes INTEGER NOT NULL,
    total_no_kpi INTEGER NOT NULL,
    total_violacoes INTEGER NOT NULL,
    pct_sem_intervencao NUMERIC(5,2) NOT NULL,
    gerado_em TIMESTAMP DEFAULT now()
);

-- =========================================================
-- FRENTE PREDITIVA
-- Outputs dos modelos, alimentam o painel principal
-- =========================================================

-- Prophet: previsao de volume D+1 e D+7
CREATE TABLE IF NOT EXISTS gold.previsao_volume (
    id BIGSERIAL PRIMARY KEY,
    data_referencia DATE NOT NULL, -- dia previsto
    horizonte_dias SMALLINT NOT NULL, -- 1 ou 7
    total_previsto NUMERIC(10,2) NOT NULL, -- yhat
    limite_inferior NUMERIC(10,2), -- yhat_lower
    limite_superior NUMERIC(10,2), -- yhat_upper
    gerado_em TIMESTAMP DEFAULT now(),
    UNIQUE (data_referencia, horizonte_dias)
);

-- Random Forest: risco de violacao OLA por incidente
CREATE TABLE IF NOT EXISTS gold.risco_ola_incidente (
    id  BIGSERIAL PRIMARY KEY,
    numero TEXT NOT NULL UNIQUE,
    prioridade_id BIGINT NOT NULL REFERENCES gold.dim_prioridade (id),
    grupo_id BIGINT NOT NULL REFERENCES gold.dim_grupo (id),
    probabilidade_violacao NUMERIC(5,4) NOT NULL, -- 0.0000 a 1.0000
    classe_risco TEXT NOT NULL, -- Baixo, Medio, Alto
    abertura_data DATE NOT NULL,
    gerado_em TIMESTAMP DEFAULT now()
);

-- KPIs de OLA calculados: violacoes acumuladas e projecao de meta
CREATE TABLE IF NOT EXISTS gold.risco_ola_kpi (
    id BIGSERIAL PRIMARY KEY,
    ano SMALLINT NOT NULL,
    prioridade_id BIGINT NOT NULL REFERENCES gold.dim_prioridade (id),
    violacoes_acumuladas INTEGER NOT NULL,
    total_no_kpi INTEGER NOT NULL,
    pct_atingimento_meta NUMERIC(5,2), -- ex: 75.00, 100.00, 150.00
    faixa_meta TEXT, -- ex: '40-45 violacoes = 75%'
    violacoes_projetadas_ano INTEGER, -- extrapolacao linear do ritmo atual
    pct_projetado_meta NUMERIC(5,2), -- projecao do % de atingimento ao fim do ano
    gerado_em TIMESTAMP DEFAULT now(),
    UNIQUE (ano, prioridade_id)
);

-- Random Forest: importancia de cada variavel no modelo (explicabilidade)
CREATE TABLE IF NOT EXISTS gold.modelo_feature_importance (
    id BIGSERIAL PRIMARY KEY,
    feature TEXT NOT NULL,          -- label legivel da variavel
    importancia NUMERIC(6,4) NOT NULL, -- peso no modelo (0.0000 a 1.0000)
    ranking SMALLINT NOT NULL,      -- posicao no ranking (1 = mais importante)
    gerado_em TIMESTAMP DEFAULT now()
);

-- K-Means: perfil de cada cluster
CREATE TABLE IF NOT EXISTS gold.cluster_perfil (
    id BIGSERIAL PRIMARY KEY,
    cluster_id INTEGER NOT NULL UNIQUE,
    descricao TEXT, -- ex: 'Pico quarta 9h-11h, Team14, P3'
    grupo_id BIGINT REFERENCES gold.dim_grupo (id),
    prioridade_id BIGINT REFERENCES gold.dim_prioridade (id),
    hora_predominante SMALLINT, -- hora mais frequente no cluster
    dia_semana_predominante SMALLINT, -- dia mais frequente
    total_incidentes INTEGER NOT NULL,
    pct_violacao_ola NUMERIC(5,2), -- % de violacoes dentro do cluster
    gerado_em TIMESTAMP DEFAULT now()
);

-- K-Means: associacao incidente -> cluster
CREATE TABLE IF NOT EXISTS gold.cluster_incidente (
    id BIGSERIAL PRIMARY KEY,
    numero TEXT NOT NULL UNIQUE,
    cluster_id INTEGER NOT NULL REFERENCES gold.cluster_perfil (cluster_id),
    gerado_em TIMESTAMP DEFAULT now()
);

-- Recomendacoes geradas por regras (Frente 04)
CREATE TABLE IF NOT EXISTS gold.recomendacao (
    id BIGSERIAL PRIMARY KEY,
    tipo TEXT NOT NULL, -- 'equipe', 'janela_critica', 'produto_recorrente'
    prioridade TEXT, -- 'Alta', 'Media', ou NULL se geral
    grupo_id BIGINT REFERENCES gold.dim_grupo (id),
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    gerado_em TIMESTAMP DEFAULT now()
);

-- =========================================================
-- INDICES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_gold_hist_vol_mensal_ano_mes
    ON gold.historico_volume_mensal (ano, mes);

CREATE INDEX IF NOT EXISTS idx_gold_hist_viol_mensal_ano_mes
    ON gold.historico_violacoes_mensal (ano, mes);

CREATE INDEX IF NOT EXISTS idx_gold_previsao_data
    ON gold.previsao_volume (data_referencia, horizonte_dias);

CREATE INDEX IF NOT EXISTS idx_gold_risco_incidente_risco
    ON gold.risco_ola_incidente (classe_risco, prioridade_id);

CREATE INDEX IF NOT EXISTS idx_gold_risco_kpi_ano
    ON gold.risco_ola_kpi (ano, prioridade_id);

CREATE INDEX IF NOT EXISTS idx_gold_feature_importance_ranking
    ON gold.modelo_feature_importance (ranking);

CREATE INDEX IF NOT EXISTS idx_gold_cluster_incidente
    ON gold.cluster_incidente (cluster_id);

CREATE INDEX IF NOT EXISTS idx_gold_recomendacao_tipo
    ON gold.recomendacao (tipo);

-- =========================================================
-- DADOS FIXOS DAS DIMENSOES
-- =========================================================

INSERT INTO gold.dim_prioridade (codigo, label, prazo_ola_horas, elegivel_kpi) VALUES
    (1, 'Critica', 4, TRUE),
    (2, 'Alta', 4, TRUE),
    (3, 'Media', 12, TRUE),
    (4, 'Baixa', NULL, FALSE),
    (5, 'Muito Baixa', NULL, FALSE)
ON CONFLICT (codigo) DO NOTHING;