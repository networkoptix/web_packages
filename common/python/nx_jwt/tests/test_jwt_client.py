import json
from copy import copy
from datetime import datetime, timezone
from time import sleep
from uuid import uuid4

import jwt
import pytest
from jwt import PyJWKClientConnectionError

from nx_jwt.jwt_auth import (
    JWKMissingKeyError,
    get_jwk_client,
    get_sa_jwk_client,
    FallbackToRegToken, 
    JWTPayload,
    SAJWTPayload,
)


class TestJWKClient:
    @pytest.fixture(autouse=True)
    def setup(self, private_key_factory, jwk_key_factory, jwt_token_factory,
              faking_jwt_token):
        self.valid_keys = []
        self.valid_ts = datetime.now(tz=timezone.utc)
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
        self.hostname = 'cloud-test.hdw.mx'

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

    def test_format_jwk_data(self):
        client = get_jwk_client(self.hostname, init_keys=False)
        keys = client.format_jwks_data(self.jwks)
        assert keys == {'keys': self.jwks}

    def test_clean_token(self):
        client = get_jwk_client(self.hostname, init_keys=False)
        original_token = self.valid_keys[0]['jwt_tokens'][0]
        token = client.clean_token(original_token)
        assert token == original_token[6:]

    def test_clean_token_failure(self):
        original_token = self.valid_keys[0]['jwt_tokens'][0]
        client = get_jwk_client(self.hostname, init_keys=False)
        with pytest.raises(FallbackToRegToken) as ex:
            client.clean_token(original_token[6:])

    def test_fallbacks(self, mock_jwks_request):
        mock_jwks = mock_jwks_request(b'', side_effect=TimeoutError)
        client = get_jwk_client(self.hostname, init_keys=False)
        token = self.valid_keys[0]['jwt_tokens'][0]
        for i in range(40):
            try:
                verified_token = client.decode_jwt_token(token)
            except Exception as ex:
                pass
        assert client.current_fallbacks == 30
        assert client.is_failure is True
        assert len(mock_jwks.mock_calls) == 30

    def test_decode_jwt_without_fallback(self, mock_jwks_request):
        mock_jwks = mock_jwks_request(b'', side_effect=TimeoutError)
        client = get_jwk_client(self.hostname, init_keys=False)
        token = self.valid_keys[0]['jwt_tokens'][0]
        for _ in range(3):
            with pytest.raises(PyJWKClientConnectionError) as ex:
                client.decode_jwt_without_fallback(token)
        assert client.current_fallbacks == 0
        assert client.is_failure is False
        assert len(mock_jwks.mock_calls) == 3


class TestSAJWKClient:

    def test_format_jwk_data(self):
        original_key = [f'{uuid4()}' for _ in range(3)]
        client = get_sa_jwk_client('cloud-test.hdw.mx', init_keys=False)
        keys = client.format_jwks_data(original_key)
        assert keys == original_key

    def test_clean_token(self):
        client = get_sa_jwk_client('cloud-test.hdw.mx', init_keys=False)
        original_token = f'{uuid4()}'
        token = client.clean_token(original_token)
        assert token == original_token


class TestJWTPayload:

    @pytest.fixture(autouse=True)
    def setup(self):
        now = int(datetime.now(tz=timezone.utc).timestamp())
        self.valid_payload = {
            'aud': 'https://cloud-test.hdw.mx/ cloudSystemId=*',
            'client_id': 'cloud/default',
            'exp': now + 1000,
            'iat': now,
            'iss': 'cdb',
            'pwdTime': now,
            'sid': '02db52ff-f9ae-4cd9-b85b-e4182a887504',
            'sub': 'kapanovich+defaultadmin@networkoptix.com',
            'typ': 'accessToken'
        }
        self.expired_token = copy(self.valid_payload)
        self.expired_token['exp'] = self.valid_payload['iat']

    def test_valid_payload(self):
        payload = JWTPayload(**self.valid_payload)
        assert payload.aud == self.valid_payload['aud']
        assert payload.client_id == self.valid_payload['client_id']
        assert payload.exp == self.valid_payload['exp']
        assert payload.iat == self.valid_payload['iat']
        assert payload.iss == self.valid_payload['iss']
        assert payload.pwd_time == self.valid_payload['pwdTime']
        assert payload.sid == self.valid_payload['sid']
        assert payload.sub == self.valid_payload['sub']
        assert payload.typ == self.valid_payload['typ']

        assert payload.is_expired is False
        assert payload.expires_in > 0

    def test_expired_payload(self):
        payload = JWTPayload(**self.expired_token)
        assert payload.is_expired is True

    def test_missing_argument(self):
        self.valid_payload.pop('aud')
        with pytest.raises(ValueError) as ex:
            JWTPayload(**self.valid_payload)
        assert 'aud' in str(ex.value)


class TestSAJWTPayload:
    @pytest.fixture(autouse=True)
    def setup(self):
        now = int(datetime.now(tz=timezone.utc).timestamp())
        self.valid_payload = {
            'auth_time': now,
            'client_id': 'channel_partners_service',
            'exp': now + 1000,
            'iat': now,
            'jti': 'ac03b35e-1cd7-411e-8b12-388cc09ba104',
            'scope': '[{"service":"cloud_db","rules":[{"method":"PUT","path":"/cdb/internal/v0/account/[^/]+/organization-attrs/?"},{"method":"POST","path":"/cdb/internal/accounts/info/?"}]}, {"service": "channel_partners"}]',
            'sub': 'channel_partners_service',
            'token_use': 'access',
            'version': 2
        }
        self.rules = [
            {"method":"PUT","path":"/cdb/internal/v0/account/[^/]+/organization-attrs/?"},
            {"method":"POST","path":"/cdb/internal/accounts/info/?"}
        ]

    def test_valid_payload(self):
        payload = SAJWTPayload(**self.valid_payload)
        assert payload.auth_time == self.valid_payload['auth_time']
        assert payload.client_id == self.valid_payload['client_id']
        assert payload.exp == self.valid_payload['exp']
        assert payload.iat == self.valid_payload['iat']
        assert payload.jti == self.valid_payload['jti']
        assert payload.scope == self.valid_payload['scope']
        assert payload.sub == self.valid_payload['sub']
        assert payload.token_use == self.valid_payload['token_use']
        assert payload.version == self.valid_payload['version']

    def test_missing_argument(self):
        self.valid_payload.pop('auth_time')
        with pytest.raises(ValueError) as ex:
            SAJWTPayload(**self.valid_payload)
        assert 'auth_time' in str(ex.value)

    def test_extra_argument(self):
        self.valid_payload['invalid'] = '1728492773'
        payload = SAJWTPayload(**self.valid_payload)
        assert payload.auth_time == self.valid_payload['auth_time']
        assert payload.client_id == self.valid_payload['client_id']
        assert payload.exp == self.valid_payload['exp']
        assert payload.iat == self.valid_payload['iat']
        assert payload.jti == self.valid_payload['jti']
        assert payload.scope == self.valid_payload['scope']
        assert payload.sub == self.valid_payload['sub']
        assert payload.token_use == self.valid_payload['token_use']
        assert payload.version == self.valid_payload['version']

    def test_services(self):
        payload = SAJWTPayload(**self.valid_payload)
        assert payload.services == {'cloud_db', 'channel_partners'}

    def test_is_service_allowed_true(self):
        payload = SAJWTPayload(**self.valid_payload)
        assert payload.is_service_allowed('cloud_db')

    def test_is_service_allowed_false(self):
        payload = SAJWTPayload(**self.valid_payload)
        assert payload.is_service_allowed('cloud') is False

    def test_is_request_allowed_true(self):
        payload = SAJWTPayload(**self.valid_payload)
        assert payload.is_request_allowed('cloud_db', 'request')

    def test_is_request_allowed_false(self):
        payload = SAJWTPayload(**self.valid_payload)
        assert payload.is_request_allowed('cloud', 'request') is False

