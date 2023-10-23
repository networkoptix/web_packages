import logging
from random import randint

import requests

logger = logging.getLogger(__name__)


class DockerApi(object):
    def __init__(self):
        self.env = "https://cloud-test.hdw.mx"
        self.host_ip = "10.1.5.48"
        self.host_port = 5555
        self.image = "5.1"

    def create_docker_server(self, name: str, server):
        ports = []
        for _ in range(server["ports"]):
            ports.append(self._get_random_port_from_docker_server())
        container = self._create_container(ports, name, server)
        self.start_container(container)
        return {
            "name": name,
            "port": ports,
            "container": container,
            }

    def _create_container(self, ports, name, server):
        port_count = 7001
        PortBindings = {}
        ExposedPorts = {}
        for port in ports:
            ExposedPorts.update({f'{port_count}/tcp': {}})
            PortBindings.update({f'{port_count}/tcp': [{"HostPort": port}]})
            port_count = port_count + 1
        payload = {
            "Env": [f'CLOUD_HOST={self.env.replace("https://", "")}'],
            "Image": self.image,
            "ExposedPorts": ExposedPorts,
            "HostConfig": {
                "RestartPolicy": {
                    "Name": "always"
                },
                "PortBindings": PortBindings,
                "CapAdd": ["NET_ADMIN"],
                "Privileged": True
            }
        }
        if server.get("binds"):
            payload["HostConfig"]["Binds"] = server["binds"]
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

    def _get_random_port_from_docker_server(self):
        usedPorts = []
        docker_api = DockerApi()
        for container in docker_api.list_containers():
            for usedPort in container["Ports"]:
                usedPorts.append(usedPort["PublicPort"])
        port = randint(30000, 65535)
        while port in usedPorts:
            port = randint(30000, 65535)
        return str(port)
