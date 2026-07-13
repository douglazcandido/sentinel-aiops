-- 5 prioridades fixas (identico a backend/sql/silver.sql e clean.py::PRIORIDADE_MAP)
select *
from (
    values
        (1, 1, 'Critica',     4,    true),
        (2, 2, 'Alta',        4,    true),
        (3, 3, 'Media',       12,   true),
        (4, 4, 'Baixa',       null, false),
        (5, 5, 'Muito Baixa', null, false)
) as t (id, codigo, label, prazo_ola_horas, elegivel_kpi)
