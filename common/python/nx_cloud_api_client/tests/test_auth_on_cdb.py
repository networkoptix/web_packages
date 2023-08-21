from datetime import datetime
from uuid import uuid4

import httpx
import pytest

from nx_cloud_api_client.base_auth import CdbOauth2APIBase, Grant, ResponseType, CdbAuthAPIClient, \
    AuthenticationNotPossible
from nx_cloud_api_client.tests.conftest import CDB_TEST_HOST, skip_if_no_cred


skip_if_no_cred()


class TestCdbOauth2APIBase:

    @pytest.mark.asyncio
    async def test_token_post_get_token(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD):
        assert NX_CLOUD_TEST_ACC_1 and NX_CLOUD_TEST_PWD
        async with CdbOauth2APIBase(host=CDB_TEST_HOST, client=httpx.AsyncClient()) as client:
            resp = await client.token_post(
                grant_type=Grant.password,
                response_type=ResponseType.token,
                scope="cloudSystemId=*",
                client_id="dev_unit_test",
                username=NX_CLOUD_TEST_ACC_1,
                password=NX_CLOUD_TEST_PWD,
                refresh_token_lifetime=3600,
            )
        assert resp.status_code == 200

        with CdbOauth2APIBase(host=CDB_TEST_HOST, client=httpx.Client()) as client:
            resp = client.token_post(
                grant_type=Grant.password,
                response_type=ResponseType.token,
                client_id="dev_unit_test",
                username=NX_CLOUD_TEST_ACC_1,
                password=NX_CLOUD_TEST_PWD,
                refresh_token_lifetime=3600,
            )
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_token_post_get_code(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD):
        async with CdbOauth2APIBase(host=CDB_TEST_HOST, client=httpx.AsyncClient()) as client:
            resp = await client.token_post(
                grant_type=Grant.password,
                response_type=ResponseType.code,
                scope="cloudSystemId=*",
                client_id="dev_unit_test",
                username=NX_CLOUD_TEST_ACC_1,
                password=NX_CLOUD_TEST_PWD,
                refresh_token_lifetime=3600,
            )
        assert resp.status_code == 200

        with CdbOauth2APIBase(host=CDB_TEST_HOST, client=httpx.Client()) as client:
            resp = client.token_post(
                grant_type=Grant.password,
                response_type=ResponseType.code,
                scope="cloudSystemId=*",
                client_id="dev_unit_test",
                username=NX_CLOUD_TEST_ACC_1,
                password=NX_CLOUD_TEST_PWD,
                refresh_token_lifetime=3600,
            )
        assert resp.status_code == 200


    @pytest.mark.asyncio
    async def test_token_get(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD):
        async with CdbOauth2APIBase(host=CDB_TEST_HOST, client=httpx.AsyncClient()) as client:
            resp = await client.token_post(
                grant_type=Grant.password,
                response_type=ResponseType.token,
                scope="cloudSystemId=*",
                client_id="dev_unit_test",
                username=NX_CLOUD_TEST_ACC_1,
                password=NX_CLOUD_TEST_PWD,
                refresh_token_lifetime=3600,
            )

            token = resp.json().get("access_token")
            resp = await client.token_get(token, username=NX_CLOUD_TEST_ACC_1, password=NX_CLOUD_TEST_PWD)
        assert resp.status_code == 200
        assert resp.json()["access_token"] == token

        with CdbOauth2APIBase(host=CDB_TEST_HOST, client=httpx.Client()) as client:
            resp = client.token_post(
                grant_type=Grant.password,
                response_type=ResponseType.token,
                scope="cloudSystemId=*",
                client_id="dev_unit_test",
                username=NX_CLOUD_TEST_ACC_1,
                password=NX_CLOUD_TEST_PWD,
                refresh_token_lifetime=3600,
            )

            token = resp.json().get("access_token")
            resp = client.token_get(token, username=NX_CLOUD_TEST_ACC_1, password=NX_CLOUD_TEST_PWD)
        assert resp.status_code == 200


    @pytest.mark.asyncio
    async def test_token_delete(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD):
        async with CdbOauth2APIBase(host=CDB_TEST_HOST, client=httpx.AsyncClient()) as client:
            resp = await client.token_post(
                grant_type=Grant.password,
                response_type=ResponseType.token,
                scope="cloudSystemId=*",
                client_id="dev_unit_test",
                username=NX_CLOUD_TEST_ACC_1,
                password=NX_CLOUD_TEST_PWD,
                refresh_token_lifetime=3600,
            )

            token = resp.json().get("access_token")
            resp = await client.token_delete(token, username=NX_CLOUD_TEST_ACC_1, password=NX_CLOUD_TEST_PWD)
            assert resp.is_success
            resp = await client.token_get(token, username=NX_CLOUD_TEST_ACC_1, password=NX_CLOUD_TEST_PWD)
            # it's strange because must be 404, but cdb returns 403
            assert resp.is_error

        with CdbOauth2APIBase(host=CDB_TEST_HOST, client=httpx.Client()) as client:
            resp = client.token_post(
                grant_type=Grant.password,
                response_type=ResponseType.token,
                scope="cloudSystemId=*",
                client_id="dev_unit_test",
                username=NX_CLOUD_TEST_ACC_1,
                password=NX_CLOUD_TEST_PWD,
                refresh_token_lifetime=3600,
            )

            token = resp.json().get("access_token")
            resp = client.token_delete(token, username=NX_CLOUD_TEST_ACC_1, password=NX_CLOUD_TEST_PWD)
            assert resp.is_success
            resp = client.token_get(token, username=NX_CLOUD_TEST_ACC_1, password=NX_CLOUD_TEST_PWD)
            # it's strange because must be 404, but cdb returns 403
            assert resp.is_error


    @pytest.mark.asyncio
    async def test_token_delete_users(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD):
        async with CdbOauth2APIBase(host=CDB_TEST_HOST, client=httpx.AsyncClient()) as client:
            resp = await client.token_post(
                grant_type=Grant.password,
                response_type=ResponseType.token,
                scope="cloudSystemId=*",
                client_id="dev_unit_test",
                username=NX_CLOUD_TEST_ACC_1,
                password=NX_CLOUD_TEST_PWD,
                refresh_token_lifetime=3600,
            )

            token = resp.json().get("access_token")
            assert token
            resp = await client.user_tokens_delete(username=NX_CLOUD_TEST_ACC_1, password=NX_CLOUD_TEST_PWD)
            assert resp.is_success
            resp = await client.token_delete(token, username=NX_CLOUD_TEST_ACC_1, password=NX_CLOUD_TEST_PWD)
            assert resp.status_code == 404

        with CdbOauth2APIBase(host=CDB_TEST_HOST, client=httpx.Client()) as client:
            resp = client.token_post(
                grant_type=Grant.password,
                response_type=ResponseType.token,
                scope="cloudSystemId=*",
                client_id="dev_unit_test",
                username=NX_CLOUD_TEST_ACC_1,
                password=NX_CLOUD_TEST_PWD,
                refresh_token_lifetime=3600,
            )

            token = resp.json().get("access_token")
            assert token
            resp = client.user_tokens_delete(username=NX_CLOUD_TEST_ACC_1, password=NX_CLOUD_TEST_PWD)
            assert resp.is_success
            resp = client.token_delete(token, username=NX_CLOUD_TEST_ACC_1, password=NX_CLOUD_TEST_PWD)
            assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_token_delete_clients(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD):
        async with CdbOauth2APIBase(host=CDB_TEST_HOST, client=httpx.AsyncClient()) as client:
            resp = await client.token_post(
                grant_type=Grant.password,
                response_type=ResponseType.token,
                scope="cloudSystemId=*",
                client_id="dev_unit_test_1",
                username=NX_CLOUD_TEST_ACC_1,
                password=NX_CLOUD_TEST_PWD,
                refresh_token_lifetime=3600,
            )

            token = resp.json().get("access_token")
            resp = await client.client_tokens_delete(client_id="dev_unit_test_1",
                                                     username=NX_CLOUD_TEST_ACC_1, password=NX_CLOUD_TEST_PWD)
            assert resp.is_success
            resp = await client.token_delete(token, username=NX_CLOUD_TEST_ACC_1, password=NX_CLOUD_TEST_PWD)
            assert resp.status_code == 404

        with CdbOauth2APIBase(host=CDB_TEST_HOST, client=httpx.Client()) as client:
            resp = client.token_post(
                grant_type=Grant.password,
                response_type=ResponseType.token,
                scope="cloudSystemId=*",
                client_id="dev_unit_test_1",
                username=NX_CLOUD_TEST_ACC_1,
                password=NX_CLOUD_TEST_PWD,
                refresh_token_lifetime=3600,
            )

            token = resp.json().get("access_token")
            resp = client.client_tokens_delete(client_id="dev_unit_test_1",
                                                     username=NX_CLOUD_TEST_ACC_1, password=NX_CLOUD_TEST_PWD)
            assert resp.is_success
            resp = client.token_delete(token, username=NX_CLOUD_TEST_ACC_1, password=NX_CLOUD_TEST_PWD)
            assert resp.status_code == 404


class TestCdbAuthAPIClientAsync:

    @pytest.mark.asyncio
    async def test_token(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD):
        assert NX_CLOUD_TEST_ACC_1 and NX_CLOUD_TEST_PWD
        api = CdbAuthAPIClient(
            host=CDB_TEST_HOST,
            client=httpx.AsyncClient(),
            client_id="dev_unit_test",
            username=NX_CLOUD_TEST_ACC_1,
            password=NX_CLOUD_TEST_PWD,
            refresh_token_lifetime=3600
        )

        # test access token retrieving by password
        resp = await api.get_access_token_by_password()
        assert resp.is_success

        # test access token retrieving by refresh token
        api.refresh_token = resp.json()["refresh_token"]
        resp = await api.get_access_token_by_refresh()
        assert resp.is_success

        # test authorization code retrieving by refresh token
        api.access_token = resp.json()["access_token"]
        api.refresh_token = resp.json()["refresh_token"]
        resp = await api.get_code_by_refresh()
        assert resp.is_success

        # test authorization code retrieving by password
        resp = await api.get_code_by_password()
        assert resp.is_success

        # test access token retrieving by code
        api.code = resp.json()["code"]
        resp = await api.get_access_token_by_code()
        assert resp.is_success

        # test auth by refresh token
        api.code = None
        api.refresh_token = resp.json()["refresh_token"]
        resp = await api.authenticate()
        assert resp.is_success

        # test auth by code
        api.access_token = None
        api.refresh_token = None
        api.code = (await api.get_code_by_password()).json()["code"]
        resp = await api.authenticate()
        assert resp.is_success

        # test auth by password
        api.access_token = None
        api.refresh_token = None
        api.code = None
        resp = await api.authenticate()
        assert resp.is_success

        # test access token only - retrieve token params
        api.code = None
        api.username = None
        api.access_token = resp.json()["access_token"]
        api.refresh_token = None
        try:
            resp = await api.authenticate()
        except Exception as ex:
            assert isinstance(ex, AuthenticationNotPossible)

    @pytest.mark.asyncio
    async def test_client_auth_and_save(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD, get_code):
        async with httpx.AsyncClient() as client:
            # by password
            api = CdbAuthAPIClient(host=CDB_TEST_HOST, client=client,
                                   client_id=f'cl_test_{uuid4()}',
                                   username=NX_CLOUD_TEST_ACC_1, password=NX_CLOUD_TEST_PWD,
                                   refresh_token_lifetime=7200)
            resp = await api.authenticate_and_save_async()

            assert resp.is_success
            assert api.token.is_stored
            assert api.token.is_refreshable
            assert api.token.expires_in > 3500
            assert api.token.refreshable_until > datetime.now().timestamp() + 7100

            # by refresh token
            api = CdbAuthAPIClient(host=CDB_TEST_HOST, client=client,
                                   client_id=f'nx_api_cl_test_{uuid4()}',
                                   refresh_token=api.token.refresh_token,
                                   refresh_token_lifetime=7200)
            resp = await api.authenticate_and_save_async()

            assert resp.is_success
            assert api.token.is_stored
            assert api.token.is_refreshable
            assert api.token.expires_in > 3500
            assert api.token.refreshable_until > datetime.now().timestamp() + 7100

            # by code
            code = get_code()
            api = CdbAuthAPIClient(host=CDB_TEST_HOST, client=client,
                                   client_id=f'nx_api_cl_test_{uuid4()}',
                                   code=code["code"], refresh_token_lifetime=7200)
            resp = await api.authenticate_and_save_async()

            assert resp.is_success
            assert api.token.is_stored
            assert api.token.is_refreshable
            assert api.token.expires_in > 3500
            assert api.token.refreshable_until > datetime.now().timestamp() + 7100
