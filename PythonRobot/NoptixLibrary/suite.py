import time
from contextlib import ExitStack
from typing import Self

from NoptixLibrary.CloudPortalAPI import CloudPortalAPI
from NoptixLibrary.DockerApi import DockerApi
from NoptixLibrary.GenericKeywords import GenericKeywords
from NoptixLibrary.server_api import DEFAULT_PASSWORD
from NoptixLibrary.server_api import INITIAL_PASSWORD
from NoptixLibrary.server_api import ServerApi

_CLOUD_API = CloudPortalAPI()
_DOCKER_API = DockerApi()
_GENERIC_KEYWORDS = GenericKeywords()


class Suite:

    def __init__(self):
        self._exit_stack = ExitStack()

    def __enter__(self) -> 'Self':
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self._exit_stack.close()

    def create_cloud_account(self):
        return self._exit_stack.enter_context(_CloudAccount())

    def create_cloud_server(self, cloud_owner: '_CloudAccount') -> 'CloudServer':
        return self._exit_stack.enter_context(CloudServer(cloud_owner))


class CloudServer:

    def __init__(self, cloud_owner: '_CloudAccount'):
        self.cloud_owner = cloud_owner
        self._exit_stack = ExitStack()

    def __enter__(self) -> 'Self':
        self._set_up()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self._tear_down()
        self._exit_stack.close()

    def _set_up(self):
        # Create a docker server.
        # Mimic configuration from JSON files.
        data = {
            'name': 'test_cloud_server_',
            'ports': 1,
        }
        unique_id = time.perf_counter_ns()
        docker_server_data = _GENERIC_KEYWORDS.create_docker_server(data, unique_id)
        data.update(docker_server_data)
        self.name = data['name']
        self._container_id = data['container']
        time.sleep(5)  # Wait for the docker server to be ready
        # Set up a local system.
        server_api_port, *_ = data['port']
        server_api_url = f'https://{_GENERIC_KEYWORDS.docker_host_ip}:{server_api_port}'
        self._api = ServerApi(server_api_url, password=INITIAL_PASSWORD)
        self._api.setup_local_system(new_password=DEFAULT_PASSWORD, system_name=self.name)
        # Set up a cloud system.
        bind_info = _CLOUD_API.connect(self.name, self.cloud_owner.email, DEFAULT_PASSWORD)
        self._api.api_connect_to_cloud(bind_info)
        self.id = bind_info['systemId']
        # Wait while the cloud owner settings are applied.
        time.sleep(10)

    def _tear_down(self):
        try:
            _CLOUD_API.disconnect(self.cloud_owner.email, DEFAULT_PASSWORD, self.id)
        finally:
            _DOCKER_API.delete_container(self._container_id)


class _CloudAccount:

    def __init__(self):
        self.password = DEFAULT_PASSWORD

    def __enter__(self) -> 'Self':
        self._set_up()
        return self

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
        _CLOUD_API.delete_account(self.email, self.password)
