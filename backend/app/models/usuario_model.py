from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, LargeBinary, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

class Usuario(Base):
    __tablename__ = 'usuarios'
    __table_args__ = {'schema': 'public'}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    senha_hash: Mapped[str] = mapped_column(Text, nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=text('now()'))

    cargo_id: Mapped[int | None] = mapped_column(Integer, ForeignKey('public.cargos.id'))
    foto_perfil: Mapped[bytes | None] = mapped_column(LargeBinary)
    foto_type_id: Mapped[int | None] = mapped_column(Integer, ForeignKey('public.tipos_foto.id'))
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    atualizado_em: Mapped[datetime | None] = mapped_column(DateTime)

    def __repr__(self) -> str:
        return f'<Usuario(email={self.email})>'


class Cargo(Base):
    __tablename__ = 'cargos'
    __table_args__ = {'schema': 'public'}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=text('now()'))

    def __repr__(self) -> str:
        return f'<Cargo(nome={self.nome})>'


class TipoFoto(Base):
    __tablename__ = 'tipos_foto'
    __table_args__ = {'schema': 'public'}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mime: Mapped[str] = mapped_column(Text, nullable=False, unique=True)

    def __repr__(self) -> str:
        return f'<TipoFoto(mime={self.mime})>'
