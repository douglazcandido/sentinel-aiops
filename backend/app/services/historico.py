from datetime import date

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.models.gold_models import (
    DimData,
    DimGrupo,
    DimPrioridade,
    HistoricoDiario,
    HistoricoGrupoDiario,
    HistoricoHoraDiario,
    HistoricoViolacoesDiario,
)
from app.schemas.historico import (
    HistoricoCompletoSchema,
    KpisGeraisSchema,
    VolumeDiaSemanaSchema,
    VolumeDiarioSchema,
    ViolacoesDiarioSchema,
    VolumeGrupoSchema,
    VolumeHoraSchema,
)


def get_historico_completo(
    db: Session,
    data_inicio: date | None = None,
    data_fim: date | None = None,
) -> HistoricoCompletoSchema:
    kpis = _get_kpis_gerais(db, data_inicio, data_fim)
    volume_hora = _get_volume_hora(db, data_inicio, data_fim)
    volume_dia = _get_volume_dia_semana(db, data_inicio, data_fim)
    volume_diario = _get_volume_diario(db, data_inicio, data_fim)
    violacoes_diario = _get_violacoes_diario(db, data_inicio, data_fim)
    volume_grupo = _get_volume_grupo(db, data_inicio, data_fim)

    return HistoricoCompletoSchema(
        kpis_gerais=kpis,
        volume_por_hora=volume_hora,
        volume_por_dia_semana=volume_dia,
        volume_diario=volume_diario,
        violacoes_diario=violacoes_diario,
        volume_por_grupo=volume_grupo,
    )


def _aplicar_filtro_data(query, model, data_inicio, data_fim):
    '''Aplica filtro de intervalo de datas a qualquer query que tenha coluna data.'''
    if data_inicio:
        query = query.filter(model.data >= data_inicio)
    if data_fim:
        query = query.filter(model.data <= data_fim)
    return query


# ---------------------------------------------------------
# KPIs GERAIS — agrega historico_diario com filtro opcional
# ---------------------------------------------------------

def _get_kpis_gerais(
    db: Session,
    data_inicio: date | None,
    data_fim: date | None,
) -> KpisGeraisSchema:
    query = db.query(
        func.sum(HistoricoDiario.total_incidentes).label('total_incidentes'),
        func.sum(HistoricoDiario.total_no_kpi).label('total_no_kpi'),
        func.sum(HistoricoDiario.total_violacoes).label('total_violacoes'),
        func.sum(HistoricoDiario.abertos_automaticamente).label('abertos_auto'),
        func.sum(HistoricoDiario.sem_intervencao).label('sem_intervencao'),
        func.min(HistoricoDiario.data).label('periodo_inicio'),
        func.max(HistoricoDiario.data).label('periodo_fim'),
    )
    query = _aplicar_filtro_data(query, HistoricoDiario, data_inicio, data_fim)
    row = query.one()

    if not row.total_incidentes:
        raise ValueError('nenhum dado historico encontrado no gold para o periodo solicitado')

    total = int(row.total_incidentes)
    pct_auto = round(float(row.abertos_auto or 0) / total * 100, 2)
    pct_sem = round(float(row.sem_intervencao or 0) / total * 100, 2)

    return KpisGeraisSchema(
        total_incidentes=total,
        pct_aberto_automaticamente=pct_auto,
        pct_sem_intervencao=pct_sem,
        total_violacoes_ola=int(row.total_violacoes or 0),
        total_no_kpi=int(row.total_no_kpi or 0),
        periodo_inicio=row.periodo_inicio.isoformat(),
        periodo_fim=row.periodo_fim.isoformat(),
    )


# ---------------------------------------------------------
# VOLUME POR HORA — agrega historico_hora_diario
# ---------------------------------------------------------

def _get_volume_hora(
    db: Session,
    data_inicio: date | None,
    data_fim: date | None,
) -> list[VolumeHoraSchema]:
    query = db.query(
        HistoricoHoraDiario.hora,
        func.sum(HistoricoHoraDiario.total_incidentes).label('total_incidentes'),
    )
    query = _aplicar_filtro_data(query, HistoricoHoraDiario, data_inicio, data_fim)
    rows = query.group_by(HistoricoHoraDiario.hora).order_by(HistoricoHoraDiario.hora).all()

    return [
        VolumeHoraSchema(hora=r.hora, total_incidentes=int(r.total_incidentes))
        for r in rows
    ]


# ---------------------------------------------------------
# VOLUME POR DIA DA SEMANA — via JOIN com dim_data
# ---------------------------------------------------------

def _get_volume_dia_semana(
    db: Session,
    data_inicio: date | None,
    data_fim: date | None,
) -> list[VolumeDiaSemanaSchema]:
    query = db.query(
        DimData.dia_semana,
        DimData.dia_semana_label.label('dia_label'),
        func.sum(HistoricoDiario.total_incidentes).label('total_incidentes'),
    ).join(DimData, HistoricoDiario.data == DimData.data)

    query = _aplicar_filtro_data(query, HistoricoDiario, data_inicio, data_fim)

    rows = (
        query
        .group_by(DimData.dia_semana, DimData.dia_semana_label)
        .order_by(DimData.dia_semana)
        .all()
    )

    return [
        VolumeDiaSemanaSchema(
            dia_semana=r.dia_semana,
            dia_label=r.dia_label,
            total_incidentes=int(r.total_incidentes),
        )
        for r in rows
    ]


# ---------------------------------------------------------
# VOLUME DIARIO POR PRIORIDADE — série temporal
# Busca do Silver diretamente: unica fonte com todas as 5 prioridades
# HistoricoViolacoesDiario so tem P2/P3 (elegíveis a KPI) — nao serve aqui
# ---------------------------------------------------------

def _get_volume_diario(
    db: Session,
    data_inicio: date | None,
    data_fim: date | None,
) -> list[VolumeDiarioSchema]:
    from sqlalchemy import text as sa_text

    filtros = []
    params: dict = {}

    if data_inicio:
        filtros.append('f.abertura_data >= :data_inicio')
        params['data_inicio'] = data_inicio
    if data_fim:
        filtros.append('f.abertura_data <= :data_fim')
        params['data_fim'] = data_fim

    where = ('WHERE ' + ' AND '.join(filtros)) if filtros else ''

    sql = f'''
        SELECT
            f.abertura_data                       AS data,
            p.codigo                              AS prioridade_codigo,
            p.label                               AS prioridade_label,
            COUNT(*)                              AS total_incidentes,
            SUM(CASE WHEN f.entrou_kpi THEN 1 ELSE 0 END) AS total_no_kpi
        FROM silver.fato_incidentes f
        JOIN silver.dim_prioridade p ON f.prioridade_id = p.id
        {where}
        GROUP BY f.abertura_data, p.codigo, p.label
        ORDER BY f.abertura_data, p.codigo
    '''

    rows = db.execute(sa_text(sql), params).fetchall()

    return [
        VolumeDiarioSchema(
            data=row.data.isoformat(),
            prioridade_codigo=row.prioridade_codigo,
            prioridade_label=row.prioridade_label,
            total_incidentes=int(row.total_incidentes),
            total_no_kpi=int(row.total_no_kpi),
        )
        for row in rows
    ]


# ---------------------------------------------------------
# VIOLACOES DIARIO POR PRIORIDADE
# ---------------------------------------------------------

def _get_violacoes_diario(
    db: Session,
    data_inicio: date | None,
    data_fim: date | None,
) -> list[ViolacoesDiarioSchema]:
    query = db.query(
        HistoricoViolacoesDiario.data,
        DimPrioridade.codigo.label('prioridade_codigo'),
        DimPrioridade.label.label('prioridade_label'),
        func.sum(HistoricoViolacoesDiario.total_violacoes).label('total_violacoes'),
        func.sum(HistoricoViolacoesDiario.total_no_kpi).label('total_no_kpi'),
    ).join(DimPrioridade, HistoricoViolacoesDiario.prioridade_id == DimPrioridade.id)

    query = _aplicar_filtro_data(query, HistoricoViolacoesDiario, data_inicio, data_fim)

    rows = (
        query
        .group_by(
            HistoricoViolacoesDiario.data,
            DimPrioridade.codigo,
            DimPrioridade.label,
        )
        .order_by(HistoricoViolacoesDiario.data, DimPrioridade.codigo)
        .all()
    )

    return [
        ViolacoesDiarioSchema(
            data=r.data.isoformat(),
            prioridade_codigo=r.prioridade_codigo,
            prioridade_label=r.prioridade_label,
            total_violacoes=int(r.total_violacoes),
            total_no_kpi=int(r.total_no_kpi),
        )
        for r in rows
    ]


# ---------------------------------------------------------
# VOLUME POR GRUPO
# ---------------------------------------------------------

def _get_volume_grupo(
    db: Session,
    data_inicio: date | None,
    data_fim: date | None,
) -> list[VolumeGrupoSchema]:
    query = db.query(
        DimGrupo.nome.label('grupo_nome'),
        func.sum(HistoricoGrupoDiario.total_incidentes).label('total_incidentes'),
        func.sum(HistoricoGrupoDiario.total_no_kpi).label('total_no_kpi'),
        func.sum(HistoricoGrupoDiario.total_violacoes).label('total_violacoes'),
        func.sum(HistoricoGrupoDiario.sem_intervencao).label('sem_intervencao'),
    ).join(DimGrupo, HistoricoGrupoDiario.grupo_id == DimGrupo.id)

    query = _aplicar_filtro_data(query, HistoricoGrupoDiario, data_inicio, data_fim)

    rows = (
        query
        .group_by(DimGrupo.nome)
        .order_by(func.sum(HistoricoGrupoDiario.total_incidentes).desc())
        .all()
    )

    return [
        VolumeGrupoSchema(
            grupo_nome=r.grupo_nome,
            total_incidentes=int(r.total_incidentes),
            total_no_kpi=int(r.total_no_kpi),
            total_violacoes=int(r.total_violacoes),
            pct_sem_intervencao=round(
                float(r.sem_intervencao or 0) / float(r.total_incidentes or 1) * 100, 2
            ),
        )
        for r in rows
    ]