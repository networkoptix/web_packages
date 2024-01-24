from uuid import uuid4

from mock import MagicMock
from rest_framework.test import APIRequestFactory

from partners.middleware import cloud_host_middleware


def test_cloud_host_middleware(cloud_test_host):
    get_response = MagicMock()
    hostname = f"{uuid4()}"
    middleware = cloud_host_middleware(get_response)

    request = APIRequestFactory(SERVER_NAME=cloud_test_host.hostname).get('/')
    response = middleware(request)
    assert request.cloud_host == cloud_test_host

    request = APIRequestFactory().get('/')
    response = middleware(request)
    assert request.cloud_host is None
