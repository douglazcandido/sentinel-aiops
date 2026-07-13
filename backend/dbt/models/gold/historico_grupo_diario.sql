-- silver.dim_grupo e gold.dim_grupo sao tabelas separadas com IDs diferentes:
-- faz-se o lookup do grupo_id do Gold via o nome do grupo.
with fato as (

    select * from {{ ref('fato_incidentes') }}

),

silver_grupo as (

    select * from {{ ref('dim_grupo') }}

),

gold_grupo as (

    select * from {{ source('gold', 'dim_grupo') }}

)

select
    f.abertura_data as data,
    gg.id as grupo_id,
    count(*) as total_incidentes,
    sum(case when f.entrou_kpi then 1 else 0 end) as total_no_kpi,
    sum(case when f.kpi_violado then 1 else 0 end) as total_violacoes,
    sum(case when f.sem_intervencao then 1 else 0 end) as sem_intervencao
from fato f
join silver_grupo sg on f.grupo_id = sg.id
join gold_grupo gg on sg.nome = gg.nome
group by f.abertura_data, gg.id
