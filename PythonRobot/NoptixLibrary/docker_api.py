import logging

import requests

logger = logging.getLogger(__name__)


class DockerApi(object):
    def __init__(self):
        self.env = "https://cloud-test.hdw.mx"
        self.host_ip = "10.1.5.48"
        self.host_port = 5555
        self.image = "5.1"

    def create_container(self, ports, mac, name, server):
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
            "MacAddress": mac,
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
        assert r.status_code == 201
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
