from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.logger import setup_logger
from app.models.usuario_model import Usuario
from app.schemas.base import SentinelResponse
from app.schemas.historico import HistoricoCompletoSchema
from app.services import historico as historico_service


logger = setup_logger(__name__)

router = APIRouter(prefix='/historico', tags=['Historico'])


@router.get('', response_model=SentinelResponse[HistoricoCompletoSchema])
def get_historico(
    data_inicio: date | None = Query(None, description='Data de inicio do filtro (YYYY-MM-DD)'),
    data_fim: date | None = Query(None, description='Data de fim do filtro (YYYY-MM-DD)'),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    '''Retorna o payload completo do painel historico com granularidade diaria.
    Sem filtros retorna o periodo completo (Jan/2023 a Dez/2025).
    Com filtros retorna apenas os dados do intervalo informado.'''
    logger.info(
        'requisicao recebida: GET /historico (usuario=%s, inicio=%s, fim=%s)',
        usuario.email, data_inicio, data_fim,
    )

    if data_inicio and data_fim and data_inicio > data_fim:
        raise HTTPException(
            status_code=400,
            detail='data_inicio nao pode ser posterior a data_fim.',
        )

    try:
        data = historico_service.get_historico_completo(db, data_inicio, data_fim)
    except ValueError as exc:
        logger.warning('dados historicos indisponiveis: %s', exc)
        raise HTTPException(
            status_code=503,
            detail='Dados historicos ainda nao foram processados. Execute o pipeline de dados primeiro.',
        ) from exc
    except Exception:
        logger.exception('erro inesperado ao buscar dados historicos')
        raise HTTPException(
            status_code=500,
            detail='Erro interno ao processar dados historicos.',
        )

    return SentinelResponse(
        mensagem='Dados historicos recuperados com sucesso',
        data=data,
    )