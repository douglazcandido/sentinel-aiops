from pydantic import BaseModel, ConfigDict, Field


class DistribuicaoRiscoSchema(BaseModel):
    '''Contagem de incidentes por classe de risco.'''
    classe_risco: str = Field(..., description='Classe de risco (Baixo, Medio, Alto)')
    quantidade: int = Field(..., description='Quantidade de incidentes nessa classe')

    model_config = ConfigDict(from_attributes=True)


class KpiOlaSchema(BaseModel):
    '''KPI de OLA para um ano e prioridade especificos.'''
    ano: int = Field(..., description='Ano de referencia')
    prioridade_codigo: int = Field(..., description='Codigo da prioridade')
    prioridade_label: str = Field(..., description='Label da prioridade (Alta, Media)')
    violacoes_acumuladas: int = Field(..., description='Total de violacoes acumuladas no ano')
    total_no_kpi: int = Field(..., description='Total de incidentes que entraram no KPI')
    pct_atingimento_meta: float | None = Field(None, description='% de atingimento da meta OLA')
    faixa_meta: str | None = Field(None, description='Descricao da faixa de meta atingida')
    violacoes_projetadas_ano: int | None = Field(None, description='Projecao de violacoes ao fim do ano')
    pct_projetado_meta: float | None = Field(None, description='% projetado de atingimento da meta ao fim do ano')

    model_config = ConfigDict(from_attributes=True)


class FeatureImportanceSchema(BaseModel):
    '''Importancia de uma variavel no modelo Random Forest.'''
    feature: str = Field(..., description='Nome legivel da variavel')
    importancia: float = Field(..., description='Peso da variavel na decisao do modelo (0 a 1)')
    ranking: int = Field(..., description='Posicao no ranking de importancia (1 = mais importante)')

    model_config = ConfigDict(from_attributes=True)


class RiscoCompletoSchema(BaseModel):
    '''Payload completo da Frente 03 - Risco de OLA.'''
    distribuicao_risco: list[DistribuicaoRiscoSchema] = Field(
        ..., description='Distribuicao de incidentes por classe de risco'
    )
    kpis_ola: list[KpiOlaSchema] = Field(
        ..., description='KPIs de OLA por ano e prioridade'
    )
    feature_importance: list[FeatureImportanceSchema] = Field(
        default_factory=list,
        description='Importancia de cada variavel no modelo Random Forest',
    )