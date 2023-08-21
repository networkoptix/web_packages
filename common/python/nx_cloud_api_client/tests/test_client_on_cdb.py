import asyncio
import json
from concurrent.futures import ThreadPoolExecutor

import httpx
import pytest

from nx_cloud_api_client.base_auth import AUTH_TYPES, BearerTokenAuth, CdbAuthAPIClient
from nx_cloud_api_client.client import RESPONSES_TYPE
from nx_cloud_api_client.tests.conftest import (
    CDB_TEST_HOST, skip_if_no_cred
)


skip_if_no_cred()


class TestNxCloudAPIClient:

    def test_init(self, generate_client):
        client = generate_client()
        assert isinstance(client.client, httpx.AsyncClient)
        assert hasattr(client.system, 'get_system')
        assert client.system.get_system.__annotations__.get('auth') == AUTH_TYPES.BASIC_BEARER
        assert client.account.update_security_settings.__annotations__.get('auth') == AUTH_TYPES.BASIC_BEARER
        assert client.account.fetch_account.__annotations__.get('return') == RESPONSES_TYPE

    @pytest.mark.asyncio
    async def test_fetch_account_refresh_token(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD,
                                               get_token, generate_client):
        token = get_token()
        async with generate_client(refresh_token=token["refresh_token"],
                                   cred='refresh_token',
                                   auto_refresh=True) as client:
            assert client.authentication.token.access_token is None
            response = await client.account.fetch_account()
            assert response.is_success
            acc = response.json()
            assert acc["email"] == NX_CLOUD_TEST_ACC_1
            assert client.authentication.token.access_token
            assert client.authentication.token.refresh_token

        token = get_token()
        with generate_client(refresh_token=token["refresh_token"], cred='refresh_token',
                             sync=True, auto_refresh=True) as client:
            assert client.authentication.token.access_token is None
            response = client.account.fetch_account()
            assert response.is_success
            acc = response.json()
            assert acc["email"] == NX_CLOUD_TEST_ACC_1
            assert client.authentication.token.access_token
            assert client.authentication.token.refresh_token


    @pytest.mark.asyncio
    async def test_fetch_account_code(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD,
                                      get_code, generate_client):
        code = get_code()
        client = generate_client(code=code["code"], cred='code', auto_refresh=True)
        assert client.authentication.token.access_token is None
        response = await client.account.fetch_account()
        assert response.is_success
        acc = response.json()
        assert acc["email"] == NX_CLOUD_TEST_ACC_1
        assert client.authentication.token.access_token
        assert client.authentication.token.refresh_token

        code = get_code()
        client = generate_client(code=code["code"], sync=True, cred='code', auto_refresh=True)
        assert client.authentication.token.access_token is None
        response = client.account.fetch_account()
        assert response.is_success
        acc = response.json()
        assert acc["email"] == NX_CLOUD_TEST_ACC_1
        assert client.authentication.token.access_token
        assert client.authentication.token.refresh_token

    @pytest.mark.asyncio
    async def test_fetch_account_password(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD,
                                          generate_client):
        client = generate_client(auto_refresh=True)
        assert client.authentication.token.access_token is None
        response = await client.account.fetch_account()
        assert response.is_success
        acc = response.json()
        assert acc["email"] == NX_CLOUD_TEST_ACC_1
        assert client.authentication.token.access_token
        assert client.authentication.token.refresh_token

        client = generate_client(sync=True, auto_refresh=True)
        assert client.authentication.token.access_token is None
        response = client.account.fetch_account()
        assert response.is_success
        acc = response.json()
        assert acc["email"] == NX_CLOUD_TEST_ACC_1
        assert client.authentication.token.access_token
        assert client.authentication.token.refresh_token

    @pytest.mark.asyncio
    async def test_fetch_account_with_different_auth(
            self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_ACC_2, NX_CLOUD_TEST_ACC_3,
            NX_CLOUD_TEST_PWD, generate_client, get_token, get_code
):
        client = generate_client(auto_refresh=True)

        code = get_code(username=NX_CLOUD_TEST_ACC_2)
        auth2 = CdbAuthAPIClient(host=CDB_TEST_HOST, client=client.client, code=code["code"])
        token = get_token(username=NX_CLOUD_TEST_ACC_3)
        auth3 = BearerTokenAuth(token=token["access_token"])
        coros = [
            client.account.fetch_account(),
            client.account.fetch_account(authenticator=auth2),
            client.account.fetch_account(auth=auth3),
        ]
        resp1, resp2, resp3 = await asyncio.gather(*coros)
        acc1 = resp1.json()
        acc2 = resp2.json()
        acc3 = resp3.json()
        assert acc1["email"] == NX_CLOUD_TEST_ACC_1
        assert acc2["email"] == NX_CLOUD_TEST_ACC_2
        assert acc3["email"] == NX_CLOUD_TEST_ACC_3
        assert client.authentication.token.access_token
        assert client.authentication.token.refresh_token
        assert auth2.token.access_token
        assert auth2.token.refresh_token
        assert auth2.token.access_token != client.authentication.token.access_token

    @pytest.mark.asyncio
    async def test_fetch_account_in_multiple_coroutines(self, mocker, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD,
                                                        generate_client, get_token):
        client = generate_client(auto_refresh=True)
        token = get_token()
        token_response = httpx.Response(status_code=200, content=json.dumps(token), request=httpx.Request('POST', '/'))

        async def get_token_response():
            return token_response

        mock_authenticate = mocker.patch.object(CdbAuthAPIClient, 'token_post',
                                                return_value=get_token_response())
        # mock_refresh = mocker.patch.object(CdbAuthAPIClient, '_refresh_token_handler',
        #                                    return_value=token_response)

        coros = [
            client.account.fetch_account(),
            client.account.fetch_account(),
            client.account.fetch_account(),
        ]
        responses = await asyncio.gather(*coros)
        mock_authenticate.assert_called_once()
        assert all([resp.is_success for resp in responses])

    def test_fetch_account_in_multiple_threads(self, mocker, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD,
                                               generate_client, get_token, mock_request):
        client = generate_client(sync=True, auto_refresh=True)
        token = get_token()
        token_response = httpx.Response(status_code=200, content=json.dumps(token), request=httpx.Request('POST', '/'))
        # mock_authenticate = mock_request(client.client, method='POST', data=token)
        mock_authenticate = mocker.patch.object(CdbAuthAPIClient, 'token_post',
                                                return_value=token_response)
        # mock_refresh = mocker.patch.object(CdbAuthAPIClient, '_refresh_token_handler',
        #                                    return_value=token_response)

        with ThreadPoolExecutor(max_workers=3) as executor:
            features = [executor.submit(client.account.fetch_account) for _ in range(3)]
        # responses = await asyncio.gather(*coros)
        mock_authenticate.assert_called_once()
        assert all([feature.result().is_success for feature in features])
