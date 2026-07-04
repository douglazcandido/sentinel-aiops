import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.config import DATABASE_URL
from app.core.logger import setup_logger
from app.models.gold_models import (
    DimGrupo,
    DimPrioridade,
    ModeloFeatureImportance,
    RiscoOlaIncidente,
    RiscoOlaKpi,
)

logger = setup_logger(__name__)

FEATURES = [
    'prioridade_codigo',
    'abertura_hora',
    'abertura_dia_semana',
    'abertura_mes',
    'abertura_ano',
    'abertura_fim_de_semana',
    'abertura_fora_horario',
    'aberto_automaticamente',
    'tem_incidente_pai',
    'duracao_segundos_capped',
]

# labels legíveis para cada feature — usados na tabela gold e no frontend
FEATURES_LABEL = {
    'prioridade_codigo':        'Prioridade',
    'abertura_hora':            'Hora de abertura',
    'abertura_dia_semana':      'Dia da semana',
    'abertura_mes':             'Mês de abertura',
    'abertura_ano':             'Ano de abertura',
    'abertura_fim_de_semana':   'Fim de semana',
    'abertura_fora_horario':    'Fora do horário comercial',
    'aberto_automaticamente':   'Abertura automática',
    'tem_incidente_pai':        'Possui incidente pai',
    'duracao_segundos_capped':  'Duração (s)',
}

LIMIAR_MEDIO = 0.3
LIMIAR_ALTO  = 0.6

METAS_P2 = [
    (0,  30,   'abaixo de 31 = 150%', 150.0),
    (31, 35,   '31-35 = 125%',        125.0),
    (36, 39,   '36-39 = 110%',        110.0),
    (40, 45,   '40-45 = 75%',          75.0),
    (46, 53,   '46-53 = 50%',          50.0),
    (54, 9999, 'acima de 53 = 0%',      0.0),
]

METAS_P3 = [
    (0,   200,  'abaixo de 201 = 150%', 150.0),
    (201, 230,  '201-230 = 125%',       125.0),
    (231, 263,  '231-263 = 110%',       110.0),
    (264, 290,  '264-290 = 75%',         75.0),
    (291, 320,  '291-320 = 50%',         50.0),
    (321, 9999, 'acima de 320 = 0%',      0.0),
]


def fetch_dados(engine) -> pd.DataFrame:
    logger.info('buscando dados do silver para o random forest')
    query = '''
        SELECT
            f.numero,
            p.codigo AS prioridade_codigo,
            f.abertura_hora,
            f.abertura_dia_semana,
            f.abertura_mes,
            f.abertura_ano,
            f.abertura_fim_de_semana,
            f.abertura_fora_horario,
            f.aberto_automaticamente,
            f.tem_incidente_pai,
            f.duracao_segundos_capped,
            f.abertura_data,
            f.kpi_violado,
            g.nome AS grupo_nome
        FROM silver.fato_incidentes f
        JOIN silver.dim_prioridade p ON f.prioridade_id = p.id
        JOIN silver.dim_grupo g ON f.grupo_id = g.id
        WHERE f.entrou_kpi = TRUE
          AND p.codigo IN (2, 3)
    '''
    df = pd.read_sql(query, engine)
    logger.info('dados carregados: %d incidentes no kpi', len(df))
    return df


def preparar_dados(df: pd.DataFrame):
    df = df.copy()

    # agrupa P1 com P2 (apenas 1 registro de P1 na base)
    df['prioridade_codigo'] = df['prioridade_codigo'].replace({1: 2})

    bool_cols = [
        'abertura_fim_de_semana', 'abertura_fora_horario',
        'aberto_automaticamente', 'tem_incidente_pai',
    ]
    for col in bool_cols:
        df[col] = df[col].astype(int)

    df['kpi_violado'] = df['kpi_violado'].astype(int)

    # split temporal dentro de 2025: 80% treino, 20% teste
    # justificativa: volume KPI so explodiu em 2025 (EDA confirmou)
    # usar 2023-2024 como treino deixaria apenas 444 linhas
    df_2025 = df[df['abertura_ano'] == 2025].copy()
    df_2025 = df_2025.sort_values('abertura_data').reset_index(drop=True)
    corte = int(len(df_2025) * 0.8)
    treino = df_2025.iloc[:corte]
    teste  = df_2025.iloc[corte:]

    logger.info('treino: %d linhas | teste: %d linhas', len(treino), len(teste))
    logger.info(
        'distribuicao treino - violado: %d / nao violado: %d',
        treino['kpi_violado'].sum(),
        (treino['kpi_violado'] == 0).sum(),
    )

    X_treino = treino[FEATURES]
    y_treino = treino['kpi_violado']
    X_teste  = teste[FEATURES]
    y_teste  = teste['kpi_violado']

    return X_treino, y_treino, X_teste, y_teste, teste


def treinar_random_forest(X_treino, y_treino) -> RandomForestClassifier:
    logger.info('treinando random forest')
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_treino, y_treino)
    logger.info('random forest treinado com sucesso')
    return model


def avaliar_modelo(model: RandomForestClassifier, X_teste, y_teste) -> None:
    y_pred = model.predict(X_teste)
    relatorio = classification_report(y_teste, y_pred, target_names=['Nao Violado', 'Violado'])
    logger.info('relatorio de classificacao:\n%s', relatorio)


def classificar_risco(probabilidade: float) -> str:
    if probabilidade >= LIMIAR_ALTO:
        return 'Alto'
    elif probabilidade >= LIMIAR_MEDIO:
        return 'Medio'
    return 'Baixo'


def calcular_meta(violacoes: int, tabela: list) -> tuple[float, str]:
    for min_v, max_v, faixa, pct in tabela:
        if min_v <= violacoes <= max_v:
            return pct, faixa
    return 0.0, 'fora das faixas'


def sincronizar_dim_grupo(grupos: list, session: Session) -> None:
    for nome in grupos:
        existente = session.query(DimGrupo).filter_by(nome=nome).first()
        if not existente:
            session.add(DimGrupo(nome=nome))
    session.commit()
    logger.info('dim_grupo sincronizada: %d grupos', len(grupos))


def salvar_feature_importance(model: RandomForestClassifier, session: Session) -> None:
    logger.info('salvando feature importance no gold')

    # limpa registros anteriores para garantir idempotencia
    session.query(ModeloFeatureImportance).delete()
    session.commit()

    importancias = sorted(
        zip(FEATURES, model.feature_importances_),
        key=lambda x: x[1],
        reverse=True,
    )

    for ranking, (feature, importancia) in enumerate(importancias, start=1):
        session.add(ModeloFeatureImportance(
            feature=FEATURES_LABEL.get(feature, feature),
            importancia=round(float(importancia), 4),
            ranking=ranking,
        ))

    session.commit()
    logger.info('feature importance salva: %d features', len(importancias))


def salvar_resultados(df_teste: pd.DataFrame, probabilidades, session: Session) -> None:
    logger.info('salvando risco por incidente no gold')

    grupos_novos = df_teste['grupo_nome'].unique().tolist()
    sincronizar_dim_grupo(grupos_novos, session)

    dim_prioridade = {p.codigo: p.id for p in session.query(DimPrioridade).all()}
    dim_grupo = {g.nome: g.id for g in session.query(DimGrupo).all()}

    for i, (_, row) in enumerate(df_teste.iterrows()):
        prob = float(probabilidades[i])
        prioridade_codigo = int(row['prioridade_codigo'])

        existente = session.query(RiscoOlaIncidente).filter_by(numero=row['numero']).first()

        if existente:
            existente.probabilidade_violacao = round(prob, 4)
            existente.classe_risco = classificar_risco(prob)
        else:
            session.add(RiscoOlaIncidente(
                numero=row['numero'],
                prioridade_id=dim_prioridade.get(prioridade_codigo),
                grupo_id=dim_grupo.get(row['grupo_nome']),
                probabilidade_violacao=round(prob, 4),
                classe_risco=classificar_risco(prob),
                abertura_data=row['abertura_data'],
            ))

    session.commit()
    logger.info('risco por incidente salvo: %d registros', len(df_teste))


def salvar_kpi_ola(df: pd.DataFrame, session: Session) -> None:
    logger.info('calculando e salvando kpis de ola')

    dim_prioridade = {p.codigo: p.id for p in session.query(DimPrioridade).all()}

    for ano in df['abertura_ano'].unique():
        df_ano = df[df['abertura_ano'] == ano]

        for codigo, tabela_meta in [(2, METAS_P2), (3, METAS_P3)]:
            df_p = df_ano[df_ano['prioridade_codigo'] == codigo]
            if df_p.empty:
                continue

            total_no_kpi = len(df_p)
            violacoes = int(df_p['kpi_violado'].sum())
            meses_decorridos = int(df_p['abertura_data'].max().month)
            projecao = round(violacoes / meses_decorridos * 12) if meses_decorridos > 0 else violacoes
            pct_meta, faixa = calcular_meta(violacoes, tabela_meta)
            pct_proj, _ = calcular_meta(projecao, tabela_meta)

            prioridade_id = dim_prioridade.get(codigo)

            existente = session.query(RiscoOlaKpi).filter_by(
                ano=int(ano), prioridade_id=prioridade_id
            ).first()

            if existente:
                existente.violacoes_acumuladas = violacoes
                existente.total_no_kpi = total_no_kpi
                existente.pct_atingimento_meta = pct_meta
                existente.faixa_meta = faixa
                existente.violacoes_projetadas_ano = projecao
                existente.pct_projetado_meta = pct_proj
            else:
                session.add(RiscoOlaKpi(
                    ano=int(ano),
                    prioridade_id=prioridade_id,
                    violacoes_acumuladas=violacoes,
                    total_no_kpi=total_no_kpi,
                    pct_atingimento_meta=pct_meta,
                    faixa_meta=faixa,
                    violacoes_projetadas_ano=projecao,
                    pct_projetado_meta=pct_proj,
                ))

            logger.info(
                'kpi salvo: ano=%d, P%d, violacoes=%d, meta=%.0f%%',
                ano, codigo, violacoes, pct_meta,
            )

    session.commit()


def run() -> None:
    logger.info('=== inicio do pipeline random forest ===')

    try:
        engine = create_engine(DATABASE_URL)

        df = fetch_dados(engine)
        X_treino, y_treino, X_teste, y_teste, df_teste = preparar_dados(df)

        model = treinar_random_forest(X_treino, y_treino)
        avaliar_modelo(model, X_teste, y_teste)

        probabilidades = model.predict_proba(X_teste)[:, 1]

        with Session(engine) as session:
            salvar_feature_importance(model, session)
            salvar_resultados(df_teste, probabilidades, session)
            salvar_kpi_ola(df, session)

        engine.dispose()
        logger.info('pipeline random forest finalizado com sucesso')

    except Exception:
        logger.exception('erro inesperado no pipeline random forest')
        raise

    logger.info('=== fim do pipeline random forest ===')


if __name__ == '__main__':
    run()