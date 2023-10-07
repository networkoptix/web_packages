import time
from contextlib import ExitStack
from types import MappingProxyType
from typing import Collection
from typing import Mapping
from typing import Optional
from typing import List
from random import randint
from NoptixLibrary.cloud_2fa import TimeBasedOtp

from email_access import Email
from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from NoptixLibrary.docker_api import DockerApi
from NoptixLibrary.server_api import DEFAULT_PASSWORD
from NoptixLibrary.server_api import INITIAL_PASSWORD
from NoptixLibrary.server_api import ServerApi

_CLOUD_API = CloudPortalAPI()
_DOCKER_API = DockerApi()


class Suite:

    def __init__(self):
        self.run_id = randint(10000, 100000)
        self._exit_stack = ExitStack()
        self._server_count = 0

    def __enter__(self) -> 'Suite':
        return self

    def __exit__(self, *exc_details):
        # Calling close() from context manager's __exit__ will suppress parent exceptions
        self._exit_stack.__exit__(*exc_details)

    def create_cloud_account(self):
        return self._exit_stack.enter_context(CloudAccount())

    def create_local_server(self, suite_name: Optional[str] = None):
        if suite_name is None:
            suite_name = 'test_cloud_server_'
        self._server_count += 1
        suite_name = f"{suite_name}_{self._server_count}"
        server = Mediaserver(suite_name, self.run_id, ports=2).set_up()
        self._exit_stack.callback(server.tear_down)
        return server

    def create_cloud_server(
            self,
            cloud_owner: 'CloudAccount',
            suite_name: Optional[str] = None,
            cloud_users: Mapping[str, 'CloudAccount'] = MappingProxyType({}),
            ) -> 'Mediaserver':
        server = self.create_local_server(suite_name)
        server.connect_to_cloud(cloud_owner)
        for user in cloud_users:
            _CLOUD_API.add_user_to_cloud(
                server.id,
                user,
                cloud_users[user].email,
                [cloud_owner.email, cloud_owner.password],
                CloudAccount.PERMISSIONS[user]
            )
            print(f"Added {user}: {cloud_users[user].email}")
        if cloud_users:
            started_at = time.monotonic()
            timeout_sec = 30
            requested_users = set([account.email for account in cloud_users.values()])
            while True:
                users = [user['email'] for user in server.api.get_users()]
                if requested_users.issubset(users):
                    break
                if time.monotonic() - started_at > timeout_sec:
                    raise TimeoutError(f"Requested users did not created after {timeout_sec} seconds")
                time.sleep(0.5)
            server._cloud_admin = cloud_users.get('cloudAdmin')
            server._cloud_viewer = cloud_users.get('viewer')
            server._cloud_advanced_viewer = cloud_users.get('advancedViewer')
            server._cloud_live_viewer = cloud_users.get('liveViewer')
            server._cloud_custom_user = cloud_users.get('custom')
        return server

    def create_cloud_users(self, permissions: Optional[Collection[str]] = None):
        cloud_users = {}
        if permissions is not None:
            if not set(permissions).issubset(CloudAccount.PERMISSIONS.keys()):
                raise RuntimeError("Expected permissions are not among available permissions. "
                                   f"Expected: {permissions}, "
                                   f"available: {CloudAccount.PERMISSIONS}")
        else:
            permissions = CloudAccount.PERMISSIONS
        for permission in permissions:
            account = self._exit_stack.enter_context(CloudAccount())
            cloud_users.update({permission: account})
            time.sleep(2)
        return cloud_users


class Mediaserver:

    def __init__(
            self,
            suite_name,
            run_id,
            ports: int = 1,
            ):
        self._cloud_owner = None
        self._cloud_admin = None
        self._cloud_viewer = None
        self._cloud_advanced_viewer = None
        self._cloud_live_viewer = None
        self._cloud_custom_user = None
        self.ports = ports
        self.suite_name = suite_name
        self.run_id = run_id
        self._port_mapping = {}
        self.api: Optional[ServerApi] = None
        self.id: Optional[str] = None
        self.name: Optional[str] = None
        self._container_id: Optional[str] = None

    def stop(self):
        _DOCKER_API.stop_container(self._container_id)

    def connect_to_cloud(self, cloud_owner: 'CloudAccount'):
        bind_info = _CLOUD_API.connect(self.name, cloud_owner.email, cloud_owner.password)
        self.api.api_connect_to_cloud(bind_info)
        self.id = bind_info['systemId']
        self._cloud_owner = cloud_owner
        # Wait while the cloud owner settings are applied.
        time.sleep(.1)

    def get_cloud_admin(self) -> 'CloudAccount':
        if self._cloud_admin is None:
            if self._cloud_owner is None:
                raise RuntimeError("System is not connected to Cloud")
            raise RuntimeError("System does not have cloud admin")
        return self._cloud_admin

    def get_cloud_owner(self) -> 'CloudAccount':
        if self._cloud_owner is None:
            raise RuntimeError("System is not connected to Cloud")
        return self._cloud_owner
    
    def get_cloud_viewer(self) -> 'CloudAccount':
        if self._cloud_viewer is None:
            if self._cloud_owner is None:
                raise RuntimeError("System is not connected to Cloud")
            raise RuntimeError("System does not have cloud viewer")
        return self._cloud_viewer
    
    def get_cloud_advanced_viewer(self) -> 'CloudAccount':
        if self._cloud_advanced_viewer is None:
            if self._cloud_owner is None:
                raise RuntimeError("System is not connected to Cloud")
            raise RuntimeError("System does not have cloud advanced viewer")
        return self._cloud_advanced_viewer
    
    def get_cloud_live_viewer(self) -> 'CloudAccount':
        if self._cloud_live_viewer is None:
            if self._cloud_owner is None:
                raise RuntimeError("System is not connected to Cloud")
            raise RuntimeError("System does not have cloud live viewer")
        return self._cloud_live_viewer

    def get_cloud_custom_user(self) -> 'CloudAccount':
        if self._cloud_custom_user is None:
            if self._cloud_owner is None:
                raise RuntimeError("System is not connected to Cloud")
            raise RuntimeError("System does not have cloud custom user")
        return self._cloud_custom_user
    
    def get_local_users(self):
        return self._local_users()

    def get_server_name(self) -> str:
        server_info = self.api.get_server_info()
        return server_info['name']

    def get_copy_api(self, vms_port=7001, username: str = None, password: str = None) -> ServerApi:
        try:
            new_url = self._port_mapping[vms_port]
        except KeyError:
            raise PortNotMapped(vms_port)
        else:
            token = None
            if username is not None and '@' in username:
                token = _CLOUD_API.get_oauth2_token(self.id, username, password)
            return self.api.copy(url=new_url, token=token)

    def set_up(self):
        # Create a docker server.
        # Mimic configuration from JSON files.
        data = {
            'name': self.suite_name,
            'ports': self.ports,
            }
        docker_server_data = _DOCKER_API.create_docker_server(data, self.run_id)
        data.update(docker_server_data)
        self.name = data['name']
        self._container_id = data['container']
        print(f"Container {self.name} should be up, waiting for 5 secs")
        time.sleep(5)  # Wait for the docker server to be ready
        vms_default_port = 7001
        for index, docker_port in enumerate(data['port']):
            self._port_mapping[vms_default_port + index] = f'https://{_DOCKER_API.host_ip}:{docker_port}'
        # Set up a local system.
        server_api_port, *_ = data['port']
        server_api_url = f'https://{_GENERIC_KEYWORDS.docker_host_ip}:{server_api_port}'
        self._api = ServerApi(server_api_url, password=INITIAL_PASSWORD)
        self._api.setup_local_system(new_password=DEFAULT_PASSWORD, system_name=self.name)
        self._local_users = self.create_local_users()
        return self

    def create_local_users(self):
        local_users = {}
        permissions = _GENERIC_KEYWORDS.permissions
        for permission in permissions:
            self._api.save_user(
                "Local+" + permission,
                permissions[permission],
                f"noptixautoqa+local_{permission}@gmail.com",
                "Local User",
                DEFAULT_PASSWORD,
                is_cloud=False,
                )
            local_users.update(
                {permission: {
                    "login": "Local" + permission,
                    "email": f"noptixautoqa+local_{permission}@gmail.com",
                    },
                }
            )
        return local_users


    def tear_down(self):
        if self._cloud_owner is not None:
            _CLOUD_API.disconnect(
                self._cloud_owner.email,
                self._cloud_owner.password,
                self.id,
                self._cloud_owner.get_otp(),
                )
        _DOCKER_API.delete_container(self._container_id)


class CloudAccount:
    PERMISSIONS = {
        "cloudAdmin": "GlobalAdminPermission|GlobalEditCamerasPermission|GlobalControlVideoWallPermission|GlobalViewLogsPermission|GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalManageBookmarksPermission|GlobalUserInputPermission|GlobalAccessAllMediaPermission",
        "viewer": "GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalAccessAllMediaPermission",
        "liveViewer": "GlobalAccessAllMediaPermission",
        "advancedViewer": "GlobalViewLogsPermission|GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalManageBookmarksPermission|GlobalUserInputPermission|GlobalAccessAllMediaPermission",
        "custom": "NoGlobalPermissions",
        }

    def __init__(self):
        self.password = DEFAULT_PASSWORD
        self._totp = None
        self._backup_codes = None

    def __enter__(self) -> 'CloudAccount':
        self._set_up()
        return self

    def setup_totp(self, totp: TimeBasedOtp):
        self._totp = totp

    def setup_backup_codes(self, backup_codes: List[str]):
        self._backup_codes = backup_codes

    def disable_2fa(self):
        if self._totp is None:
            raise RuntimeError("2FA is not enabled. Time-based One-time Password not found")
        self._totp = None
        self._backup_codes = None

    def get_otp(self, at_time=None):
        if self._totp is None:
            return None
        return self._totp.generate_otp(at_time=at_time)

    def pop_backup_code(self):
        if self._backup_codes is None:
            raise RuntimeError("No backup codes found")
        return self._backup_codes.pop(0)

    def __exit__(self, exc_type, exc_val, exc_tb):
        self._tear_down()

    def _set_up(self):
        self.email = Email.get_random_email(
            'noptixautoqa+sendemail@gmail.com',
            False,
            )
        _CLOUD_API.register_account('Mark', 'Hamill', self.email, self.password)
        _CLOUD_API.activate_account_via_api(self.email, self.password)

    def _tear_down(self):
        _CLOUD_API.delete_account(self.email, self.password, self.get_otp())


class PortNotMapped(Exception):
    def __init__(self, port: int):
        self.msg = f"Port {port} has not been mapped in Docker"

    def __str__(self):
        return self.msg
