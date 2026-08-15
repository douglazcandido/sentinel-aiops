-- Silver (Modelo Dimensional)
--
-- AVISO: as 5 tabelas abaixo (dim_prioridade, dim_grupo, dim_status, dim_categoria,
-- fato_incidentes) sao recriadas do zero pelos modelos dbt equivalentes em
-- backend/dbt/models/silver/ (materialized: table => DROP + CREATE TABLE AS a cada
-- `dbt run --select silver`). Isso significa que os PRIMARY KEY/FOREIGN KEY/UNIQUE
-- e os indices definidos aqui NAO sobrevivem apos a primeira execucao do pipeline via
-- dbt; eles servem apenas como dicionario de dados / referencia da estrutura esperada.
-- Os indices de fato_incidentes sao reaplicados de fato via config() no proprio
-- modelo dbt (backend/dbt/models/silver/fato_incidentes.sql).

CREATE SCHEMA IF NOT EXISTS silver;

-- ---------------------------------------------------------
-- DIM_PRIORIDADE
-- 5 linhas fixas, populadas pelo modelo dbt silver/dim_prioridade.sql
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS silver.dim_prioridade (
    id BIGSERIAL PRIMARY KEY,
    codigo SMALLINT NOT NULL UNIQUE, -- 1, 2, 3, 4, 5
    label TEXT NOT NULL, -- Critica, Alta, Media, Baixa, Muito Baixa
    prazo_ola_horas SMALLINT, -- 4, 4, 12, NULL, NULL
    elegivel_kpi BOOLEAN NOT NULL -- TRUE para codigos 1, 2, 3
);

-- ---------------------------------------------------------
-- DIM_GRUPO
-- Uma linha por equipe encontrada na base
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS silver.dim_grupo (
    id BIGSERIAL PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE -- Team01 .. Team17
);

-- ---------------------------------------------------------
-- DIM_STATUS
-- 4 linhas fixas (Aguardando Problema normalizado para Encerrado)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS silver.dim_status (
    id BIGSERIAL PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
    sem_intervencao BOOLEAN NOT NULL
);

-- ---------------------------------------------------------
-- DIM_CATEGORIA
-- Combinacoes unicas de produto / categoria / subcategoria
-- ~63% dos incidentes terao FK para um registro "Nao Classificado"
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS silver.dim_categoria (
    id BIGSERIAL PRIMARY KEY,
    produto TEXT,
    categoria TEXT,
    subcategoria TEXT,
    UNIQUE (produto, categoria, subcategoria)
);

-- ---------------------------------------------------------
-- FATO_INCIDENTES
-- Granularidade: um registro por incidente
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS silver.fato_incidentes (

    -- chave e rastreabilidade
    numero TEXT PRIMARY KEY,
    bronze_id UUID NOT NULL,

    -- chaves das dimensoes
    prioridade_id BIGINT NOT NULL REFERENCES silver.dim_prioridade (id),
    grupo_id BIGINT NOT NULL REFERENCES silver.dim_grupo (id),
    status_id BIGINT NOT NULL REFERENCES silver.dim_status (id),
    categoria_id BIGINT NOT NULL REFERENCES silver.dim_categoria (id),

    -- campos diretos
    item_configuracao TEXT,
    solucao TEXT,
    aberto_por TEXT NOT NULL,
    incidente_pai TEXT,

    -- datas e duracao
    aberto_em TIMESTAMP NOT NULL,
    encerrado_em  TIMESTAMP NOT NULL,
    resolvido_em TIMESTAMP,
    duracao_segundos INTEGER NOT NULL,
    duracao_segundos_capped INTEGER NOT NULL,

    -- features temporais
    abertura_data DATE NOT NULL,
    abertura_hora SMALLINT NOT NULL,
    abertura_dia_semana SMALLINT NOT NULL,
    abertura_mes SMALLINT NOT NULL,
    abertura_ano SMALLINT NOT NULL,
    abertura_fim_de_semana BOOLEAN NOT NULL,
    abertura_fora_horario BOOLEAN NOT NULL,

    -- campos derivados
    aberto_automaticamente BOOLEAN NOT NULL,
    tem_incidente_pai BOOLEAN NOT NULL,
    sem_intervencao BOOLEAN NOT NULL,

    -- KPI e OLA
    entrou_kpi BOOLEAN NOT NULL,
    kpi_violado BOOLEAN,
    elegivel_kpi BOOLEAN NOT NULL,

    -- controle de carga
    processado_em TIMESTAMP DEFAULT now()
);

-- ---------------------------------------------------------
-- INDICES
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_fato_abertura_data
    ON silver.fato_incidentes (abertura_data);

CREATE INDEX IF NOT EXISTS idx_fato_kpi
    ON silver.fato_incidentes (entrou_kpi, kpi_violado);

CREATE INDEX IF NOT EXISTS idx_fato_prioridade
    ON silver.fato_incidentes (prioridade_id);

CREATE INDEX IF NOT EXISTS idx_fato_grupo
    ON silver.fato_incidentes (grupo_id);

CREATE INDEX IF NOT EXISTS idx_fato_kpi_prioridade_data
    ON silver.fato_incidentes (entrou_kpi, prioridade_id, abertura_data);

CREATE INDEX IF NOT EXISTS idx_fato_bronze_id
    ON silver.fato_incidentes (bronze_id);

-- ---------------------------------------------------------
-- DADOS FIXOS DAS DIMENSOES
-- Populados aqui diretamente pois sao estaticos
-- ---------------------------------------------------------

INSERT INTO silver.dim_prioridade (codigo, label, prazo_ola_horas, elegivel_kpi) VALUES
    (1, 'Critica', 4, TRUE),
    (2, 'Alta', 4, TRUE),
    (3, 'Media', 12, TRUE),
    (4, 'Baixa', NULL, FALSE),
    (5, 'Muito Baixa', NULL, FALSE)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO silver.dim_status (nome, sem_intervencao) VALUES
    ('Encerrado', FALSE),
    ('Encerrado Automaticamente',FALSE),
    ('Sem Intervenção', TRUE)
ON CONFLICT (nome) DO NOTHING;

INSERT INTO silver.dim_categoria (produto, categoria, subcategoria) VALUES
    (NULL, NULL, NULL)
ON CONFLICT (produto, categoria, subcategoria) DO NOTHING;