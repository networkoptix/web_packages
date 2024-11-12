import json
from datetime import (
    datetime,
    timedelta,
)
from uuid import uuid4

import httpx
import pytest
from django.conf import settings
from django.core.cache import caches
from jwt import (
    DecodeError,
    InvalidTokenError,
    PyJWKClientConnectionError,
    PyJWTError,
)
from nx_jwt.jwt_auth import (
    FallbackToRegToken,
    get_jwk_client,
)

from partners.auth.cache import TokenCache
from partners.auth.helpers import (
    authenticate_jwt_token,
    authenticate_regular_token,
    get_cloud_user_from_token,
    get_sa_token_payload,
)
from partners.auth.helpers import logger as auth_logger


def test_authenticate_regular_token(httpx_mock):
    email = f'{uuid4()}'
    token = f'{uuid4()}'
    cloud_host = f'{uuid4()}'
    url = f'https://{cloud_host}/cdb/oauth2/token/{token}'
    token_resp = {
        "username": email,
        "expires_in": '3600',
    }

    # Mock the client and authentication response
    httpx_mock.add_response(url=url, json=token_resp)

    # Call the function with mocked client and authentication
    auth = authenticate_regular_token(token, cloud_host)

    request = httpx_mock.get_request(url=url)
    assert auth == email
    assert request.headers['authorization'] == f'Bearer {token}'

    # Reset the mock and add a new response for the second call
    httpx_mock.reset()
    httpx_mock.add_response(url=url, json=token_resp)

    auth = authenticate_regular_token(token, cloud_host)

    request = httpx_mock.get_request(url=url)
    assert auth == email
    assert request is None
    # test errors
    caches['default'].clear()
    httpx_mock.reset()
    httpx_mock.add_response(url=url, json=token_resp, status_code=401)

    auth = authenticate_regular_token(token, cloud_host)

    request = httpx_mock.get_request(url=url)
    assert auth is None
    assert request

    caches['default'].clear()
    httpx_mock.reset()
    httpx_mock.add_response(url=url, json=token_resp, status_code=403)

    auth = authenticate_regular_token(token, cloud_host)

    request = httpx_mock.get_request(url=url)
    assert auth is None
    assert request

    caches['default'].clear()
    httpx_mock.reset()
    httpx_mock.add_response(url=url, json=token_resp, status_code=500)

    auth = authenticate_regular_token(token, cloud_host)

    request = httpx_mock.get_request(url=url)
    assert auth is None
    assert request

    caches['default'].clear()
    httpx_mock.reset()
    httpx_mock.add_exception(url=url, exception=httpx.ConnectError('Connection refused'))
    try:
        auth = authenticate_regular_token(token, cloud_host)
    except httpx.ConnectError:
        assert True
    else:
        assert False, 'Should have raised an exception'


class TestAuthenticateJwtToken:
    @pytest.fixture(autouse=True)
    def setup(self, private_key_factory, jwk_key_factory, jwt_token_factory,
              faking_jwt_token, cloud_test_host):
        self.valid_keys = []
        self.valid_ts = datetime.utcnow() + timedelta(hours=1)
        self.expired_ts = datetime.utcnow() - timedelta(hours=1)
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
        self.hostname = cloud_test_host.hostname
        # looks like settings.py
        settings.JWK_CLIENT = get_jwk_client(cloud_test_host.hostname, init_keys=False)
        caches['default'].clear()

    def test_valid_tokens(self, mock_jwks_request):
        mock_jwks = mock_jwks_request(self.jwks_ret_val)
        for key in self.valid_keys:
            token = key['jwt_tokens'][0]
            email = key['emails'][0]
            verified_email = authenticate_jwt_token(token)
            assert verified_email == email
            assert TokenCache.get_token(token) == email
            token = key['jwt_tokens'][1]
            email = key['emails'][1]
            verified_email = authenticate_jwt_token(token)
            assert verified_email is None
            assert TokenCache.get_token(token) is None

    def test_missing_keys(self, mock_jwks_request):
        mock_jwks = mock_jwks_request(self.jwks_ret_val)
        token = self.missing_keys[0]['jwt_tokens'][0]
        verified_email = authenticate_jwt_token(token)
        assert verified_email is None

    def test_fake_token(self, mock_jwks_request, faking_jwt_token):
        mock_jwks = mock_jwks_request(self.jwks_ret_val)
        token = self.valid_keys[0]['jwt_tokens'][0]
        fake_token = faking_jwt_token(token)
        verified_email = authenticate_jwt_token(fake_token)
        assert verified_email is None

    def test_connection_error(self, mock_jwks_request):
        mock_jwks = mock_jwks_request(self.jwks_ret_val, side_effect=TimeoutError('timeout'))
        token = self.valid_keys[0]['jwt_tokens'][0]
        try:
            authenticate_jwt_token(token)
        except FallbackToRegToken as ex:
            assert True
        else:
            assert False, 'should have raised FallbackToRegToken'


    def test_get_cloud_user_from_token_valid_jwt(self, mock_jwks_request, mocker, random_email):
        spy_authenticate_jwt_token = mocker.spy(settings.JWK_CLIENT, 'decode_jwt_token')
        mock_reg_token = mocker.patch('partners.auth.helpers.authenticate_regular_token', return_value=random_email)
        mock_jwks = mock_jwks_request(self.jwks_ret_val)
        token = self.valid_keys[0]['jwt_tokens'][0]
        email = get_cloud_user_from_token(token, cloud_host=self.hostname)
        assert email == self.valid_keys[0]['emails'][0]
        spy_authenticate_jwt_token.assert_called_once_with(token, verify_exp=True)
        mock_reg_token.assert_not_called()

    def test_get_cloud_user_from_token_expired_jwt(self, mock_jwks_request, mocker, random_email):
        spy_authenticate_jwt_token = mocker.spy(settings.JWK_CLIENT, 'decode_jwt_token')
        mock_reg_token = mocker.patch('partners.auth.helpers.authenticate_regular_token', return_value=random_email)
        mock_jwks = mock_jwks_request(self.jwks_ret_val)
        token = self.valid_keys[0]['jwt_tokens'][1]
        email = get_cloud_user_from_token(token, cloud_host=self.hostname)
        assert email is None
        spy_authenticate_jwt_token.assert_called_once_with(token, verify_exp=True)
        mock_reg_token.assert_not_called()

    def test_get_cloud_user_from_token_missing_key(self, mock_jwks_request, mocker, random_email):
        spy_authenticate_jwt_token = mocker.spy(settings.JWK_CLIENT, 'decode_jwt_token')
        mock_reg_token = mocker.patch('partners.auth.helpers.authenticate_regular_token', return_value=random_email)
        mock_jwks = mock_jwks_request(self.jwks_ret_val)
        token = self.missing_keys[0]['jwt_tokens'][1]
        email = get_cloud_user_from_token(token, cloud_host=self.hostname)
        assert email is None
        spy_authenticate_jwt_token.assert_called_once_with(token, verify_exp=True)
        mock_reg_token.assert_not_called()

    def test_get_cloud_user_from_token_non_jwt(self, mock_jwks_request, mocker, random_email):
        spy_authenticate_jwt_token = mocker.spy(settings.JWK_CLIENT, 'decode_jwt_token')
        mock_reg_token = mocker.patch('partners.auth.helpers.authenticate_regular_token', return_value=random_email)
        mock_jwks = mock_jwks_request(self.jwks_ret_val)
        token = f'{uuid4()}'
        email = get_cloud_user_from_token(token, cloud_host=self.hostname)
        assert email == random_email
        spy_authenticate_jwt_token.assert_not_called()
        mock_reg_token.assert_called_once_with(token, self.hostname)

    def test_get_cloud_user_from_token_fallback_to_reg(self, mock_jwks_request, mocker, random_email):
        spy_authenticate_jwt_token = mocker.spy(settings.JWK_CLIENT, 'decode_jwt_token')
        mock_reg_token = mocker.patch('partners.auth.helpers.authenticate_regular_token', return_value=random_email)
        mock_jwks = mock_jwks_request(self.jwks_ret_val, side_effect=TimeoutError('timeout'))
        token = self.missing_keys[0]['jwt_tokens'][1]
        email = get_cloud_user_from_token(token, cloud_host=self.hostname)
        assert email == random_email
        spy_authenticate_jwt_token.assert_called_once_with(token, verify_exp=True)
        mock_reg_token.assert_called_once_with(token, self.hostname)


class TestGetSaTokenPayload:
    @pytest.fixture(autouse=True)
    def setup(self, mocker):
        self.mock_decode_jwt_without_fallback = mocker.patch('nx_jwt.jwt_auth.JWKClient.decode_jwt_without_fallback')
        self.spy_logger_debug = mocker.spy(auth_logger, 'debug')
        self.spy_logger_error = mocker.spy(auth_logger, 'error')

    @pytest.mark.parametrize('exception', [PyJWTError, PyJWKClientConnectionError])
    def test_get_sa_token_payload(self, exception):
        self.mock_decode_jwt_without_fallback.side_effect = exception
        assert get_sa_token_payload('token') is None
        self.spy_logger_error.assert_called_once()

    @pytest.mark.parametrize('exception', [InvalidTokenError, DecodeError])
    def test_get_sa_token_payload(self, exception):
        self.mock_decode_jwt_without_fallback.side_effect = exception
        assert get_sa_token_payload('token') is None
        self.spy_logger_debug.assert_called_once()

    @pytest.mark.parametrize('exception', [ValueError, TypeError, FallbackToRegToken])
    def test_get_sa_token_payload_fallback(self, exception):
        self.mock_decode_jwt_without_fallback.side_effect = exception
        with pytest.raises(exception):
            get_sa_token_payload('token')
        self.spy_logger_debug.assert_not_called()
        self.spy_logger_error.assert_not_called()

    def test_valid_token(self):
        payload = {'sub': 'sub'}
        self.mock_decode_jwt_without_fallback.return_value = payload
        assert get_sa_token_payload('token') == payload
        self.mock_decode_jwt_without_fallback.assert_called_once_with('token', verify_exp=True)
