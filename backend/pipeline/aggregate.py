import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.core.config import DATABASE_URL
from app.core.logger import setup_logger
from app.models.gold_models import (
    DimData,
    DimGrupo,
    DimPrioridade,
    HistoricoDiario,
    HistoricoHoraDiario,
    HistoricoGrupoDiario,
    HistoricoViolacoesDiario,
)

logger = setup_logger(__name__)

MESES_LABEL = {
    1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
    5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
    9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro',
}

DIAS_LABEL = {
    0: 'Segunda', 1: 'Terça', 2: 'Quarta', 3: 'Quinta',
    4: 'Sexta', 5: 'Sábado', 6: 'Domingo',
}


# ---------------------------------------------------------
# FETCH
# ---------------------------------------------------------

def fetch_dados(engine) -> pd.DataFrame:
    logger.info('buscando dados do silver para agregacoes historicas')
    query = '''
        SELECT
            f.numero,
            f.abertura_hora,
            f.abertura_dia_semana,
            f.abertura_mes,
            f.abertura_ano,
            f.abertura_data,
            f.abertura_fora_horario,
            f.aberto_automaticamente,
            f.sem_intervencao,
            f.entrou_kpi,
            f.kpi_violado,
            p.codigo  AS prioridade_codigo,
            p.id      AS prioridade_id,
            g.nome    AS grupo_nome,
            g.id      AS grupo_id_silver
        FROM silver.fato_incidentes f
        JOIN silver.dim_prioridade p ON f.prioridade_id = p.id
        JOIN silver.dim_grupo g ON f.grupo_id = g.id
    '''
    df = pd.read_sql(query, engine)
    df['abertura_data'] = pd.to_datetime(df['abertura_data']).dt.date
    df['kpi_violado'] = df['kpi_violado'].fillna(False).astype(bool)
    logger.info('dados carregados: %d incidentes', len(df))
    return df


# ---------------------------------------------------------
# SINCRONIZAR DIMS GOLD
# ---------------------------------------------------------

def sincronizar_dims(df: pd.DataFrame, session: Session) -> tuple[dict, dict]:
    for nome in df['grupo_nome'].unique():
        if not session.query(DimGrupo).filter_by(nome=nome).first():
            session.add(DimGrupo(nome=nome))
    session.commit()

    dim_prioridade = {p.codigo: p.id for p in session.query(DimPrioridade).all()}
    dim_grupo = {g.nome: g.id for g in session.query(DimGrupo).all()}
    logger.info('dims sincronizadas: %d prioridades, %d grupos', len(dim_prioridade), len(dim_grupo))
    return dim_prioridade, dim_grupo


# ---------------------------------------------------------
# DIM_DATA — dimensão de tempo
# ---------------------------------------------------------

def popular_dim_data(df: pd.DataFrame, session: Session) -> None:
    logger.info('populando dim_data')

    datas = sorted(df['abertura_data'].unique())

    inseridos = 0
    for data in datas:
        existente = session.get(DimData, data)
        if existente:
            continue

        ts = pd.Timestamp(data)
        dia_semana = ts.dayofweek  # 0=Seg ... 6=Dom
        fim_de_semana = dia_semana >= 5

        session.add(DimData(
            data=data,
            ano=int(ts.year),
            trimestre=int(ts.quarter),
            mes=int(ts.month),
            mes_label=MESES_LABEL[int(ts.month)],
            semana_ano=int(ts.isocalendar().week),
            dia_mes=int(ts.day),
            dia_semana=dia_semana,
            dia_semana_label=DIAS_LABEL[dia_semana],
            fim_de_semana=fim_de_semana,
            fora_horario=False,  # campo reservado, não calculado por dia
        ))
        inseridos += 1

    session.commit()
    logger.info('dim_data populada: %d datas novas, %d total', inseridos, len(datas))


# ---------------------------------------------------------
# HISTORICO DIARIO GERAL
# ---------------------------------------------------------

def agregar_historico_diario(df: pd.DataFrame, session: Session) -> None:
    logger.info('agregando historico diario geral')

    por_data = (
        df.groupby('abertura_data')
        .agg(
            total_incidentes=('numero', 'count'),
            total_no_kpi=('entrou_kpi', 'sum'),
            total_violacoes=('kpi_violado', 'sum'),
            abertos_automaticamente=('aberto_automaticamente', 'sum'),
            sem_intervencao=('sem_intervencao', 'sum'),
        )
        .reset_index()
    )

    for _, row in por_data.iterrows():
        data = row['abertura_data']
        existente = session.get(HistoricoDiario, data)

        if existente:
            existente.total_incidentes       = int(row['total_incidentes'])
            existente.total_no_kpi           = int(row['total_no_kpi'])
            existente.total_violacoes        = int(row['total_violacoes'])
            existente.abertos_automaticamente = int(row['abertos_automaticamente'])
            existente.sem_intervencao        = int(row['sem_intervencao'])
        else:
            session.add(HistoricoDiario(
                data                  = data,
                total_incidentes      = int(row['total_incidentes']),
                total_no_kpi          = int(row['total_no_kpi']),
                total_violacoes       = int(row['total_violacoes']),
                abertos_automaticamente = int(row['abertos_automaticamente']),
                sem_intervencao       = int(row['sem_intervencao']),
            ))

    session.commit()
    logger.info('historico diario salvo: %d registros', len(por_data))


# ---------------------------------------------------------
# HISTORICO HORA DIARIO
# ---------------------------------------------------------

def agregar_hora_diario(df: pd.DataFrame, session: Session) -> None:
    logger.info('agregando volume por hora do dia (diario)')

    por_data_hora = (
        df.groupby(['abertura_data', 'abertura_hora'])
        .size()
        .reset_index(name='total_incidentes')
    )

    for _, row in por_data_hora.iterrows():
        data = row['abertura_data']
        hora = int(row['abertura_hora'])
        total = int(row['total_incidentes'])

        existente = session.get(HistoricoHoraDiario, (data, hora))
        if existente:
            existente.total_incidentes = total
        else:
            session.add(HistoricoHoraDiario(
                data=data,
                hora=hora,
                total_incidentes=total,
            ))

    session.commit()
    logger.info('historico hora diario salvo: %d registros', len(por_data_hora))


# ---------------------------------------------------------
# HISTORICO GRUPO DIARIO
# ---------------------------------------------------------

def agregar_grupo_diario(df: pd.DataFrame, dim_grupo: dict, session: Session) -> None:
    logger.info('agregando volume por grupo (diario)')

    por_data_grupo = (
        df.groupby(['abertura_data', 'grupo_nome'])
        .agg(
            total_incidentes=('numero', 'count'),
            total_no_kpi=('entrou_kpi', 'sum'),
            total_violacoes=('kpi_violado', 'sum'),
            sem_intervencao=('sem_intervencao', 'sum'),
        )
        .reset_index()
    )

    for _, row in por_data_grupo.iterrows():
        data = row['abertura_data']
        grupo_id = dim_grupo.get(row['grupo_nome'])
        if grupo_id is None:
            continue

        existente = session.get(HistoricoGrupoDiario, (data, grupo_id))
        if existente:
            existente.total_incidentes = int(row['total_incidentes'])
            existente.total_no_kpi     = int(row['total_no_kpi'])
            existente.total_violacoes  = int(row['total_violacoes'])
            existente.sem_intervencao  = int(row['sem_intervencao'])
        else:
            session.add(HistoricoGrupoDiario(
                data             = data,
                grupo_id         = grupo_id,
                total_incidentes = int(row['total_incidentes']),
                total_no_kpi     = int(row['total_no_kpi']),
                total_violacoes  = int(row['total_violacoes']),
                sem_intervencao  = int(row['sem_intervencao']),
            ))

    session.commit()
    logger.info('historico grupo diario salvo: %d registros', len(por_data_grupo))


# ---------------------------------------------------------
# HISTORICO VIOLACOES DIARIO
# ---------------------------------------------------------

def agregar_violacoes_diario(df: pd.DataFrame, dim_prioridade: dict, session: Session) -> None:
    logger.info('agregando violacoes por prioridade (diario)')

    df_kpi = df[df['entrou_kpi'] == True].copy()

    por_data_prioridade = (
        df_kpi.groupby(['abertura_data', 'prioridade_codigo'])
        .agg(
            total_violacoes=('kpi_violado', 'sum'),
            total_no_kpi=('entrou_kpi', 'count'),
        )
        .reset_index()
    )

    for _, row in por_data_prioridade.iterrows():
        data = row['abertura_data']
        prioridade_id = dim_prioridade.get(int(row['prioridade_codigo']))
        if prioridade_id is None:
            continue

        existente = session.get(HistoricoViolacoesDiario, (data, prioridade_id))
        if existente:
            existente.total_violacoes = int(row['total_violacoes'])
            existente.total_no_kpi    = int(row['total_no_kpi'])
        else:
            session.add(HistoricoViolacoesDiario(
                data          = data,
                prioridade_id = prioridade_id,
                total_violacoes = int(row['total_violacoes']),
                total_no_kpi    = int(row['total_no_kpi']),
            ))

    session.commit()
    logger.info('violacoes diario salvas: %d registros', len(por_data_prioridade))


# ---------------------------------------------------------
# ENTRY POINT
# ---------------------------------------------------------

def run() -> None:
    logger.info('=== inicio do pipeline aggregate (silver -> gold historico) ===')

    try:
        engine = create_engine(DATABASE_URL)
        df = fetch_dados(engine)

        with Session(engine) as session:
            dim_prioridade, dim_grupo = sincronizar_dims(df, session)
            popular_dim_data(df, session)
            agregar_historico_diario(df, session)
            agregar_hora_diario(df, session)
            agregar_grupo_diario(df, dim_grupo, session)
            agregar_violacoes_diario(df, dim_prioridade, session)

        engine.dispose()
        logger.info('pipeline aggregate finalizado com sucesso')

    except Exception:
        logger.exception('erro inesperado no pipeline aggregate')
        raise

    logger.info('=== fim do pipeline aggregate (silver -> gold historico) ===')


if __name__ == '__main__':
    run()