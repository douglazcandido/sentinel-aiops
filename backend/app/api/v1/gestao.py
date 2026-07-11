from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import get_admin_user, get_current_user
from app.core.database import get_db
from app.core.logger import setup_logger
from app.models.usuario_model import Usuario
from app.schemas.base import SentinelResponse
from app.schemas.perfil import (
    AtualizarCargoRequest,
    AtualizarUsuarioAdminRequest,
    CargoSchema,
    CriarCargoRequest,
    CriarUsuarioAdminRequest,
    UsuarioAdminResponse,
)
from app.services import gestao as gestao_service
from app.services import perfil as perfil_service

logger = setup_logger(__name__)

router = APIRouter(prefix='/gestao', tags=['Gestao'])
cargos_router = APIRouter(prefix='/cargos', tags=['Cargos'])

MIMES_PERMITIDOS = {'image/jpeg', 'image/png', 'image/webp'}
TAMANHO_MAXIMO_FOTO = 2 * 1024 * 1024


@router.get('/usuarios', response_model=SentinelResponse[list[UsuarioAdminResponse]])
def listar_usuarios(
    db: Session = Depends(get_db),
    admin: Usuario = Depends(get_admin_user),
):
    '''Lista todos os usuarios cadastrados (area de gestao, somente admin).'''
    logger.info('requisicao recebida: GET /gestao/usuarios (admin=%s)', admin.email)

    try:
        data = gestao_service.listar_usuarios(db)
    except Exception:
        logger.exception('erro inesperado ao listar usuarios')
        raise HTTPException(status_code=500, detail='Erro interno ao listar usuarios.')

    return SentinelResponse(mensagem='Usuarios recuperados com sucesso', data=data)


@router.post('/usuarios', response_model=SentinelResponse[UsuarioAdminResponse])
def criar_usuario(
    payload: CriarUsuarioAdminRequest,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(get_admin_user),
):
    '''Cria um novo usuario (somente admin).'''
    logger.info('requisicao recebida: POST /gestao/usuarios (admin=%s)', admin.email)

    try:
        data = gestao_service.criar_usuario(db, payload, admin.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        logger.exception('erro inesperado ao criar usuario')
        raise HTTPException(status_code=500, detail='Erro interno ao criar usuario.')

    return SentinelResponse(mensagem='Usuario criado com sucesso', data=data)


@router.patch('/usuarios/{usuario_id}', response_model=SentinelResponse[UsuarioAdminResponse])
def atualizar_usuario(
    usuario_id: int,
    payload: AtualizarUsuarioAdminRequest,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(get_admin_user),
):
    '''Atualiza permissoes, status ou cargo de um usuario (somente admin).'''
    logger.info('requisicao recebida: PATCH /gestao/usuarios/%s (admin=%s)', usuario_id, admin.email)

    try:
        data = gestao_service.atualizar_usuario(db, usuario_id, payload, admin.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        logger.exception('erro inesperado ao atualizar usuario')
        raise HTTPException(status_code=500, detail='Erro interno ao atualizar usuario.')

    return SentinelResponse(mensagem='Usuario atualizado com sucesso', data=data)


@router.post('/usuarios/{usuario_id}/foto', response_model=SentinelResponse[None])
async def upload_foto_usuario(
    usuario_id: int,
    file: UploadFile,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(get_admin_user),
):
    '''Faz upload da foto de perfil de um usuario (somente admin).'''
    logger.info('requisicao recebida: POST /gestao/usuarios/%s/foto (admin=%s)', usuario_id, admin.email)

    if file.content_type not in MIMES_PERMITIDOS:
        raise HTTPException(status_code=400, detail='Formato de imagem invalido. Use JPEG, PNG ou WEBP.')

    conteudo = await file.read()
    if len(conteudo) > TAMANHO_MAXIMO_FOTO:
        raise HTTPException(status_code=413, detail='A imagem excede o tamanho maximo de 2MB.')

    try:
        perfil_service.salvar_foto(db, usuario_id, conteudo, file.content_type)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        logger.exception('erro inesperado ao salvar foto de usuario')
        raise HTTPException(status_code=500, detail='Erro interno ao salvar a foto do usuario.')

    return SentinelResponse(mensagem='Foto de perfil atualizada com sucesso', data=None)


@router.get('/usuarios/{usuario_id}/foto')
def get_foto_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(get_admin_user),
):
    '''Retorna os bytes da foto de perfil de um usuario (somente admin).'''
    logger.info('requisicao recebida: GET /gestao/usuarios/%s/foto (admin=%s)', usuario_id, admin.email)

    try:
        resultado = perfil_service.get_foto(db, usuario_id)
    except Exception:
        logger.exception('erro inesperado ao buscar foto de usuario')
        raise HTTPException(status_code=500, detail='Erro interno ao buscar a foto do usuario.')

    if resultado is None:
        raise HTTPException(status_code=404, detail='Usuario nao possui foto de perfil.')

    conteudo, mime = resultado
    return Response(content=conteudo, media_type=mime)


@router.get('/cargos', response_model=SentinelResponse[list[CargoSchema]])
def listar_cargos_gestao(
    db: Session = Depends(get_db),
    admin: Usuario = Depends(get_admin_user),
):
    '''Lista todos os cargos, ativos e inativos (somente admin).'''
    logger.info('requisicao recebida: GET /gestao/cargos (admin=%s)', admin.email)

    try:
        data = gestao_service.listar_cargos(db)
    except Exception:
        logger.exception('erro inesperado ao listar cargos')
        raise HTTPException(status_code=500, detail='Erro interno ao listar cargos.')

    return SentinelResponse(mensagem='Cargos recuperados com sucesso', data=data)


@router.post('/cargos', response_model=SentinelResponse[CargoSchema])
def criar_cargo(
    payload: CriarCargoRequest,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(get_admin_user),
):
    '''Cria um novo cargo (somente admin).'''
    logger.info('requisicao recebida: POST /gestao/cargos (admin=%s)', admin.email)

    try:
        data = gestao_service.criar_cargo(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        logger.exception('erro inesperado ao criar cargo')
        raise HTTPException(status_code=500, detail='Erro interno ao criar cargo.')

    return SentinelResponse(mensagem='Cargo criado com sucesso', data=data)


@router.patch('/cargos/{cargo_id}', response_model=SentinelResponse[CargoSchema])
def atualizar_cargo(
    cargo_id: int,
    payload: AtualizarCargoRequest,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(get_admin_user),
):
    '''Atualiza o nome e/ou o status (ativo/inativo) de um cargo (somente admin).'''
    logger.info('requisicao recebida: PATCH /gestao/cargos/%s (admin=%s)', cargo_id, admin.email)

    try:
        data = gestao_service.atualizar_cargo(db, cargo_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        logger.exception('erro inesperado ao atualizar cargo')
        raise HTTPException(status_code=500, detail='Erro interno ao atualizar cargo.')

    return SentinelResponse(mensagem='Cargo atualizado com sucesso', data=data)


@cargos_router.get('', response_model=SentinelResponse[list[CargoSchema]])
def listar_cargos_publico(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    '''Lista os cargos ativos, disponivel para qualquer usuario autenticado.'''
    logger.info('requisicao recebida: GET /cargos (usuario=%s)', usuario.email)

    try:
        cargos = [c for c in gestao_service.listar_cargos(db) if c.ativo]
    except Exception:
        logger.exception('erro inesperado ao listar cargos publicos')
        raise HTTPException(status_code=500, detail='Erro interno ao listar cargos.')

    return SentinelResponse(mensagem='Cargos recuperados com sucesso', data=cargos)
