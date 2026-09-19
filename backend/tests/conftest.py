'''Fixtures compartilhadas pelos testes de integracao (tests/api e tests/data_pipeline).

Sobem a aplicacao FastAPI real (incluindo o lifespan de startup: bootstrap do
schema em pipeline/bootstrap.py e criacao do usuario admin padrao) contra um
Postgres de verdade, apontado pelas variaveis de ambiente POSTGRES_* (as
mesmas usadas em producao, ver app/core/config.py).

Requer um banco DESCARTAVEL: os testes escrevem em public.usuarios e (no caso
de tests/data_pipeline) esperam os schemas bronze/silver/gold ja carregados.
No CI isso e um servico Postgres efemero (ver .github/workflows/backend-ci.yml).
Para rodar localmente, aponte POSTGRES_HOST/PORT/USER/PASSWORD/DB para uma
instancia de teste, nunca para o Postgres de desenvolvimento do docker-compose.
'''

import pytest
from fastapi.testclient import TestClient

from app.core.database import SessionLocal
from app.core.security import hash_senha
from app.main import app
from app.models.usuario_model import Usuario


@pytest.fixture(scope='session')
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def criar_usuario(db):
    '''Cria (ou recria) um usuario de teste por email, para os testes ficarem
    idempotentes ao rodar varias vezes contra o mesmo banco local.'''

    def _criar(email: str, senha: str = 'senha123456', **kwargs) -> Usuario:
        db.query(Usuario).filter(Usuario.email == email).delete()
        db.commit()

        usuario = Usuario(
            nome=kwargs.pop('nome', 'Usuario de Teste'),
            email=email,
            senha_hash=hash_senha(senha),
            **kwargs,
        )
        db.add(usuario)
        db.commit()
        db.refresh(usuario)
        return usuario

    return _criar
