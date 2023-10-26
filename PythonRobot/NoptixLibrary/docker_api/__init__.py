# See: https://docs.docker.com/engine/api/v1.43/
import copy
import json
import logging
import time
from contextlib import contextmanager
from http import HTTPStatus
from ipaddress import AddressValueError
from ipaddress import IPv4Address
from typing import Any
from typing import Collection
from typing import ContextManager
from typing import Iterator
from typing import Literal
from typing import Mapping
from typing import NamedTuple
from urllib.parse import urlparse

from ._http import _DELETE
from ._http import _GET
from ._http import _HTTPStream
from ._http import _POST
from ._http import _http_stream

_logger = logging.getLogger(__name__.split('.')[-1])


class _HTTPError(Exception):

    def __init__(self, code: int, body: bytes):
        self.code = code
        self.body = body

    def __str__(self):
        return f'HTTP error {self.code}: {self.body}'


class ContainerExists(Exception):

    def __init__(self, container: '_Container'):
        self.container = container

    def __str__(self):
        return f'{self.container} exists'


class ContainerNotFound(Exception):

    def __init__(self, name: str):
        self.name = name

    def __str__(self):
        return f'{self.name} not found'


class DockerHTTPApi:

    _api_version = '1.43'

    def __init__(self, url: str):
        self._url = url
        parsed = urlparse(url)
        self._host = parsed.hostname
        if parsed.port is None:
            if parsed.scheme == 'http':
                self._port = 80
            elif parsed.scheme == 'https':
                self._port = 443
            else:
                raise RuntimeError(f"Wrong URL scheme {parsed.scheme}")
        else:
            self._port = parsed.port

    @contextmanager
    def _http_stream(self) -> ContextManager[_HTTPStream]:
        with _http_stream(self._host, self._port) as http_stream:
            yield http_stream

    def get_json(self, path: str) -> Mapping[str, Any]:
        request = _GET(self._url + path, b'')
        request.add_header('Api-Version', self._api_version)
        with self._http_stream() as http_stream:
            response = http_stream.get_response(request)
            body = http_stream.get_whole_body(response)
        if response.status.code < 200 or response.status.code > 299:
            raise _HTTPError(response.status.code, body)
        return json.loads(body) if body else {}

    def post_json(self, path: str, data: Mapping[str, Any]) -> Mapping[str, Any]:
        body = json.dumps(data).encode("utf-8")
        request = _POST(self._url + path, body)
        request.add_header('Api-Version', self._api_version)
        request.add_header('Content-Type', 'application/json;charset=UTF-8')
        request.add_header('Content-Length', str(len(body)))
        with self._http_stream() as http_stream:
            response = http_stream.get_response(request)
            body = http_stream.get_whole_body(response)
        if response.status.code < 200 or response.status.code > 299:
            raise _HTTPError(response.status.code, body)
        return json.loads(body) if body else {}

    def post_stream(self, path: str, data: Mapping[str, Any]) -> Iterator[bytes]:
        body = json.dumps(data).encode("utf-8")
        request = _POST(self._url + path, body)
        request.add_header('Api-Version', self._api_version)
        request.add_header('Content-Type', 'application/json;charset=UTF-8')
        request.add_header('Content-Length', str(len(body)))
        with self._http_stream() as http_stream:
            response = http_stream.get_response(request)
            if response.status.code < 200 or response.status.code > 299:
                raise _HTTPError(response.status.code, body)
            yield from http_stream.iter_body(response)

    def delete(self, path: str):
        request = _DELETE(self._url + path, b'')
        request.add_header('Api-Version', self._api_version)
        with self._http_stream() as http_stream:
            response = http_stream.get_response(request)
            if response.status.code < 200 or response.status.code > 299:
                raise _HTTPError(response.status.code, b'')

    def __repr__(self):
        return f'<Docker {self._host}:{self._port}>'


class _PortMap(NamedTuple):

    protocol: Literal["tcp", "udp"]
    inner_port: int
    outer_port: int


def get_ports_mapping(container: '_Container') -> Collection[_PortMap]:
    ports_struct = container.inspect()["NetworkSettings"]["Ports"]
    result = []
    for port_string, host_sockets in ports_struct.items():  # type: str, Collection[Mapping[str, str]]
        inner_port_string, protocol = port_string.split("/")
        for host_socket in host_sockets:
            try:
                _ = IPv4Address(host_socket['HostIp'])
            except AddressValueError:
                continue
            result.append(_PortMap(protocol, int(inner_port_string), int(host_socket['HostPort'])))
    return result


class _Container:

    def __init__(self, api: DockerHTTPApi, name: str):
        self._api = api
        self._name = name

    def start(self):
        _logger.info("%r: Starting ...", self)
        try:
            _ = self._api.post_json(f'/containers/{self._name}/start', {})
        except _HTTPError as err:
            if err.code == HTTPStatus.NOT_FOUND:
                raise ContainerNotFound(self._name)
            raise
        _logger.info("%r: Started", self)

    def stop(self):
        _logger.info("%r: Stopping ...", self)
        try:
            _ = self._api.post_json(f'/containers/{self._name}/stop', {})
        except _HTTPError as err:
            if err.code == HTTPStatus.NOT_FOUND:
                raise ContainerNotFound(self._name)
            raise
        _logger.info("%r: Stopped", self)

    def inspect(self) -> Mapping[str, Any]:
        try:
            return self._api.get_json(f'/containers/{self._name}/json')
        except _HTTPError as err:
            if err.code == HTTPStatus.NOT_FOUND:
                raise ContainerNotFound(self._name)
            raise

    def delete(self):
        _logger.info("%r: Removing ...", self)
        try:
            _ = self._api.delete(f'/containers/{self._name}?force=1')
        except _HTTPError as err:
            if err.code == HTTPStatus.NOT_FOUND:
                _logger.info("%r: Not exist", self)
                return
            raise
        _logger.info("%r: Removed", self)

    def __repr__(self):
        return f'<Container {self._name} on {self._api}>'


class _DockerImage:

    def __init__(self, image_name: str, image_tag: str):
        self._image_name = image_name
        self._image_tag = image_tag

    def pull(self, api: DockerHTTPApi):
        _logger.info("%r: Pulling ...", self)
        path = f'/images/create?fromImage={self._image_name}&tag={self._image_tag}'
        log_delay_sec = 2
        next_notification_on = time.monotonic() + log_delay_sec
        for _ in api.post_stream(path, {}):
            if time.monotonic() > next_notification_on:
                _logger.info("%r: Pulling ...", self)
                next_notification_on += log_delay_sec
        _logger.info("%r: Successfully pulled", self)

    def tag(self) -> str:
        return f'{self._image_name}:{self._image_tag}'

    def __repr__(self):
        return f'<Image {self._image_name}:{self._image_tag}>'


class ContainerConfiguration:

    def __init__(self, image_name: str, image_tag: str):
        self._env = {}
        self._image = _DockerImage(image_name, image_tag)
        self._exposed_tcp_ports = []
        self._exposed_udp_ports = []

    def create(self, api: DockerHTTPApi, name: str) -> _Container:
        exposed_ports = [f"{port}/tcp" for port in self._exposed_tcp_ports]
        exposed_ports.extend((f"{port}/udp" for port in self._exposed_udp_ports))
        struct = {
            "Env": [f"{key}={value}" for key, value in self._env.items()],
            "Image": self._image.tag(),
            "ExposedPorts": {port: {} for port in exposed_ports},
            "HostConfig": {
                "RestartPolicy": {"Name": "always"},
                "CapAdd": ["NET_ADMIN"],
                "Privileged": True,
                "PublishAllPorts": True,
                },
            }
        create_path = f'/containers/create?name={name}'
        try:
            container_id = api.post_json(create_path, struct)['Id']
        except _HTTPError as err:
            if err.code == HTTPStatus.NOT_FOUND:
                self._image.pull(api)
                container_id = api.post_json(create_path, struct)
            elif err.code == HTTPStatus.CONFLICT:
                raise ContainerExists(_Container(api, name))
            else:
                raise
        _logger.info("%r: Successfully created container %s [%s]", api, name, container_id)
        return _Container(api, name)

    def with_env(self, env: Mapping[str, str]):
        new_configuration = copy.deepcopy(self)
        new_configuration._env.update(env)
        return new_configuration

    def with_exposed(self, tcp_ports: Collection[int] = (), udp_ports: Collection[int] = ()):
        new_configuration = copy.deepcopy(self)
        new_configuration._exposed_tcp_ports.extend(tcp_ports)
        new_configuration._exposed_udp_ports.extend(udp_ports)
        return new_configuration
