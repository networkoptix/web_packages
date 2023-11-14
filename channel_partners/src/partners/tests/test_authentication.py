from time import sleep
from uuid import uuid4

from mock.mock import MagicMock
from rest_framework.test import APIRequestFactory
from partners.authentication import get_cloud_user_from_token, TokenCache, cloud_host_middleware


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




