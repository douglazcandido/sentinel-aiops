select
    abertura_data as data,
    count(*) as total_incidentes,
    sum(case when entrou_kpi then 1 else 0 end) as total_no_kpi,
    sum(case when kpi_violado then 1 else 0 end) as total_violacoes,
    sum(case when aberto_automaticamente then 1 else 0 end) as abertos_automaticamente,
    sum(case when sem_intervencao then 1 else 0 end) as sem_intervencao
from {{ ref('fato_incidentes') }}
group by abertura_data
