from pathlib import Path

from sqlalchemy import create_engine

from app.core.config import DATABASE_URL
from app.core.logger import setup_logger

logger = setup_logger(__name__)

SQL_DIR = Path(__file__).resolve().parent.parent / 'sql'

# silver.sql fica de fora: as tabelas do Silver sao recriadas do zero pelo dbt
# (dbt run --select silver) a cada execucao do pipeline, entao nao ha necessidade
# de criar la-las aqui antes.
SQL_FILES = ['bronze.sql', 'gold.sql', 'sql_auth.sql']


def run() -> None:
    '''Garante que schemas/tabelas/views existam antes de qualquer outra etapa.
    Idempotente: todo DDL em backend/sql/*.sql usa IF NOT EXISTS / CREATE OR REPLACE /
    ON CONFLICT DO NOTHING, entao rodar isso de novo em uma base ja existente e um no-op.
    Chamado no startup da API (app/main.py) e como primeira etapa do pipeline
    (run_pipeline.py / DAG do Airflow), para nao depender de um passo manual.
    '''
    logger.info('=== bootstrap de schema: verificando/criando bronze, gold e auth ===')
    engine = create_engine(DATABASE_URL)

    for filename in SQL_FILES:
        caminho = SQL_DIR / filename
        logger.info('aplicando %s', filename)
        sql = caminho.read_text(encoding='utf-8')

        # cursor raw do driver (nao Connection.exec_driver_sql): quando chamado com um
        # unico argumento, o psycopg2 nao faz nenhum scan de '%s'/'%(nome)s' na string.
        # exec_driver_sql(sql) passa um dict vazio "sentinela" (immutabledict) para o
        # driver por baixo dos panos, o que faz o psycopg2 tentar interpretar '%' como
        # placeholder — e os .sql tem '%' literal em comentarios (ex: gold.sql, "= 75%").
        raw_conn = engine.raw_connection()
        try:
            with raw_conn.cursor() as cursor:
                cursor.execute(sql)
            raw_conn.commit()
        finally:
            raw_conn.close()

    engine.dispose()
    logger.info('=== bootstrap de schema concluido ===')


if __name__ == '__main__':
    run()
