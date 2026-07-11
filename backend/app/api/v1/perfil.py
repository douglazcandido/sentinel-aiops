from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.logger import setup_logger
from app.models.usuario_model import Usuario
from app.services import perfil as perfil_service

logger = setup_logger(__name__)

router = APIRouter(prefix='/perfil', tags=['Perfil'])


@router.get('/foto')
def get_foto(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    '''Retorna os bytes da foto de perfil do usuario autenticado.'''
    logger.info('requisicao recebida: GET /perfil/foto (usuario=%s)', usuario.email)

    try:
        resultado = perfil_service.get_foto(db, usuario.id)
    except Exception:
        logger.exception('erro inesperado ao buscar foto de perfil')
        raise HTTPException(status_code=500, detail='Erro interno ao buscar a foto de perfil.')

    if resultado is None:
        raise HTTPException(status_code=404, detail='Usuario nao possui foto de perfil.')

    conteudo, mime = resultado
    return Response(content=conteudo, media_type=mime)
