from app.core.security import criar_access_token


def test_get_foto_sem_token_retorna_401(client):
    resposta = client.get('/api/v1/perfil/foto')

    assert resposta.status_code == 401


def test_get_foto_com_token_invalido_retorna_401(client):
    resposta = client.get(
        '/api/v1/perfil/foto',
        headers={'Authorization': 'Bearer token-invalido'},
    )

    assert resposta.status_code == 401


def test_get_foto_com_token_de_email_inexistente_retorna_401(client):
    token = criar_access_token('fantasma@sentinellocaweb.com.br')

    resposta = client.get(
        '/api/v1/perfil/foto',
        headers={'Authorization': f'Bearer {token}'},
    )

    assert resposta.status_code == 401


def test_get_foto_com_token_valido_sem_foto_cadastrada_retorna_404(client, criar_usuario):
    usuario = criar_usuario('sem-foto@sentinellocaweb.com.br')

    token = criar_access_token(usuario.email)

    resposta = client.get(
        '/api/v1/perfil/foto',
        headers={'Authorization': f'Bearer {token}'},
    )

    assert resposta.status_code == 404
