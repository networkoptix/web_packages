import json
from datetime import (
    datetime,
    timedelta,
    timezone,
)
from time import sleep
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
    SAJWTPayload,
    get_jwk_client,
)
from rest_framework.exceptions import AuthenticationFailed

from accounts.models import Account
from conftest import RequestFactory
from partners.authentication import (
    CdbInternalAuthentication,
    NxS2SAuthentication,
    TokenCache,
    authenticate_jwt_token,
    authenticate_regular_token,
    check_system_credentials,
    get_cloud_user_from_token,
    get_sa_token_payload,
)
from partners.authentication import logger as auth_logger
from partners.models import (
    CloudSystemStates,
    NxInternalService,
    VmsRoles,
)
from tools.exception import ErrorCodes


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

    httpx_mock.reset()
    httpx_mock.add_response(url=cdb_url, json=not_activated_system, status_code=200)
    authenticated, status, system_name = check_system_credentials(system_id, system_auth_key, cloud_host)

    assert authenticated is False
    assert status == CloudSystemStates.NOT_ACTIVATED
    assert system_name == 'name_not_activated'

    httpx_mock.reset()
    httpx_mock.add_response(url=cdb_url, json=wrong_id, status_code=200)
    authenticated, status, system_name = check_system_credentials(system_id, system_auth_key, cloud_host)

    assert authenticated is False
    assert status is None
    assert system_name == None

    sys.refresh_from_db()
    assert sys.system_state == CloudSystemStates.ACTIVATED

    httpx_mock.reset()
    httpx_mock.add_response(url=cdb_url, json=deleted_system, status_code=200)
    authenticated, status, system_name = check_system_credentials(system_id, system_auth_key, cloud_host)
    assert authenticated is False
    assert status == CloudSystemStates.DELETED
    assert system_name == None

    httpx_mock.reset()
    httpx_mock.add_response(url=cdb_url, json=auth_error, status_code=403)
    authenticated, status, system_name = check_system_credentials(system_id, system_auth_key, cloud_host)
    assert authenticated is False
    assert status == CloudSystemStates.DELETED
    assert system_name is None

    httpx_mock.reset()
    httpx_mock.add_response(url=cdb_url, content=b'some text response', status_code=403)
    authenticated, status, system_name = check_system_credentials(system_id, system_auth_key, cloud_host)
    assert authenticated is False
    assert status is None
    assert system_name is None

    httpx_mock.reset()
    httpx_mock.add_response(url=cdb_url, content=b'some text response', status_code=500)
    authenticated, status, system_name = check_system_credentials(system_id, system_auth_key, cloud_host)
    assert authenticated is False
    assert status is None
    assert system_name is None

    httpx_mock.reset()
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
        token = f'{uuid4()}'
        httpx_mock.add_response(url=cdb_introspect_url, json=data, status_code=200)
        introspection = CdbInternalAuthentication.introspect_with_system(
            token=token,
            cloud_host_name=cloud_test_host.hostname,
            system_id=self.system_1.system_id)
        assert not introspection.email
        assert introspection.introspected_systems_roles == {}

        request = httpx_mock.get_request(url=cdb_introspect_url)
        request_data = json.loads(request.read())
        assert request_data['token'] == token
        assert request_data['system_ids'] == [str(self.system_1.system_id)]
        assert request_data['skip_non_shared'] is True

        data = {
            "errorClass": "unauthorized",
            "errorDetail": "111",
            "errorText": "badUsername",
            "resultCode": "badUsername"
        }
        httpx_mock.add_response(url=cdb_introspect_url, json=data, status_code=401)
        introspection = CdbInternalAuthentication.introspect_with_system(
            token=token,
            cloud_host_name=cloud_test_host.hostname,
            system_id=self.system_1.system_id)
        assert not introspection.email
        assert introspection.introspected_systems_roles == {}

    def test_no_system(self, mock_cdb_token_introspect, cloud_test_host, httpx_mock, cdb_introspect_url):
        mock_cdb_token_introspect(user=self.user)
        token = f'{uuid4()}'
        introspection = CdbInternalAuthentication.introspect_with_system(
            token=token,
            cloud_host_name=cloud_test_host.hostname,
            system_id=self.system_1.system_id)
        assert introspection.email == self.user.email
        assert introspection.introspected_systems_roles == {}
        assert not introspection.has_roles_in_system(email=self.user.email,
                                                     system_id=self.system_1.system_id,
                                                     expected_roles=VmsRoles.ALL_ROLES)
        request = httpx_mock.get_request(url=cdb_introspect_url)
        request_data = json.loads(request.read())
        assert request_data['token'] == token
        assert request_data['system_ids'] == [str(self.system_1.system_id)]
        assert request_data['skip_non_shared'] is True

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
        assert introspection.has_roles_in_system(email=self.user.email,
                                                 system_id=self.system_1.system_id,
                                                 expected_roles=VmsRoles.ANY_ROLE)


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


class TestNxS2SAuthentication:

    @pytest.fixture(autouse=True)
    def setup(self, cloud_test_host, mocker, arf):
        self.now = int(datetime.now(timezone.utc).timestamp())
        self.valid_payload = {
            'auth_time': self.now - 1000,
            'client_id': 'channel_partners_service',
            'exp': self.now + 2600,
            'iat': self.now - 1000,
            'jti': 'ac03b35e-1cd7-411e-8b12-388cc09ba104',
            'scope': '[{"service":"cloud_db","rules":[{"method":"PUT","path":"/cdb/internal/v0/account/[^/]+/organization-attrs/?"},{"method":"POST","path":"/cdb/internal/accounts/info/?"}]}, {"service": "channel_partners"}]',
            'sub': 'channel_partners_service',
            'token_use': 'access',
            'version': 2
        }
        self.token = f'Service {uuid4()}'
        self.wrong_keyword = f'Bearer {uuid4()}'
        self.hostname = cloud_test_host.hostname
        self.mock_decode_jwt_token = mocker.patch('partners.authentication.get_sa_token_payload')

    def request_factory(self, token):
        arf = RequestFactory(cloud_host=self.hostname, headers={'Authorization': token})
        return arf.get('/')

    def test_valid_token(self):
        token_payload = SAJWTPayload(**self.valid_payload)
        self.mock_decode_jwt_token.return_value = token_payload
        request = self.request_factory(self.token)
        authenticator = NxS2SAuthentication()
        user, token = authenticator.authenticate(request)
        assert isinstance(user, Account)
        assert token == self.token.replace('Service ', '')
        assert isinstance(request.internal_service, NxInternalService)
        assert request.internal_service.token_payload == token_payload
        assert request.internal_service.id == token_payload.token_hash()

    def test_wrong_keyword(self):
        request = self.request_factory(self.wrong_keyword)
        authenticator = NxS2SAuthentication()
        assert authenticator.authenticate(request) is None

    def test_no_payload(self):
        self.mock_decode_jwt_token.return_value = None
        request = self.request_factory(self.token)
        authenticator = NxS2SAuthentication()
        with pytest.raises(AuthenticationFailed) as ex:
            authenticator.authenticate(request)
        assert ex.value.detail == 'Invalid or expired token.'
        assert ex.value.detail.code == ErrorCodes.invalid_token

    def test_invalid_scope(self):
        payload = self.valid_payload.copy()
        payload['scope'] = '[{"service":"cloud_db","rules":[{"method":"PUT","path":"/cdb/internal/v0/account/[^/]+/organization-attrs/?"},{"method":"POST","path":"/cdb/internal/accounts/info/?"}]}]'
        token_payload = SAJWTPayload(**payload)
        self.mock_decode_jwt_token.return_value = token_payload
        request = self.request_factory(self.token)
        authenticator = NxS2SAuthentication()
        with pytest.raises(AuthenticationFailed) as ex:
            authenticator.authenticate(request)
        assert ex.value.detail == 'Invalid or expired token.'
        assert ex.value.detail.code == ErrorCodes.invalid_token_scope


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
