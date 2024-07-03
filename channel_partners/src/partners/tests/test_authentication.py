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
from nx_jwt.jwt_auth import (
    FallbackToRegToken,
    get_jwk_client,
)

from partners.authentication import (
    CdbInternalAuthentication,
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

    TokenCache.set_token(token, value, expires_in='1')
    assert TokenCache.get_token(token) == value
    sleep(2)
    assert TokenCache.get_token(token) is None

    cache_get_mock = mocker.patch("nx_django_redis.redis_cache.RedisSyncBackend.get", return_value=None)
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


class TestCdbInternalAuthentication:
    @pytest.fixture(autouse=True)
    def setup(self, system_factory, cloud_user_factory):
        self.user = cloud_user_factory()
        self.system_1 = system_factory()
        self.system_2 = system_factory()

    def test_not_authorized(self, httpx_mock, cdb_introspect_url, cloud_test_host):
        data = {
            "errorClass": "unauthorized",
            "errorDetail": "111",
            "errorText": "badUsername",
            "resultCode": "badUsername"
        }
        httpx_mock.add_response(url=cdb_introspect_url, json=data, status_code=200)
        introspection = CdbInternalAuthentication.introspect_with_system(
            token=f'{uuid4()}',
            cloud_host_name=cloud_test_host.hostname,
            system_id=self.system_1.system_id)
        assert not introspection.email
        assert introspection.introspected_systems_roles == {}

        data = {
            "errorClass": "unauthorized",
            "errorDetail": "111",
            "errorText": "badUsername",
            "resultCode": "badUsername"
        }
        httpx_mock.add_response(url=cdb_introspect_url, json=data, status_code=401)
        introspection = CdbInternalAuthentication.introspect_with_system(
            token=f'{uuid4()}',
            cloud_host_name=cloud_test_host.hostname,
            system_id=self.system_1.system_id)
        assert not introspection.email
        assert introspection.introspected_systems_roles == {}

    def test_no_system(self, mock_cdb_token_introspect, cloud_test_host):
        mock_cdb_token_introspect(user=self.user)
        introspection = CdbInternalAuthentication.introspect_with_system(
            token=f'{uuid4()}',
            cloud_host_name=cloud_test_host.hostname,
            system_id=self.system_1.system_id)
        assert introspection.email == self.user.email
        assert introspection.introspected_systems_roles == {}
        assert not introspection.has_roles_in_system(email=self.user.email,
                                                     system_id=self.system_1.system_id,
                                                     expected_roles=VmsRoles.ALL_ROLES)

    def test_no_role(self, mock_cdb_token_introspect, cloud_test_host):
        mock_cdb_token_introspect(user=self.user, system=self.system_1, system_role=None)
        introspection = CdbInternalAuthentication.introspect_with_system(
            token=f'{uuid4()}',
            cloud_host_name=cloud_test_host.hostname,
            system_id=self.system_1.system_id)
        assert introspection.email == self.user.email
        assert introspection.introspected_systems_roles == {self.system_1.system_id: set()}
        assert not introspection.has_roles_in_system(email=self.user.email,
                                                     system_id=self.system_1.system_id,
                                                     expected_roles=VmsRoles.ALL_ROLES)

    def test_roles_not_authorized(self, mock_cdb_token_introspect, cloud_test_host):
        mock_cdb_token_introspect(user=self.user, system=self.system_1, system_role=VmsRoles.VIEWER)
        introspection = CdbInternalAuthentication.introspect_with_system(
            token=f'{uuid4()}',
            cloud_host_name=cloud_test_host.hostname,
            system_id=self.system_1.system_id)
        assert introspection.email == self.user.email
        assert introspection.introspected_systems_roles == {self.system_1.system_id: {VmsRoles.VIEWER}}
        assert not introspection.has_roles_in_system(email=self.user.email,
                                                     system_id=self.system_1.system_id,
                                                     expected_roles=[VmsRoles.ADMINISTRATOR])
        assert not introspection.has_roles_in_system(email=self.user.email,
                                                     system_id=self.system_2.system_id,
                                                     expected_roles=[VmsRoles.VIEWER])
        assert not introspection.has_roles_in_system(email='self.user.email',
                                                     system_id=self.system_1.system_id,
                                                     expected_roles=[VmsRoles.VIEWER])
        assert not introspection.has_roles_in_system(email='',
                                                     system_id=self.system_1.system_id,
                                                     expected_roles=[VmsRoles.VIEWER])

    def test_roles_authorized(self, mock_cdb_token_introspect, cloud_test_host):
        mock_cdb_token_introspect(user=self.user, system=self.system_1, system_role=VmsRoles.VIEWER)
        introspection = CdbInternalAuthentication.introspect_with_system(
            token=f'{uuid4()}',
            cloud_host_name=cloud_test_host.hostname,
            system_id=self.system_1.system_id)
        assert introspection.email == self.user.email
        assert introspection.introspected_systems_roles == {self.system_1.system_id: {VmsRoles.VIEWER}}
        assert introspection.has_roles_in_system(email=self.user.email,
                                                 system_id=self.system_1.system_id,
                                                 expected_roles=[VmsRoles.VIEWER])

    def test_cache(self, mock_cdb_token_introspect, cloud_test_host):
        token = f'{uuid4()}'
        mock_cdb_token_introspect(user=self.user, system=self.system_1, system_role=VmsRoles.VIEWER)
        introspection = CdbInternalAuthentication.introspect_with_system(
            token=token,
            cloud_host_name=cloud_test_host.hostname,
            system_id=self.system_1.system_id)
        cached = TokenCache.get_system_introspection(token, system_id=self.system_1.system_id)
        assert cached == introspection
