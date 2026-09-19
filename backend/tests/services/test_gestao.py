'''Testes da camada de servico de gestao (app/services/gestao.py).

Chamam as funcoes de servico diretamente (sem passar pela API HTTP), contra
um Postgres real via a fixture `db` — mesma exigencia de tests/api (ver
tests/conftest.py): banco descartavel, so precisa do schema public (auth).
'''

import pytest

from app.models.usuario_model import Cargo, Usuario
from app.schemas.perfil import (
    AtualizarCargoRequest,
    AtualizarUsuarioAdminRequest,
    CriarCargoRequest,
    CriarUsuarioAdminRequest,
)
from app.services import gestao as gestao_service


def test_criar_usuario_com_sucesso(db):
    payload = CriarUsuarioAdminRequest(
        nome='Novo Usuario',
        email='novo-usuario-gestao@sentinellocaweb.com.br',
        senha='senha123456',
    )

    resultado = gestao_service.criar_usuario(db, payload, admin_id=1)

    assert resultado.email == payload.email
    assert resultado.ativo is True
    assert resultado.is_admin is False


def test_criar_usuario_com_email_duplicado_gera_erro(db, criar_usuario):
    existente = criar_usuario('duplicado-gestao@sentinellocaweb.com.br')

    payload = CriarUsuarioAdminRequest(
        nome='Outro Nome',
        email=existente.email,
        senha='senha123456',
    )

    with pytest.raises(ValueError, match='email_ja_cadastrado'):
        gestao_service.criar_usuario(db, payload, admin_id=1)


def test_atualizar_usuario_inexistente_gera_erro(db):
    with pytest.raises(ValueError, match='usuario_nao_encontrado'):
        gestao_service.atualizar_usuario(db, 999_999, AtualizarUsuarioAdminRequest(), admin_id=1)


def test_atualizar_usuario_nao_pode_remover_a_propria_permissao_de_admin(db, criar_usuario):
    admin = criar_usuario('admin-gestao@sentinellocaweb.com.br', is_admin=True)

    with pytest.raises(ValueError, match='nao_e_possivel_remover_a_propria_permissao_de_admin'):
        gestao_service.atualizar_usuario(
            db, admin.id, AtualizarUsuarioAdminRequest(is_admin=False), admin_id=admin.id,
        )


def test_atualizar_usuario_altera_campos_permitidos(db, criar_usuario):
    usuario = criar_usuario('alvo-atualizacao@sentinellocaweb.com.br')

    resultado = gestao_service.atualizar_usuario(
        db, usuario.id, AtualizarUsuarioAdminRequest(nome='Nome Atualizado', ativo=False), admin_id=1,
    )

    assert resultado.nome == 'Nome Atualizado'
    assert resultado.ativo is False


def test_atualizar_usuario_com_email_ja_usado_por_outro_gera_erro(db, criar_usuario):
    usuario_a = criar_usuario('usuario-a-gestao@sentinellocaweb.com.br')
    usuario_b = criar_usuario('usuario-b-gestao@sentinellocaweb.com.br')

    with pytest.raises(ValueError, match='email_ja_cadastrado'):
        gestao_service.atualizar_usuario(
            db, usuario_b.id, AtualizarUsuarioAdminRequest(email=usuario_a.email), admin_id=1,
        )


def test_criar_cargo_com_sucesso(db):
    resultado = gestao_service.criar_cargo(db, CriarCargoRequest(nome='Cargo de Teste A'))

    assert resultado.nome == 'Cargo de Teste A'
    assert resultado.ativo is True


def test_criar_cargo_com_nome_duplicado_gera_erro(db):
    gestao_service.criar_cargo(db, CriarCargoRequest(nome='Cargo Duplicado'))

    with pytest.raises(ValueError, match='cargo_ja_existe'):
        gestao_service.criar_cargo(db, CriarCargoRequest(nome='Cargo Duplicado'))


def test_atualizar_cargo_inexistente_gera_erro(db):
    with pytest.raises(ValueError, match='cargo_nao_encontrado'):
        gestao_service.atualizar_cargo(db, 999_999, AtualizarCargoRequest())


def test_atualizar_cargo_nao_pode_desativar_com_usuarios_vinculados(db, criar_usuario):
    cargo = gestao_service.criar_cargo(db, CriarCargoRequest(nome='Cargo Vinculado'))
    criar_usuario('vinculado-ao-cargo@sentinellocaweb.com.br', cargo_id=cargo.id)

    with pytest.raises(ValueError, match='cargo_possui_usuarios_vinculados'):
        gestao_service.atualizar_cargo(db, cargo.id, AtualizarCargoRequest(ativo=False))


def test_atualizar_cargo_pode_desativar_sem_usuarios_vinculados(db):
    cargo = gestao_service.criar_cargo(db, CriarCargoRequest(nome='Cargo Sem Vinculo'))

    resultado = gestao_service.atualizar_cargo(db, cargo.id, AtualizarCargoRequest(ativo=False))

    assert resultado.ativo is False


@pytest.fixture(autouse=True)
def _limpar_dados_de_teste(db):
    '''Cargos tem nome UNIQUE e usuarios email UNIQUE: limpa antes de cada teste
    para permitir reruns locais contra o mesmo banco.'''
    nomes_cargo = [
        'Cargo de Teste A', 'Cargo Duplicado', 'Cargo Vinculado', 'Cargo Sem Vinculo',
    ]
    # usuarios criados fora da fixture `criar_usuario` (que ja e idempotente sozinha)
    emails_usuario = ['novo-usuario-gestao@sentinellocaweb.com.br']

    db.query(Usuario).filter(Usuario.email.in_(emails_usuario)).delete(synchronize_session=False)

    cargo_ids = [c.id for c in db.query(Cargo.id).filter(Cargo.nome.in_(nomes_cargo)).all()]
    if cargo_ids:
        db.query(Usuario).filter(Usuario.cargo_id.in_(cargo_ids)).update(
            {'cargo_id': None}, synchronize_session=False,
        )
    db.query(Cargo).filter(Cargo.nome.in_(nomes_cargo)).delete(synchronize_session=False)
    db.commit()
    yield
