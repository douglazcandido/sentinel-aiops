import torch
import pandas as pd
from neuralprophet import NeuralProphet
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.config import DATABASE_URL
from app.core.logger import setup_logger
from app.models.gold_models import PrevisaoVolume

logger = setup_logger(__name__)

HORIZONTE_DIAS = [1, 7]
RANDOM_SEED = 42


def fetch_serie_temporal(engine) -> pd.DataFrame:
    logger.info('buscando serie temporal do silver')
    query = '''
        SELECT
            abertura_data AS ds,
            count(*) AS y
        FROM silver.fato_incidentes
        GROUP BY abertura_data
        ORDER BY abertura_data
    '''
    df = pd.read_sql(query, engine)
    df['ds'] = pd.to_datetime(df['ds'])
    df['y'] = df['y'].astype(float)
    logger.info('serie temporal carregada: %d dias', len(df))
    return df


def treinar_neuralprophet(df: pd.DataFrame) -> NeuralProphet:
    logger.info('treinando modelo neuralprophet (seed=%d)', RANDOM_SEED)

    # trava seed do pytorch para resultados deterministicos entre execucoes
    torch.manual_seed(RANDOM_SEED)

    model = NeuralProphet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        seasonality_mode='multiplicative',
        epochs=100,
        batch_size=64,
        learning_rate=0.001,
    )
    model.fit(df, freq='D', progress='none')
    logger.info('modelo neuralprophet treinado com sucesso')
    return model


def gerar_previsoes(model: NeuralProphet, df: pd.DataFrame, horizonte: int) -> pd.DataFrame:
    logger.info('gerando previsao para D+%d', horizonte)
    ultima_data = df['ds'].max()
    datas_futuras = pd.date_range(
        start=ultima_data + pd.Timedelta(days=1),
        periods=horizonte,
        freq='D',
    )
    linhas = []
    for data in datas_futuras:
        df_pred = df.copy()
        nova_linha = pd.DataFrame({'ds': [data], 'y': [None]})
        df_pred = pd.concat([df_pred, nova_linha], ignore_index=True)
        forecast = model.predict(df_pred)
        col_yhat = 'yhat1' if 'yhat1' in forecast.columns else 'yhat'
        ultima_previsao = forecast.iloc[-1]
        linhas.append({
            'data_referencia': data,
            'yhat': max(0.0, float(ultima_previsao[col_yhat])),
            'horizonte_dias': horizonte,
        })
    previsoes = pd.DataFrame(linhas)
    logger.info('previsoes geradas: %d registros para D+%d', len(previsoes), horizonte)
    return previsoes


def salvar_previsoes(previsoes: pd.DataFrame, session: Session) -> None:
    logger.info('salvando previsoes no gold')
    for _, row in previsoes.iterrows():
        data_ref = row['data_referencia'].date()
        horizonte = int(row['horizonte_dias'])
        previsto = round(float(row['yhat']), 2)

        existente = session.query(PrevisaoVolume).filter_by(
            data_referencia=data_ref,
            horizonte_dias=horizonte,
        ).first()

        if existente:
            existente.total_previsto = previsto
            existente.limite_inferior = None
            existente.limite_superior = None
        else:
            session.add(PrevisaoVolume(
                data_referencia=data_ref,
                horizonte_dias=horizonte,
                total_previsto=previsto,
                limite_inferior=None,
                limite_superior=None,
            ))
    session.commit()
    logger.info('previsoes salvas: %d registros', len(previsoes))


def run() -> None:
    logger.info('=== inicio do pipeline neuralprophet ===')
    try:
        engine = create_engine(DATABASE_URL)
        df = fetch_serie_temporal(engine)
        model = treinar_neuralprophet(df)

        with Session(engine) as session:
            for horizonte in HORIZONTE_DIAS:
                previsoes = gerar_previsoes(model, df, horizonte)
                salvar_previsoes(previsoes, session)

        engine.dispose()
        logger.info('pipeline neuralprophet finalizado com sucesso')

    except Exception:
        logger.exception('erro inesperado no pipeline neuralprophet')
        raise

    logger.info('=== fim do pipeline neuralprophet ===')


if __name__ == '__main__':
    run()