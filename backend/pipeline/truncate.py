from sqlalchemy import create_engine, text

from app.core.config import DATABASE_URL
from app.core.logger import setup_logger

logger = setup_logger(__name__)

# tabelas Gold preditivas — full refresh antes de cada treino
# ordem respeita dependencias: cluster_incidente antes de cluster_perfil
# truncadas em grupos para respeitar FKs:
# cluster_incidente e cluster_perfil precisam ser truncadas juntas
TRUNCATE_STATEMENTS = [
    ('gold.previsao_volume',                        'gold.previsao_volume'),
    ('gold.risco_ola_incidente',                    'gold.risco_ola_incidente'),
    ('gold.risco_ola_kpi',                          'gold.risco_ola_kpi'),
    ('gold.modelo_feature_importance',              'gold.modelo_feature_importance'),
    ('gold.cluster_incidente, gold.cluster_perfil', 'gold.cluster_incidente, gold.cluster_perfil'),
    ('gold.recomendacao',                           'gold.recomendacao'),
]


def run() -> None:
    logger.info('=== truncando tabelas gold preditivo para full refresh ===')
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        for label, tabelas in TRUNCATE_STATEMENTS:
            conn.execute(text(f'TRUNCATE TABLE {tabelas}'))
            logger.info('truncada: %s', label)
        conn.commit()

    engine.dispose()
    logger.info('=== truncate gold preditivo concluido ===')


if __name__ == '__main__':
    run()