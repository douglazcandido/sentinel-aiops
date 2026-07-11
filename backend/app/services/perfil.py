from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.logger import setup_logger
from app.models.usuario_model import TipoFoto, Usuario

logger = setup_logger(__name__)


def salvar_foto(db: Session, usuario_id: int, foto_bytes: bytes, mime: str) -> None:
    usuario = db.get(Usuario, usuario_id)
    if usuario is None:
        raise ValueError('usuario_nao_encontrado')

    tipo_foto = db.query(TipoFoto).filter(TipoFoto.mime == mime).first()
    if tipo_foto is None:
        raise ValueError('mime_invalido')

    usuario.foto_perfil = foto_bytes
    usuario.foto_type_id = tipo_foto.id
    usuario.atualizado_em = datetime.now(timezone.utc)
    db.commit()

    logger.info('foto de perfil atualizada: usuario_id=%s', usuario_id)


def get_foto(db: Session, usuario_id: int) -> tuple[bytes, str] | None:
    usuario = db.get(Usuario, usuario_id)
    if usuario is None or usuario.foto_perfil is None or usuario.foto_type_id is None:
        return None

    tipo_foto = db.get(TipoFoto, usuario.foto_type_id)
    if tipo_foto is None:
        return None

    return usuario.foto_perfil, tipo_foto.mime
