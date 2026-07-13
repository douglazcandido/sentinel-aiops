import pandas as pd
from sqlalchemy import create_engine, text

from app.core.config import DATABASE_URL, SOURCE_FILE
from app.core.logger import setup_logger

logger = setup_logger(__name__)

# mapeamento coluna origem (XLSX) -> coluna bronze.incidentes
COLUMN_MAP = {
    'Número': 'numero',
    'Prioridade': 'prioridade',
    'Produto': 'produto',
    'Categoria': 'categoria',
    'Subcategoria': 'subcategoria',
    'Grupo designado': 'grupo_designado',
    'Item de configuração': 'item_configuracao',
    'Aberto': 'aberto',
    'Resolvido': 'resolvido',
    'Encerrado': 'encerrado',
    'Duração': 'duracao',
    'Código de fechamento': 'codigo_fechamento',
    'Descrição resumida': 'descricao_resumida',
    'Solução': 'solucao',
    'Aberto por': 'aberto_por',
    'Incidente Pai': 'incidente_pai',
    'Status': 'status',
    'Entrou para KPI?': 'entrou_kpi',
    'KPI Violado?': 'kpi_violado',
}

TARGET_TABLE = 'incidentes'
TARGET_SCHEMA = 'bronze'


def read_source(file_path) -> pd.DataFrame:
    '''Le o XLSX de origem e retorna um DataFrame com colunas renomeadas para bronze.
    Todos os valores sao convertidos para string (texto), preservando nulos.
    '''
    logger.info('lendo arquivo de origem: %s', file_path)
    df = pd.read_excel(file_path, dtype=str)
    logger.info('arquivo lido com sucesso, %d linhas e %d colunas', df.shape[0], df.shape[1])

    missing_cols = [col for col in COLUMN_MAP if col not in df.columns]
    if missing_cols:
        logger.error('colunas esperadas nao encontradas no arquivo: %s', missing_cols)
        raise ValueError(f'colunas faltando no arquivo de origem: {missing_cols}')

    df = df[list(COLUMN_MAP.keys())].rename(columns=COLUMN_MAP)
    df = df.where(pd.notnull(df), None)
    return df


def load_to_bronze(df: pd.DataFrame, database_url: str) -> int:
    '''Trunca bronze.incidentes e insere o DataFrame completo.
    Garante que cada execucao do pipeline parta de um bronze limpo,
    sem acumulo de cargas anteriores.

    Returns:
        numero de linhas inseridas.
    '''
    engine = create_engine(database_url)
    logger.info('conectando ao banco de dados')

    with engine.connect() as conn:
        logger.info('truncando bronze.%s para garantir carga limpa', TARGET_TABLE)
        conn.execute(text(f'TRUNCATE TABLE {TARGET_SCHEMA}.{TARGET_TABLE}'))
        conn.commit()

    logger.info('iniciando insercao na tabela %s.%s', TARGET_SCHEMA, TARGET_TABLE)
    df.to_sql(
        TARGET_TABLE,
        engine,
        schema=TARGET_SCHEMA,
        if_exists='append',
        index=False,
        method='multi',
        chunksize=1000,
    )
    logger.info('insercao concluida: %d linhas inseridas', len(df))
    engine.dispose()
    return len(df)


def run() -> None:
    logger.info('=== inicio do pipeline de ingestao bronze ===')
    try:
        df = read_source(SOURCE_FILE)
        total = load_to_bronze(df, DATABASE_URL)
        logger.info('pipeline finalizado com sucesso, total de linhas: %d', total)
    except FileNotFoundError:
        logger.error('arquivo de origem nao encontrado em: %s', SOURCE_FILE)
        raise
    except Exception:
        logger.exception('erro inesperado durante a ingestao')
        raise
    logger.info('=== fim do pipeline de ingestao bronze ===')


if __name__ == '__main__':
    run()