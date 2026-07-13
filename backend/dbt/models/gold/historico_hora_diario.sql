select
    abertura_data as data,
    abertura_hora as hora,
    count(*) as total_incidentes
from {{ ref('fato_incidentes') }}
group by abertura_data, abertura_hora
