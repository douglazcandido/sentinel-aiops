from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import auth, clusters, gestao, historico, perfil, previsao, recomendacoes, risco
from app.core.logger import setup_logger

logger = setup_logger(__name__)

app = FastAPI(
    title='Sentinel API',
    description='API de analytics preditivo para incidentes de TI da Locaweb',
    version='1.0.0',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(auth.router, prefix='/api/v1')
app.include_router(historico.router, prefix='/api/v1')
app.include_router(previsao.router, prefix='/api/v1')
app.include_router(risco.router, prefix='/api/v1')
app.include_router(clusters.router, prefix='/api/v1')
app.include_router(recomendacoes.router, prefix='/api/v1')
app.include_router(perfil.router, prefix='/api/v1')
app.include_router(gestao.router, prefix='/api/v1')
app.include_router(gestao.cargos_router, prefix='/api/v1')

@app.get('/')
def root():
    logger.info('requisicao recebida: GET /')
    return {'sucesso': True, 'mensagem': 'Sentinel API esta no ar'}

@app.on_event('startup')
def on_startup():
    logger.info('=== sentinel api iniciada ===')
