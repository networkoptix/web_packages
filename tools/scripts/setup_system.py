#!/usr/bin/python3
import argparse
import logging
import requests
import sys
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logging.basicConfig()
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def login(session, host, password="admin"):
    credentials = {"username": "admin", "password": password, "setCookie": True}
    session.post(f"{host}/rest/v1/login/sessions", json=credentials, verify=False)


def setup_system(address, port, system_password, connect_to_cloud=False, disable_auto_discovery=False, instance=None, email=None, password=None):
    host = f"{address}:{port}"
    with requests.Session() as s:
        login(s, host)
        system_name = f"Docker server {port}"
        body = {
            "name": system_name,
            "settings": {},
            "local": {
                "password": system_password
            }
        }
        s.post(f"{host}/rest/v1/system/setup", json=body)
        s.delete(f"{host}/res/v1/login/sessions")
        logger.info(f"{system_name} has been setup on {host}")

        if connect_to_cloud:
            try:
                login(s, host, password=system_password)
                cloud_credentials = {"name": system_name, "email": email, "password": password}
                res = s.post(f"{instance}/api/systems/connect", json=cloud_credentials, verify=False)
                data = res.json()
                cloud_info = {
                    "systemId": data.get("id"),
                    "authKey": data.get("authKey"),
                    "owner": data.get("ownerAccountEmail")
                }
                s.post(f"{host}/rest/v1/system/cloudBind", json=cloud_info)
                s.delete(f"{host}/rest/v1/login/sessions")
                logger.info(f"{system_name} has been connected to {instance} with {email}'s account.")
            except requests.exceptions.HTTPError as e:
                logger.info("Something went wrong. System will be setup without connecting to cloud")
                logger.warning(res.status_code)
                logger.warning(res.content)
                logger.error(e)

        if disable_auto_discovery:
            try:
                login(s, host, password=system_password)
                res = s.patch(f"{host}/rest/v1/system/settings", json={"autoDiscoveryEnabled": False, "autoDiscoveryResponseEnabled": False})
                s.delete(f"{host}/rest/vs/login/sessions")
                logger.info(f"Auto discover disabled for {system_name}")
            except requests.exceptions.HTTPError as e:
                logger.info("Something went wrong. Auto discover couldn't be disabled")
                logger.warning(res.status_code)
                logger.warning(res.content)
                logger.error(e)


def setup_systems(address, ports, system_password, connect_to_cloud=False, disable_auto_discovery=False, instance=None, email=None, password=None):
    for port in ports:
        setup_system(address, port, system_password,
                     connect_to_cloud=connect_to_cloud,
                     disable_auto_discovery=disable_auto_discovery,
                     instance=instance,
                     email=email,
                     password=password)


def get_args(argv):
    description = """Helper script for setting up servers.
    Usage:
    \t ./setup_system address "ports" - Sets up the mediaservers without connnecting to cloud
    \t ./setup_system address "ports" -e user@networkoptix.com -p credentials
    """
    parser = argparse.ArgumentParser("setup_system", description=description,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("address", help="IP address of the host system.")
    parser.add_argument("ports", help="Ports of the host system.")
    parser.add_argument("system_password", help="Password for the servers.")

    parser.add_argument("-c", "--cloud", action='store_true',
                        help="Connect system to cloud after setup.")
    parser.add_argument("-d", "--disable-autodiscover", action='store_true',
                        help="Disables auto discover.")
    parser.add_argument("-i", "--instance", nargs="?", default=False,
                        help="Target cloud instance.")
    parser.add_argument("-e", "--email", nargs="?", default="",
                        help="Email for the cloud account.")
    parser.add_argument("-p", "--password", nargs="?", default="",
                        help="Password for the cloud account.")

    data = parser.parse_args(argv)

    if data.cloud:
        assert data.instance and data.email and data.password

    return data


if __name__ == "__main__":
    cmd_args = get_args(sys.argv[1:])
    setup_systems(cmd_args.address, cmd_args.ports.split(" "), cmd_args.system_password,
                  connect_to_cloud=cmd_args.cloud,
                  disable_auto_discovery=cmd_args.disable_autodiscover,
                  instance=cmd_args.instance,
                  email=cmd_args.email,
                  password=cmd_args.password)
