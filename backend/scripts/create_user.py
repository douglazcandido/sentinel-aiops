import sys

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.config import DATABASE_URL
from app.core.logger import setup_logger
from app.core.security import hash_senha
from app.models.usuario_model import Usuario

logger = setup_logger(__name__)

def criar_usuario(nome: str, email: str, senha: str, is_admin: bool = False) -> None:
    engine = create_engine(DATABASE_URL)

    with Session(engine) as session:
        existente = session.query(Usuario).filter_by(email=email).first()
        if existente:
            logger.warning('usuario ja existe: %s', email)
            engine.dispose()
            return

        # o primeiro usuario da base vira admin automaticamente: sem isso,
        # ninguem consegue acessar /gestao (rota exige get_admin_user) para
        # promover o proprio usuario a admin
        primeiro_usuario = session.query(Usuario).count() == 0
        admin = is_admin or primeiro_usuario

        usuario = Usuario(
            nome=nome,
            email=email,
            senha_hash=hash_senha(senha),
            is_admin=admin,
        )
        session.add(usuario)
        session.commit()
        logger.info('usuario criado com sucesso: %s (admin=%s)', email, admin)

    engine.dispose()


if __name__ == '__main__':
    if len(sys.argv) not in (4, 5):
        print('uso: python -m scripts.create_user "<nome>" "<email>" "<senha>" [--admin]')
        sys.exit(1)

    nome_arg, email_arg, senha_arg = sys.argv[1], sys.argv[2], sys.argv[3]
    admin_arg = len(sys.argv) == 5 and sys.argv[4] == '--admin'
    criar_usuario(nome_arg, email_arg, senha_arg, is_admin=admin_arg)
