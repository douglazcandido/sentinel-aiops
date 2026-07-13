with source as (

    select distinct
        produto,
        categoria,
        subcategoria
    from {{ source('bronze', 'incidentes') }}

)

select
    row_number() over (order by produto, categoria, subcategoria) as id,
    produto,
    categoria,
    subcategoria
from source
