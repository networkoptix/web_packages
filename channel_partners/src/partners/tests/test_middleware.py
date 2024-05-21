from uuid import uuid4

from mock import MagicMock
from rest_framework.test import APIRequestFactory

from partners.middleware import cloud_host_middleware


def test_cloud_host_middleware(cloud_test_host, mocker):
    get_response = MagicMock()
    hostname = f"{uuid4()}"
    middleware = cloud_host_middleware(get_response)

    request = APIRequestFactory(SERVER_NAME=cloud_test_host.hostname).get('/')
    response = middleware(request)
    assert request.cloud_host == cloud_test_host

    request = APIRequestFactory().get('/')
    response = middleware(request)
    assert request.cloud_host is None

    # Test the case where the X-Original-Host passed with host number

    request = APIRequestFactory(SERVER_NAME='localhost').get('/')
    headers_mock = MagicMock()
    headers_mock.get = MagicMock(return_value=f"{cloud_test_host.hostname}:8080")
    mocker.patch.object(request, 'headers', headers_mock)
    request.headers = headers_mock

    response = middleware(request)
    headers_mock.get.assert_called_with('X-Original-Host')
    assert request.cloud_host == cloud_test_host