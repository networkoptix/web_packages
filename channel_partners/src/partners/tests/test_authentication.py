from time import sleep
from uuid import uuid4

from django.conf import settings
from mock.mock import MagicMock
from rest_framework.test import APIRequestFactory
from partners.authentication import get_cloud_user_from_token, TokenCache, cloud_host_middleware, \
    check_system_credentials
from partners.models import CloudSystemStates


def test_get_cloud_user_from_token(httpx_mock):
    email = f'{uuid4()}'
    token = f'{uuid4()}'
    cloud_host = f'{uuid4()}'
    url = f'https://{cloud_host}/cdb/oauth2/token/{token}'
    token_resp = {
        "username": email,
        "expires_in": '3600',
    }
    httpx_mock.add_response(url=url, json=token_resp)
    auth = get_cloud_user_from_token(token, cloud_host)
    request = httpx_mock.get_request(url=url)
    assert auth == email
    assert request.headers['authorization'] == f'Bearer {token}'

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


def test_cloud_host_middleware(cloud_test_host):
    get_response = MagicMock()
    hostname = f"{uuid4()}"
    request = APIRequestFactory(SERVER_NAME=hostname).get('/')
    middleware = cloud_host_middleware(get_response)
    response = middleware(request)
    assert request.cloud_host is None

    request = APIRequestFactory(SERVER_NAME=cloud_test_host.hostname).get('/')
    response = middleware(request)
    assert request.cloud_host == cloud_test_host

    request = APIRequestFactory(headers={"cloud-host": cloud_test_host.hostname}).get('/')
    response = middleware(request)
    assert request.cloud_host == cloud_test_host


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

