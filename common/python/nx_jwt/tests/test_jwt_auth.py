import json
import re
from datetime import (
    datetime,
    timedelta, timezone,
)
from time import sleep
from urllib.error import URLError
from uuid import uuid4

import jwt.exceptions
import pytest
# from django.conf import settings
from jwt.utils import base64url_encode

from nx_jwt.jwt_auth import (
    JWT_REGEX,
    FallbackToRegToken,
    JTWPayload,
    JWKMissingKeyError,
    get_jwk_client,
)

CLOUD_TEST_HOSTNAME = 'cloud-test.hdw.mx'


def test_jwt_regex(jwt_token_factory, private_key_factory):
    private_key = private_key_factory()
    token = jwt_token_factory(f'{uuid4()}@networkoptix.com', f'{uuid4()}', private_key)
    match = re.match(JWT_REGEX, f'nxcdb-{token}')
    assert match
    assert match.group("jwt") == token


class TestDecodeJwtToken:
    @pytest.fixture(autouse=True)
    def setup(self, private_key_factory, jwk_key_factory, jwt_token_factory,
              faking_jwt_token):
        self.valid_keys = []
        self.valid_ts = datetime.now(tz=timezone.utc) + timedelta(hours=1)
        self.expired_ts = datetime.now(tz=timezone.utc) - timedelta(hours=1)
        self.timestamps = [
            self.valid_ts,
            self.expired_ts
        ]
        for _ in range(3):
            kid = f'{uuid4()}'
            private_key = private_key_factory()
            jwk = jwk_key_factory(kid=kid, priv_key=private_key)
            emails = [f'{uuid4()}@netwrokotix.com' for _ in range(2)]
            jwt_tokens = [f'nxcdb-{jwt_token_factory(email, kid, private_key, exp=ts)}'
                          for email, ts in zip(emails, self.timestamps)]
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
        self.hostname = CLOUD_TEST_HOSTNAME

    def test_valid_tokens(self, mock_jwks_request, jwk_client):

        mock_jwks = mock_jwks_request(self.jwks_ret_val)
        for key in self.valid_keys:
            token = key['jwt_tokens'][0]
            email = key['emails'][0]
            verified_token = jwk_client.decode_jwt_token(token)
            assert isinstance(verified_token, JTWPayload)
            assert verified_token.sub == email
            assert verified_token.exp == int(self.timestamps[0].timestamp())
            assert verified_token.is_expired is False
            token = key['jwt_tokens'][1]
            email = key['emails'][1]
            verified_token = jwk_client.decode_jwt_token(token)
            assert isinstance(verified_token, JTWPayload)
            assert verified_token.sub == email
            assert verified_token.exp == int(self.timestamps[1].timestamp())
            assert verified_token.is_expired is True

    def test_connection_error(self, mock_jwks_request, jwk_client):
        mock_jwks = mock_jwks_request(self.jwks_ret_val, side_effect=URLError(reason="bad url"))
        token = self.valid_keys[0]['jwt_tokens'][0]
        try:
            verified_token = jwk_client.decode_jwt_token(token)
        except FallbackToRegToken as ex:
            assert True
        else:
            assert False, 'expected FallbackToRegToken'
        mock_jwks = mock_jwks_request(self.jwks_ret_val, side_effect=TimeoutError("timeout"))
        token = self.valid_keys[0]['jwt_tokens'][0]
        try:
            verified_token = jwk_client.decode_jwt_token(token)
        except FallbackToRegToken as ex:
            assert True
        else:
            assert False, 'expected FallbackToRegToken'
        assert jwk_client.current_fallbacks == 2

    def test_client_error(self,  mock_jwks_request, jwk_client):
        mock_jwks = mock_jwks_request(b'')
        mock_jwks.reset_mock()
        token = self.valid_keys[0]['jwt_tokens'][0]
        try:
            verified_token = jwk_client.decode_jwt_token(token)
        except FallbackToRegToken as ex:
            assert True
        else:
            assert False, 'expected FallbackToRegToken'
        mock_jwks = mock_jwks_request(b'[]')
        token = self.valid_keys[0]['jwt_tokens'][0]
        try:
            verified_token = jwk_client.decode_jwt_token(token)
        except FallbackToRegToken as ex:
            assert True
        else:
            assert False, 'expected FallbackToRegToken'
        assert jwk_client.current_fallbacks == 2

    def test_invalid_jwt_string(self, mock_jwks_request, jwk_client):
        token = self.valid_keys[0]['jwt_tokens'][0]
        try:
            verified_token = jwk_client.decode_jwt_token('x' + token)
        except FallbackToRegToken as ex:
            assert "Not a valid JWT token string." in str(ex)
        else:
            assert False, 'expected FallbackToRegToken'
        assert jwk_client.current_fallbacks == 0

    def test_client_failure_and_clearing_on_time_out(self, mock_jwks_request, jwk_client):
        mock_jwks = mock_jwks_request(b'')
        jwk_client.retry_fallback_after = 1
        jwk_client.current_fallbacks = 30
        jwk_client.incr_fallbacks()
        assert jwk_client.is_failure is True
        assert jwk_client.current_fallbacks == 31
        token = self.valid_keys[0]['jwt_tokens'][0]
        try:
            verified_token = jwk_client.decode_jwt_token(token)
        except FallbackToRegToken as ex:
            assert f"Too many failures in last {jwk_client.retry_fallback_after} seconds." in str(ex)
        else:
            assert False, 'expected FallbackToRegToken'
        mock_jwks.assert_not_called()
        assert jwk_client.is_failure is True
        assert jwk_client.current_fallbacks == 31
        mock_jwks.reset_mock()
        sleep(1)
        try:
            verified_token = jwk_client.decode_jwt_token(token)
        except FallbackToRegToken as ex:
            assert f"Cannot decode json body" in str(ex)
        else:
            assert False, 'expected FallbackToRegToken'
        mock_jwks.assert_called_once()
        mock_jwks.reset_mock()
        assert jwk_client.is_failure is True
        assert jwk_client.current_fallbacks == 32
        sleep(1)
        mock_jwks = mock_jwks_request(self.jwks_ret_val)
        verified_token = jwk_client.decode_jwt_token(token)
        assert isinstance(verified_token, JTWPayload)
        assert jwk_client.current_fallbacks == 0
        assert jwk_client.is_failure is False
        mock_jwks.assert_called_once()

    def test_fallbacks_counter(self, mock_jwks_request, jwk_client):
        mock_jwks = mock_jwks_request(b'', side_effect=TimeoutError)
        token = self.valid_keys[0]['jwt_tokens'][0]
        for i in range(40):
            try:
                verified_token = jwk_client.decode_jwt_token(token)
            except Exception as ex:
                pass
        assert jwk_client.current_fallbacks == 30
        assert jwk_client.is_failure is True
        assert len(mock_jwks.mock_calls) == 30

    def test_missing_jwk(self, mock_jwks_request, jwk_client):
        mock_jwks = mock_jwks_request(self.jwks_ret_val)
        jwk_client.get_signing_keys()
        mock_jwks.reset_mock()
        token = self.missing_keys[0]['jwt_tokens'][0]
        try:
            verified_token = jwk_client.decode_jwt_token(token)
        except JWKMissingKeyError as ex:
            assert self.missing_keys[0]['kid'] in str(ex)
        else:
            assert False, 'expected JWKMissingKeyError'
        mock_jwks.assert_not_called()

    def test_bad_token(self, mock_jwks_request, jwk_client):
        token = self.missing_keys[0]['jwt_tokens'][0]
        token_parts = token.split('.')
        token_parts[1] = base64url_encode(f'{uuid4()}'.encode()).decode('utf-8')
        bad_token = '.'.join(token_parts)
        try:
            verified_token = jwk_client.decode_jwt_token(bad_token)
        except jwt.exceptions.InvalidTokenError as ex:
            assert isinstance(ex, jwt.exceptions.DecodeError)
        else:
            assert False, 'expected DecodeError'

    def test_expired_token(self, mock_jwks_request, jwk_client):
        mock_jwks = mock_jwks_request(self.jwks_ret_val)
        token = self.valid_keys[0]['jwt_tokens'][1]
        try:
            verified_token = jwk_client.decode_jwt_token(token, verify_exp=True)
        except jwt.exceptions.InvalidTokenError as ex:
            assert isinstance(ex, jwt.exceptions.ExpiredSignatureError)
        else:
            assert False, 'expected ExpiredSignatureError'

    def test_fake_token(self, mock_jwks_request, faking_jwt_token, jwk_client):
        mock_jwks = mock_jwks_request(self.jwks_ret_val)
        token = self.valid_keys[0]['jwt_tokens'][1]
        fake_token = faking_jwt_token(token)
        try:
            verified_token = jwk_client.decode_jwt_token(fake_token, verify_exp=True)
        except jwt.exceptions.InvalidTokenError as ex:
            assert isinstance(ex, jwt.exceptions.InvalidSignatureError)
        else:
            assert False, 'expected InvalidSignatureError'