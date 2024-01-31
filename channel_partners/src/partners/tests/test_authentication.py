from time import sleep
from uuid import uuid4

import pytest
from django.conf import settings
from rest_framework import exceptions

from partners.authentication import (
    NxCloudOauthIntrospectAuthentication,
    TokenCache,
    check_system_credentials,
    get_cloud_user_from_token,
)
from partners.models import (
    CloudSystemStates,
    VmsRoles,
)


def test_get_cloud_user_from_token(httpx_mock):
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
    auth = get_cloud_user_from_token(token, cloud_host)

    request = httpx_mock.get_request(url=url)
    assert auth == email
    assert request.headers['authorization'] == f'Bearer {token}'

    # Reset the mock and add a new response for the second call
    httpx_mock.reset(False)
    httpx_mock.add_response(url=url, json=token_resp)

    auth = get_cloud_user_from_token(token, cloud_host)

    request = httpx_mock.get_request(url=url)
    assert auth == email
    assert request is None


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
    cloud_host = settings.INSTANCE_CONFIG.default_host
    system_auth_key = 'system_auth_key'
    cdb_url = f'https://{cloud_host}/cdb/systems/{system_id}'
    activated_system = {
        'id': system_id,
        'status': 'activated'
    }
    not_activated_system = {
        'id': system_id,
        'status': 'notActivated'
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
    authenticated, status = check_system_credentials(system_id, system_auth_key, cloud_host)

    assert authenticated is True
    assert status == CloudSystemStates.ACTIVATED

    httpx_mock.reset(False)
    httpx_mock.add_response(url=cdb_url, json=not_activated_system, status_code=200)
    authenticated, status = check_system_credentials(system_id, system_auth_key, cloud_host)

    assert authenticated is False
    assert status == CloudSystemStates.NOT_ACTIVATED

    httpx_mock.reset(False)
    httpx_mock.add_response(url=cdb_url, json=wrong_id, status_code=200)
    authenticated, status = check_system_credentials(system_id, system_auth_key, cloud_host)

    assert authenticated is False
    assert status is None

    sys.refresh_from_db()
    assert sys.system_state == CloudSystemStates.ACTIVATED

    httpx_mock.reset(False)
    httpx_mock.add_response(url=cdb_url, json=deleted_system, status_code=200)
    authenticated, status = check_system_credentials(system_id, system_auth_key, cloud_host)

    assert authenticated is False
    assert status == CloudSystemStates.DELETED

    httpx_mock.reset(False)
    httpx_mock.add_response(url=cdb_url, json=auth_error, status_code=403)
    authenticated, status = check_system_credentials(system_id, system_auth_key, cloud_host)
    assert authenticated is False
    assert status == CloudSystemStates.DELETED


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
        assert str(self.request.introspected_system_id) == str(self.cloud_system.system_id)
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