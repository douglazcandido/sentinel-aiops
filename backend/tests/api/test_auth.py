from scripts.create_user import EMAIL_ADMIN_PADRAO, SENHA_ADMIN_PADRAO


def test_login_com_credenciais_do_admin_padrao_retorna_token(client):
    # o admin padrao e criado automaticamente no startup da API (base vazia)
    resposta = client.post('/api/v1/auth/login', json={
        'email': EMAIL_ADMIN_PADRAO,
        'senha': SENHA_ADMIN_PADRAO,
    })

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo['sucesso'] is True
    assert corpo['data']['email'] == EMAIL_ADMIN_PADRAO
    assert corpo['data']['is_admin'] is True
    assert corpo['data']['access_token']


def test_login_com_senha_incorreta_retorna_401(client):
    resposta = client.post('/api/v1/auth/login', json={
        'email': EMAIL_ADMIN_PADRAO,
        'senha': 'senha-errada-123',
    })

    assert resposta.status_code == 401


def test_login_com_email_inexistente_retorna_401(client):
    resposta = client.post('/api/v1/auth/login', json={
        'email': 'nao-existe@sentinellocaweb.com.br',
        'senha': 'qualquer-senha',
    })

    assert resposta.status_code == 401


def test_login_com_usuario_inativo_retorna_403(client, criar_usuario):
    usuario = criar_usuario('inativo@sentinellocaweb.com.br', senha='senha123456', ativo=False)

    resposta = client.post('/api/v1/auth/login', json={
        'email': usuario.email,
        'senha': 'senha123456',
    })

    assert resposta.status_code == 403


def test_login_com_email_mal_formatado_retorna_erro_de_validacao(client):
    resposta = client.post('/api/v1/auth/login', json={
        'email': 'nao-e-um-email',
        'senha': 'qualquer-senha',
    })

    assert resposta.status_code == 422
