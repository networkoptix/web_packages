#!/usr/bin/python3
import argparse
import json
import logging
import requests
import sys
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logging.basicConfig()
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class RequestWrapper:
    def __init__(self, instance):
        self.instance = instance
        self.session = requests.Session()

    def _request_wrapper(self, url, method='get', query=None, data=None):
        if method == 'get':
            request = self.session.get
        elif method == 'post':
            request = self.session.post
        elif method == 'put':
            request = self.session.put
        elif method == 'delete':
            request = self.session.delete
        else:
            raise ValueError(f"method must be get, post, put, or delete not {method}")

        res = request(f"{self.instance}{url}", params=query, json=data)
        res.raise_for_status()
        return res.json()

    def get_cookies(self):
        return self.session.cookies.get_dict()


class CloudAuth(RequestWrapper):
    def __init__(self, instance):
        super().__init__(instance)

    def get_access_code(self, username, password):
        data = {
            "client_id": "cloud_portal",
            "grant_type": "password",
            "response_type": "code",
            "email": username,
            "password": password,
            "redirect_uri": ""
        }
        return self._request_wrapper("/oauth/authenticate", method='post', data=data)

    def verify_with_2fa(self, code, verification_code):
        query = {
            "code": code,
            "verification_code": verification_code
        }
        return self._request_wrapper("/api/2fa/verification", query=query)

    def verify_with_backup(self, code, backup_code):
        query = {
            "code": code,
            "verification_code": backup_code
        }
        return self._request_wrapper("/api/2fa/backup", query=query)

    def login_with_code(self, username, password, backup_code=None, verification_code=None):
        data = self.get_access_code(username, password)
        code = data.get('code') or data.get('access_code')
        if 'error' in data:
            if not backup_code and not verification_code:
                raise Exception('Verification code is missing')
            try:
                if verification_code:
                    self.verify_with_2fa(code, verification_code)
                else:
                    self.verify_with_backup(code, backup_code)
            except requests.exceptions.HTTPError as e:
                logger.error(e)

        res = self._request_wrapper("/api/account/loginCode", method='post', data={"code": code})
        self.session.headers.update({'X-CSRFToken': self.session.cookies['csrftoken']})
        return res

    def logout(self):
        return self._request_wrapper('/api/account/logout', method='post')

    def get_systems(self):
        return self._request_wrapper("/api/systems")

    def disconnect_system(self, system_id):
        return self._request_wrapper("/api/systems/disconnect", method='post', data={"system_id": system_id})

    def mass_disconnect_by_name(self, name, once=False):
        """
        Disconnect all systems from cloud containing the name.
        """
        for system in self.get_systems():
            if name in system.get("name") and system.get("accessRole") == "owner":
                logger.info(f"Disconnecting {system.get('name')}")
                self.disconnect_system(system.get('id'))
                if once:
                    break

    def merge_by_name(self, name, password):
        """
        Merges the the first two systems containing the name.
        """
        systems_to_merge = []
        for system in self.get_systems():
            if name in system.get("name") and \
                    system.get("stateOfHealth") == "online" and \
                    system.get("accessRole") == "owner":
                systems_to_merge.append(system)
        if len(systems_to_merge) < 2:
            logger.error("Not enough docker systems to merge.")
            logger.debug(systems_to_merge)
            return

        master, slave = systems_to_merge[:2]
        merge_data = {
            "master_system_id": master.get("id"),
            "slave_system_id": slave.get("id"),
            "password": password
        }

        try:
            res = self._request_wrapper("/api/systems/merge", "post", data=merge_data)
            logger.info(json.dumps(res, indent=4))
        except requests.exceptions.HTTPError as e:
            logger.error(e)


class CloudAuthManager:
    def __init__(self, instance, email, password, backup_code=None, verification_code=None):
        self.api = CloudAuth(instance)
        self.email = email
        self.password = password
        self.backup_code = backup_code
        self.verification_code = verification_code

    def __enter__(self):
        self.api.login_with_code(
            self.email,
            self.password,
            backup_code=self.backup_code,
            verification_code=self.verification_code
        )
        return self.api

    def __exit__(self, *args, **kwargs):
        self.api.logout()


def get_args(argv):
    gets_message = "Gets all systems related to account with matching credentials from"
    description = f"""Helper script for setting up servers.
    Usage:
    \t ./cloud_api_tool email password - {gets_message} cloud-test
    \t ./cloud_api_tool -i https://dev3.cloud.hdw.mx email password - {gets_message} dev3
    \t ./cloud_api_tool -a disconnect -n ocker email password - Disconnects the first system that contains ocker in the name
    \t ./cloud_api_tool -a disconnect_all -n ocker email password - Disconnects all systems that contain ocker in the name
    \t ./cloud_api_tool -a merge -n ocker email password - Merges the first two systems that contain ocker in the name
    """
    parser = argparse.ArgumentParser("cloud_api_tool", description=description,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("email", help="Email for the cloud account.")
    parser.add_argument("password", help="Password for the cloud account.")
    parser.add_argument("-b", "--backup_code", nargs="?", default="",
                        help="Backup code for 2fa login")
    parser.add_argument("-v", "--verification_code", nargs="?", default="",
                        help="Verification code for 2fa login")

    parser.add_argument("-i", "--instance", nargs="?", default="https://cloud-test.hdw.mx",
                        help="Target cloud instance.")
    parser.add_argument("-a", "--action", nargs="?", default="get_systems",
                        help="Commands for the script to run")
    parser.add_argument("-n", "--name", nargs="?", default="",
                        help="All systems containing the name will be modified by the action")

    data = parser.parse_args(argv)
    if data.action in ["disconnect", "disconnect_all", "merge"]:
        assert data.name

    return data


def main(args):
    action = args.action
    email = args.email
    password = args.password
    system_name = args.name
    with CloudAuthManager(args.instance, email, password,
                          backup_code=args.backup_code,
                          verification_code=args.verification_code) as api:
        if action == "disconnect":
            api.mass_disconnect_by_name(system_name, once=True)
        elif action == "disconnect_all":
            api.mass_disconnect_by_name(system_name)
        elif action == "merge":
            api.merge_by_name(system_name, password)
        else:
            logger.info(json.dumps(api.get_systems(), indent=4))


if __name__ == "__main__":
    main(get_args(sys.argv[1:]))

