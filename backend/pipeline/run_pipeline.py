import subprocess
import sys
import time
from pathlib import Path

from app.core.logger import setup_logger
from pipeline import bootstrap, ingest, recommend, train_models, truncate

logger = setup_logger(__name__)

# caminho absoluto para a pasta do projeto dbt
DBT_PROJECT_DIR = Path(__file__).resolve().parent.parent / 'dbt'


def run_dbt(select: str) -> None:
    '''Executa dbt run para um subset de modelos.
    Lança RuntimeError se o dbt retornar código de saída diferente de zero.
    '''
    cmd = [
        'dbt', 'run',
        '--profiles-dir', str(DBT_PROJECT_DIR),
        '--project-dir', str(DBT_PROJECT_DIR),
        '--select', select,
        '--threads', '1',
    ]
    logger.info('executando: %s', ' '.join(cmd))
    result = subprocess.run(cmd, capture_output=False)
    if result.returncode != 0:
        raise RuntimeError(f'dbt run falhou para --select {select} (returncode={result.returncode})')


ETAPAS = [
    ('bootstrap',           bootstrap.run),
    ('ingest',              ingest.run),
    ('dbt:silver',          lambda: run_dbt('silver')),
    ('dbt:gold',            lambda: run_dbt('gold')),
    ('truncate:preditivo',  truncate.run),
    ('train_models',        train_models.run),
    ('recommend',           recommend.run),
]


def run() -> None:
    logger.info('=== inicio do pipeline completo sentinel ===')
    inicio_total = time.time()

    for nome, funcao in ETAPAS:
        logger.info('--- iniciando etapa: %s ---', nome)
        inicio_etapa = time.time()

        try:
            funcao()
        except Exception:
            logger.exception('falha na etapa "%s", pipeline interrompido', nome)
            sys.exit(1)

        duracao = round(time.time() - inicio_etapa, 1)
        logger.info('--- etapa "%s" concluida em %ss ---', nome, duracao)

    duracao_total = round(time.time() - inicio_total, 1)
    logger.info('=== pipeline completo finalizado com sucesso em %ss ===', duracao_total)


if __name__ == '__main__':
    run()