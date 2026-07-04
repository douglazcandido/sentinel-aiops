from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.gold_models import (
    DimPrioridade,
    ModeloFeatureImportance,
    RiscoOlaIncidente,
    RiscoOlaKpi,
)
from app.schemas.risco import (
    DistribuicaoRiscoSchema,
    FeatureImportanceSchema,
    KpiOlaSchema,
    RiscoCompletoSchema,
)


def get_risco_completo(db: Session, ano: int | None = None) -> RiscoCompletoSchema:
    distribuicao = _get_distribuicao_risco(db)
    kpis = _get_kpis_ola(db, ano)
    feature_importance = _get_feature_importance(db)

    return RiscoCompletoSchema(
        distribuicao_risco=distribuicao,
        kpis_ola=kpis,
        feature_importance=feature_importance,
    )


def _get_distribuicao_risco(db: Session) -> list[DistribuicaoRiscoSchema]:
    rows = (
        db.query(
            RiscoOlaIncidente.classe_risco,
            func.count(RiscoOlaIncidente.id).label('quantidade'),
        )
        .group_by(RiscoOlaIncidente.classe_risco)
        .order_by(func.count(RiscoOlaIncidente.id).desc())
        .all()
    )
    return [
        DistribuicaoRiscoSchema(classe_risco=r.classe_risco, quantidade=r.quantidade)
        for r in rows
    ]


def _get_kpis_ola(db: Session, ano: int | None) -> list[KpiOlaSchema]:
    query = (
        db.query(RiscoOlaKpi, DimPrioridade)
        .join(DimPrioridade, RiscoOlaKpi.prioridade_id == DimPrioridade.id)
    )

    if ano:
        query = query.filter(RiscoOlaKpi.ano == ano)

    rows = query.order_by(RiscoOlaKpi.ano.desc(), DimPrioridade.codigo).all()

    return [
        KpiOlaSchema(
            ano=r.RiscoOlaKpi.ano,
            prioridade_codigo=r.DimPrioridade.codigo,
            prioridade_label=r.DimPrioridade.label,
            violacoes_acumuladas=r.RiscoOlaKpi.violacoes_acumuladas,
            total_no_kpi=r.RiscoOlaKpi.total_no_kpi,
            pct_atingimento_meta=float(r.RiscoOlaKpi.pct_atingimento_meta) if r.RiscoOlaKpi.pct_atingimento_meta is not None else None,
            faixa_meta=r.RiscoOlaKpi.faixa_meta,
            violacoes_projetadas_ano=r.RiscoOlaKpi.violacoes_projetadas_ano,
            pct_projetado_meta=float(r.RiscoOlaKpi.pct_projetado_meta) if r.RiscoOlaKpi.pct_projetado_meta is not None else None,
        )
        for r in rows
    ]


def _get_feature_importance(db: Session) -> list[FeatureImportanceSchema]:
    rows = (
        db.query(ModeloFeatureImportance)
        .order_by(ModeloFeatureImportance.ranking)
        .all()
    )
    return [
        FeatureImportanceSchema(
            feature=r.feature,
            importancia=float(r.importancia),
            ranking=r.ranking,
        )
        for r in rows
    ]