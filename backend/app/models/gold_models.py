from datetime import date, datetime

from sqlalchemy import BigInteger, Boolean, Date, DateTime, ForeignKey, Integer, Numeric, SmallInteger, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DimPrioridade(Base):
    __tablename__ = 'dim_prioridade'
    __table_args__ = {'schema': 'gold'}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    codigo: Mapped[int] = mapped_column(SmallInteger, nullable=False, unique=True)
    label: Mapped[str] = mapped_column(Text, nullable=False)
    prazo_ola_horas: Mapped[int | None] = mapped_column(SmallInteger)
    elegivel_kpi: Mapped[bool] = mapped_column(Boolean, nullable=False)

    volumes_mensais: Mapped[list['HistoricoVolumeMensal']] = relationship(back_populates='prioridade')
    violacoes_mensais: Mapped[list['HistoricoViolacoesMensal']] = relationship(back_populates='prioridade')
    riscos_incidente: Mapped[list['RiscoOlaIncidente']] = relationship(back_populates='prioridade')
    riscos_kpi: Mapped[list['RiscoOlaKpi']] = relationship(back_populates='prioridade')

    def __repr__(self) -> str:
        return f'<gold.DimPrioridade(codigo={self.codigo}, label={self.label})>'


class DimGrupo(Base):
    __tablename__ = 'dim_grupo'
    __table_args__ = {'schema': 'gold'}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(Text, nullable=False, unique=True)

    volumes_grupo: Mapped[list['HistoricoVolumeGrupo']] = relationship(back_populates='grupo')
    riscos_incidente: Mapped[list['RiscoOlaIncidente']] = relationship(back_populates='grupo')
    clusters: Mapped[list['ClusterPerfil']] = relationship(back_populates='grupo')
    recomendacoes: Mapped[list['Recomendacao']] = relationship(back_populates='grupo')

    def __repr__(self) -> str:
        return f'<gold.DimGrupo(nome={self.nome})>'


# =========================================================
# FRENTE HISTORICA
# =========================================================

class HistoricoKpisGerais(Base):
    __tablename__ = 'historico_kpis_gerais'
    __table_args__ = {'schema': 'gold'}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    total_incidentes: Mapped[int] = mapped_column(Integer, nullable=False)
    pct_aberto_automaticamente: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    pct_sem_intervencao: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    total_violacoes_ola: Mapped[int] = mapped_column(Integer, nullable=False)
    total_no_kpi: Mapped[int] = mapped_column(Integer, nullable=False)
    periodo_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    periodo_fim: Mapped[date] = mapped_column(Date, nullable=False)
    gerado_em: Mapped[datetime] = mapped_column(DateTime, server_default=text('now()'))

    def __repr__(self) -> str:
        return f'<HistoricoKpisGerais(total={self.total_incidentes}, violacoes={self.total_violacoes_ola})>'


class HistoricoVolumeHora(Base):
    __tablename__ = 'historico_volume_hora'
    __table_args__ = {'schema': 'gold'}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    hora: Mapped[int] = mapped_column(SmallInteger, nullable=False, unique=True)
    total_incidentes: Mapped[int] = mapped_column(Integer, nullable=False)
    gerado_em: Mapped[datetime] = mapped_column(DateTime, server_default=text('now()'))

    def __repr__(self) -> str:
        return f'<HistoricoVolumeHora(hora={self.hora}, total={self.total_incidentes})>'


class HistoricoVolumeDiaSemana(Base):
    __tablename__ = 'historico_volume_dia_semana'
    __table_args__ = {'schema': 'gold'}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    dia_semana: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    dia_label: Mapped[str] = mapped_column(Text, nullable=False)
    total_incidentes: Mapped[int] = mapped_column(Integer, nullable=False)
    gerado_em: Mapped[datetime] = mapped_column(DateTime, server_default=text('now()'))

    def __repr__(self) -> str:
        return f'<HistoricoVolumeDiaSemana(dia={self.dia_label}, total={self.total_incidentes})>'


class HistoricoVolumeMensal(Base):
    __tablename__ = 'historico_volume_mensal'
    __table_args__ = {'schema': 'gold'}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    ano: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    mes: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    prioridade_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey('gold.dim_prioridade.id'), nullable=False
    )
    total_incidentes: Mapped[int] = mapped_column(Integer, nullable=False)
    total_no_kpi: Mapped[int] = mapped_column(Integer, nullable=False)
    gerado_em: Mapped[datetime] = mapped_column(DateTime, server_default=text('now()'))

    prioridade: Mapped['DimPrioridade'] = relationship(back_populates='volumes_mensais')

    def __repr__(self) -> str:
        return f'<HistoricoVolumeMensal(ano={self.ano}, mes={self.mes})>'


class HistoricoViolacoesMensal(Base):
    __tablename__ = 'historico_violacoes_mensal'
    __table_args__ = {'schema': 'gold'}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    ano: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    mes: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    prioridade_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey('gold.dim_prioridade.id'), nullable=False
    )
    total_violacoes: Mapped[int] = mapped_column(Integer, nullable=False)
    gerado_em: Mapped[datetime] = mapped_column(DateTime, server_default=text('now()'))

    prioridade: Mapped['DimPrioridade'] = relationship(back_populates='violacoes_mensais')

    def __repr__(self) -> str:
        return f'<HistoricoViolacoesMensal(ano={self.ano}, mes={self.mes}, violacoes={self.total_violacoes})>'


class HistoricoVolumeGrupo(Base):
    __tablename__ = 'historico_volume_grupo'
    __table_args__ = {'schema': 'gold'}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    grupo_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey('gold.dim_grupo.id'), nullable=False
    )
    total_incidentes: Mapped[int] = mapped_column(Integer, nullable=False)
    total_no_kpi: Mapped[int] = mapped_column(Integer, nullable=False)
    total_violacoes: Mapped[int] = mapped_column(Integer, nullable=False)
    pct_sem_intervencao: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    gerado_em: Mapped[datetime] = mapped_column(DateTime, server_default=text('now()'))

    grupo: Mapped['DimGrupo'] = relationship(back_populates='volumes_grupo')

    def __repr__(self) -> str:
        return f'<HistoricoVolumeGrupo(grupo_id={self.grupo_id}, total={self.total_incidentes})>'


# =========================================================
# FRENTE PREDITIVA
# =========================================================

class PrevisaoVolume(Base):
    __tablename__ = 'previsao_volume'
    __table_args__ = {'schema': 'gold'}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    data_referencia: Mapped[date] = mapped_column(Date, nullable=False)
    horizonte_dias: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    total_previsto: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    limite_inferior: Mapped[float | None] = mapped_column(Numeric(10, 2))
    limite_superior: Mapped[float | None] = mapped_column(Numeric(10, 2))
    gerado_em: Mapped[datetime] = mapped_column(DateTime, server_default=text('now()'))

    def __repr__(self) -> str:
        return f'<PrevisaoVolume(data={self.data_referencia}, horizonte={self.horizonte_dias})>'


class RiscoOlaIncidente(Base):
    __tablename__ = 'risco_ola_incidente'
    __table_args__ = {'schema': 'gold'}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    numero: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    prioridade_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey('gold.dim_prioridade.id'), nullable=False
    )
    grupo_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey('gold.dim_grupo.id'), nullable=False
    )
    probabilidade_violacao: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False)
    classe_risco: Mapped[str] = mapped_column(Text, nullable=False)
    abertura_data: Mapped[date] = mapped_column(Date, nullable=False)
    gerado_em: Mapped[datetime] = mapped_column(DateTime, server_default=text('now()'))

    prioridade: Mapped['DimPrioridade'] = relationship(back_populates='riscos_incidente')
    grupo: Mapped['DimGrupo'] = relationship(back_populates='riscos_incidente')

    def __repr__(self) -> str:
        return f'<RiscoOlaIncidente(numero={self.numero}, risco={self.classe_risco})>'


class RiscoOlaKpi(Base):
    __tablename__ = 'risco_ola_kpi'
    __table_args__ = {'schema': 'gold'}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    ano: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    prioridade_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey('gold.dim_prioridade.id'), nullable=False
    )
    violacoes_acumuladas: Mapped[int] = mapped_column(Integer, nullable=False)
    total_no_kpi: Mapped[int] = mapped_column(Integer, nullable=False)
    pct_atingimento_meta: Mapped[float | None] = mapped_column(Numeric(5, 2))
    faixa_meta: Mapped[str | None] = mapped_column(Text)
    violacoes_projetadas_ano: Mapped[int | None] = mapped_column(Integer)
    pct_projetado_meta: Mapped[float | None] = mapped_column(Numeric(5, 2))
    gerado_em: Mapped[datetime] = mapped_column(DateTime, server_default=text('now()'))

    prioridade: Mapped['DimPrioridade'] = relationship(back_populates='riscos_kpi')

    def __repr__(self) -> str:
        return f'<RiscoOlaKpi(ano={self.ano}, pct_meta={self.pct_atingimento_meta})>'


class ClusterPerfil(Base):
    __tablename__ = 'cluster_perfil'
    __table_args__ = {'schema': 'gold'}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    cluster_id: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    descricao: Mapped[str | None] = mapped_column(Text)
    grupo_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey('gold.dim_grupo.id'))
    prioridade_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey('gold.dim_prioridade.id'))
    hora_predominante: Mapped[int | None] = mapped_column(SmallInteger)
    dia_semana_predominante: Mapped[int | None] = mapped_column(SmallInteger)
    total_incidentes: Mapped[int] = mapped_column(Integer, nullable=False)
    pct_violacao_ola: Mapped[float | None] = mapped_column(Numeric(5, 2))
    gerado_em: Mapped[datetime] = mapped_column(DateTime, server_default=text('now()'))

    grupo: Mapped['DimGrupo | None'] = relationship(back_populates='clusters')
    incidentes: Mapped[list['ClusterIncidente']] = relationship(back_populates='cluster')

    def __repr__(self) -> str:
        return f'<ClusterPerfil(cluster_id={self.cluster_id}, descricao={self.descricao})>'


class ClusterIncidente(Base):
    __tablename__ = 'cluster_incidente'
    __table_args__ = {'schema': 'gold'}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    numero: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    cluster_id: Mapped[int] = mapped_column(
        Integer, ForeignKey('gold.cluster_perfil.cluster_id'), nullable=False
    )
    gerado_em: Mapped[datetime] = mapped_column(DateTime, server_default=text('now()'))

    cluster: Mapped['ClusterPerfil'] = relationship(back_populates='incidentes')

    def __repr__(self) -> str:
        return f'<ClusterIncidente(numero={self.numero}, cluster_id={self.cluster_id})>'


class Recomendacao(Base):
    __tablename__ = 'recomendacao'
    __table_args__ = {'schema': 'gold'}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tipo: Mapped[str] = mapped_column(Text, nullable=False)
    prioridade: Mapped[str | None] = mapped_column(Text)
    grupo_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey('gold.dim_grupo.id'))
    titulo: Mapped[str] = mapped_column(Text, nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    gerado_em: Mapped[datetime] = mapped_column(DateTime, server_default=text('now()'))

    grupo: Mapped['DimGrupo | None'] = relationship(back_populates='recomendacoes')

    def __repr__(self) -> str:
        return f'<Recomendacao(tipo={self.tipo}, titulo={self.titulo})>'


class ModeloFeatureImportance(Base):
    __tablename__ = 'modelo_feature_importance'
    __table_args__ = {'schema': 'gold'}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    feature: Mapped[str] = mapped_column(Text, nullable=False)
    importancia: Mapped[float] = mapped_column(Numeric(6, 4), nullable=False)
    ranking: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    gerado_em: Mapped[datetime] = mapped_column(DateTime, server_default=text('now()'))

    def __repr__(self) -> str:
        return f'<ModeloFeatureImportance(feature={self.feature}, importancia={self.importancia})>'