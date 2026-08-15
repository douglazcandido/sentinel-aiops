-- Autenticacao e gestao de usuarios (schema public)
--
-- Precisa refletir exatamente os modelos ORM em backend/app/models/usuario_model.py:
-- Usuario, Cargo, TipoFoto. Qualquer coluna/tabela ausente aqui quebra o SELECT * do
-- SQLAlchemy (inclusive o login em app/api/v1/auth.py, que consulta Usuario por completo).

DROP VIEW IF EXISTS public.vw_usuarios;
DROP TABLE IF EXISTS public.usuarios CASCADE;
DROP TABLE IF EXISTS public.cargos CASCADE;
DROP TABLE IF EXISTS public.tipos_foto CASCADE;

-- ---------------------------------------------------------
-- CARGOS
-- Cadastrados pela area de gestao (Admin), vinculados a usuarios
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cargos (
    id              SERIAL PRIMARY KEY,
    nome            TEXT NOT NULL UNIQUE,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMP DEFAULT now()
);

-- ---------------------------------------------------------
-- TIPOS_FOTO
-- Mimes aceitos para foto de perfil (ver MIMES_PERMITIDOS em app/api/v1/gestao.py)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tipos_foto (
    id              SERIAL PRIMARY KEY,
    mime            TEXT NOT NULL UNIQUE
);

-- ---------------------------------------------------------
-- USUARIOS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usuarios (
    id              BIGSERIAL PRIMARY KEY,
    nome            TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    senha_hash      TEXT NOT NULL,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMP DEFAULT now(),

    cargo_id        INTEGER REFERENCES public.cargos (id),
    foto_perfil     BYTEA,
    foto_type_id    INTEGER REFERENCES public.tipos_foto (id),
    is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
    atualizado_em   TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios (email);

-- ---------------------------------------------------------
-- VW_USUARIOS
-- Consumida por gestao_service.listar_usuarios (SELECT direto via texto SQL)
-- ---------------------------------------------------------
CREATE VIEW public.vw_usuarios AS
SELECT
    u.id,
    u.nome,
    u.email,
    c.nome AS cargo,
    u.is_admin,
    u.ativo,
    (u.foto_perfil IS NOT NULL) AS tem_foto,
    u.criado_em
FROM public.usuarios u
LEFT JOIN public.cargos c ON u.cargo_id = c.id;

-- ---------------------------------------------------------
-- DADOS FIXOS
-- ---------------------------------------------------------
INSERT INTO public.tipos_foto (mime) VALUES
    ('image/jpeg'),
    ('image/png'),
    ('image/webp')
ON CONFLICT (mime) DO NOTHING;
