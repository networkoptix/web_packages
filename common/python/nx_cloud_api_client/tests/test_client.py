import httpx
from nx_cloud_api_client.client import NxCloudAPIClient


class TestNxCloudAPIClient:

    def test_init(self):
        try:
            NxCloudAPIClient(host='/')
        except TypeError as ex:
            assert isinstance(ex, TypeError)
            return

        raise AssertionError("Exception must be raised.")

    def test_default_client_class(self):
        class SyncClient(NxCloudAPIClient):
            _default_client_class = httpx.Client

        class AsyncClient(NxCloudAPIClient):
            _default_client_class = httpx.AsyncClient

        client = AsyncClient('/')
        assert isinstance(client.client, httpx.AsyncClient)

        client = SyncClient('/')
        assert isinstance(client.client, httpx.Client)
