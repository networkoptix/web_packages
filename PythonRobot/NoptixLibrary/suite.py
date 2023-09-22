import time
from contextlib import ExitStack
from types import MappingProxyType
from typing import Optional, Mapping
from typing import List
from random import randint
from NoptixLibrary.cloud_2fa import TimeBasedOtp

from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from NoptixLibrary.docker_api import DockerApi
from NoptixLibrary.generic_keywords import GenericKeywords
from NoptixLibrary.server_api import DEFAULT_PASSWORD
from NoptixLibrary.server_api import INITIAL_PASSWORD
from NoptixLibrary.server_api import ServerApi

_CLOUD_API = CloudPortalAPI()
_DOCKER_API = DockerApi()
_GENERIC_KEYWORDS = GenericKeywords()


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
        server = Mediaserver(suite_name, self.run_id).set_up()
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
            _GENERIC_KEYWORDS.Add_user_to_cloud_system_if_not_there(
                server.id,
                user,
                cloud_users[user].email,
                [cloud_owner.email, cloud_owner.password],
            )
            print(f"Added {user}: {cloud_users[user].email}")
        server.cloud_admin = cloud_users['cloudAdmin'] if cloud_users else None
        return server

    def create_cloud_users(self):
        cloud_users = {}
        permissions = _GENERIC_KEYWORDS.permissions
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
        self.cloud_owner = None
        self.ports = ports
        self.suite_name = suite_name
        self.run_id = run_id

    def stop(self):
        _DOCKER_API.stop_container(self._container_id)

    def connect_to_cloud(self, cloud_owner: 'CloudAccount'):
        bind_info = _CLOUD_API.connect(self.name, cloud_owner.email, cloud_owner.password)
        self._api.api_connect_to_cloud(bind_info)
        self.id = bind_info['systemId']
        self.cloud_owner = cloud_owner
        # Wait while the cloud owner settings are applied.
        time.sleep(.1)

    def set_up(self):
        # Create a docker server.
        # Mimic configuration from JSON files.
        data = {
            'name': self.suite_name,
            'ports': self.ports,
            }
        docker_server_data = _GENERIC_KEYWORDS.create_docker_server(data, self.run_id)
        data.update(docker_server_data)
        self.name = data['name']
        self._container_id = data['container']
        print(f"Container {self.name} should be up, waiting for 5 secs")
        time.sleep(5)  # Wait for the docker server to be ready
        # Set up a local system.
        server_api_port, *_ = data['port']
        server_api_url = f'https://{_GENERIC_KEYWORDS.docker_host_ip}:{server_api_port}'
        self._api = ServerApi(server_api_url, password=INITIAL_PASSWORD)
        self._api.setup_local_system(new_password=DEFAULT_PASSWORD, system_name=self.name)
        return self

    def tear_down(self):
        if self.cloud_owner is not None:
            _CLOUD_API.disconnect(
                self.cloud_owner.email,
                self.cloud_owner.password,
                self.id,
                self.cloud_owner.get_otp(),
                )
        _DOCKER_API.delete_container(self._container_id)


class CloudAccount:

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
        self.email = _GENERIC_KEYWORDS.get_random_email(
            _GENERIC_KEYWORDS.base_email,
            _GENERIC_KEYWORDS.from_email,
            )
        _CLOUD_API.register_account('Mark', 'Hamill', self.email, self.password)
        _CLOUD_API.activate_account_via_api(self.email, self.password)

    def _tear_down(self):
        _CLOUD_API.delete_account(self.email, self.password, self.get_otp())
