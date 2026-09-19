'''Testes do endpoint /api/v1/historico contra dados reais.

Diferente de tests/api, que roda com o banco vazio (so as tabelas de auth),
estes testes esperam bronze/silver/gold ja carregados via
`pipeline.bootstrap` + `pipeline.ingest` + `dbt run --select silver gold`
(ver o job data-pipeline-test em .github/workflows/backend-ci.yml). Sem
esses dados, o endpoint responde 503 (ver app/api/v1/historico.py) e os
testes abaixo falham de proposito, para deixar claro que o pipeline nao rodou.
'''

from app.core.security import criar_access_token


def _token_usuario_valido(criar_usuario) -> str:
    usuario = criar_usuario('leitor-historico@sentinellocaweb.com.br')
    return criar_access_token(usuario.email)


def test_get_historico_sem_token_retorna_401(client):
    resposta = client.get('/api/v1/historico')

    assert resposta.status_code == 401


def test_get_historico_com_token_valido_retorna_dados_do_pipeline(client, criar_usuario):
    token = _token_usuario_valido(criar_usuario)

    resposta = client.get(
        '/api/v1/historico',
        headers={'Authorization': f'Bearer {token}'},
    )

    assert resposta.status_code == 200
    corpo = resposta.json()['data']

    assert corpo['kpis_gerais']['total_incidentes'] > 0
    assert len(corpo['volume_por_hora']) > 0
    assert len(corpo['volume_por_dia_semana']) > 0
    assert len(corpo['volume_diario']) > 0
    assert len(corpo['volume_por_grupo']) > 0


def test_get_historico_com_data_inicio_maior_que_data_fim_retorna_400(client, criar_usuario):
    token = _token_usuario_valido(criar_usuario)

    resposta = client.get(
        '/api/v1/historico',
        params={'data_inicio': '2025-12-31', 'data_fim': '2025-01-01'},
        headers={'Authorization': f'Bearer {token}'},
    )

    assert resposta.status_code == 400


def test_get_historico_filtra_por_intervalo_de_datas(client, criar_usuario):
    token = _token_usuario_valido(criar_usuario)
    headers = {'Authorization': f'Bearer {token}'}

    completo = client.get('/api/v1/historico', headers=headers).json()['data']
    filtrado = client.get(
        '/api/v1/historico',
        params={'data_inicio': '2023-01-01', 'data_fim': '2023-01-31'},
        headers=headers,
    ).json()['data']

    assert filtrado['kpis_gerais']['total_incidentes'] <= completo['kpis_gerais']['total_incidentes']
    assert filtrado['kpis_gerais']['periodo_inicio'] >= '2023-01-01'
    assert filtrado['kpis_gerais']['periodo_fim'] <= '2023-01-31'
