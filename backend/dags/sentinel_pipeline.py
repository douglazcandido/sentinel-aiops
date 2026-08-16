"""
DAG: sentinel_pipeline
Orquestra o pipeline completo de dados do Sentinel via DockerOperator.
Cada tarefa roda em um container efemero baseado na imagem sentinel-backend,
mantendo o Airflow leve e o pipeline isolado.

Fluxo:
  bootstrap_schema → ingest → dbt_silver → dbt_gold → truncate_preditivo
                  → prophet → random_forest → kmeans → recommend

Execucao manual — o dataset e estatico (Jan/2023-Dez/2025).
Interface web: http://localhost:8080 (admin / sentinel)
"""

import os

from airflow import DAG
from airflow.providers.docker.operators.docker import DockerOperator
from airflow.utils.dates import days_ago
from docker.types import Mount

# =========================================================
# CONFIGURACAO
# =========================================================

# nome da imagem do backend ja buildada no host e da rede docker do compose.
# o compose nomeia ambos a partir do nome da pasta do projeto (COMPOSE_PROJECT_NAME),
# entao ambos sao passados como env var pelo docker-compose.yml (servicos
# airflow-webserver/airflow-scheduler) em vez de fixos aqui — travar esses nomes
# quebra assim que o repositorio for clonado/renomeado para uma pasta diferente.
# fallback abaixo so serve para execucao do Airflow fora do docker-compose.
BACKEND_IMAGE = os.environ.get('BACKEND_IMAGE', 'sentinel-aiops-backend')

# variaveis de ambiente passadas para cada container de tarefa
SENTINEL_ENV = {
    'POSTGRES_USER':     'sentinel',
    'POSTGRES_PASSWORD': 'sentinel',
    'POSTGRES_DB':       'sentinel',
    'POSTGRES_HOST':     'postgres',   # nome do servico no compose
    'POSTGRES_PORT':     '5432',
}

# rede Docker para que os containers das tarefas se comuniquem
# com o sentinel-postgres pelo nome do servico
DOCKER_NETWORK = os.environ.get('DOCKER_NETWORK', 'sentinel-aiops_default')

# caminho do dataset no host — configurado via variavel de ambiente no compose
# fallback para o caminho padrao do ambiente de desenvolvimento
_DATA_PATH = os.environ.get(
    'SENTINEL_DATA_PATH',
    'C:\\Users\\Douglas Candido\\Documents\\Scripts\\Fiap\\fiap-sentinel\\backend\\data',
)

# bind mount do dataset para os containers efemeros das tarefas
DATA_MOUNT = Mount(
    target='/app/data',
    source=_DATA_PATH,
    type='bind',
)

default_args = {
    'owner': 'sentinel',
    'retries': 1,
    'retry_delay_seconds': 30,
}

# =========================================================
# HELPERS
# =========================================================

def make_task(task_id: str, command: str) -> DockerOperator:
    '''Cria um DockerOperator padronizado para uma tarefa do pipeline Sentinel.'''
    return DockerOperator(
        task_id=task_id,
        image=BACKEND_IMAGE,
        command=command,
        environment=SENTINEL_ENV,
        network_mode=DOCKER_NETWORK,
        mounts=[DATA_MOUNT],
        auto_remove='success',   # remove o container apos sucesso
        docker_url='unix://var/run/docker.sock',
        mount_tmp_dir=False,
    )

# =========================================================
# DAG
# =========================================================

with DAG(
    dag_id='sentinel_pipeline',
    description='Pipeline completo Sentinel — ingestao, dbt, modelos ML e recomendacoes',
    default_args=default_args,
    schedule=None,        # execucao manual apenas
    start_date=days_ago(1),
    catchup=False,
    tags=['sentinel', 'pipeline', 'ml', 'dbt'],
) as dag:

    bootstrap_schema = make_task(
        task_id='bootstrap_schema',
        command='python -m pipeline.bootstrap',
    )

    ingest = make_task(
        task_id='ingest',
        command='python -m pipeline.ingest',
    )

    dbt_silver = make_task(
        task_id='dbt_silver',
        command=(
            'dbt run '
            '--profiles-dir /app/dbt '
            '--project-dir /app/dbt '
            '--select silver '
            '--threads 1'
        ),
    )

    dbt_gold = make_task(
        task_id='dbt_gold',
        command=(
            'dbt run '
            '--profiles-dir /app/dbt '
            '--project-dir /app/dbt '
            '--select gold '
            '--threads 1'
        ),
    )

    truncate_preditivo = make_task(
        task_id='truncate_preditivo',
        command='python -m pipeline.truncate',
    )

    prophet = make_task(
        task_id='prophet',
        command='python -m pipeline.train.prophet',
    )

    random_forest = make_task(
        task_id='random_forest',
        command='python -m pipeline.train.random_forest',
    )

    kmeans = make_task(
        task_id='kmeans',
        command='python -m pipeline.train.kmeans',
    )

    recommend = make_task(
        task_id='recommend',
        command='python -m pipeline.recommend',
    )

    # =========================================================
    # DEPENDENCIAS — ordem de execucao
    # =========================================================

    bootstrap_schema >> ingest >> dbt_silver >> dbt_gold >> truncate_preditivo
    truncate_preditivo >> prophet >> random_forest >> kmeans >> recommend