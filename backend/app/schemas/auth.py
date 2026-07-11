from pydantic import BaseModel, ConfigDict, EmailStr, Field

class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description='Email do usuario')
    senha: str = Field(..., description='Senha do usuario', min_length=6)

class LoginResponseData(BaseModel):
    access_token: str = Field(..., description='Token JWT para autenticacao')
    token_type: str = Field('bearer', description='Tipo do token')
    nome: str = Field(..., description='Nome do usuario autenticado')
    email: str = Field(..., description='Email do usuario autenticado')
    is_admin: bool = Field(False, description='Indica se o usuario e administrador')
    tem_foto: bool = Field(False, description='Indica se o usuario possui foto de perfil')
    cargo: str | None = Field(None, description='Nome do cargo do usuario, se houver')

    model_config = ConfigDict(from_attributes=True)
