import requests

from robot.libraries.BuiltIn import BuiltIn
from robot.api import logger
from robot.api.deco import keyword, library

@library
class DockerApi(object):
    def __init__(self):
        self.docker_host_ip = BuiltIn().get_variable_value("${QA BURBANK IP}")
        self.docker_host_port = BuiltIn().get_variable_value("${QA DOCKER HOST PORT}")
        self.docker_image = BuiltIn().get_variable_value("${IMAGE}")

    @keyword
    def create_container(self, ports, mac, name, server):
        port_count = 7001
        PortBindings = {}
        ExposedPorts = {}
        for port in ports:
            ExposedPorts.update({f'{port_count}/tcp':{}})
            PortBindings.update({f'{port_count}/tcp':[{"HostPort":port}]})
            port_count = port_count + 1
        payload = {
            "Image": self.docker_image,
            "MacAddress": mac,
            "ExposedPorts": ExposedPorts,
            "HostConfig":{ 
                "RestartPolicy":{
                    "Name": "always"
                },
                "PortBindings": PortBindings,
                "CapAdd": ["NET_ADMIN"],
                "Privileged": True
            }
        }
        if server.get("binds"):
            payload["HostConfig"]["Binds"] = server["binds"]
        r = requests.post(f'http://{self.docker_host_ip}:{self.docker_host_port}/containers/create?name={name}', json=payload)
        logger.trace(payload, r.json)
        assert r.status_code == 201 
        return r.json()['Id']

    @keyword    
    def start_container(self, id):
        r = requests.post(f'http://{self.docker_host_ip}:{self.docker_host_port}/containers/{id}/start')
        assert r.status_code == 204 

    @keyword    
    def stop_container(self, id):
        r = requests.post(f'http://{self.docker_host_ip}:{self.docker_host_port}/containers/{id}/stop')
        assert r.status_code == 204 
    
    @keyword    
    def restart_container(self, id):
        r = requests.post(f'http://{self.docker_host_ip}:{self.docker_host_port}/containers/{id}/restart')
        assert r.status_code == 204 

    @keyword    
    def delete_container(self, id):
        r = requests.delete(f'http://{self.docker_host_ip}:{self.docker_host_port}/containers/{id}?force=true')
        assert r.status_code == 204 

    @keyword    
    def list_containers(self):
        r = requests.get(f'http://{self.docker_host_ip}:{self.docker_host_port}/containers/json')
        assert r.status_code == 200
        return r.json()
    
    @keyword
    def prune_containers(self):
        r = requests.post(f'http://{self.docker_host_ip}:{self.docker_host_port}/containers/prune')
        assert r.status_code == 200