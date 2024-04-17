import datetime
import json
from typing import Union

from mock.mock import MagicMock
from uuid import uuid4, UUID

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicKey, RSAPrivateKey
from jwt.algorithms import RSAAlgorithm
from jwt.utils import base64url_decode, base64url_encode

from nx_jwt.jwt_auth import get_jwk_client


@pytest.fixture()
def private_key_factory():
    def factory():
        return rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )

    return factory

def jwk_string(public_key: RSAPublicKey) -> str:
    pub_key = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.PKCS1
    )
    return f"{''.join(pub_key.strip().decode().splitlines()[1:-1])}"

@pytest.fixture()
def jwk_key_factory(private_key_factory):
    def factory(kid: Union[str ,UUID] = None, priv_key: RSAPrivateKey = None) -> dict:
        alg = RSAAlgorithm(RSAAlgorithm.SHA256)
        if not kid:
            kid = f'{uuid4()}'
        if not priv_key:
            priv_key = private_key_factory()
        jwk = alg.to_jwk(priv_key, as_dict=True)
        return {
            "kty": "RSA",
            "use": "sig",
            "kid": f"{kid}",
            "n": jwk["n"],
            "e": "AQAB",
            "alg": "RS256",
            "key_ops": [
                "verify"
            ]
        }

    return factory


def generate_jwt_token(
        email: str,
        kid: Union[str ,UUID],
        priv_key: RSAPrivateKey,
        exp: datetime.datetime = None,
        cloud_host_name: str = 'cloud-test.hdw.mx'
    ) -> str:
        if not exp:
            exp = datetime.datetime.utcnow() + datetime.timedelta(hours=1)
        iat = exp - datetime.timedelta(hours=2)
        headers = {'typ': 'JWT', 'alg': 'RS256', 'kid': f'{kid}'}
        payload = {
            'exp': int(exp.timestamp()),
            'pwdTime': int(iat.timestamp()),
            'sid': f'{uuid4()}',
            'typ': 'accessToken',
            'aud': f'https://{cloud_host_name}/ cloudSystemId=*',
            'iat': int(iat.timestamp()),
            'sub': f'{email}',
            'client_id': '',
            'iss': 'cdb'
        }
        return jwt.encode(payload=payload, key=priv_key, headers=headers, algorithm='RS256')


@pytest.fixture()
def jwt_token_factory():
    def factory(
        email: str,
        kid: Union[str, UUID],
        priv_key: RSAPrivateKey,
        exp: datetime.datetime = None,
        cloud_host_name: str = 'cloud-test.hdw.mx'
    ) -> str:
        if not exp:
            exp = datetime.datetime.utcnow() + datetime.timedelta(days=1)
        return generate_jwt_token(email, kid, priv_key, exp=exp, cloud_host_name=cloud_host_name)

    return factory


@pytest.fixture()
def faking_jwt_token():
    def factory(valid_token: str):
        parts = valid_token.split('.')
        payload = json.loads(base64url_decode(parts[1].encode()))
        payload['exp'] += 1000
        parts[1] = base64url_encode(json.dumps(payload).encode()).decode('utf-8')
        return '.'.join(parts)

    return factory


@pytest.fixture(scope='function')
def mock_jwks_request(mocker):
    def mock(ret_value: str, status_code: int = 200, side_effect=None):
        mock_urlopen = mocker.patch('urllib.request.urlopen', side_effect=side_effect)
        cm = MagicMock(side_effect=side_effect)
        cm.getcode.return_value = str(status_code)
        cm.read.return_value = ret_value
        cm.__enter__.return_value = cm
        mock_urlopen.return_value = cm
        return mock_urlopen

    return mock


def wrapped_report_mock_func(
        func,
        entity_obj_name,
        entity_id_name,
        report_type,
        *args,
        **kwargs,
):
    return func(*args, **kwargs)


@pytest.fixture()
def mock_reports_decoration(mocker):
    return mocker.patch('partners.services.usage_reports_service.wrapped_report_func',
                        wrapped_report_mock_func)


@pytest.fixture()
def jwk_client():
    CLOUD_TEST_HOSTNAME = 'cloud-test.hdw.mx'
    JWK_LIFESPAN = 21600
    JWK_CLIENT = get_jwk_client(CLOUD_TEST_HOSTNAME, lifespan=JWK_LIFESPAN, init_keys=False)
    return JWK_CLIENT