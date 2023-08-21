import asyncio
from uuid import uuid4

from nx_cloud_api_client.tests.conftest import CDB_TEST_HOST, skip_if_no_cred

import httpx
import pytest

from nx_cloud_api_client.apis import (
    CdbSystemAPIBase, Cdb2faAPIBase,
    CdbAccountAPIBase, CdbSystemTransferAPIBase, CdbAuthSupportAPIBase
)
from nx_cloud_api_client.base_auth import BearerTokenAuth, QueryParamAuth, RequestedTokenAuth, RequestedTokenQueryAuth

skip_if_no_cred()


class TestCdbAccountAPIAsync:

    def setup(self):
        self.email = f'{uuid4()}@example.com'
        self.password = f'{uuid4()}'
        self.name = 'Api Test'
        self.customization = 'default'

    @pytest.mark.asyncio
    async def test_account_api_init(self):
        api = CdbAccountAPIBase(host=CDB_TEST_HOST, client=httpx.AsyncClient())
        assert api.get_full_url('') == f'https://cloud-test.hdw.mx/cdb/account'
        assert isinstance(api.client, httpx.AsyncClient)

    @pytest.mark.asyncio
    async def test_account_api_register_async(self):
        async with CdbAccountAPIBase(host=CDB_TEST_HOST, client=httpx.AsyncClient()) as api:
            resp = await api.register(email=self.email, password=self.password,
                                      customization=self.customization, full_name=self.name)
            assert resp.is_success

            # test already exist
            resp = await api.register(email=self.email, password=self.password,
                                      customization=self.customization)
            assert resp.is_error
            assert resp.json()["resultCode"] == "alreadyExists"

    @pytest.mark.asyncio
    async def test_account_api_register_sync(self):
        with CdbAccountAPIBase(host=CDB_TEST_HOST, client=httpx.Client()) as api:
            resp = api.register(email=self.email, password=self.password,
                                customization=self.customization, full_name=self.name)
            assert resp.is_success

            # test already exist
            resp = api.register(email=self.email, password=self.password,
                                customization=self.customization)
            assert resp.is_error
            assert resp.json()["resultCode"] == "alreadyExists"


    @pytest.mark.asyncio
    async def test_account_status_async(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_ACC_2, NX_CLOUD_TEST_ACC_3):
        async with CdbAccountAPIBase(host=CDB_TEST_HOST, client=httpx.AsyncClient()) as api:
            statuses = [api.status(user_email)
                        for user_email in
                        [NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_ACC_2, NX_CLOUD_TEST_ACC_3]]

            responses = await asyncio.gather(*statuses)

            assert all([resp.is_success for resp in responses])
            assert all([resp.json()["statusCode"] == "activated" for resp in responses])

    @pytest.mark.asyncio
    async def test_account_status_sync(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_ACC_2, NX_CLOUD_TEST_ACC_3):
        with CdbAccountAPIBase(host=CDB_TEST_HOST, client=httpx.Client()) as api:
            responses = [api.status(user_email)
                        for user_email in
                        [NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_ACC_2, NX_CLOUD_TEST_ACC_3]]

            assert all([resp.is_success for resp in responses])
            assert all([resp.json()["statusCode"] == "activated" for resp in responses])

    @pytest.mark.asyncio
    async def test_temporary_credentials_async(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD, async_run_test_with_auth):

        async def run(api, auth):
            # test invalid type
            creds = await api.create_temporary_credentials(
                cred_type="invalid",
                auth=auth
            )
            assert creds.is_error

            # test short
            creds = await api.create_temporary_credentials(
                cred_type="short",
                auth=auth
            )
            assert creds.is_success
            assert int(creds.json()["timeouts"]["expirationPeriod"]) == 3600
            assert creds.json()["timeouts"]["autoProlongationEnabled"]

            # test long
            creds = await api.create_temporary_credentials(
                cred_type="long",
                auth=auth
            )
            assert creds.is_success
            assert int(creds.json()["timeouts"]["expirationPeriod"]) == 2592000
            assert not creds.json()["timeouts"]["autoProlongationEnabled"]

            # test custom
            expirationPeriod = 10000
            autoProlongationEnabled = False
            creds = await api.create_temporary_credentials(
                auto_prolongation_enabled=autoProlongationEnabled,
                expiration_period=expirationPeriod,
                auth=auth
            )
            assert creds.is_success
            assert int(creds.json()["timeouts"]["expirationPeriod"]) == expirationPeriod
            assert creds.json()["timeouts"]["autoProlongationEnabled"] == autoProlongationEnabled

        async with CdbAccountAPIBase(host=CDB_TEST_HOST, client=httpx.AsyncClient()) as api:

            await async_run_test_with_auth(run, api, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD)

    def test_temporary_credentials_sync(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD, run_test_with_auth):
        client_id = f'{uuid4()}'

        def run(api, auth):
            # test invalid type
            creds = api.create_temporary_credentials(
                cred_type="invalid",
                auth=auth
            )
            assert creds.is_error

            # test short
            creds = api.create_temporary_credentials(
                cred_type="short",
                auth=auth
            )
            assert creds.is_success
            assert int(creds.json()["timeouts"]["expirationPeriod"]) == 3600
            assert creds.json()["timeouts"]["autoProlongationEnabled"]

            # test long
            creds = api.create_temporary_credentials(
                cred_type="long",
                auth=auth
            )
            assert creds.is_success
            assert int(creds.json()["timeouts"]["expirationPeriod"]) == 2592000
            assert not creds.json()["timeouts"]["autoProlongationEnabled"]

            # test custom
            expirationPeriod = 10000
            autoProlongationEnabled = False
            creds = api.create_temporary_credentials(
                auto_prolongation_enabled=autoProlongationEnabled,
                expiration_period=expirationPeriod,
                auth=auth
            )
            assert creds.is_success
            assert int(creds.json()["timeouts"]["expirationPeriod"]) == expirationPeriod
            assert creds.json()["timeouts"]["autoProlongationEnabled"] == autoProlongationEnabled

        with CdbAccountAPIBase(host=CDB_TEST_HOST, client=httpx.Client()) as api:
            run_test_with_auth(run, api, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD)

    @pytest.mark.asyncio
    async def test_account_attributes_async(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD, async_run_test_with_auth):

        async def run(api, auth):
            resp = await api.fetch_account(auth=auth)

            assert resp.is_success
            assert resp.json()["statusCode"] == "activated"
            assert resp.json()["registrationTime"]
            assert resp.json()["email"] == NX_CLOUD_TEST_ACC_1.lower()

            attrs = resp.json()

            # test update
            name = f"name {uuid4()}"
            attrs["fullName"] = name
            resp = await api.update_account(full_name=name, auth=auth)

            assert resp.is_success
            assert resp.json()["statusCode"] == "activated"
            assert resp.json()["fullName"] == name

            resp = await api.fetch_account(auth=auth)

            assert resp.is_success
            assert resp.json()["fullName"] == name
            assert resp.json() == attrs

        async with CdbAccountAPIBase(host=CDB_TEST_HOST, client=httpx.AsyncClient()) as api:
            await async_run_test_with_auth(run, api, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD)

    def test_account_attributes_sync(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD, run_test_with_auth):
        def run(api, auth):
            resp = api.fetch_account(auth=auth)

            assert resp.is_success
            assert resp.json()["statusCode"] == "activated"
            assert resp.json()["registrationTime"]
            assert resp.json()["email"] == NX_CLOUD_TEST_ACC_1.lower()

            attrs = resp.json()

            # test update
            name = f"name {uuid4()}"
            attrs["fullName"] = name
            resp = api.update_account(full_name=name, auth=auth)

            assert resp.is_success
            assert resp.json()["statusCode"] == "activated"
            assert resp.json()["fullName"] == name

            resp = api.fetch_account(auth=auth)

            assert resp.is_success
            assert resp.json()["fullName"] == name
            assert resp.json() == attrs

        with CdbAccountAPIBase(host=CDB_TEST_HOST, client=httpx.Client()) as api:
            run_test_with_auth(run, api, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD)

    @pytest.mark.asyncio
    async def test_security_settings_async(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD, async_run_test_with_auth):

        async def run(api, auth):
            resp = await api.fetch_security_settings(auth=auth)

            assert resp.is_success
            settings = resp.json()

            resp = await api.update_security_settings(
                password=NX_CLOUD_TEST_PWD,
                http_digest_auth_enabled=not settings["httpDigestAuthEnabled"],
                auth=auth
            )
            settings["httpDigestAuthEnabled"] = not settings["httpDigestAuthEnabled"]
            assert resp.is_success

            resp = await api.fetch_security_settings(auth=auth)
            assert resp.is_success
            assert resp.json() == settings

        async with CdbAccountAPIBase(host=CDB_TEST_HOST, client=httpx.AsyncClient()) as api:
            await async_run_test_with_auth(run, api, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD)

    def test_security_settings_sync(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD, run_test_with_auth):

        def run(api, auth):
            resp = api.fetch_security_settings(auth=auth)

            assert resp.is_success
            settings = resp.json()

            resp = api.update_security_settings(
                password=NX_CLOUD_TEST_PWD,
                http_digest_auth_enabled=not settings["httpDigestAuthEnabled"],
                auth=auth
            )
            settings["httpDigestAuthEnabled"] = not settings["httpDigestAuthEnabled"]
            assert resp.is_success

            resp = api.fetch_security_settings(auth=auth)
            assert resp.is_success
            assert resp.json() == settings

        with CdbAccountAPIBase(host=CDB_TEST_HOST, client=httpx.Client()) as api:
            run_test_with_auth(run, api, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD)


class TestCdbSystemAPIBase:

    @pytest.fixture(autouse=True)
    def setup(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_ACC_2, NX_CLOUD_TEST_ACC_3, NX_CLOUD_TEST_PWD, get_token):
        client = httpx.Client()
        auth = RequestedTokenAuth(cdb_host=CDB_TEST_HOST, client=client,
                                  username=NX_CLOUD_TEST_ACC_1, password=NX_CLOUD_TEST_PWD)
        api = CdbSystemAPIBase(host=CDB_TEST_HOST, client=client)
        systems = api.get_systems(auth=auth).json()["systems"]
        self.system_id = systems[0]["id"]
        for usr in [NX_CLOUD_TEST_ACC_2, NX_CLOUD_TEST_ACC_3]:
            resp = api.stop_sharing_system(system_id=self.system_id, user_email=usr, auth=auth)
            assert resp.is_success

    def test_api_init(self):
        api = CdbSystemAPIBase(host=CDB_TEST_HOST, client=httpx.AsyncClient())
        assert api.get_full_url('') == f'https://cloud-test.hdw.mx/cdb/systems'
        assert isinstance(api.client, httpx.AsyncClient)

    @pytest.mark.asyncio
    async def test_get_systems_async(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD, async_run_test_with_auth):
        async def run(api, auth):
            resp = await api.get_systems(auth=auth)
            assert resp.is_success

        api = CdbSystemAPIBase(host=CDB_TEST_HOST, client=httpx.AsyncClient())

        await async_run_test_with_auth(run, api=api, username=NX_CLOUD_TEST_ACC_1, password=NX_CLOUD_TEST_PWD)

    def test_get_systems_sync(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD, run_test_with_auth):
        def run(api, auth):
            resp = api.get_systems(auth=auth)
            assert resp.is_success

        api = CdbSystemAPIBase(host=CDB_TEST_HOST, client=httpx.Client())

        run_test_with_auth(run, api=api, username=NX_CLOUD_TEST_ACC_1, password=NX_CLOUD_TEST_PWD)


    @pytest.mark.asyncio
    async def test_sharing_system_async(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_ACC_2,
                                        NX_CLOUD_TEST_PWD, async_run_test_with_auth):
        async def share(api: CdbSystemAPIBase, auth):
            resp = await api.share_system(system_id=self.system_id, user_email=NX_CLOUD_TEST_ACC_2,
                                          access_role="cloudAdmin", user_role="cloudAdmin",
                                          is_enabled=True, auth=auth)
            assert resp.is_success

        async def stop_sharing(api, auth):
            resp = await api.stop_sharing_system(system_id=self.system_id, user_email=NX_CLOUD_TEST_ACC_2, auth=auth)
            assert resp.is_success

        async def check_systems_none(api: CdbSystemAPIBase, auth):
            resp = await api.get_systems(auth=auth)
            assert len(resp.json()["systems"]) == 0

        async def check_systems_one(api: CdbSystemAPIBase, auth):
            resp = await api.get_systems(auth=auth)
            assert len(resp.json()["systems"]) == 1

        async def check_users_two(api: CdbSystemAPIBase, auth):
            resp = await api.get_cloud_users(system_id=self.system_id, auth=auth)
            assert resp.is_success
            assert isinstance(resp.json(), list)
            assert len(resp.json()) == 2

        api = CdbSystemAPIBase(host=CDB_TEST_HOST, client=httpx.AsyncClient())

        # basic auth
        await async_run_test_with_auth(check_systems_none, api=api, username=NX_CLOUD_TEST_ACC_2,
                                       password=NX_CLOUD_TEST_PWD, auths="Pass")
        await async_run_test_with_auth(share, api=api, username=NX_CLOUD_TEST_ACC_1,
                                       password=NX_CLOUD_TEST_PWD, auths="Pass")
        await async_run_test_with_auth(check_systems_one, api=api, username=NX_CLOUD_TEST_ACC_2,
                                       password=NX_CLOUD_TEST_PWD, auths="Pass")
        await async_run_test_with_auth(check_users_two, api=api, username=NX_CLOUD_TEST_ACC_1,
                                       password=NX_CLOUD_TEST_PWD, auths="Pass")
        await async_run_test_with_auth(stop_sharing, api=api, username=NX_CLOUD_TEST_ACC_1,
                                       password=NX_CLOUD_TEST_PWD, auths="Pass")
        await async_run_test_with_auth(check_systems_none, api=api, username=NX_CLOUD_TEST_ACC_2,
                                       password=NX_CLOUD_TEST_PWD, auths="Pass")
        # bearer auth
        await async_run_test_with_auth(check_systems_none, api=api, username=NX_CLOUD_TEST_ACC_2,
                                       password=NX_CLOUD_TEST_PWD, auths="Bearer")
        await async_run_test_with_auth(share, api=api, username=NX_CLOUD_TEST_ACC_1,
                                       password=NX_CLOUD_TEST_PWD, auths="Bearer")
        await async_run_test_with_auth(check_systems_one, api=api, username=NX_CLOUD_TEST_ACC_2,
                                       password=NX_CLOUD_TEST_PWD, auths="Bearer")
        await async_run_test_with_auth(check_users_two, api=api, username=NX_CLOUD_TEST_ACC_1,
                                       password=NX_CLOUD_TEST_PWD, auths="Bearer")
        await async_run_test_with_auth(stop_sharing, api=api, username=NX_CLOUD_TEST_ACC_1,
                                       password=NX_CLOUD_TEST_PWD, auths="Bearer")
        await async_run_test_with_auth(check_systems_none, api=api, username=NX_CLOUD_TEST_ACC_2,
                                       password=NX_CLOUD_TEST_PWD, auths="Bearer")


    @pytest.mark.asyncio
    async def test_get_systems_health_history(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD, async_run_test_with_auth):
        async def run(api, auth):
            resp = await api.health_history(system_id=self.system_id, auth=auth)
            assert resp.is_success

        api = CdbSystemAPIBase(host=CDB_TEST_HOST, client=httpx.AsyncClient())

        await async_run_test_with_auth(run, api=api, username=NX_CLOUD_TEST_ACC_1, password=NX_CLOUD_TEST_PWD)


class TestCdbSystemTransferAPIBase:

    @pytest.fixture(autouse=True)
    def setup(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD):
        client = httpx.Client()
        auth = RequestedTokenAuth(cdb_host=CDB_TEST_HOST, client=client,
                                  username=NX_CLOUD_TEST_ACC_1, password=NX_CLOUD_TEST_PWD)
        systems = CdbSystemAPIBase(host=CDB_TEST_HOST, client=client).get_systems(auth=auth).json()["systems"]
        self.system_id = systems[0]["id"]
        api = CdbSystemTransferAPIBase(host=CDB_TEST_HOST, client=client)
        offers = api.systems_offers(auth=auth).json()
        for offer in offers:
            sys_id = offer["systemId"]
            api.delete_offer(system_id=sys_id, auth=auth)

    @pytest.mark.asyncio
    async def test_system_offer(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_ACC_2,
                                NX_CLOUD_TEST_PWD, async_run_test_with_auth):
        comment = f'{uuid4()}'
        client = httpx.AsyncClient()
        api = CdbSystemTransferAPIBase(host=CDB_TEST_HOST, client=client)

        async def make_offer(api: CdbSystemTransferAPIBase, auth):
            offer = await api.offer_system(system_id=self.system_id,
                                           to_account=NX_CLOUD_TEST_ACC_2,
                                           comment=comment, auth=auth)
            assert offer.is_success
            assert offer.json()["systemId"] == self.system_id
            assert offer.json()["comment"] == comment
            assert offer.json()["toAccount"] == NX_CLOUD_TEST_ACC_2

            offers = await api.systems_offers(auth=auth)
            assert offers.is_success
            assert len(offers.json()) == 1
            offer = offers.json()[0]
            assert offer["systemId"] == self.system_id
            assert offer["comment"] == comment
            assert offer["toAccount"] == NX_CLOUD_TEST_ACC_2

            resp = await api.delete_offer(system_id=self.system_id, auth=auth)
            assert resp.is_success

        await async_run_test_with_auth(make_offer, api, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD)


    @pytest.mark.asyncio
    async def test_update_system_offer(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_ACC_2,
                                       NX_CLOUD_TEST_PWD, async_run_test_with_auth):
        client = httpx.AsyncClient()
        api = CdbSystemTransferAPIBase(host=CDB_TEST_HOST, client=client)

        async def make_offer(api: CdbSystemTransferAPIBase, auth):
            au = httpx.BasicAuth(username=NX_CLOUD_TEST_ACC_1, password=NX_CLOUD_TEST_PWD)
            comment = f'{uuid4()}'
            # create offer
            offer = await api.offer_system(system_id=self.system_id,
                                           to_account=NX_CLOUD_TEST_ACC_2,
                                           comment=comment, auth=au)
            assert offer.is_success

            assert offer.json()["systemId"] == self.system_id
            assert offer.json()["comment"] == comment
            assert offer.json()["toAccount"] == NX_CLOUD_TEST_ACC_2

            # get and check offer
            offers = await api.systems_offers(auth=auth)
            assert offers.is_success
            assert len(offers.json()) == 1
            offer = offers.json()[0]
            assert offer["systemId"] == self.system_id
            assert offer["comment"] == comment
            assert offer["toAccount"] == NX_CLOUD_TEST_ACC_2

            # Reject offer
            resp = await api.reject_offer(system_id=self.system_id, auth=auth)
            assert resp.is_success

            # ensure offer is rejected
            offers = await api.systems_offers(auth=auth)
            assert offers.is_success
            assert len(offers.json()) == 0

        await async_run_test_with_auth(make_offer, api, NX_CLOUD_TEST_ACC_2, NX_CLOUD_TEST_PWD)


class TestCdbAuthSupportAPIBase:

    @pytest.fixture(autouse=True)
    def setup(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD):
        client = httpx.Client()
        auth = RequestedTokenAuth(cdb_host=CDB_TEST_HOST, client=client, username=NX_CLOUD_TEST_ACC_1, password=NX_CLOUD_TEST_PWD)
        systems = CdbSystemAPIBase(host=CDB_TEST_HOST, client=client).get_systems(auth=auth).json()["systems"]
        self.system_id = systems[0]["id"]

    @pytest.mark.asyncio
    async def test_get_nonce(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD, async_run_test_with_auth):
        async def get_nonce(api: CdbAuthSupportAPIBase, auth):
            response = await api.get_nonce(system_id=self.system_id, auth=auth)

            assert response.is_success
            assert response.json()["nonce"]

        api = CdbAuthSupportAPIBase(host=CDB_TEST_HOST, client=httpx.AsyncClient())
        await async_run_test_with_auth(get_nonce, api=api, username=NX_CLOUD_TEST_ACC_1, password=NX_CLOUD_TEST_PWD)

    @pytest.mark.asyncio
    async def test_caller_identity(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_ACC_2, NX_CLOUD_TEST_PWD,
                                   get_token, async_run_test_with_auth):
        with CdbAuthSupportAPIBase(host=CDB_TEST_HOST, client=httpx.Client()) as au:
            token = get_token()
            nonce = au.get_nonce(self.system_id, auth=BearerTokenAuth(token=token["access_token"]))

        async def caller_identity(api: CdbAuthSupportAPIBase, auth):

            identity = await api.caller_identy(
                request_method='POST',
                request_authorization=f"Bearer {token['access_token']}",
                base_nonce=nonce.json()["nonce"],
                auth=auth
            )
            assert identity.is_success
            assert identity.json()["objectType"] == "account"
            assert identity.json()["objectId"] == NX_CLOUD_TEST_ACC_1

        await async_run_test_with_auth(caller_identity,
                                       api=CdbAuthSupportAPIBase(host=CDB_TEST_HOST, client=httpx.AsyncClient()),
                                       username=NX_CLOUD_TEST_ACC_2, password=NX_CLOUD_TEST_PWD)

    @pytest.mark.asyncio
    async def test_access_level(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_ACC_2, NX_CLOUD_TEST_PWD,
                                get_token, async_run_test_with_auth):
        with CdbAuthSupportAPIBase(host=CDB_TEST_HOST, client=httpx.Client()) as au:
            token = get_token()
            nonce = au.get_nonce(self.system_id, auth=BearerTokenAuth(token=token["access_token"]))

        async def caller_identity(api: CdbAuthSupportAPIBase, auth):

            identity = await api.access_level(
                system_id=self.system_id,
                request_method='POST',
                request_authorization=f"Bearer {token['access_token']}",
                base_nonce=nonce.json()["nonce"],
                auth=auth
            )
            assert identity.is_success
            assert identity.json()["accessRole"] == "owner"

        await async_run_test_with_auth(caller_identity,
                                       api=CdbAuthSupportAPIBase(host=CDB_TEST_HOST, client=httpx.AsyncClient()),
                                       username=NX_CLOUD_TEST_ACC_2, password=NX_CLOUD_TEST_PWD)


class TestCdb2faAPIBase:

    @pytest.mark.asyncio
    async def test_api_get_totp_key(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD, async_run_test_with_auth):
        async def get_totp(api: Cdb2faAPIBase, auth):
            response = await api.get_totp_secret_key(auth=auth)
            assert response.is_success
            assert response.json()["keyUrl"]

        await async_run_test_with_auth(get_totp, Cdb2faAPIBase(host=CDB_TEST_HOST, client=httpx.AsyncClient()),
                                       username=NX_CLOUD_TEST_ACC_1, password=NX_CLOUD_TEST_PWD)

    @pytest.mark.asyncio
    async def test_backup_codes_gen_get_del(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD,
                                            async_run_test_with_auth):
        codes_cnt = 5
        async def run(api: Cdb2faAPIBase, auth):
            # delete
            del_response = await api.delete_backup_codes(auth=auth)
            assert del_response.is_success
            #  check if deleted
            get_response = await api.get_backup_codes(auth=auth)
            assert get_response.is_success
            codes = get_response.json()
            assert len(codes) == 0

            # generate and check if quantity is correct
            gen_response = await api.generate_backup_codes(count=codes_cnt, auth=auth)
            assert gen_response.is_success
            codes = gen_response.json()
            assert len(codes) == codes_cnt
            assert codes[0]["backup_code"]

            # get and check if quantity is correct
            get_response = await api.get_backup_codes(auth=auth)
            assert get_response.is_success
            codes = get_response.json()
            assert len(codes) == codes_cnt

            # delete
            del_response = await api.delete_backup_codes(auth=auth)
            assert del_response.is_success
            #  check if deleted
            get_response = await api.get_backup_codes(auth=auth)
            assert get_response.is_success
            codes = get_response.json()
            assert len(codes) == 0

        await async_run_test_with_auth(run, Cdb2faAPIBase(host=CDB_TEST_HOST, client=httpx.AsyncClient()),
                                       username=NX_CLOUD_TEST_ACC_1, password=NX_CLOUD_TEST_PWD)

    @pytest.mark.asyncio
    async def test_backup_codes_confirm(self, NX_CLOUD_TEST_ACC_1, NX_CLOUD_TEST_PWD):
        codes_cnt = 5
        async with Cdb2faAPIBase(host=CDB_TEST_HOST, client=httpx.AsyncClient()) as api:
            auth = RequestedTokenAuth(cdb_host=CDB_TEST_HOST, client=api.client,
                                      username=NX_CLOUD_TEST_ACC_1, password=NX_CLOUD_TEST_PWD)
            # delete
            del_response = await api.delete_backup_codes(auth=auth)
            assert del_response.is_success

            # generate and check if quantity is correct
            gen_response = await api.generate_backup_codes(count=codes_cnt, auth=auth)
            assert gen_response.is_success
            code = gen_response.json()[0]["backup_code"]
            assert code

            # get and check if quantity is correct
            query_auth = QueryParamAuth(token=auth.token['access_token'])
            get_response = await api.verify_backup_code(code=code, auth=query_auth)
            assert get_response.is_success
            result = get_response.json()
            assert result["resultCode"] == "ok"

            query_auth = RequestedTokenQueryAuth(cdb_host=CDB_TEST_HOST, client=api.client,
                                                 username=NX_CLOUD_TEST_ACC_1, password=NX_CLOUD_TEST_PWD)
            code = gen_response.json()[1]["backup_code"]
            get_response = await api.verify_backup_code(code=code, auth=query_auth)
            assert get_response.is_success
            result = get_response.json()
            assert result["resultCode"] == "ok"

            # delete
            del_response = await api.delete_backup_codes(auth=auth)
            assert del_response.is_success


def email_len_test(username, password, get_token):
    token = get_token(httpx.Client(), username, password)
    print(f'Username:{username}.\nLength:{len(username)}\n.Token:{token}')
    print("Requesting temporary credentials.")
    api = CdbAccountAPIBase(host=CDB_TEST_HOST, client=httpx.Client())
    creds = api.create_temporary_credentials(cred_type="short", auth=BearerTokenAuth(token=token["access_token"]))
    print(f'Status:{creds.status_code}.\nResponse:{creds.json()}')