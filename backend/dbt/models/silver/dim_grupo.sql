with source as (

    select distinct grupo_designado as nome
    from {{ source('bronze', 'incidentes') }}
    where grupo_designado is not null

)

select
    row_number() over (order by nome) as id,
    nome
from source
