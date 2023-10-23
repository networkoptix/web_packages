import logging
from typing import Any
from typing import Collection
from typing import Mapping

import requests

logger = logging.getLogger(__name__)


class DockerApi(object):
    def __init__(self):
        self.env = "https://cloud-test.hdw.mx"
        self.host_ip = "10.1.5.48"
        self.host_port = 5555
        self.image = "5.1"

    def create_docker_server(self, name: str, exposed_tcp_ports: Collection[int]):
        ports_as_strings = [f'{port}/tcp' for port in exposed_tcp_ports]
        container = self._create_container(name, ports_as_strings)
        self.start_container(container)
        ports_mapping = {}
        ports_output = self._inspect_container(container)['NetworkSettings']['Ports']
        inspect_ports_mapping: Mapping[str, Collection[Mapping[str, str]]] = ports_output
        for container_port_string, host_sockets in inspect_ports_mapping.items():
            for host_socket in host_sockets:
                if host_socket['HostIp'] == '0.0.0.0':
                    external_port = int(host_socket['HostPort'])
                    container_port = int(container_port_string.rstrip("/tcp"))
                    ports_mapping[container_port] = external_port
        return {
            "name": name,
            "ports_mapping": ports_mapping,
            "container": container,
            }

    def _create_container(self, name: str, exposed_ports: Collection[str]):
        payload = {
            "Env": [f'CLOUD_HOST={self.env.replace("https://", "")}'],
            "Image": self.image,
            "ExposedPorts": {port: {} for port in exposed_ports},
            "HostConfig": {
                "RestartPolicy": {
                    "Name": "always"
                },
                "CapAdd": ["NET_ADMIN"],
                "Privileged": True,
                "PublishAllPorts": True,
            }
        }
        r = requests.post(
            url=f'http://{self.host_ip}:{self.host_port}/containers/create?name={name}',
            json=payload,
            )
        logger.debug(r.content)
        r.raise_for_status()
        return r.json()['Id']

    def start_container(self, id):
        r = requests.post(f'http://{self.host_ip}:{self.host_port}/containers/{id}/start')
        assert r.status_code == 204

    def stop_container(self, id):
        r = requests.post(f'http://{self.host_ip}:{self.host_port}/containers/{id}/stop')
        assert r.status_code == 204

    def restart_container(self, id):
        r = requests.post(f'http://{self.host_ip}:{self.host_port}/containers/{id}/restart')
        assert r.status_code == 204

    def delete_container(self, id):
        r = requests.delete(f'http://{self.host_ip}:{self.host_port}/containers/{id}?force=true')
        assert r.status_code == 204

    def list_containers(self):
        r = requests.get(f'http://{self.host_ip}:{self.host_port}/containers/json')
        assert r.status_code == 200
        return r.json()

    def prune_containers(self):
        r = requests.post(f'http://{self.host_ip}:{self.host_port}/containers/prune')
        assert r.status_code == 200

    def get_container_by_name(self, name):
        r = requests.get(f'http://{self.host_ip}:{self.host_port}/containers/json?name={name}')
        assert r.status_code == 200
        return r.json()

    def _inspect_container(self, id) -> Mapping[str, Any]:
        response = requests.get(f'http://{self.host_ip}:{self.host_port}/containers/{id}/json')
        return response.json()
