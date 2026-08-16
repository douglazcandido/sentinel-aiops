{{
    config(
        indexes=[
            {'columns': ['abertura_data']},
            {'columns': ['entrou_kpi', 'kpi_violado']},
            {'columns': ['prioridade_id']},
            {'columns': ['grupo_id']},
            {'columns': ['entrou_kpi', 'prioridade_id', 'abertura_data']},
            {'columns': ['bronze_id']},
        ]
    )
}}

with source as (

    select * from {{ source('bronze', 'incidentes') }}

),

renamed as (

    select
        id as bronze_id,
        numero,
        prioridade,
        produto,
        categoria,
        subcategoria,
        grupo_designado,
        item_configuracao,
        solucao,
        aberto_por,
        incidente_pai,

        -- normaliza outlier de status (identico a clean.py::transform)
        case
            when status = 'Aguardando Problema' then 'Encerrado'
            else status
        end as status_normalizado,

        entrou_kpi as entrou_kpi_raw,
        kpi_violado as kpi_violado_raw,

        nullif(aberto, '')::timestamp as aberto_em,
        nullif(encerrado, '')::timestamp as encerrado_em,
        nullif(resolvido, '')::timestamp as resolvido_em,

        -- equivalente a pd.to_numeric(errors='coerce'): string nao numerica vira NULL
        case
            when duracao ~ '^[0-9]+(\.[0-9]+)?$' then round(duracao::numeric)::integer
            else null
        end as duracao_segundos,

        -- equivalente a PRIORIDADE_MAP em clean.py
        case prioridade
            when '1 - Crítica' then 1
            when '2 - Alta' then 2
            when '3 - Média' then 3
            when '4 - Baixa' then 4
            when '5 - Muito Baixa' then 5
            else null
        end as prioridade_codigo,

        (incidente_pai is not null and trim(incidente_pai) <> '') as tem_incidente_pai

    from source

),

features as (

    select
        *,
        extract(hour from aberto_em)::smallint as abertura_hora,
        -- ISODOW: segunda=1 .. domingo=7 -> -1 para bater com pandas dayofweek (segunda=0 .. domingo=6)
        (extract(isodow from aberto_em)::smallint - 1) as abertura_dia_semana,
        extract(month from aberto_em)::smallint as abertura_mes,
        extract(year from aberto_em)::smallint as abertura_ano,
        least(duracao_segundos, 259200) as duracao_segundos_capped
    from renamed

),

final as (

    select
        f.numero,
        f.bronze_id,
        dp.id as prioridade_id,
        dg.id as grupo_id,
        ds.id as status_id,
        dc.id as categoria_id,

        f.item_configuracao,
        f.solucao,
        f.aberto_por,
        f.incidente_pai,

        f.aberto_em,
        f.encerrado_em,
        f.resolvido_em,
        f.duracao_segundos,
        f.duracao_segundos_capped,

        f.aberto_em::date as abertura_data,
        f.abertura_hora,
        f.abertura_dia_semana,
        f.abertura_mes,
        f.abertura_ano,
        f.abertura_dia_semana in (5, 6) as abertura_fim_de_semana,
        (f.abertura_hora < 8 or f.abertura_hora >= 18) as abertura_fora_horario,

        (f.aberto_por = 'Monitoramento') as aberto_automaticamente,
        f.tem_incidente_pai,
        ds.sem_intervencao,

        case f.entrou_kpi_raw
            when 'SIM' then true
            when 'NAO' then false
            else null
        end as entrou_kpi,

        case f.kpi_violado_raw
            when 'SIM' then true
            when 'NAO' then false
            else null
        end as kpi_violado,

        -- elegivel_kpi = prioridade in (1,2,3) AND NOT sem_intervencao AND NOT tem_incidente_pai
        (
            coalesce(dp.elegivel_kpi, false)
            and not coalesce(ds.sem_intervencao, false)
            and not f.tem_incidente_pai
        ) as elegivel_kpi

    from features f
    left join {{ ref('dim_prioridade') }} dp on dp.codigo = f.prioridade_codigo
    left join {{ ref('dim_grupo') }} dg on dg.nome = f.grupo_designado
    left join {{ ref('dim_status') }} ds on ds.nome = f.status_normalizado
    left join {{ ref('dim_categoria') }} dc
        on dc.produto is not distinct from f.produto
        and dc.categoria is not distinct from f.categoria
        and dc.subcategoria is not distinct from f.subcategoria

)

select * from final
