import json
from datetime import (
    datetime,
    timedelta,
)
from time import sleep
from uuid import uuid4

import httpx
import pytest
from django.conf import settings
from django.core.cache import caches
from rest_framework import exceptions

from partners.authentication import (
    NxCloudOauthIntrospectAuthentication,
    TokenCache,
    authenticate_jwt_token,
    authenticate_regular_token,
    check_system_credentials,
    get_cloud_user_from_token,
)
from partners.models import (
    CloudSystemStates,
    VmsRoles,
)
from tools.jwt.jwt_auth import (
    FallbackToRegToken,
    get_jwk_client,
)


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
    httpx_mock.reset(False)
    httpx_mock.add_response(url=url, json=token_resp)

    auth = authenticate_regular_token(token, cloud_host)

    request = httpx_mock.get_request(url=url)
    assert auth == email
    assert request is None
    # test errors
    caches['default'].clear()
    httpx_mock.reset(False)
    httpx_mock.add_response(url=url, json=token_resp, status_code=401)

    auth = authenticate_regular_token(token, cloud_host)

    request = httpx_mock.get_request(url=url)
    assert auth is None
    assert request

    caches['default'].clear()
    httpx_mock.reset(False)
    httpx_mock.add_response(url=url, json=token_resp, status_code=403)

    auth = authenticate_regular_token(token, cloud_host)

    request = httpx_mock.get_request(url=url)
    assert auth is None
    assert request

    caches['default'].clear()
    httpx_mock.reset(False)
    httpx_mock.add_response(url=url, json=token_resp, status_code=500)

    auth = authenticate_regular_token(token, cloud_host)

    request = httpx_mock.get_request(url=url)
    assert auth is None
    assert request

    caches['default'].clear()
    httpx_mock.reset(False)
    httpx_mock.add_exception(url=url, exception=httpx.ConnectError('Connection refused'))
    try:
        auth = authenticate_regular_token(token, cloud_host)
    except httpx.ConnectError:
        assert True
    else:
        assert False, 'Should have raised an exception'



def test_token_cache(mocker):
    token = f'{uuid4()}'
    value = f'{uuid4()}'
    TokenCache.set_token(token, value, expires_in='3600')
    assert TokenCache.get_token(token) == value

    TokenCache.set_token(token, value, expires_in='2')
    assert TokenCache.get_token(token) == value
    sleep(2)
    assert TokenCache.get_token(token) is None

    cache_get_mock = mocker.patch("django.core.cache.backends.redis.RedisCache.get", return_value=None)
    assert TokenCache.get_token(None) is None
    cache_get_mock.assert_not_called()


def test_check_system_credentials(mocker, httpx_mock, channel_partner_factory,
                                  organization_factory, system_factory):
    cp = channel_partner_factory()
    org = organization_factory(channel_partner=cp)
    sys = system_factory(organization=org)
    system_id = str(sys.system_id)
    cloud_host = settings.DEFAULT_HOST_NAME
    system_auth_key = 'system_auth_key'
    cdb_url = f'https://{cloud_host}/cdb/systems/{system_id}'
    activated_system = {
        'id': system_id,
        'status': 'activated',
        'name': 'name_activated',
    }
    not_activated_system = {
        'id': system_id,
        'status': 'notActivated',
        'name': 'name_not_activated',
    }
    deleted_system = {
        'id': system_id,
        'status': 'deleted'
    }
    auth_error = {
        'resultCode': 'credentialsRemovedPermanently'
    }
    wrong_id = {
        'id': 'wrong_id',
        'status': 'activated'
    }
    httpx_mock.add_response(url=cdb_url, json=activated_system, status_code=200)
    authenticated, status, system_name = check_system_credentials(system_id, system_auth_key, cloud_host)

    assert authenticated is True
    assert status == CloudSystemStates.ACTIVATED
    assert system_name == 'name_activated'

    httpx_mock.reset(False)
    httpx_mock.add_response(url=cdb_url, json=not_activated_system, status_code=200)
    authenticated, status, system_name = check_system_credentials(system_id, system_auth_key, cloud_host)

    assert authenticated is False
    assert status == CloudSystemStates.NOT_ACTIVATED
    assert system_name == 'name_not_activated'

    httpx_mock.reset(False)
    httpx_mock.add_response(url=cdb_url, json=wrong_id, status_code=200)
    authenticated, status, system_name = check_system_credentials(system_id, system_auth_key, cloud_host)

    assert authenticated is False
    assert status is None
    assert system_name == None

    sys.refresh_from_db()
    assert sys.system_state == CloudSystemStates.ACTIVATED

    httpx_mock.reset(False)
    httpx_mock.add_response(url=cdb_url, json=deleted_system, status_code=200)
    authenticated, status, system_name = check_system_credentials(system_id, system_auth_key, cloud_host)
    assert authenticated is False
    assert status == CloudSystemStates.DELETED
    assert system_name == None

    httpx_mock.reset(False)
    httpx_mock.add_response(url=cdb_url, json=auth_error, status_code=403)
    authenticated, status, system_name = check_system_credentials(system_id, system_auth_key, cloud_host)
    assert authenticated is False
    assert status == CloudSystemStates.DELETED
    assert system_name is None

    httpx_mock.reset(False)
    httpx_mock.add_response(url=cdb_url, content=b'some text response', status_code=403)
    authenticated, status, system_name = check_system_credentials(system_id, system_auth_key, cloud_host)
    assert authenticated is False
    assert status is None
    assert system_name is None

    httpx_mock.reset(False)
    httpx_mock.add_response(url=cdb_url, content=b'some text response', status_code=500)
    authenticated, status, system_name = check_system_credentials(system_id, system_auth_key, cloud_host)
    assert authenticated is False
    assert status is None
    assert system_name is None

    httpx_mock.reset(False)
    httpx_mock.add_exception(url=cdb_url, exception=httpx.ConnectError('error'))
    authenticated, status, system_name = check_system_credentials(system_id, system_auth_key, cloud_host)
    assert authenticated is False
    assert status is None
    assert system_name is None



class TestNxCloudOauthIntrospectAuthentication:

    @pytest.fixture(autouse=True)
    def setup(self, httpx_mock, cloud_test_host, channel_partner_factory, organization_factory,
              cloud_user_factory, system_factory, arf):
        self.url = f'https://{cloud_test_host.hostname}/cdb/oauth2/introspect'
        httpx_mock.reset(False)

        cp = channel_partner_factory()
        organization = organization_factory(channel_partner=cp)
        self.cloud_system = system_factory(organization=organization)
        self.cloud_user = cloud_user_factory()
        self.request = arf.get('/')
        self.request.parser_context = {'kwargs': {'system_id': str(self.cloud_system.system_id)}}
        self.token = 'HERE_MIGHT_BE_TOKEN'

    def test_success(self, httpx_mock):
        data = {
            "active": True,
            "username": self.cloud_user.email,
            "token_type": "bearer",
            "system_role_ids": {
                f"{self.cloud_system.system_id}": [str(VmsRoles.ADMINISTRATOR)]
            }
        }
        httpx_mock.add_response(url=self.url, json=data, status_code=200)
        user, token = NxCloudOauthIntrospectAuthentication().authenticate(request=self.request)
        assert user == self.cloud_user
        assert token == self.token
        assert self.request.introspected_system_id == self.cloud_system.system_id
        assert self.request.introspected_system_roles_ids == [VmsRoles.ADMINISTRATOR]
        assert TokenCache.get_token(self.token) == self.cloud_user.email
        assert (TokenCache.get_token_system(self.token, self.cloud_system.system_id) ==
                (self.cloud_user.email, [VmsRoles.ADMINISTRATOR]))

    def test_success_using_cached_data(self, httpx_mock):
        data = {
            "active": True,
            "username": self.cloud_user.email,
            "token_type": "bearer",
            "system_role_ids": {
                f"{self.cloud_system.system_id}": [str(VmsRoles.ADMINISTRATOR)]
            }
        }
        httpx_mock.add_response(url=self.url, json=data, status_code=200)
        user, token = NxCloudOauthIntrospectAuthentication().authenticate(request=self.request)
        user, token = NxCloudOauthIntrospectAuthentication().authenticate(request=self.request)
        assert user == self.cloud_user
        assert token == self.token
        assert self.request.introspected_system_id == self.cloud_system.system_id
        assert self.request.introspected_system_roles_ids == [VmsRoles.ADMINISTRATOR]
        assert TokenCache.get_token(self.token) == self.cloud_user.email
        assert (TokenCache.get_token_system(self.token, self.cloud_system.system_id) ==
                (self.cloud_user.email, [VmsRoles.ADMINISTRATOR]))

    def test_viewer_role(self, httpx_mock):
        data = {
            "username": self.cloud_user.email,
            "active": True,
            "token_type": "bearer",
            "system_role_ids": {
                f"{self.cloud_system.system_id}": [f"{VmsRoles.VIEWER}"]
            }
        }
        httpx_mock.add_response(url=self.url, json=data, status_code=200)
        user, token = NxCloudOauthIntrospectAuthentication().authenticate(request=self.request)
        assert user == self.cloud_user
        assert token == self.token
        assert self.request.introspected_system_id == self.cloud_system.system_id
        assert self.request.introspected_system_roles_ids == [VmsRoles.VIEWER]
        assert TokenCache.get_token(self.token) == self.cloud_user.email
        assert (TokenCache.get_token_system(self.token, self.cloud_system.system_id) ==
                (self.cloud_user.email, [VmsRoles.VIEWER]))

    def test_no_role(self, httpx_mock):
        data = {
            "username": self.cloud_user.email,
            "active": True,
            "token_type": "bearer",
            "system_role_ids": {
                f"{self.cloud_system.system_id}": []
            }
        }
        httpx_mock.add_response(url=self.url, json=data, status_code=200)
        user, token = NxCloudOauthIntrospectAuthentication().authenticate(request=self.request)
        assert user == self.cloud_user
        assert token == self.token
        assert self.request.introspected_system_id == self.cloud_system.system_id
        assert self.request.introspected_system_roles_ids == []
        assert TokenCache.get_token(self.token) == self.cloud_user.email
        assert TokenCache.get_token_system(self.token, self.cloud_system.system_id) == (self.cloud_user.email, [])

    def test_inactive(self, httpx_mock):
        data = {
            "username": self.cloud_user.email,
            "active": False,
            "token_type": "bearer",
        }
        httpx_mock.add_response(url=self.url, json=data, status_code=200)
        try:
            user, token = NxCloudOauthIntrospectAuthentication().authenticate(request=self.request)
        except exceptions.AuthenticationFailed:
            pass
        else:
            assert False, "AuthenticationFailed must be raised"

    def test_401(self, httpx_mock):
        httpx_mock.add_response(url=self.url, status_code=401)
        try:
            user, token = NxCloudOauthIntrospectAuthentication().authenticate(request=self.request)
        except exceptions.AuthenticationFailed:
            pass
        else:
            assert False, "AuthenticationFailed must be raised"


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
        mock_reg_token = mocker.patch('partners.authentication.authenticate_regular_token', return_value=random_email)
        mock_jwks = mock_jwks_request(self.jwks_ret_val)
        token = self.valid_keys[0]['jwt_tokens'][0]
        email = get_cloud_user_from_token(token, cloud_host=self.hostname)
        assert email == self.valid_keys[0]['emails'][0]
        spy_authenticate_jwt_token.assert_called_once_with(token, verify_exp=True)
        mock_reg_token.assert_not_called()

    def test_get_cloud_user_from_token_expired_jwt(self, mock_jwks_request, mocker, random_email):
        spy_authenticate_jwt_token = mocker.spy(settings.JWK_CLIENT, 'decode_jwt_token')
        mock_reg_token = mocker.patch('partners.authentication.authenticate_regular_token', return_value=random_email)
        mock_jwks = mock_jwks_request(self.jwks_ret_val)
        token = self.valid_keys[0]['jwt_tokens'][1]
        email = get_cloud_user_from_token(token, cloud_host=self.hostname)
        assert email is None
        spy_authenticate_jwt_token.assert_called_once_with(token, verify_exp=True)
        mock_reg_token.assert_not_called()

    def test_get_cloud_user_from_token_missing_key(self, mock_jwks_request, mocker, random_email):
        spy_authenticate_jwt_token = mocker.spy(settings.JWK_CLIENT, 'decode_jwt_token')
        mock_reg_token = mocker.patch('partners.authentication.authenticate_regular_token', return_value=random_email)
        mock_jwks = mock_jwks_request(self.jwks_ret_val)
        token = self.missing_keys[0]['jwt_tokens'][1]
        email = get_cloud_user_from_token(token, cloud_host=self.hostname)
        assert email is None
        spy_authenticate_jwt_token.assert_called_once_with(token, verify_exp=True)
        mock_reg_token.assert_not_called()

    def test_get_cloud_user_from_token_non_jwt(self, mock_jwks_request, mocker, random_email):
        spy_authenticate_jwt_token = mocker.spy(settings.JWK_CLIENT, 'decode_jwt_token')
        mock_reg_token = mocker.patch('partners.authentication.authenticate_regular_token', return_value=random_email)
        mock_jwks = mock_jwks_request(self.jwks_ret_val)
        token = f'{uuid4()}'
        email = get_cloud_user_from_token(token, cloud_host=self.hostname)
        assert email == random_email
        spy_authenticate_jwt_token.assert_not_called()
        mock_reg_token.assert_called_once_with(token, self.hostname)

    def test_get_cloud_user_from_token_fallback_to_reg(self, mock_jwks_request, mocker, random_email):
        spy_authenticate_jwt_token = mocker.spy(settings.JWK_CLIENT, 'decode_jwt_token')
        mock_reg_token = mocker.patch('partners.authentication.authenticate_regular_token', return_value=random_email)
        mock_jwks = mock_jwks_request(self.jwks_ret_val, side_effect=TimeoutError('timeout'))
        token = self.missing_keys[0]['jwt_tokens'][1]
        email = get_cloud_user_from_token(token, cloud_host=self.hostname)
        assert email == random_email
        spy_authenticate_jwt_token.assert_called_once_with(token, verify_exp=True)
        mock_reg_token.assert_called_once_with(token, self.hostname)
