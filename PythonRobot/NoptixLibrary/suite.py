import time
from contextlib import ExitStack
from typing import Optional
from typing import List
from random import randint
from pyotp import TOTP

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

    def __enter__(self) -> 'Suite':
        return self

    def __exit__(self, *exc_details):
        # Calling close() from context manager's __exit__ will suppress parent exceptions
        self._exit_stack.__exit__(*exc_details)

    def create_cloud_account(self):
        return self._exit_stack.enter_context(CloudAccount())

    def create_cloud_server(self, cloud_owner: 'CloudAccount', suite_name: Optional[str] = None) -> 'CloudServer':
        if suite_name is None:
            suite_name = 'test_cloud_server_'
        return self._exit_stack.enter_context(CloudServer(cloud_owner, suite_name, self.run_id))


class CloudServer:

    def __init__(self, cloud_owner: 'CloudAccount', suite_name, run_id, ports: int = 1):
        self.cloud_owner = cloud_owner
        self.ports = ports
        self.suite_name = suite_name
        self.run_id = run_id

    def __enter__(self) -> 'CloudServer':
        self._set_up()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self._tear_down()

    def _set_up(self):
        # Create a docker server.
        # Mimic configuration from JSON files.
        data = {
            'name': self.suite_name,
            'ports': self.ports
        }
        docker_server_data = _GENERIC_KEYWORDS.create_docker_server(data, self.run_id)
        data.update(docker_server_data)
        self.name = data['name']
        self._container_id = data['container']
        time.sleep(5)  # Wait for the docker server to be ready
        # Set up a local system.
        server_api_port, *_ = data['port']
        server_api_url = f'https://{_GENERIC_KEYWORDS.docker_host_ip}:{server_api_port}'
        self._api = ServerApi(server_api_url, password=INITIAL_PASSWORD)
        self._api.setup_local_system(new_password=self.cloud_owner.password, system_name=self.name)
        # Set up a cloud system.
        bind_info = _CLOUD_API.connect(self.name, self.cloud_owner.email, self.cloud_owner.password)
        self._api.api_connect_to_cloud(bind_info)
        self.id = bind_info['systemId']
        # Wait while the cloud owner settings are applied.
        time.sleep(.1)

    def _tear_down(self):
        try:
            _CLOUD_API.disconnect(
                self.cloud_owner.email,
                self.cloud_owner.password,
                self.id,
                self.cloud_owner.get_otp(),
                )
        finally:
            _DOCKER_API.delete_container(self._container_id)


class CloudAccount:

    def __init__(self):
        self.password = DEFAULT_PASSWORD
        self._totp = None
        self._backup_codes = None

    def __enter__(self) -> '_CloudAccount':
        self._set_up()
        return self

    def setup_2fa(self, totp_secret: str, backup_codes: Optional[List[str]] = None):
        self._totp = TOTP(totp_secret)
        self._backup_codes = backup_codes

    def disable_2fa(self):
        assert self._totp is not None
        self._totp = None
        self._backup_codes = None

    def get_otp(self, at_time=None):
        if self._totp is None:
            return None
        if at_time is None:
            return self._totp.now()
        else:
            return self._totp.at(at_time)

    def pop_backup_code(self):
        assert self._backup_codes is not None
        return self._backup_codes.pop(0)

    def __exit__(self, exc_type, exc_val, exc_tb):
        self._tear_down()

    def _set_up(self):
        self.email = _GENERIC_KEYWORDS.get_random_email(
            _GENERIC_KEYWORDS.base_email,
            _GENERIC_KEYWORDS.from_email
        )
        _CLOUD_API.register_account('Mark', 'Hamill', self.email, self.password)
        _CLOUD_API.activate_account_via_api(self.email, self.password)

    def _tear_down(self):
        _CLOUD_API.delete_account(self.email, self.password, self.get_otp())
