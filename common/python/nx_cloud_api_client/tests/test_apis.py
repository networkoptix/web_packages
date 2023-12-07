import uuid

import pytest
import httpx
from uuid import uuid4

from datetime import datetime
from nx_cloud_api_client.base_auth import BearerTokenAuth, QueryParamAuth
from nx_cloud_api_client.apis import CdbAccountAPIBase, CdbSystemAPIBase, CdbSystemTransferAPIBase, \
    CdbAuthSupportAPIBase, Cdb2faAPIBase
from nx_cloud_api_client.tests.conftest import CDB_TEST_HOST


class TestCdbAccountAPIAsync:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.access_token = f"token-{uuid4()}"
        self.username = self.email = f'user-{uuid4()}@exmpale.com'
        self.password = f'password-{uuid4()}'
        self.name = "Full Name"
        self.sync_client = CdbAccountAPIBase(host=CDB_TEST_HOST, client=httpx.Client())
        self.async_client = CdbAccountAPIBase(host=CDB_TEST_HOST, client=httpx.AsyncClient())
        self.customization = "default"
        self.api_base_path = f'{CDB_TEST_HOST}/cdb/account'
        self.bearer_auth = BearerTokenAuth(self.access_token)
        self.basic_auth = httpx.BasicAuth(self.username, self.password)

    @pytest.mark.asyncio
    async def test_account_api_init(self):
        assert self.sync_client.get_full_url('') == self.api_base_path
        assert isinstance(self.sync_client.client, httpx.Client)
        assert isinstance(self.async_client.client, httpx.AsyncClient)

    @pytest.mark.asyncio
    async def test_account_api_register_async(self, mock_request):
        request_mock = mock_request(self.async_client.client, method="POST")
        resp = await self.async_client.register(
            email=self.email, password=self.password,
            customization=self.customization, full_name=self.name)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("POST", f'{self.api_base_path}/register')
        assert args.kwargs["json"] == {
            'email': self.email,
            'password': self.password,
            'customization': self.customization,
            'fullName': self.name}
        assert args.kwargs.get("auth") is None \
               or isinstance(args.kwargs.get("auth"), httpx._client.UseClientDefault)

        # test sync
        request_mock = mock_request(self.sync_client.client, method="POST")
        resp = self.sync_client.register(
            email=self.email, password=self.password,
            customization=self.customization, full_name=self.name)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("POST", f'{self.api_base_path}/register')
        assert args.kwargs["json"] == {
            'email': self.email,
            'password': self.password,
            'customization': self.customization,
            'fullName': self.name}
        assert args.kwargs.get("auth") is None \
               or isinstance(args.kwargs.get("auth"), httpx._client.UseClientDefault)


    @pytest.mark.asyncio
    async def test_account_status_async(self, mock_request):
        request_mock = mock_request(self.async_client.client, method="GET")
        resp = await self.async_client.status(email=self.email)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("GET", f'{self.api_base_path}/{self.email}/status')
        assert args.kwargs.get("json") is None \
               or isinstance(args.kwargs.get("json"), httpx._client.UseClientDefault)
        assert args.kwargs.get("auth") is None \
               or isinstance(args.kwargs.get("auth"), httpx._client.UseClientDefault)

    def test_account_status_sync(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="GET")
        resp = self.sync_client.status(email=self.email)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("GET", f'{self.api_base_path}/{self.email}/status')
        assert args.kwargs.get("json") is None \
               or isinstance(args.kwargs.get("json"), httpx._client.UseClientDefault)
        assert args.kwargs.get("auth") is None \
               or isinstance(args.kwargs.get("auth"), httpx._client.UseClientDefault)

    @pytest.mark.asyncio
    async def test_temporary_credentials_async(self, mock_request):
        request_mock = mock_request(self.async_client.client, method="POST")
        resp = await self.async_client.create_temporary_credentials(
            cred_type="short", auth=self.basic_auth
        )
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("POST", f'{self.api_base_path}/createTemporaryCredentials')
        assert args.kwargs["json"] == {'type': "short"}
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header

        resp = await self.async_client.create_temporary_credentials(
            expiration_period=1000, prolongation_period=2000, auto_prolongation_enabled=True, auth=self.bearer_auth
        )
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("POST", f'{self.api_base_path}/createTemporaryCredentials')
        assert args.kwargs["json"] == {
            "timeouts": {
                "expirationPeriod": 1000,
                "autoProlongationEnabled": True,
                "prolongationPeriod": 2000
            }
        }
        assert args.kwargs["auth"].token == self.bearer_auth.token

        resp = await self.async_client.create_temporary_credentials(
            cred_type="short", expiration_period=1000, prolongation_period=2000,
            auto_prolongation_enabled=True, headers={"Authorization": f"Bearer {self.access_token}"}
        )
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("POST", f'{self.api_base_path}/createTemporaryCredentials')
        assert args.kwargs["json"] == {'type': "short"}
        assert args.kwargs["headers"]["Authorization"] == f"Bearer {self.access_token}"

    def test_temporary_credentials_sync(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="POST")
        resp = self.sync_client.create_temporary_credentials(
            cred_type="short", auth=self.basic_auth
        )
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("POST", f'{self.api_base_path}/createTemporaryCredentials')
        assert args.kwargs["json"] == {'type': "short"}
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header

        resp = self.sync_client.create_temporary_credentials(
            expiration_period=1000, prolongation_period=2000, auto_prolongation_enabled=True, auth=self.bearer_auth
        )
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("POST", f'{self.api_base_path}/createTemporaryCredentials')
        assert args.kwargs["json"] == {
            "timeouts": {
                "expirationPeriod": 1000,
                "autoProlongationEnabled": True,
                "prolongationPeriod": 2000
            }
        }
        assert args.kwargs["auth"].token == self.bearer_auth.token

        resp = self.sync_client.create_temporary_credentials(
            cred_type="short", expiration_period=1000, prolongation_period=2000,
            auto_prolongation_enabled=True, headers={"Authorization": f"Bearer {self.access_token}"}
        )
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("POST", f'{self.api_base_path}/createTemporaryCredentials')
        assert args.kwargs["json"] == {'type': "short"}
        assert args.kwargs["headers"]["Authorization"] == f"Bearer {self.access_token}"

    @pytest.mark.asyncio
    async def test_fetch_account(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="GET")
        resp = self.sync_client.fetch_account(auth=self.bearer_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("GET", f'{self.api_base_path}/self')
        assert args.kwargs["auth"].token == self.bearer_auth.token

        request_mock = mock_request(self.async_client.client, method="GET")
        resp = await self.async_client.fetch_account(auth=self.basic_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("GET", f'{self.api_base_path}/self')
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header

    @pytest.mark.asyncio
    async def test_delete_account(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="DELETE")
        resp = self.sync_client.delete_account(auth=self.bearer_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("DELETE", f'{self.api_base_path}/self')
        assert args.kwargs["auth"].token == self.bearer_auth.token

        request_mock = mock_request(self.async_client.client, method="DELETE")
        resp = await self.async_client.delete_account(auth=self.basic_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("DELETE", f'{self.api_base_path}/self')
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header

    @pytest.mark.asyncio
    async def test_update_account(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="PUT")
        resp = self.sync_client.update_account(password=self.password, full_name=self.name,
                                               auth=self.bearer_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("PUT", f'{self.api_base_path}/self')
        assert args.kwargs["json"] == {'password': self.password, "fullName": self.name}
        assert args.kwargs["auth"].token == self.bearer_auth.token

        request_mock = mock_request(self.async_client.client, method="PUT")
        resp = await self.async_client.update_account(
            password=self.password,
            current_password=self.password,
            full_name=self.name,
            customization=self.customization,
            mfa_code='1111111',
            auth=self.basic_auth
        )
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("PUT", f'{self.api_base_path}/self')
        assert args.kwargs["json"] == {
            "password": self.password,
            "currentPassword": self.password,
            "fullName": self.name,
            "customization": self.customization,
            "mfaCode": '1111111'
        }
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header

    @pytest.mark.asyncio
    async def test_fetch_security_settings(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="GET")
        resp = self.sync_client.fetch_security_settings(auth=self.bearer_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("GET", f'{self.api_base_path}/self/settings/security')
        assert args.kwargs["auth"].token == self.bearer_auth.token

        request_mock = mock_request(self.async_client.client, method="GET")
        resp = await self.async_client.fetch_security_settings(auth=self.basic_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("GET", f'{self.api_base_path}/self/settings/security')
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header

    @pytest.mark.asyncio
    async def test_update_security_settings(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="PUT")
        resp = self.sync_client.update_security_settings(
            password=self.password,
            http_digest_auth_enabled=True,
            account_2fa_enabled=False,
            auth=self.bearer_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("PUT", f'{self.api_base_path}/self/settings/security')
        assert args.kwargs["json"] == {
            "password": self.password,
            "httpDigestAuthEnabled": True,
            "account2faEnabled": False,
        }
        assert args.kwargs["auth"].token == self.bearer_auth.token

        request_mock = mock_request(self.async_client.client, method="PUT")
        resp = await self.async_client.update_security_settings(
            password=self.password,
            http_digest_auth_enabled=True,
            account_2fa_enabled=False,
            totp_exists_for_account=True,
            auth_session_lifetime=4000,
            mfa_code='1111111',
            auth=self.basic_auth
        )
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("PUT", f'{self.api_base_path}/self/settings/security')
        assert args.kwargs["json"] == {
            "password": self.password,
            "mfaCode": '1111111',
            "httpDigestAuthEnabled": True,
            "account2faEnabled": False,
            "totpExistsForAccount": True,
            "authSessionLifetime": 4000
        }
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header


class TestCdbSystemAPIBase:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.access_token = f"token-{uuid4()}"
        self.username = f'user-{uuid4()}@exmpale.com'
        self.password = f'password-{uuid4()}'
        self.system_id = f"sys-id-{uuid4()}"
        self.sync_client = CdbSystemAPIBase(host=CDB_TEST_HOST, client=httpx.Client())
        self.async_client = CdbSystemAPIBase(host=CDB_TEST_HOST, client=httpx.AsyncClient())
        self.customization = "default"
        self.api_base_path = f'{CDB_TEST_HOST}/cdb/systems'
        self.bearer_auth = BearerTokenAuth(self.access_token)
        self.basic_auth = httpx.BasicAuth(self.username, self.password)

    def test_api_init(self):
        assert self.async_client.get_full_url('') == self.api_base_path
        assert isinstance(self.async_client.client, httpx.AsyncClient)
        assert self.sync_client.get_full_url('') == self.api_base_path
        assert isinstance(self.sync_client.client, httpx.Client)

    @pytest.mark.asyncio
    async def test_get_systems(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="GET")
        resp = self.sync_client.get_systems(auth=self.bearer_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("GET", f'{self.api_base_path}')
        assert args.kwargs["auth"].token == self.bearer_auth.token

        request_mock = mock_request(self.async_client.client, method="GET")
        resp = await self.async_client.get_systems(
            customization=self.customization, system_status="online",
            auth=self.basic_auth, params={"passed": "query_string"})
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("GET", f'{self.api_base_path}')
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header
        assert args.kwargs["params"] == {
            "passed": "query_string",
            "customization": self.customization,
            "systemStatus": "online"
        }

    @pytest.mark.asyncio
    async def test_get_system(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="GET")
        resp = self.sync_client.get_system(system_id=self.system_id, auth=self.bearer_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("GET", f'{self.api_base_path}/{self.system_id}')
        assert args.kwargs["auth"].token == self.bearer_auth.token

        request_mock = mock_request(self.async_client.client, method="GET")
        resp = await self.async_client.get_system(
            system_id=self.system_id, auth=self.basic_auth, params={"passed": "query_string"})
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("GET", f'{self.api_base_path}/{self.system_id}')
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header
        assert args.kwargs["params"] == {
            "passed": "query_string",
        }

    @pytest.mark.asyncio
    async def test_bind(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="POST")
        organization_id = str(uuid.uuid4())
        id = str(uuid.uuid4())
        resp = self.sync_client.bind(organization_id=organization_id, id=id, name="sys name", opaque="12345", customization=self.customization,
                                     auth=self.bearer_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("POST", f'{self.api_base_path}/bind')
        assert args.kwargs["json"] == {
            "organizationId": organization_id,
            "id": id,
            "opaque": '12345',
            "name": "sys name",
            "customization": self.customization,
        }
        assert args.kwargs["auth"].token == self.bearer_auth.token

        request_mock = mock_request(self.async_client.client, method="POST")
        resp = await self.async_client.bind(organization_id=organization_id, id=id, name="sys name", opaque="12345", customization=self.customization,
                                            auth=self.basic_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("POST", f'{self.api_base_path}/bind')
        assert args.kwargs["json"] == {
            "organizationId": organization_id,
            "id": id,
            "opaque": '12345',
            "name": "sys name",
            "customization": self.customization,
        }
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header

    @pytest.mark.asyncio
    async def test_update_system(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="PUT")
        resp = self.sync_client.update_system(
            system_id=self.system_id,
            name="sys name", opaque="12345",
            system_2fa_enabled=True, mfa_code='111111',
            auth=self.bearer_auth
        )
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("PUT", f'{self.api_base_path}/{self.system_id}')
        assert args.kwargs["json"] == {
            "opaque": '12345',
            "name": "sys name",
            "mfa_code": "111111",
            "system_2fa_enabled": True
        }
        assert args.kwargs["auth"].token == self.bearer_auth.token

        request_mock = mock_request(self.async_client.client, method="PUT")
        resp = await self.async_client.update_system(
            system_id=self.system_id,
            name="sys name", opaque="12345",
            mfa_code='111111',
            auth=self.basic_auth
        )
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("PUT", f'{self.api_base_path}/{self.system_id}')
        assert args.kwargs["json"] == {
            "opaque": '12345',
            "name": "sys name",
            "mfa_code": "111111",
        }
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header

    @pytest.mark.asyncio
    async def test_delete_system(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="DELETE")
        resp = self.sync_client.delete_system(
            system_id=self.system_id,
            auth=self.bearer_auth
        )
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("DELETE", f'{self.api_base_path}/{self.system_id}')
        assert args.kwargs["auth"].token == self.bearer_auth.token

        request_mock = mock_request(self.async_client.client, method="DELETE")
        resp = await self.async_client.delete_system(
            system_id=self.system_id,
            auth=self.basic_auth
        )
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("DELETE", f'{self.api_base_path}/{self.system_id}')
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header

    @pytest.mark.asyncio
    async def test_get_cloud_users(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="GET")
        resp = self.sync_client.get_cloud_users(
            system_id=self.system_id,
            auth=self.bearer_auth
        )
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("GET", f'{self.api_base_path}/{self.system_id}/users')
        assert args.kwargs["auth"].token == self.bearer_auth.token

        request_mock = mock_request(self.async_client.client, method="GET")
        resp = await self.async_client.get_cloud_users(
            system_id=self.system_id,
            auth=self.basic_auth
        )
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("GET", f'{self.api_base_path}/{self.system_id}/users')
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header

    @pytest.mark.asyncio
    async def test_share_system(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="POST")
        resp = self.sync_client.share_system(
            system_id=self.system_id,
            user_email=self.username,
            user_role='admin_role_',
            access_role='access_role_',
            custom_permissions='permission',
            is_enabled=True,
            vms_user_id='12345',
            send_notification=True,
            auth=self.bearer_auth
        )
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("POST", f'{self.api_base_path}/{self.system_id}/users')
        assert args.kwargs["params"]["sendNotification"] is True
        assert args.kwargs["auth"].token == self.bearer_auth.token
        assert args.kwargs["json"] == {
            "accountEmail": self.username,
            "accessRole": 'access_role_',
            "userRoleId": 'admin_role_',
            "customPermissions": 'permission',
            "isEnabled": True,
            "vmsUserId": '12345'
        }

        request_mock = mock_request(self.async_client.client, method="POST")
        resp = await self.async_client.share_system(
            system_id=self.system_id,
            user_email=self.username,
            user_role='admin_role_',
            access_role='access_role_',
            custom_permissions='permission',
            is_enabled=True,
            auth=self.basic_auth
        )
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("POST", f'{self.api_base_path}/{self.system_id}/users')
        assert args.kwargs["params"] is None
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header
        assert args.kwargs["json"] == {
            "accountEmail": self.username,
            "accessRole": 'access_role_',
            "userRoleId": 'admin_role_',
            "customPermissions": 'permission',
            "isEnabled": True,
        }

    @pytest.mark.asyncio
    async def test_stop_sharing_system(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="DELETE")
        resp = self.sync_client.stop_sharing_system(
            system_id=self.system_id,
            user_email=self.username,
            auth=self.bearer_auth
        )
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("DELETE", f'{self.api_base_path}/{self.system_id}/users/{self.username}')
        assert args.kwargs["auth"].token == self.bearer_auth.token

        request_mock = mock_request(self.async_client.client, method="DELETE")
        resp = await self.async_client.stop_sharing_system(
            system_id=self.system_id,
            user_email=self.username,
            auth=self.basic_auth
        )
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("DELETE", f'{self.api_base_path}/{self.system_id}/users/{self.username}')
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header

    @pytest.mark.asyncio
    async def test_health_history(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="GET")
        resp = self.sync_client.health_history(
            system_id=self.system_id,
            auth=self.bearer_auth
        )
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("GET", f'{self.api_base_path}/{self.system_id}/health-history')
        assert args.kwargs["auth"].token == self.bearer_auth.token

        request_mock = mock_request(self.async_client.client, method="GET")
        resp = await self.async_client.health_history(
            system_id=self.system_id,
            auth=self.basic_auth
        )
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("GET", f'{self.api_base_path}/{self.system_id}/health-history')
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header

    @pytest.mark.asyncio
    async def test_merge_systems(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="POST")
        resp = self.sync_client.merge_systems(
            system_id=self.system_id,
            master_system_access_token=self.access_token,
            slave_system_access_token=self.access_token + '1',
            auth=self.bearer_auth
        )
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("POST", f'{self.api_base_path}/{self.system_id}/merged_systems/')
        assert args.kwargs["auth"].token == self.bearer_auth.token
        assert args.kwargs["json"] == {
            "masterSystemAccessToken": self.access_token,
            "slaveSystemAccessToken": self.access_token + '1'
        }

        request_mock = mock_request(self.async_client.client, method="POST")
        resp = await self.async_client.merge_systems(
            system_id=self.system_id,
            master_system_access_token=self.access_token,
            slave_system_access_token=self.access_token + '1',
            auth=self.basic_auth
        )
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("POST", f'{self.api_base_path}/{self.system_id}/merged_systems/')
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header
        assert args.kwargs["json"] == {
            "masterSystemAccessToken": self.access_token,
            "slaveSystemAccessToken": self.access_token + '1'
        }


class TestCdbSystemTransferAPIBase:

    @pytest.fixture(autouse=True)
    def setup(self):
        self.access_token = f"token-{uuid4()}"
        self.username = f'user-{uuid4()}@exmpale.com'
        self.to_username = f'user-{uuid4()}@exmpale.com'
        self.password = f'password-{uuid4()}'
        self.system_id = f"sys-id-{uuid4()}"
        self.string = f'rand-str-{uuid4()}'
        self.sync_client = CdbSystemTransferAPIBase(host=CDB_TEST_HOST, client=httpx.Client())
        self.async_client = CdbSystemTransferAPIBase(host=CDB_TEST_HOST, client=httpx.AsyncClient())
        self.customization = "default"
        self.api_base_path = f'{CDB_TEST_HOST}/cdb/offered-systems'
        self.bearer_auth = BearerTokenAuth(self.access_token)
        self.basic_auth = httpx.BasicAuth(self.username, self.password)

    def test_api_init(self):
        assert self.async_client.get_full_url('') == self.api_base_path
        assert isinstance(self.async_client.client, httpx.AsyncClient)
        assert self.sync_client.get_full_url('') == self.api_base_path
        assert isinstance(self.sync_client.client, httpx.Client)

    @pytest.mark.asyncio
    async def test_systems_offers(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="GET")
        resp = self.sync_client.systems_offers(auth=self.bearer_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("GET", f'{self.api_base_path}')
        assert args.kwargs["auth"].token == self.bearer_auth.token

        request_mock = mock_request(self.async_client.client, method="GET")
        resp = await self.async_client.systems_offers(auth=self.basic_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("GET", f'{self.api_base_path}')
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header

    @pytest.mark.asyncio
    async def test_offer_system(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="POST")
        resp = self.sync_client.offer_system(
            system_id=self.system_id, to_account=self.to_username,
            comment=self.string, auth=self.bearer_auth)

        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("POST", f'{self.api_base_path}')
        assert args.kwargs["json"] == {
            "toAccount": self.to_username,
            "systemId": self.system_id,
            "comment": self.string
        }
        assert args.kwargs["auth"].token == self.bearer_auth.token

        request_mock = mock_request(self.async_client.client, method="POST")
        resp = await self.async_client.offer_system(
            system_id=self.system_id, to_account=self.to_username,
            comment=self.string, auth=self.basic_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("POST", f'{self.api_base_path}')
        assert args.kwargs["json"] == {
            "toAccount": self.to_username,
            "systemId": self.system_id,
            "comment": self.string
        }
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header

    @pytest.mark.asyncio
    async def test_stop_sharing_system(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="DELETE")
        resp = self.sync_client.delete_offer(
            system_id=self.system_id,
            auth=self.bearer_auth
        )
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("DELETE", f'{self.api_base_path}/{self.system_id}')
        assert args.kwargs["auth"].token == self.bearer_auth.token

        request_mock = mock_request(self.async_client.client, method="DELETE")
        resp = await self.async_client.delete_offer(
            system_id=self.system_id,
            auth=self.basic_auth
        )
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("DELETE", f'{self.api_base_path}/{self.system_id}')
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header

    @pytest.mark.asyncio
    async def test_offer_system(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="PUT")
        resp = self.sync_client.update_offer(
            system_id=self.system_id, status="rejected",
            comment=self.string, auth=self.bearer_auth)

        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("PUT", f'{self.api_base_path}/{self.system_id}')
        assert args.kwargs["json"] == {
            "status": "rejected",
            "comment": self.string
        }
        assert args.kwargs["auth"].token == self.bearer_auth.token

        request_mock = mock_request(self.async_client.client, method="PUT")
        resp = await self.async_client.update_offer(
            system_id=self.system_id, status="accepted", auth=self.basic_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("PUT", f'{self.api_base_path}/{self.system_id}')
        assert args.kwargs["json"] == {
            "status": "accepted",
        }
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header

    @pytest.mark.asyncio
    async def test_accept_offer(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="PUT")
        resp = self.sync_client.accept_offer(
            system_id=self.system_id, auth=self.bearer_auth)

        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("PUT", f'{self.api_base_path}/{self.system_id}')
        assert args.kwargs["json"] == {
            "status": "accepted",
        }
        assert args.kwargs["auth"].token == self.bearer_auth.token

        request_mock = mock_request(self.async_client.client, method="PUT")
        resp = await self.async_client.accept_offer(
            system_id=self.system_id, auth=self.basic_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("PUT", f'{self.api_base_path}/{self.system_id}')
        assert args.kwargs["json"] == {
            "status": "accepted",
        }
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header

    @pytest.mark.asyncio
    async def test_reject_offer(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="PUT")
        resp = self.sync_client.reject_offer(
            system_id=self.system_id, auth=self.bearer_auth)

        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("PUT", f'{self.api_base_path}/{self.system_id}')
        assert args.kwargs["json"] == {
            "status": "rejected",
        }
        assert args.kwargs["auth"].token == self.bearer_auth.token

        request_mock = mock_request(self.async_client.client, method="PUT")
        resp = await self.async_client.reject_offer(
            system_id=self.system_id, auth=self.basic_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("PUT", f'{self.api_base_path}/{self.system_id}')
        assert args.kwargs["json"] == {
            "status": "rejected",
        }
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header


class TestCdbAuthSupportAPIBase:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.access_token = f"token-{uuid4()}"
        self.username = f'user-{uuid4()}@exmpale.com'
        self.to_username = f'user-{uuid4()}@exmpale.com'
        self.password = f'password-{uuid4()}'
        self.system_id = f"sys-id-{uuid4()}"
        self.string = f'rand-str-{uuid4()}'
        self.sync_client = CdbAuthSupportAPIBase(host=CDB_TEST_HOST, client=httpx.Client())
        self.async_client = CdbAuthSupportAPIBase(host=CDB_TEST_HOST, client=httpx.AsyncClient())
        self.customization = "default"
        self.api_base_path = f'{CDB_TEST_HOST}/cdb/auth'
        self.bearer_auth = BearerTokenAuth(self.access_token)
        self.basic_auth = httpx.BasicAuth(self.username, self.password)

    def test_api_init(self):
        assert self.async_client.get_full_url('') == self.api_base_path
        assert isinstance(self.async_client.client, httpx.AsyncClient)
        assert self.sync_client.get_full_url('') == self.api_base_path
        assert isinstance(self.sync_client.client, httpx.Client)

    @pytest.mark.asyncio
    async def test_get_nonce(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="GET")
        resp = self.sync_client.get_nonce(system_id=self.system_id, auth=self.bearer_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("GET", f'{self.api_base_path}/getNonce')
        assert args.kwargs["auth"].token == self.bearer_auth.token
        assert args.kwargs["params"]["systemId"] == self.system_id

        request_mock = mock_request(self.async_client.client, method="GET")
        resp = await self.async_client.get_nonce(system_id=self.system_id, auth=self.basic_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("GET", f'{self.api_base_path}/getNonce')
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header
        assert args.kwargs["params"]["systemId"] == self.system_id

    @pytest.mark.asyncio
    async def test_caller_identity(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="POST")
        resp = self.sync_client.caller_identy(
            request_method="POST",
            request_authorization=f"Bearer {self.access_token}",
            base_nonce=self.string,
            auth=self.bearer_auth
        )

        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("POST", f'{self.api_base_path}_provider/caller-identity')
        assert args.kwargs["auth"].token == self.bearer_auth.token
        assert args.kwargs["json"] == {
            "requestMethod": "POST",
            "requestAuthorization": f"Bearer {self.access_token}",
            "baseNonce": self.string
        }

        request_mock = mock_request(self.async_client.client, method="POST")
        resp = await self.async_client.caller_identy(
            request_method="POST",
            request_authorization=f"Bearer {self.access_token}",
            base_nonce=self.string,
            auth=self.basic_auth
        )
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("POST", f'{self.api_base_path}_provider/caller-identity')
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header
        assert args.kwargs["json"] == {
            "requestMethod": "POST",
            "requestAuthorization": f"Bearer {self.access_token}",
            "baseNonce": self.string
        }

    @pytest.mark.asyncio
    async def test_access_level(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="POST")
        resp = self.sync_client.access_level(
            system_id=self.system_id,
            request_method="POST",
            request_authorization=f"Bearer {self.access_token}",
            base_nonce=self.string,
            auth=self.bearer_auth
        )

        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("POST", f'{self.api_base_path}_provider/system/{self.system_id}/access-level')
        assert args.kwargs["auth"].token == self.bearer_auth.token
        assert args.kwargs["json"] == {
            "requestMethod": "POST",
            "requestAuthorization": f"Bearer {self.access_token}",
            "baseNonce": self.string
        }

        request_mock = mock_request(self.async_client.client, method="POST")
        resp = await self.async_client.access_level(
            system_id=self.system_id,
            request_method="POST",
            request_authorization=f"Bearer {self.access_token}",
            base_nonce=self.string,
            auth=self.basic_auth
        )
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("POST", f'{self.api_base_path}_provider/system/{self.system_id}/access-level')
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header
        assert args.kwargs["json"] == {
            "requestMethod": "POST",
            "requestAuthorization": f"Bearer {self.access_token}",
            "baseNonce": self.string
        }


class TestCdb2faAPIBase:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.access_token = f"token-{uuid4()}"
        self.refresh_token = f"refresh-{uuid4()}"
        self.username = f'user-{uuid4()}@exmpale.com'
        self.password = f'password-{uuid4()}'
        self.system_id = f"sys-id-{uuid4()}"
        self.string = f'rand-str-{uuid4()}'
        self.valid_token = {
            "access_token": self.access_token,
            "refresh_token": self.refresh_token,
            "expires_in": "3600",
            "expires_at": f"{int(datetime.now().timestamp() + 3000) * 1000}",
            "token_type": "bearer",
            "scope": "cloud-test.hdw.mx cloudSystemId=*"
        }
        self.sync_client = Cdb2faAPIBase(host=CDB_TEST_HOST, client=httpx.Client())
        self.async_client = Cdb2faAPIBase(host=CDB_TEST_HOST, client=httpx.AsyncClient())
        self.customization = "default"
        self.api_base_path = f'{CDB_TEST_HOST}/cdb/account/self/2fa'
        self.bearer_auth = BearerTokenAuth(self.access_token)
        self.basic_auth = httpx.BasicAuth(self.username, self.password)

    def test_api_init(self):
        assert self.async_client.get_full_url('') == self.api_base_path
        assert isinstance(self.async_client.client, httpx.AsyncClient)
        assert self.sync_client.get_full_url('') == self.api_base_path
        assert isinstance(self.sync_client.client, httpx.Client)

    @pytest.mark.asyncio
    async def test_get_totp_secret_key(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="POST")
        resp = self.sync_client.get_totp_secret_key(auth=self.bearer_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("POST", f'{self.api_base_path}/totp/key')
        assert args.kwargs["auth"].token == self.bearer_auth.token

        request_mock = mock_request(self.async_client.client, method="POST")
        resp = await self.async_client.get_totp_secret_key(auth=self.basic_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("POST", f'{self.api_base_path}/totp/key')
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header

    @pytest.mark.asyncio
    async def test_delete_totp_secret_key(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="DELETE")
        resp = self.sync_client.delete_totp_secret_key(auth=self.bearer_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("DELETE", f'{self.api_base_path}/totp/key')
        assert args.kwargs["auth"].token == self.bearer_auth.token

        request_mock = mock_request(self.async_client.client, method="DELETE")
        resp = await self.async_client.delete_totp_secret_key(auth=self.basic_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("DELETE", f'{self.api_base_path}/totp/key')
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header

    @pytest.mark.asyncio
    async def test_generate_backup_codes(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="POST")
        resp = self.sync_client.generate_backup_codes(count=3, auth=self.bearer_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("POST", f'{self.api_base_path}/backup-code/')
        assert args.kwargs["auth"].token == self.bearer_auth.token
        assert args.kwargs["json"] == {
            "count": 3
        }

        request_mock = mock_request(self.async_client.client, method="POST")
        resp = await self.async_client.generate_backup_codes(count=3, auth=self.basic_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("POST", f'{self.api_base_path}/backup-code/')
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header
        assert args.kwargs["json"] == {
            "count": 3
        }

    @pytest.mark.asyncio
    async def test_get_backup_codes(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="GET")
        resp = self.sync_client.get_backup_codes(auth=self.bearer_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("GET", f'{self.api_base_path}/backup-code/')
        assert args.kwargs["auth"].token == self.bearer_auth.token

        request_mock = mock_request(self.async_client.client, method="POST")
        resp = await self.async_client.get_backup_codes(auth=self.basic_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("GET", f'{self.api_base_path}/backup-code/')
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header

    @pytest.mark.asyncio
    async def test_delete_backup_codes(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="DELETE")
        resp = self.sync_client.delete_backup_codes(auth=self.bearer_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("DELETE", f'{self.api_base_path}/backup-code/')
        assert args.kwargs["auth"].token == self.bearer_auth.token

        request_mock = mock_request(self.async_client.client, method="DELETE")
        resp = await self.async_client.delete_backup_codes(auth=self.basic_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("DELETE", f'{self.api_base_path}/backup-code/')
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header

    @pytest.mark.asyncio
    async def test_delete_backup_code(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="DELETE")
        resp = self.sync_client.delete_backup_code(code=self.string, auth=self.bearer_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("DELETE", f'{self.api_base_path}/backup-code/{self.string}')
        assert args.kwargs["auth"].token == self.bearer_auth.token

        request_mock = mock_request(self.async_client.client, method="DELETE")
        resp = await self.async_client.delete_backup_code(code=self.string, auth=self.basic_auth)
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("DELETE", f'{self.api_base_path}/backup-code/{self.string}')
        assert args.kwargs["auth"]._auth_header == self.basic_auth._auth_header

    @pytest.mark.asyncio
    async def test_verify_backup_code(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="GET", data=self.valid_token)
        resp = self.sync_client.verify_backup_code(code=self.string, auth=QueryParamAuth(token=self.access_token))
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("GET", f'{self.api_base_path}/backup-code/{self.string}')
        assert args.kwargs["auth"].query_param_value == self.access_token

        request_mock = mock_request(self.async_client.client, method="GET", data=self.valid_token)
        resp = await self.async_client.verify_backup_code(code=self.string,
                                                          auth=QueryParamAuth(token=self.access_token))
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("GET", f'{self.api_base_path}/backup-code/{self.string}')
        assert args.kwargs["auth"].query_param_value == self.access_token

    @pytest.mark.asyncio
    async def test_verify_2fa_code(self, mock_request):
        request_mock = mock_request(self.sync_client.client, method="GET", data=self.valid_token)
        resp = self.sync_client.verify_2fa_code(mfa_code=self.string,
                                                auth=QueryParamAuth(token=self.access_token))
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("GET", f'{self.api_base_path}/totp/key/{self.string}')
        assert args.kwargs["auth"].query_param_value == self.access_token

        request_mock = mock_request(self.async_client.client, method="GET", data=self.valid_token)
        resp = await self.async_client.verify_2fa_code(mfa_code=self.string,
                                                       auth=QueryParamAuth(token=self.access_token))
        assert resp.is_success
        args = request_mock.call_args
        assert args.args == ("GET", f'{self.api_base_path}/totp/key/{self.string}')
        assert args.kwargs["auth"].query_param_value == self.access_token


