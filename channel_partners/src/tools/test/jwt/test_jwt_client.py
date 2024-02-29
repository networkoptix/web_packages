import json
from datetime import datetime
from time import sleep
from uuid import uuid4

import jwt
import pytest

from tools.jwt.jwt_auth import (
    JWKMissingKeyError,
    get_jwk_client,
)


class TestJWKClient:
    @pytest.fixture(autouse=True)
    def setup(self, private_key_factory, jwk_key_factory, jwt_token_factory,
              faking_jwt_token, cloud_test_host):
        self.valid_keys = []
        self.valid_ts = datetime.utcnow()
        for _ in range(3):
            kid = f'{uuid4()}'
            private_key = private_key_factory()
            jwk = jwk_key_factory(kid=kid, priv_key=private_key)
            emails = [f'{uuid4()}@netwrokotix.com' for _ in range(2)]
            jwt_tokens = [f'nxcdb-{jwt_token_factory(email, kid, private_key, exp=self.valid_ts)}'
                          for email in emails]
            self.valid_keys.append({
                'kid': kid,
                'private_key': private_key,
                'emails': emails,
                'jwk': jwk,
                'jwt_tokens': jwt_tokens
            })
        self.jwks = [k['jwk'] for k in self.valid_keys]
        self.jwks_ret_val = json.dumps(self.jwks).encode()
        self.missing_keys = []
        self.missing_ts = datetime.utcnow()
        for _ in range(3):
            kid = f'{uuid4()}'
            private_key = private_key_factory()
            jwk = jwk_key_factory(kid, private_key)
            emails = [f'{uuid4()}@netwrokotix.com' for _ in range(2)]
            jwt_tokens = [f'nxcdb-{jwt_token_factory(email, kid, private_key, exp=self.missing_ts)}'
                          for email in emails]
            self.missing_keys.append({
                'kid': kid,
                'private_key': private_key,
                'emails': emails,
                'jwk': jwk,
                'jwt_tokens': jwt_tokens
            })
        self.hostname = cloud_test_host.hostname

    def test_valid_jwt_tokens(self):
        for key in self.valid_keys:
            for token, email in zip(key['jwt_tokens'], key['emails']):
                headers = jwt.get_unverified_header(token[6:])
                assert headers['typ'] == 'JWT'
                assert headers['alg'] == 'RS256'
                payload = jwt.decode(token[6:], key=key['private_key'].public_key(), algorithms=['RS256'],
                                     options={'verify_aud': False, 'verify_exp': False})
                assert payload['exp'] == int(self.valid_ts.timestamp())
                assert payload['sub'] == email

    def test_get_signing_keys(self, mock_jwks_request):
        mock_jwks = mock_jwks_request(self.jwks_ret_val)
        client = get_jwk_client(self.hostname, init_keys=False)
        mock_jwks.assert_not_called()
        keys = client.get_signing_keys()
        assert len(keys) == len(self.valid_keys)
        mock_jwks.assert_called_once()
        keys = client.get_signing_keys()
        assert len(keys) == len(self.valid_keys)
        mock_jwks.assert_called_once()
        keys = client.get_signing_keys(refresh=True)
        assert len(mock_jwks.mock_calls) == 2

    def test_get_signing_key(self, mock_jwks_request):
        valid_key = self.valid_keys[0]
        mock_jwks = mock_jwks_request(self.jwks_ret_val)
        client = get_jwk_client(self.hostname, init_keys=False)
        mock_jwks.assert_not_called()
        key = client.get_signing_key(valid_key['kid'])
        assert jwt.decode(valid_key['jwt_tokens'][0][6:], key=key.key, algorithms=['RS256'],
                          options={'verify_aud': False, 'verify_exp': False})
        mock_jwks.assert_called_once()
        key = client.get_signing_key(valid_key['kid'])
        assert jwt.decode(valid_key['jwt_tokens'][0][6:], key=key.key, algorithms=['RS256'],
                          options={'verify_aud': False, 'verify_exp': False})
        mock_jwks.assert_called_once()

    def test_get_signing_key_from_jwt(self, mock_jwks_request):
        valid_key = self.valid_keys[0]
        mock_jwks = mock_jwks_request(self.jwks_ret_val)
        client = get_jwk_client(self.hostname, init_keys=False)
        mock_jwks.assert_not_called()
        key = client.get_signing_key_from_jwt(valid_key['jwt_tokens'][0][6:])
        assert jwt.decode(valid_key['jwt_tokens'][0][6:], key=key.key, algorithms=['RS256'],
                          options={'verify_aud': False, 'verify_exp': False})
        mock_jwks.assert_called_once()
        key = client.get_signing_key_from_jwt(valid_key['jwt_tokens'][1][6:])
        assert jwt.decode(valid_key['jwt_tokens'][1][6:], key=key.key, algorithms=['RS256'],
                          options={'verify_aud': False, 'verify_exp': False})
        mock_jwks.assert_called_once()

    def test_invalid_kid_called_once(self, mock_jwks_request):
        mock_jwks = mock_jwks_request(self.jwks_ret_val)
        client = get_jwk_client(self.hostname, init_keys=True)
        mock_jwks.assert_called_once()
        mock_jwks.reset_mock()
        invalid_kid = f'{uuid4()}'
        exception = None
        try:
            client.get_signing_key(invalid_kid)
        except JWKMissingKeyError as ex:
            exception = ex
        assert isinstance(exception, JWKMissingKeyError)
        assert len(mock_jwks.mock_calls) == 0

        try:
            client.get_signing_key(invalid_kid)
        except JWKMissingKeyError as ex:
            exception = ex
        assert isinstance(exception, JWKMissingKeyError)
        assert len(mock_jwks.mock_calls) == 0

    def test_lifespan(self, mock_jwks_request):
        mock_jwks = mock_jwks_request(self.jwks_ret_val)
        client = get_jwk_client(self.hostname, init_keys=True, lifespan=3)
        mock_jwks.assert_called_once()
        assert client.get_signing_keys()
        assert len(mock_jwks.mock_calls) == 1
        sleep(3)
        assert client.get_signing_keys()
        assert len(mock_jwks.mock_calls) == 2


