import requests
import random
import time
from robot.api import logger
from robot.libraries.BuiltIn import BuiltIn

def get_variables(ips=BuiltIn().get_variable_value('${QA DOCKER IPS}'), port=BuiltIn().get_variable_value("${QA DOCKER HOST PORT}")):
    # Drop a server if unavailable or get how many containers are running on it, then sort by fewest containers. 
    # Default to 'localhost' for all if available
    # Each suite can overide by setting ${QA BURBANK IP} in *** Variables *** section 
    if 'localhost' in ips:
        if _docker_api_is_available('localhost', port):
            docker_server = 'localhost'
        else:
            docker_server = None
    if docker_server is None:
        docker_server = _assign_docker_server(ips, port)
    return {'QA BURBANK IP': docker_server}

def _assign_docker_server(ips, port):
    wait = random.randint(1,20)
    time.sleep(wait)
    servers = []
    for ip in ips:
        if _docker_api_is_available(ip, port):
            r = requests.get(f'http://{ip}:{port}/containers/json')
            servers.append({'ip': ip, 'containers': len(r.json())})
        else:
            print(ip, "not available")
    if not servers:
        raise RuntimeError(f"None of the servers ({ips}) are available")
    servers.sort(key= lambda x: x.get('containers'))
    return servers[0]['ip']

def _docker_api_is_available(ip: str, port: int) -> bool:
    try:
       response = requests.get(f'http://{ip}:{port}/containers/json')
    except:
        logger.info(f"Can't connect to Docker API on {ip}:{port}")
        return False
    return response.status_code == 200

