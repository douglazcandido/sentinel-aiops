from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.logger import setup_logger
from app.core.security import hash_senha
from app.models.usuario_model import Cargo, Usuario
from app.schemas.perfil import (
    AtualizarCargoRequest,
    AtualizarUsuarioAdminRequest,
    CargoSchema,
    CriarCargoRequest,
    CriarUsuarioAdminRequest,
    UsuarioAdminResponse,
)

logger = setup_logger(__name__)


def listar_usuarios(db: Session) -> list[UsuarioAdminResponse]:
    rows = db.execute(
        text(
            '''
            SELECT id, nome, email, cargo, is_admin, ativo, tem_foto, criado_em
            FROM public.vw_usuarios
            ORDER BY nome
            '''
        )
    ).mappings().all()

    return [
        UsuarioAdminResponse(
            id=r['id'],
            nome=r['nome'],
            email=r['email'],
            cargo=r['cargo'],
            is_admin=r['is_admin'],
            ativo=r['ativo'],
            tem_foto=r['tem_foto'],
            criado_em=r['criado_em'].isoformat() if hasattr(r['criado_em'], 'isoformat') else str(r['criado_em']),
        )
        for r in rows
    ]


def _usuario_para_admin_response(db: Session, usuario: Usuario) -> UsuarioAdminResponse:
    cargo = db.get(Cargo, usuario.cargo_id) if usuario.cargo_id else None
    return UsuarioAdminResponse(
        id=usuario.id,
        nome=usuario.nome,
        email=usuario.email,
        cargo=cargo.nome if cargo else None,
        is_admin=usuario.is_admin,
        ativo=usuario.ativo,
        tem_foto=usuario.foto_perfil is not None,
        criado_em=usuario.criado_em.isoformat(),
    )


def criar_usuario(
    db: Session,
    dados: CriarUsuarioAdminRequest,
    admin_id: int,
) -> UsuarioAdminResponse:
    existente = db.query(Usuario).filter(Usuario.email == dados.email).first()
    if existente is not None:
        raise ValueError('email_ja_cadastrado')

    usuario = Usuario(
        nome=dados.nome,
        email=dados.email,
        senha_hash=hash_senha(dados.senha),
        cargo_id=dados.cargo_id,
        is_admin=dados.is_admin,
        ativo=dados.ativo,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    logger.info('usuario criado via gestao: usuario_id=%s, admin_id=%s', usuario.id, admin_id)

    return _usuario_para_admin_response(db, usuario)


def atualizar_usuario(
    db: Session,
    usuario_id: int,
    dados: AtualizarUsuarioAdminRequest,
    admin_id: int,
) -> UsuarioAdminResponse:
    usuario = db.get(Usuario, usuario_id)
    if usuario is None:
        raise ValueError('usuario_nao_encontrado')

    if usuario_id == admin_id and dados.is_admin is False:
        raise ValueError('nao_e_possivel_remover_a_propria_permissao_de_admin')

    if dados.nome is not None:
        usuario.nome = dados.nome
    if dados.email is not None and dados.email != usuario.email:
        email_existente = db.query(Usuario).filter(Usuario.email == dados.email, Usuario.id != usuario_id).first()
        if email_existente is not None:
            raise ValueError('email_ja_cadastrado')
        usuario.email = dados.email
    if dados.is_admin is not None:
        usuario.is_admin = dados.is_admin
    if dados.ativo is not None:
        usuario.ativo = dados.ativo
    if dados.cargo_id is not None:
        usuario.cargo_id = dados.cargo_id
    if dados.nova_senha:
        usuario.senha_hash = hash_senha(dados.nova_senha)

    usuario.atualizado_em = datetime.now(timezone.utc)
    db.commit()
    db.refresh(usuario)

    logger.info('usuario atualizado via gestao: usuario_id=%s, admin_id=%s', usuario_id, admin_id)

    return _usuario_para_admin_response(db, usuario)


def listar_cargos(db: Session) -> list[CargoSchema]:
    cargos = db.query(Cargo).order_by(Cargo.nome).all()
    return [CargoSchema.model_validate(c) for c in cargos]


def criar_cargo(db: Session, dados: CriarCargoRequest) -> CargoSchema:
    existente = db.query(Cargo).filter(Cargo.nome == dados.nome).first()
    if existente is not None:
        raise ValueError('cargo_ja_existe')

    cargo = Cargo(nome=dados.nome, ativo=True)
    db.add(cargo)
    db.commit()
    db.refresh(cargo)

    logger.info('cargo criado: %s', dados.nome)
    return CargoSchema.model_validate(cargo)


def atualizar_cargo(db: Session, cargo_id: int, dados: AtualizarCargoRequest) -> CargoSchema:
    cargo = db.get(Cargo, cargo_id)
    if cargo is None:
        raise ValueError('cargo_nao_encontrado')

    if dados.nome is not None and dados.nome != cargo.nome:
        existente = db.query(Cargo).filter(Cargo.nome == dados.nome, Cargo.id != cargo_id).first()
        if existente is not None:
            raise ValueError('cargo_ja_existe')
        cargo.nome = dados.nome

    if dados.ativo is not None and dados.ativo != cargo.ativo:
        if not dados.ativo:
            vinculados = (
                db.query(Usuario)
                .filter(Usuario.cargo_id == cargo_id, Usuario.ativo == True)
                .count()
            )
            if vinculados > 0:
                raise ValueError('cargo_possui_usuarios_vinculados')
        cargo.ativo = dados.ativo

    db.commit()
    db.refresh(cargo)

    logger.info('cargo atualizado: id=%s', cargo_id)
    return CargoSchema.model_validate(cargo)
