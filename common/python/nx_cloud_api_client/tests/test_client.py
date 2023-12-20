import unittest

import httpx
from httpx import Client

from nx_cloud_api_client.client import NxCloudAPIClient, NxCloudAPISyncClient, NxCloudAPIAsyncClient


class TestNxCloudAPIClient(unittest.TestCase):
    def test_init(self):
        with self.assertRaises(TypeError):
            NxCloudAPIClient(host='/')

    def test_default_client_class(self):
        class SyncClient(NxCloudAPIClient):
            _default_client_class = httpx.Client

        class AsyncClient(NxCloudAPIClient):
            _default_client_class = httpx.AsyncClient

        client = AsyncClient('/')
        self.assertIsInstance(client.client, httpx.AsyncClient)

        client = SyncClient('/')
        self.assertIsInstance(client.client, httpx.Client)

    def test_user_agent_header_match(self):
        class TestClient(NxCloudAPIClient):
            _default_client_class = httpx.Client

        headers = {'User-Agent': 'Test User Agent'}
        client = TestClient('/', headers=headers)

        expected = headers.get('User-Agent')
        actual = client.client.headers.get('User-Agent')
        self.assertEqual(expected, actual)

    def test_user_agent_header_deleted(self):
        class TestClient(NxCloudAPIClient):
            _default_client_class = httpx.Client

        headers = {'User-Agent': None}
        client = TestClient('/', headers=headers)

        assert 'User-Agent' not in client.client.headers

    def test_user_agent_default_in_headers(self):
        class TestClient(NxCloudAPIClient):
            _default_client_class = httpx.Client

        client = TestClient('/')

        expected = 'python-httpx'
        actual = client.client.headers.get('User-Agent')
        assert expected in actual

    def test_NxCloudAPISyncClient_user_agent_header_match(self):
        headers = {'User-Agent': 'Test User Agent'}
        client = NxCloudAPISyncClient('/', headers=headers)

        expected = headers.get('User-Agent')
        actual = client.client.headers.get('User-Agent')
        self.assertEqual(expected, actual)

    def test_NxCloudAPISyncClient_user_agent_header_deleted(self):
        headers = {'User-Agent': None}
        client = NxCloudAPISyncClient('/', headers=headers)

        assert 'User-Agent' not in client.client.headers

    def test_NxCloudAPISyncClient_user_agent_default_in_headers(self):
        client = NxCloudAPISyncClient('/')

        expected = 'python-httpx'
        actual = client.client.headers.get('User-Agent')
        assert expected in actual

    def test_NxCloudAPIAsyncClient_user_agent_header_match(self):
        headers = {'User-Agent': 'Test User Agent'}
        client = NxCloudAPIAsyncClient('/', headers=headers)

        expected = headers.get('User-Agent')
        actual = client.client.headers.get('User-Agent')
        self.assertEqual(expected, actual)

    def test_NxCloudAPIAsyncClient_user_agent_header_deleted(self):
        headers = {'User-Agent': None}
        client = NxCloudAPIAsyncClient('/', headers=headers)

        assert 'User-Agent' not in client.client.headers

    def test_NxCloudAPIAsyncClient_user_agent_default_in_headers(self):
        client = NxCloudAPIAsyncClient('/')

        expected = 'python-httpx'
        actual = client.client.headers.get('User-Agent')
        assert expected in actual

    def test_cleared_headers(self):
        http_client: Client = httpx.Client()

        client1 = NxCloudAPIClient(client=http_client, host='/', headers={'User-Agent': None})
        client2 = NxCloudAPIClient(client=http_client, host='/', headers={'User-Agent': None})

        assert 'User-Agent' not in client1.client.headers
        assert 'User-Agent' not in client2.client.headers
