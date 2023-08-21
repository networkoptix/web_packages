import json
from datetime import datetime
from uuid import uuid4

import httpx
import pytest

from nx_cloud_api_client.apis import CdbAccountAPIBase
from nx_cloud_api_client.base_auth import CdbOauth2APIBase, Grant, ResponseType, BearerTokenAuth, CdbAuthAPIClient, \
    RequestedTokenAuth, RequestedTokenQueryAuth
from nx_cloud_api_client.tests.conftest import CDB_TEST_HOST


class TestCdbOauth2APIBase:

    @pytest.fixture(autouse=True)
    def setup(self):
        self.username = f'user-{uuid4()}@exmpale.com'
        self.password = f'password-{uuid4()}'
        self.token_lifetime = 1500
        self.scope = "cloudSystemId=*"
        self.client_id = f'client-{uuid4()}'
        self.sync_client = CdbOauth2APIBase(host=CDB_TEST_HOST, client=httpx.Client())
        self.async_client = CdbOauth2APIBase(host=CDB_TEST_HOST, client=httpx.AsyncClient())

    @pytest.mark.asyncio
    async def test_token_post_get_token(self, mock_request):
        request_mock = mock_request(self.async_client.client, method='POST')
        resp = await self.async_client.token_post(
            grant_type=Grant.password,
            response_type=ResponseType.token,
            scope=self.scope,
            client_id=self.client_id,
            username=self.username,
            password=self.password,
            refresh_token_lifetime=self.token_lifetime,
        )
        assert resp.status_code == 200
        args = request_mock.call_args
        assert args.args == ('POST', f'{CDB_TEST_HOST}/cdb/oauth2/token')
        assert args.kwargs['auth'] is None
        assert args.kwargs['json'] == {
            'grant_type': 'password',
            'response_type': 'token',
            'client_id': self.client_id,
            'scope': self.scope,
            'refresh_token_lifetime': self.token_lifetime,
            'username': self.username,
            'password': self.password
        }

        request_mock = mock_request(self.sync_client.client, method='POST')
        resp = self.sync_client.token_post(
            grant_type=Grant.password,
            response_type=ResponseType.token,
            client_id=self.client_id,
            username=self.username,
            password=self.password,
            refresh_token_lifetime=self.token_lifetime,
        )
        assert resp.status_code == 200
        args = request_mock.call_args
        assert args.args == ('POST', f'{CDB_TEST_HOST}/cdb/oauth2/token')
        assert args.kwargs['auth'] is None
        assert args.kwargs['json'] == {
            'grant_type': 'password',
            'response_type': 'token',
            'client_id': self.client_id,
            'refresh_token_lifetime': self.token_lifetime,
            'username': self.username,
            'password': self.password
        }

    @pytest.mark.asyncio
    async def test_token_post_get_code(self, mock_request):
        request_mock = mock_request(self.async_client.client, method='POST')
        resp = await self.async_client.token_post(
            grant_type=Grant.password,
            response_type=ResponseType.code,
            scope=self.scope,
            client_id=self.client_id,
            username=self.username,
            password=self.password,
            refresh_token_lifetime=self.token_lifetime,
        )
        assert resp.status_code == 200
        args = request_mock.call_args
        assert args.args == ('POST', f'{CDB_TEST_HOST}/cdb/oauth2/token')
        assert args.kwargs['auth'] is None
        assert args.kwargs['json'] == {
            'grant_type': 'password',
            'response_type': 'code',
            'client_id': self.client_id,
            'scope': self.scope,
            'refresh_token_lifetime': self.token_lifetime,
            'username': self.username,
            'password': self.password
        }

        request_mock = mock_request(self.sync_client.client, method='POST')
        resp = self.sync_client.token_post(
            grant_type=Grant.password,
            response_type=ResponseType.code,
            client_id=self.client_id,
            username=self.username,
            password=self.password,
            refresh_token_lifetime=self.token_lifetime,
        )
        assert resp.status_code == 200
        args = request_mock.call_args
        assert args.args == ('POST', f'{CDB_TEST_HOST}/cdb/oauth2/token')
        assert args.kwargs['auth'] is None
        assert args.kwargs['json'] == {
            'grant_type': 'password',
            'response_type': 'code',
            'client_id': self.client_id,
            'refresh_token_lifetime': self.token_lifetime,
            'username': self.username,
            'password': self.password
        }


    @pytest.mark.asyncio
    async def test_token_get(self, mock_request):
        request_mock = mock_request(self.async_client.client)
        token = f'{uuid4()}'
        resp = await self.async_client.token_get(token, username=self.username, password=self.password)
        assert resp.status_code == 200
        assert request_mock.call_args.args == ('GET', f'{CDB_TEST_HOST}/cdb/oauth2/token/{token}')
        assert request_mock.call_args.kwargs['auth']._auth_header == \
               httpx.BasicAuth(self.username, self.password)._auth_header

        request_mock = mock_request(self.sync_client.client)
        token = f'{uuid4()}'
        resp = self.sync_client.token_get(token, username=self.username, password=self.password)
        assert resp.status_code == 200
        assert request_mock.call_args.args == ('GET', f'{CDB_TEST_HOST}/cdb/oauth2/token/{token}')
        assert request_mock.call_args.kwargs['auth']._auth_header == \
               httpx.BasicAuth(self.username, self.password)._auth_header


    @pytest.mark.asyncio
    async def test_token_delete(self, mock_request):
        request_mock = mock_request(self.async_client.client)
        token = f'{uuid4()}'
        resp = await self.async_client.token_delete(token, username=self.username, password=self.password)
        assert resp.status_code == 200
        assert request_mock.call_args.args == ('DELETE', f'{CDB_TEST_HOST}/cdb/oauth2/token/{token}')
        assert request_mock.call_args.kwargs['auth']._auth_header == \
               httpx.BasicAuth(self.username, self.password)._auth_header

        request_mock = mock_request(self.sync_client.client)
        token = f'{uuid4()}'
        resp = self.sync_client.token_delete(token, username=self.username, password=self.password)
        assert resp.status_code == 200
        assert request_mock.call_args.args == ('DELETE', f'{CDB_TEST_HOST}/cdb/oauth2/token/{token}')
        assert request_mock.call_args.kwargs['auth']._auth_header == \
               httpx.BasicAuth(self.username, self.password)._auth_header

        request_mock = mock_request(self.sync_client.client)
        token = f'{uuid4()}'
        resp = self.sync_client.token_delete(token, auth=BearerTokenAuth(token))
        assert resp.status_code == 200
        assert request_mock.call_args.args == ('DELETE', f'{CDB_TEST_HOST}/cdb/oauth2/token/{token}')
        assert request_mock.call_args.kwargs['auth'].token == token


    @pytest.mark.asyncio
    async def test_token_delete_users(self, mock_request):
        request_mock = mock_request(self.async_client.client)
        token = f'{uuid4()}'
        resp = await self.async_client.user_tokens_delete(username=self.username, password=self.password)
        assert resp.status_code == 200
        assert request_mock.call_args.args == ('DELETE', f'{CDB_TEST_HOST}/cdb/oauth2/user/self')
        assert request_mock.call_args.kwargs['auth']._auth_header == \
               httpx.BasicAuth(self.username, self.password)._auth_header

        request_mock = mock_request(self.sync_client.client)
        token = f'{uuid4()}'
        resp = self.sync_client.user_tokens_delete(username=self.username, password=self.password)
        assert resp.status_code == 200
        assert request_mock.call_args.args == ('DELETE', f'{CDB_TEST_HOST}/cdb/oauth2/user/self')
        assert request_mock.call_args.kwargs['auth']._auth_header == \
               httpx.BasicAuth(self.username, self.password)._auth_header


        request_mock = mock_request(self.sync_client.client)
        token = f'{uuid4()}'
        resp = self.sync_client.user_tokens_delete(auth=BearerTokenAuth(token))
        assert resp.status_code == 200
        assert request_mock.call_args.args == ('DELETE', f'{CDB_TEST_HOST}/cdb/oauth2/user/self')
        assert request_mock.call_args.kwargs['auth'].token == token


    @pytest.mark.asyncio
    async def test_token_delete_clients(self, mock_request):
        request_mock = mock_request(self.async_client.client)
        token = f'{uuid4()}'
        url = f'{CDB_TEST_HOST}/cdb/oauth2/user/self/client/{self.client_id}'
        resp = await self.async_client.client_tokens_delete(client_id=self.client_id,
                                                            username=self.username, password=self.password)
        assert resp.status_code == 200
        assert request_mock.call_args.args == ('DELETE', url)
        assert request_mock.call_args.kwargs['auth']._auth_header == \
               httpx.BasicAuth(self.username, self.password)._auth_header

        request_mock = mock_request(self.sync_client.client)
        resp = self.sync_client.client_tokens_delete(client_id=self.client_id,
                                                     username=self.username, password=self.password)
        assert resp.status_code == 200
        assert request_mock.call_args.args == ('DELETE', url)
        assert request_mock.call_args.kwargs['auth']._auth_header == \
               httpx.BasicAuth(self.username, self.password)._auth_header


        request_mock = mock_request(self.sync_client.client)
        resp = self.sync_client.client_tokens_delete(client_id=self.client_id, auth=BearerTokenAuth(token))
        assert resp.status_code == 200
        assert request_mock.call_args.args == ('DELETE', url)
        assert request_mock.call_args.kwargs['auth'].token == token


class TestCdbAuthAPIClientAsync:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.access_token = f"token-{uuid4()}"
        self.refresh_token = f"refresh-{uuid4()}"
        self.code = f"code-{uuid4()}"
        self.valid_token = {
            "access_token": self.access_token,
            "refresh_token": self.refresh_token,
            "expires_in": "3600",
            "expires_at": f"{int(datetime.now().timestamp() + 3000)*1000}",
            "token_type": "bearer",
            "scope": "cloud-test.hdw.mx cloudSystemId=*"
        }
        self.expired_token = {
            "access_token": self.access_token,
            "refresh_token": self.refresh_token,
            "expires_in": "3600",
            "expires_at": f"{int(datetime.now().timestamp() - 5000)*1000}",
            "token_type": "bearer",
            "scope": "cloud-test.hdw.mx cloudSystemId=*"
        }

        self.username = f'user-{uuid4()}@exmpale.com'
        self.password = f'password-{uuid4()}'
        self.token_lifetime = 3000
        self.client_id = f'client-{uuid4()}'
        self.sync_client = CdbAuthAPIClient(
            host=CDB_TEST_HOST, client=httpx.Client(),
            client_id=self.client_id, refresh_token_lifetime=self.token_lifetime
        )
        self.async_client = CdbAuthAPIClient(
            host=CDB_TEST_HOST, client=httpx.AsyncClient(),
            client_id=self.client_id, refresh_token_lifetime=self.token_lifetime
        )


    @pytest.mark.asyncio
    async def test_get_access_token_by_password(self, mock_request):
        self.async_client.password = self.password
        self.async_client.username = self.username
        request_mock = mock_request(self.async_client.client, method='POST', data=self.valid_token)

        resp = await self.async_client.get_access_token_by_password()
        assert resp.is_success

        args = request_mock.call_args
        assert args.args == ('POST', f'{CDB_TEST_HOST}/cdb/oauth2/token')
        assert args.kwargs['auth'] is None
        assert args.kwargs['json'] == {
            'grant_type': 'password',
            'response_type': 'token',
            'client_id': self.client_id,
            'refresh_token_lifetime': self.token_lifetime,
            'username': self.username,
            'password': self.password
        }

        self.sync_client.password = self.password
        self.sync_client.username = self.username
        request_mock = mock_request(self.sync_client.client, method='POST', data=self.valid_token)

        resp = self.sync_client.get_access_token_by_password()
        assert resp.is_success

        args = request_mock.call_args
        assert args.args == ('POST', f'{CDB_TEST_HOST}/cdb/oauth2/token')
        assert args.kwargs['auth'] is None
        assert args.kwargs['json'] == {
            'grant_type': 'password',
            'response_type': 'token',
            'client_id': self.client_id,
            'refresh_token_lifetime': self.token_lifetime,
            'username': self.username,
            'password': self.password
        }

    @pytest.mark.asyncio
    async def test_get_access_token_by_refresh(self, mock_request):
        self.async_client.refresh_token = self.refresh_token
        request_mock = mock_request(self.async_client.client, method='POST', data=self.valid_token)

        resp = await self.async_client.get_access_token_by_refresh()
        assert resp.is_success

        args = request_mock.call_args
        assert args.args == ('POST', f'{CDB_TEST_HOST}/cdb/oauth2/token')
        assert args.kwargs['auth'] is None
        assert args.kwargs['json'] == {
            'grant_type': 'refresh_token',
            'response_type': 'token',
            'client_id': self.client_id,
            'refresh_token_lifetime': self.token_lifetime,
            'refresh_token': self.refresh_token,
        }

        self.sync_client.refresh_token = self.refresh_token
        request_mock = mock_request(self.sync_client.client, method='POST', data=self.valid_token)

        resp = self.sync_client.get_access_token_by_refresh()
        assert resp.is_success

        args = request_mock.call_args
        assert args.args == ('POST', f'{CDB_TEST_HOST}/cdb/oauth2/token')
        assert args.kwargs['auth'] is None
        assert args.kwargs['json'] == {
            'grant_type': 'refresh_token',
            'response_type': 'token',
            'client_id': self.client_id,
            'refresh_token_lifetime': self.token_lifetime,
            'refresh_token': self.refresh_token,
        }

    @pytest.mark.asyncio
    async def test_get_code_by_refresh(self, mock_request):
        self.async_client.refresh_token = self.refresh_token
        request_mock = mock_request(self.async_client.client, method='POST', data=self.valid_token)

        resp = await self.async_client.get_code_by_refresh()
        assert resp.is_success

        args = request_mock.call_args
        assert args.args == ('POST', f'{CDB_TEST_HOST}/cdb/oauth2/token')
        assert args.kwargs['auth'] is None
        assert args.kwargs['json'] == {
            'grant_type': 'refresh_token',
            'response_type': 'code',
            'client_id': self.client_id,
            'refresh_token_lifetime': self.token_lifetime,
            'refresh_token': self.refresh_token,
        }

        self.sync_client.refresh_token = self.refresh_token
        request_mock = mock_request(self.sync_client.client, method='POST', data=self.valid_token)

        resp = self.sync_client.get_code_by_refresh()
        assert resp.is_success

        args = request_mock.call_args
        assert args.args == ('POST', f'{CDB_TEST_HOST}/cdb/oauth2/token')
        assert args.kwargs['auth'] is None
        assert args.kwargs['json'] == {
            'grant_type': 'refresh_token',
            'response_type': 'code',
            'client_id': self.client_id,
            'refresh_token_lifetime': self.token_lifetime,
            'refresh_token': self.refresh_token,
        }

    @pytest.mark.asyncio
    async def test_get_code_by_password(self, mock_request):
        self.async_client.password = self.password
        self.async_client.username = self.username
        request_mock = mock_request(self.async_client.client, method='POST', data=self.valid_token)

        resp = await self.async_client.get_code_by_password()
        assert resp.is_success

        args = request_mock.call_args
        assert args.args == ('POST', f'{CDB_TEST_HOST}/cdb/oauth2/token')
        assert args.kwargs['auth'] is None
        assert args.kwargs['json'] == {
            'grant_type': 'password',
            'response_type': 'code',
            'client_id': self.client_id,
            'refresh_token_lifetime': self.token_lifetime,
            'username': self.username,
            'password': self.password
        }

        self.sync_client.password = self.password
        self.sync_client.username = self.username
        request_mock = mock_request(self.sync_client.client, method='POST', data=self.valid_token)

        resp = self.sync_client.get_code_by_password()
        assert resp.is_success

        args = request_mock.call_args
        assert args.args == ('POST', f'{CDB_TEST_HOST}/cdb/oauth2/token')
        assert args.kwargs['auth'] is None
        assert args.kwargs['json'] == {
            'grant_type': 'password',
            'response_type': 'code',
            'client_id': self.client_id,
            'refresh_token_lifetime': self.token_lifetime,
            'username': self.username,
            'password': self.password
        }

    @pytest.mark.asyncio
    async def test_get_access_token_by_code(self, mock_request):
        self.async_client.code = self.code
        request_mock = mock_request(self.async_client.client, method='POST', data=self.valid_token)

        resp = await self.async_client.get_access_token_by_code()
        assert resp.is_success

        args = request_mock.call_args
        assert args.args == ('POST', f'{CDB_TEST_HOST}/cdb/oauth2/token')
        assert args.kwargs['auth'] is None
        assert args.kwargs['json'] == {
            'grant_type': 'authorization_code',
            'response_type': 'token',
            'client_id': self.client_id,
            'refresh_token_lifetime': self.token_lifetime,
            'code': self.code,
        }

        self.sync_client.code = self.code
        request_mock = mock_request(self.sync_client.client, method='POST', data=self.valid_token)

        resp = self.sync_client.get_access_token_by_code()
        assert resp.is_success

        args = request_mock.call_args
        assert args.args == ('POST', f'{CDB_TEST_HOST}/cdb/oauth2/token')
        assert args.kwargs['auth'] is None
        assert args.kwargs['json'] == {
            'grant_type': 'authorization_code',
            'response_type': 'token',
            'client_id': self.client_id,
            'refresh_token_lifetime': self.token_lifetime,
            'code': self.code,
        }

    @pytest.mark.asyncio
    async def test_authenticate_by_password(self, mock_request):
        self.async_client.password = self.password
        self.async_client.username = self.username
        request_mock = mock_request(self.async_client.client, method='POST', data=self.valid_token)

        resp = await self.async_client.authenticate()
        assert resp.is_success

        args = request_mock.call_args
        assert args.args == ('POST', f'{CDB_TEST_HOST}/cdb/oauth2/token')
        assert args.kwargs['auth'] is None
        assert args.kwargs['json'] == {
            'grant_type': 'password',
            'response_type': 'token',
            'client_id': self.client_id,
            'refresh_token_lifetime': self.token_lifetime,
            'username': self.username,
            'password': self.password
        }

        self.sync_client.password = self.password
        self.sync_client.username = self.username
        request_mock = mock_request(self.sync_client.client, method='POST', data=self.valid_token)

        resp = self.sync_client.authenticate()
        assert resp.is_success

        args = request_mock.call_args
        assert args.args == ('POST', f'{CDB_TEST_HOST}/cdb/oauth2/token')
        assert args.kwargs['auth'] is None
        assert args.kwargs['json'] == {
            'grant_type': 'password',
            'response_type': 'token',
            'client_id': self.client_id,
            'refresh_token_lifetime': self.token_lifetime,
            'username': self.username,
            'password': self.password
        }

    @pytest.mark.asyncio
    async def test_authenticate_and_save_by_code(self, mock_request):
        self.async_client.code = self.code
        request_mock = mock_request(self.async_client.client, method='POST', data=self.valid_token)

        resp = await self.async_client.authenticate_and_save_async()
        assert resp.is_success

        args = request_mock.call_args
        assert args.args == ('POST', f'{CDB_TEST_HOST}/cdb/oauth2/token')
        assert args.kwargs['auth'] is None
        assert args.kwargs['json'] == {
            'grant_type': 'authorization_code',
            'response_type': 'token',
            'client_id': self.client_id,
            'refresh_token_lifetime': self.token_lifetime,
            'code': self.code,
        }

        self.sync_client.code = self.code
        request_mock = mock_request(self.sync_client.client, method='POST', data=self.valid_token)

        resp = self.sync_client.authenticate_and_save_sync()
        assert resp.is_success

        args = request_mock.call_args
        assert args.args == ('POST', f'{CDB_TEST_HOST}/cdb/oauth2/token')
        assert args.kwargs['auth'] is None
        assert args.kwargs['json'] == {
            'grant_type': 'authorization_code',
            'response_type': 'token',
            'client_id': self.client_id,
            'refresh_token_lifetime': self.token_lifetime,
            'code': self.code,
        }
        assert self.sync_client.token.is_stored
        assert self.sync_client.token.is_refreshable
        assert self.sync_client.token.expires_in > 0
        assert self.sync_client.token.needs_refresh is not True

    @pytest.mark.asyncio
    async def test_get_authenticate_and_save_by_refresh(self, mock_request):
        self.async_client.refresh_token = self.refresh_token
        request_mock = mock_request(self.async_client.client, method='POST', data=self.expired_token)

        resp = await self.async_client.authenticate_and_save_async()
        assert resp.is_success

        args = request_mock.call_args
        assert args.args == ('POST', f'{CDB_TEST_HOST}/cdb/oauth2/token')
        assert args.kwargs['auth'] is None
        assert args.kwargs['json'] == {
            'grant_type': 'refresh_token',
            'response_type': 'token',
            'client_id': self.client_id,
            'refresh_token_lifetime': self.token_lifetime,
            'refresh_token': self.refresh_token,
        }

        assert self.async_client.token.is_stored
        assert not self.async_client.token.is_refreshable
        assert self.async_client.token.expires_in < 0
        assert self.async_client.token.needs_refresh is True

        self.sync_client.refresh_token = self.refresh_token
        request_mock = mock_request(self.sync_client.client, method='POST', data=self.expired_token)

        resp = self.sync_client.authenticate_and_save_sync()
        assert resp.is_success

        args = request_mock.call_args
        assert args.args == ('POST', f'{CDB_TEST_HOST}/cdb/oauth2/token')
        assert args.kwargs['auth'] is None
        assert args.kwargs['json'] == {
            'grant_type': 'refresh_token',
            'response_type': 'token',
            'client_id': self.client_id,
            'refresh_token_lifetime': self.token_lifetime,
            'refresh_token': self.refresh_token,
        }


class TestRequestedTokenAuth:

    @pytest.fixture(autouse=True)
    def setup(self):
        self.access_token = f"token-{uuid4()}"
        self.refresh_token = f"refresh-{uuid4()}"
        self.code = f"code-{uuid4()}"
        self.scope = "cloud-test.hdw.mx cloudSystemId=*"
        self.valid_token = {
            "access_token": self.access_token,
            "refresh_token": self.refresh_token,
            "expires_in": "3600",
            "expires_at": f"{int(datetime.now().timestamp() + 3000)*1000}",
            "token_type": "bearer",
            "scope": self.scope
        }
        self.expired_token = {
            "access_token": self.access_token,
            "refresh_token": self.refresh_token,
            "expires_in": "3600",
            "expires_at": f"{int(datetime.now().timestamp() - 5000)*1000}",
            "token_type": "bearer",
            "scope": self.scope
        }

        self.username = f'user-{uuid4()}@exmpale.com'
        self.password = f'password-{uuid4()}'
        self.token_lifetime = 3000
        self.client_id = f'client-{uuid4()}'
        self.sync_client = CdbAccountAPIBase(
            host=CDB_TEST_HOST, client=httpx.Client(),
        )
        self.async_client = CdbAccountAPIBase(
            host=CDB_TEST_HOST, client=httpx.AsyncClient(),
        )

    def test_token_request_sync(self, mocker):
        response = httpx.Response(status_code=200, request=httpx.Request(method="POST", url='/'),
                                  content=json.dumps(self.valid_token))
        patched = mocker.patch.object(self.sync_client.client, '_send_handling_redirects', return_value=response)
        auth = RequestedTokenAuth(
            client=self.sync_client.client, cdb_host=CDB_TEST_HOST,
            username=self.username, password=self.password,
            client_id=self.client_id, scope=self.scope
        )
        resp = self.sync_client.fetch_account(auth=auth)
        assert resp.is_success
        assert auth.token == self.valid_token

    def test_auth_header_sync(self, mocker):
        response = httpx.Response(status_code=200, request=httpx.Request(method="POST", url='/'),
                                  content='ok')
        patched = mocker.patch.object(self.sync_client.client, '_send_handling_redirects', return_value=response)
        auth = RequestedTokenAuth(
            client=self.sync_client.client, cdb_host=CDB_TEST_HOST,
            username=self.username, password=self.password,
            client_id=self.client_id, scope=self.scope
        )
        auth.token = self.valid_token
        resp = self.sync_client.fetch_account(auth=auth)
        processed_request = patched.call_args.args[0]
        authorization = processed_request.headers.get('authorization')
        assert resp.is_success
        assert auth.token == self.valid_token
        assert authorization == f'Bearer {self.access_token}'

    def test_query_param_request_sync(self, mocker):
        response = httpx.Response(status_code=200, request=httpx.Request(method="POST", url='/'),
                                  content=json.dumps(self.valid_token))
        patched = mocker.patch.object(self.sync_client.client, '_send_handling_redirects', return_value=response)
        auth = RequestedTokenQueryAuth(
            client=self.sync_client.client, cdb_host=CDB_TEST_HOST,
            username=self.username, password=self.password,
            client_id=self.client_id, scope=self.scope
        )
        resp = self.sync_client.fetch_account(auth=auth)
        assert resp.is_success
        assert auth.token == self.valid_token

    def test_auth_query_sync(self, mocker):
        response = httpx.Response(status_code=200, request=httpx.Request(method="POST", url='/'),
                                  content='ok')
        patched = mocker.patch.object(self.sync_client.client, '_send_handling_redirects', return_value=response)
        auth = RequestedTokenQueryAuth(
            client=self.sync_client.client, cdb_host=CDB_TEST_HOST,
            username=self.username, password=self.password,
            client_id=self.client_id, scope=self.scope
        )
        auth.token = self.valid_token
        resp = self.sync_client.fetch_account(auth=auth)
        processed_request = patched.call_args.args[0]
        authorization = processed_request.headers.get('authorization')
        assert resp.is_success
        assert auth.token == self.valid_token
        assert processed_request.url.__str__().find(f'token={self.access_token}') >= 0


