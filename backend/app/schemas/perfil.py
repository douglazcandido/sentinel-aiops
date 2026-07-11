from pydantic import BaseModel, ConfigDict, EmailStr, Field

class CargoSchema(BaseModel):
    id: int
    nome: str
    ativo: bool = True

    model_config = ConfigDict(from_attributes=True)


class UsuarioAdminResponse(BaseModel):
    id: int
    nome: str
    email: str
    cargo: str | None
    is_admin: bool
    ativo: bool
    tem_foto: bool
    criado_em: str

    model_config = ConfigDict(from_attributes=True)


class AtualizarUsuarioAdminRequest(BaseModel):
    nome: str | None = Field(None, min_length=2)
    email: EmailStr | None = None
    is_admin: bool | None = None
    ativo: bool | None = None
    cargo_id: int | None = None
    nova_senha: str | None = Field(None, min_length=6)


class CriarUsuarioAdminRequest(BaseModel):
    nome: str = Field(..., min_length=2)
    email: EmailStr
    senha: str = Field(..., min_length=6)
    cargo_id: int | None = None
    is_admin: bool = False
    ativo: bool = True


class CriarCargoRequest(BaseModel):
    nome: str = Field(..., min_length=2)


class AtualizarCargoRequest(BaseModel):
    nome: str | None = Field(None, min_length=2)
    ativo: bool | None = None
