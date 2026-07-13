-- 3 status fixos (identico a backend/sql/silver.sql).
-- 'Aguardando Problema' e normalizado para 'Encerrado' em fato_incidentes.
select *
from (
    values
        (1, 'Encerrado',                  false),
        (2, 'Encerrado Automaticamente',   false),
        (3, 'Sem Intervenção',             true)
) as t (id, nome, sem_intervencao)
