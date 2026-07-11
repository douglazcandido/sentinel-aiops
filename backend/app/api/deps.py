from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.logger import setup_logger
from app.core.security import decodificar_token
from app.models.usuario_model import Usuario


logger = setup_logger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl='/api/v1/auth/login')


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    credenciais_invalidas = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail='Credenciais invalidas ou sessao expirada',
        headers={'WWW-Authenticate': 'Bearer'},
    )

    email = decodificar_token(token)
    if email is None:
        raise credenciais_invalidas

    usuario = db.query(Usuario).filter(Usuario.email == email, Usuario.ativo == True).first()
    if usuario is None:
        logger.warning('usuario nao encontrado ou inativo: %s', email)
        raise credenciais_invalidas

    return usuario


def get_admin_user(usuario: Usuario = Depends(get_current_user)) -> Usuario:
    if not usuario.is_admin:
        logger.warning('acesso negado, usuario nao e admin: %s', usuario.email)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Acesso restrito a administradores')
    return usuario
