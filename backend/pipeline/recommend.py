import pandas as pd
from sqlalchemy import create_engine, func
from sqlalchemy.orm import Session

from app.core.config import DATABASE_URL
from app.core.logger import setup_logger
from app.models.gold_models import (
    ClusterPerfil,
    DimGrupo,
    HistoricoGrupoDiario,
    Recomendacao,
    RiscoOlaKpi,
)

logger = setup_logger(__name__)

DIAS_LABEL = {0: 'Segunda', 1: 'Terca', 2: 'Quarta', 3: 'Quinta', 4: 'Sexta', 5: 'Sabado', 6: 'Domingo'}
LIMIAR_PCT_VIOLACAO_CLUSTER = 0.5
TOP_N_GRUPOS_EQUIPE = 3
TOP_N_CLUSTERS_JANELA = 3


# ---------------------------------------------------------
# RECOMENDACAO: EQUIPE
# ---------------------------------------------------------

def gerar_recomendacoes_equipe(session: Session) -> list[dict]:
    logger.info('gerando recomendacoes de equipe')

    # agrega historico_grupo_diario para obter totais do periodo completo
    rows = (
        session.query(
            DimGrupo.nome.label('grupo_nome'),
            func.sum(HistoricoGrupoDiario.total_violacoes).label('total_violacoes'),
            func.sum(HistoricoGrupoDiario.sem_intervencao).label('sem_intervencao'),
            func.sum(HistoricoGrupoDiario.total_incidentes).label('total_incidentes'),
        )
        .join(DimGrupo, HistoricoGrupoDiario.grupo_id == DimGrupo.id)
        .group_by(DimGrupo.nome)
        .having(func.sum(HistoricoGrupoDiario.total_violacoes) > 0)
        .order_by(func.sum(HistoricoGrupoDiario.total_violacoes).desc())
        .limit(TOP_N_GRUPOS_EQUIPE)
        .all()
    )

    total_violacoes_geral = session.query(
        func.sum(HistoricoGrupoDiario.total_violacoes)
    ).scalar() or 0

    recomendacoes = []
    for row in rows:
        pct_do_total = (
            round(row.total_violacoes / total_violacoes_geral * 100, 1)
            if total_violacoes_geral > 0 else 0.0
        )
        pct_sem_intervencao = (
            round(row.sem_intervencao / row.total_incidentes * 100, 2)
            if row.total_incidentes > 0 else 0.0
        )
        recomendacoes.append({
            'tipo': 'equipe',
            'prioridade': None,
            'grupo_nome': row.grupo_nome,
            'titulo': f'Reforco de equipe sugerido: {row.grupo_nome}',
            'descricao': (
                f'{row.grupo_nome} concentra {row.total_violacoes} violacoes de OLA '
                f'({pct_do_total}% do total), com {pct_sem_intervencao}% dos '
                f'incidentes resolvidos sem intervencao humana. Considere reforco de '
                f'equipe ou revisao de processos para essa equipe.'
            ),
        })

    logger.info('recomendacoes de equipe geradas: %d', len(recomendacoes))
    return recomendacoes


# ---------------------------------------------------------
# RECOMENDACAO: JANELA CRITICA
# ---------------------------------------------------------

def gerar_recomendacoes_janela_critica(session: Session) -> list[dict]:
    logger.info('gerando recomendacoes de janela critica')

    rows = (
        session.query(ClusterPerfil)
        .filter(ClusterPerfil.pct_violacao_ola >= LIMIAR_PCT_VIOLACAO_CLUSTER)
        .order_by(ClusterPerfil.pct_violacao_ola.desc())
        .limit(TOP_N_CLUSTERS_JANELA)
        .all()
    )

    recomendacoes = []
    for cluster in rows:
        dia_label = DIAS_LABEL.get(cluster.dia_semana_predominante, 'dia indeterminado')
        hora = cluster.hora_predominante
        recomendacoes.append({
            'tipo': 'janela_critica',
            'prioridade': None,
            'grupo_nome': None,
            'titulo': f'Atencao redobrada: {dia_label} as {hora}h',
            'descricao': (
                f'O padrao "{cluster.descricao}" apresenta {cluster.pct_violacao_ola}% '
                f'de taxa de violacao de OLA, concentrado em {dia_label} por volta das '
                f'{hora}h, com {cluster.total_incidentes} incidentes nesse perfil. '
                f'Considere escala reforcada nesse horario.'
            ),
        })

    logger.info('recomendacoes de janela critica geradas: %d', len(recomendacoes))
    return recomendacoes


# ---------------------------------------------------------
# RECOMENDACAO: PRODUTO RECORRENTE
# ---------------------------------------------------------

def gerar_recomendacoes_produto(engine) -> list[dict]:
    logger.info('gerando recomendacoes de produto recorrente')

    query = '''
        SELECT
            c.produto,
            c.categoria,
            c.subcategoria,
            count(*) AS total
        FROM silver.fato_incidentes f
        JOIN silver.dim_categoria c ON f.categoria_id = c.id
        WHERE c.categoria IS NOT NULL
        GROUP BY c.produto, c.categoria, c.subcategoria
        ORDER BY total DESC
        LIMIT 3
    '''
    df = pd.read_sql(query, engine)

    recomendacoes = []
    for _, row in df.iterrows():
        produto = row['produto'] or 'produto nao especificado'
        categoria = row['categoria']
        subcategoria = row['subcategoria'] or 'subcategoria nao especificada'
        total = int(row['total'])
        recomendacoes.append({
            'tipo': 'produto_recorrente',
            'prioridade': None,
            'grupo_nome': None,
            'titulo': f'Categoria recorrente: {categoria}',
            'descricao': (
                f'A combinacao {produto} / {categoria} / {subcategoria} responde por '
                f'{total} incidentes no periodo analisado. Considere investigar causa raiz '
                f'recorrente para reducao de volume nessa categoria.'
            ),
        })

    logger.info('recomendacoes de produto geradas: %d', len(recomendacoes))
    return recomendacoes


# ---------------------------------------------------------
# SALVAR
# ---------------------------------------------------------

def sincronizar_dim_grupo(grupos: list, session: Session) -> dict:
    for nome in grupos:
        if nome and not session.query(DimGrupo).filter_by(nome=nome).first():
            session.add(DimGrupo(nome=nome))
    session.commit()
    return {g.nome: g.id for g in session.query(DimGrupo).all()}


def salvar_recomendacoes(recomendacoes: list[dict], session: Session) -> None:
    logger.info('salvando recomendacoes no gold')

    grupos = [r['grupo_nome'] for r in recomendacoes if r['grupo_nome']]
    dim_grupo = sincronizar_dim_grupo(grupos, session)

    tipos = {r['tipo'] for r in recomendacoes}
    for tipo in tipos:
        session.query(Recomendacao).filter_by(tipo=tipo).delete()
    session.commit()

    for r in recomendacoes:
        grupo_id = dim_grupo.get(r['grupo_nome']) if r['grupo_nome'] else None
        session.add(Recomendacao(
            tipo=r['tipo'],
            prioridade=r['prioridade'],
            grupo_id=grupo_id,
            titulo=r['titulo'],
            descricao=r['descricao'],
        ))

    session.commit()
    logger.info('recomendacoes salvas: %d registros', len(recomendacoes))


# ---------------------------------------------------------
# ENTRY POINT
# ---------------------------------------------------------

def run() -> None:
    logger.info('=== inicio do pipeline recommend ===')

    try:
        engine = create_engine(DATABASE_URL)

        with Session(engine) as session:
            recomendacoes_equipe = gerar_recomendacoes_equipe(session)
            recomendacoes_janela = gerar_recomendacoes_janela_critica(session)
            recomendacoes_produto = gerar_recomendacoes_produto(engine)

            todas = recomendacoes_equipe + recomendacoes_janela + recomendacoes_produto
            salvar_recomendacoes(todas, session)

        engine.dispose()
        logger.info('pipeline recommend finalizado com sucesso')

    except Exception:
        logger.exception('erro inesperado no pipeline recommend')
        raise

    logger.info('=== fim do pipeline recommend ===')


if __name__ == '__main__':
    run()