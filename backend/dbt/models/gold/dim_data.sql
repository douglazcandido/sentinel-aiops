with base as (

    select distinct abertura_data as data
    from {{ ref('fato_incidentes') }}
    where abertura_data is not null

),

calculado as (

    select
        data,
        extract(year from data)::smallint as ano,
        extract(quarter from data)::smallint as trimestre,
        extract(month from data)::smallint as mes,
        extract(week from data)::smallint as semana_ano,
        extract(day from data)::smallint as dia_mes,
        -- postgres DOW: 0=Domingo..6=Sabado -> +6 % 7 para 0=Segunda..6=Domingo (igual ao aggregate.py)
        ((extract(dow from data)::int + 6) % 7)::smallint as dia_semana
    from base

)

select
    data,
    ano,
    trimestre,
    mes,
    case mes
        when 1  then 'Janeiro'
        when 2  then 'Fevereiro'
        when 3  then 'Março'
        when 4  then 'Abril'
        when 5  then 'Maio'
        when 6  then 'Junho'
        when 7  then 'Julho'
        when 8  then 'Agosto'
        when 9  then 'Setembro'
        when 10 then 'Outubro'
        when 11 then 'Novembro'
        when 12 then 'Dezembro'
    end as mes_label,
    semana_ano,
    dia_mes,
    dia_semana,
    case dia_semana
        when 0 then 'Segunda'
        when 1 then 'Terça'
        when 2 then 'Quarta'
        when 3 then 'Quinta'
        when 4 then 'Sexta'
        when 5 then 'Sábado'
        when 6 then 'Domingo'
    end as dia_semana_label,
    dia_semana >= 5 as fim_de_semana,
    false as fora_horario
from calculado
