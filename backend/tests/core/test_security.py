from datetime import datetime, timedelta, timezone

from jose import jwt

from app.core import security


def test_hash_senha_gera_hash_diferente_da_senha_original():
    hash_gerado = security.hash_senha('minha-senha-123')

    assert hash_gerado != 'minha-senha-123'
    assert hash_gerado.startswith('$2b$')


def test_hash_senha_gera_hashes_diferentes_para_mesma_senha():
    # bcrypt usa salt aleatorio, entao o mesmo texto plano nunca deve gerar o mesmo hash
    hash_1 = security.hash_senha('minha-senha-123')
    hash_2 = security.hash_senha('minha-senha-123')

    assert hash_1 != hash_2


def test_verificar_senha_aceita_senha_correta():
    hash_gerado = security.hash_senha('minha-senha-123')

    assert security.verificar_senha('minha-senha-123', hash_gerado) is True


def test_verificar_senha_rejeita_senha_incorreta():
    hash_gerado = security.hash_senha('minha-senha-123')

    assert security.verificar_senha('senha-errada', hash_gerado) is False


def test_criar_access_token_gera_token_valido_com_email_correto():
    token = security.criar_access_token('usuario@teste.com')

    email_decodificado = security.decodificar_token(token)

    assert email_decodificado == 'usuario@teste.com'


def test_criar_access_token_define_expiracao_no_futuro():
    token = security.criar_access_token('usuario@teste.com')

    payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
    expira_em = datetime.fromtimestamp(payload['exp'], tz=timezone.utc)

    assert expira_em > datetime.now(timezone.utc)


def test_decodificar_token_retorna_none_para_token_invalido():
    assert security.decodificar_token('token-completamente-invalido') is None


def test_decodificar_token_retorna_none_para_token_com_assinatura_errada():
    token_com_outra_chave = jwt.encode(
        {'sub': 'usuario@teste.com', 'exp': datetime.now(timezone.utc) + timedelta(minutes=5)},
        'outra-chave-secreta',
        algorithm=security.ALGORITHM,
    )

    assert security.decodificar_token(token_com_outra_chave) is None


def test_decodificar_token_retorna_none_para_token_expirado():
    token_expirado = jwt.encode(
        {'sub': 'usuario@teste.com', 'exp': datetime.now(timezone.utc) - timedelta(minutes=1)},
        security.SECRET_KEY,
        algorithm=security.ALGORITHM,
    )

    assert security.decodificar_token(token_expirado) is None
