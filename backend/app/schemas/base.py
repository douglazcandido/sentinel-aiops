from typing import Generic, TypeVar
from pydantic import BaseModel, Field

T = TypeVar('T')

class SentinelResponse(BaseModel, Generic[T]):
    '''Envelope padrao para todas as respostas da API Sentinel.'''
    sucesso: bool = Field(True, description='Indica se a operacao foi bem-sucedida')
    mensagem: str = Field(..., description='Mensagem descritiva sobre o retorno')
    data: T = Field(..., description='Payload da resposta')
