-- silver.dim_prioridade e gold.dim_prioridade sao tabelas separadas com IDs
-- diferentes: faz-se o lookup do prioridade_id do Gold via o codigo.
--
-- Nota: nao ha filtro fixo de codigo aqui (ex.: IN (2,3)). O aggregate.py
-- original agrupa qualquer prioridade presente entre os incidentes com
-- entrou_kpi = TRUE, sem restringir a codigos especificos, e o proprio
-- dim_prioridade marca elegivel_kpi = TRUE para os codigos 1, 2 e 3
-- (Critica, Alta, Media). Restringir aqui a (2,3) descartaria silenciosamente
-- eventuais violacoes de incidentes Criticos (codigo 1).
with fato as (

    select * from {{ ref('fato_incidentes') }}
    where entrou_kpi = true

),

silver_prioridade as (

    select * from {{ ref('dim_prioridade') }}

),

gold_prioridade as (

    select * from {{ source('gold', 'dim_prioridade') }}

)

select
    f.abertura_data as data,
    gp.id as prioridade_id,
    sum(case when f.kpi_violado then 1 else 0 end) as total_violacoes,
    count(*) as total_no_kpi
from fato f
join silver_prioridade sp on f.prioridade_id = sp.id
join gold_prioridade gp on sp.codigo = gp.codigo
group by f.abertura_data, gp.id
