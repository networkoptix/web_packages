import json
import os
import httpx
import typing
import pytest
import mock
from uuid import uuid4

from nx_cloud_api_client.base_auth import RequestedTokenAuth, CdbOauth2APIBase, BearerTokenAuth, QueryParamAuth, \
    RequestedTokenQueryAuth, CdbAuthAPIClient
from nx_cloud_api_client.client import NxCloudAPIClient

CDB_TEST_HOST = 'https://cloud-test.hdw.mx'

@pytest.fixture()
def NX_CLOUD_TEST_ACC_1():
    return os.environ.get('NX_CLOUD_TEST_ACC_1')

@pytest.fixture()
def NX_CLOUD_TEST_ACC_2():
    return os.environ.get('NX_CLOUD_TEST_ACC_2')

@pytest.fixture()
def NX_CLOUD_TEST_ACC_3():
    return os.environ.get('NX_CLOUD_TEST_ACC_3')

@pytest.fixture()
def NX_CLOUD_TEST_PWD():
    return os.environ.get('NX_CLOUD_TEST_PWD')


def skip_if_no_cred():
    if not all([
        os.environ.get('NX_CLOUD_TEST_PWD'), os.environ.get('NX_CLOUD_TEST_ACC_3'),
        os.environ.get('NX_CLOUD_TEST_ACC_2'), os.environ.get('NX_CLOUD_TEST_ACC_1')
    ]):
        pytest.skip("Test credentials must be set in environment variable.", allow_module_level=True)


@pytest.fixture()
def get_token(NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD) -> typing.Callable:
    def getter(client=httpx.Client(), username=NX_CLOUD_TEST_ACC_1,
               password=NX_CLOUD_TEST_PWD, host=CDB_TEST_HOST):
        resp = CdbAuthAPIClient(host=host,
                                client=client,
                                username=username,
                                password=password,
                                refresh_token_lifetime=3600).get_access_token_by_password()
        return resp.json()

    return getter


async def get_token_async(client, username, password, host=CDB_TEST_HOST):

    resp = await CdbAuthAPIClient(host=host, client=client,

                                  username=username,
                                  password=password,
                                  client_id="test_client",
                                  refresh_token_lifetime=3600).get_access_token_by_password()
    return resp.json()


@pytest.fixture()
def get_code(NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD) -> typing.Callable:
    def getter(client=httpx.Client(), username=NX_CLOUD_TEST_ACC_1,
               password=NX_CLOUD_TEST_PWD, host=CDB_TEST_HOST):
        resp = CdbAuthAPIClient(host=host,
                                client=client,
                                username=username,
                                password=password,
                                refresh_token_lifetime=3600).get_code_by_password()
        return resp.json()

    return getter


async def get_code_async(client, username, password):
    resp = await CdbAuthAPIClient(host=CDB_TEST_HOST, client=client,
                            username=username,
                            password=password,
                            refresh_token_lifetime=3600).get_code_by_password()
    return resp.json()


@pytest.fixture()
def run_test_with_auth(get_token, get_code):
    def runner(handler, api, username, password, auths='Pass|Bearer|Refresh|Code'):
        if 'User' in auths:
            auth = httpx.BasicAuth(username=username, password=password)
            handler(api, auth)
            auth = RequestedTokenAuth(cdb_host=api.host, client=api.client, username=username, password=password)
            handler(api, auth)
            CdbOauth2APIBase(host=api.host, client=api.client).user_tokens_delete(username=username, password=password)

        if 'Bearer' in auths:
            token = get_token(api.client, username, password)
            auth = BearerTokenAuth(token=token["access_token"])
            handler(api, auth)
            CdbOauth2APIBase(host=api.host, client=api.client).user_tokens_delete(username=username, password=password)

        if 'Refresh' in auths:
            token = get_token(api.client, username, password)
            auth = RequestedTokenAuth(cdb_host=api.host, client=api.client, refresh_token=token["refresh_token"])
            handler(api, auth)
            CdbOauth2APIBase(host=api.host, client=api.client).user_tokens_delete(username=username, password=password)

        if 'Code' in auths:
            code = get_code(api.client, username, password)
            auth = RequestedTokenAuth(cdb_host=api.host, client=api.client, authorization_code=code["code"])
            handler(api, auth)
            CdbOauth2APIBase(host=api.host, client=api.client).user_tokens_delete(username=username, password=password)

    return runner


@pytest.fixture()
def async_run_test_with_auth(get_token, get_code):
    async def runner(handler, api, username, password, auths='Pass|Requested|Bearer|Refresh|Code'):

        if 'Pass' in auths:
            auth = httpx.BasicAuth(username=username, password=password)
            await handler(api, auth)

        if "Requested" in auths:
            auth = RequestedTokenAuth(cdb_host=api.host, client=api.client, username=username, password=password)
            await handler(api, auth)
            await CdbOauth2APIBase(host=api.host, client=api.client).user_tokens_delete(username=username, password=password)

        if 'Bearer' in auths:
            token = get_token(username=username, password=password)
            auth = BearerTokenAuth(token=token["access_token"])
            await handler(api, auth)
            await CdbOauth2APIBase(host=api.host, client=api.client).user_tokens_delete(username=username, password=password)

        if 'Refresh' in auths:
            token = get_token(username=username, password=password)
            auth = RequestedTokenAuth(cdb_host=api.host, client=api.client, refresh_token=token["refresh_token"])
            await handler(api, auth)
            await CdbOauth2APIBase(host=api.host, client=api.client).user_tokens_delete(username=username, password=password)

        if 'Code' in auths:
            code = get_code(username=username, password=password)
            auth = RequestedTokenAuth(cdb_host=api.host, client=api.client, authorization_code=code["code"])
            await handler(api, auth)
            await CdbOauth2APIBase(host=api.host, client=api.client).user_tokens_delete(username=username, password=password)

        if 'QueryParam' in auths:
            token = get_token(username=username, password=password)
            auth = QueryParamAuth(token=token["access_token"])
            await handler(api, auth)
            auth = RequestedTokenQueryAuth(cdb_host=api.host, client=api.client, username=username, password=password)
            await handler(api, auth)

    return runner


@pytest.fixture()
def generate_client(NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD) -> typing.Callable:
    def generator(
            username=NX_CLOUD_TEST_ACC_1, password=NX_CLOUD_TEST_PWD, refresh_token=None, code=None,
            client_id=f'{uuid4()}', cred='password', sync=False, auto_refresh=False, host=CDB_TEST_HOST
    ) -> NxCloudAPIClient:
        kwargs = {
            "host": host,
            "client": httpx.Client() if sync else httpx.AsyncClient(),
            "client_id": client_id,
            "auto_refresh": auto_refresh,
        }

        if cred == 'password':
            kwargs.update(
                username=username,
                password=password,
            )
        elif cred == 'refresh_token':
            kwargs.update(
                refresh_token=refresh_token
            )
        elif cred == 'code':
            kwargs.update(
                code=code
            )

        return NxCloudAPIClient(**kwargs)

    return generator


@pytest.fixture()
def mock_request(mocker):
    def mock_client_request(
            client, response: httpx.Response = None, method: str = 'GET', data: dict = None
    ) -> typing.Union[mock.AsyncMock, mock.MagicMock]:
        if not response:
            response = httpx.Response(status_code=200, request=httpx.Request(method=method, url='/'),
                                      content=json.dumps(data) if data else None)
        patched = mocker.patch.object(client, 'request', return_value=response)

        return patched

    return mock_client_request
