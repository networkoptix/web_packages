import time
from typing import Mapping

import requests
import urllib3
from requests.auth import HTTPBasicAuth
from requests.auth import HTTPDigestAuth
from robot.api import logger

from NoptixLibrary.ServerAPI import ServerAPI

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class APIError(Exception):
    def __init__(self, msg):
        self.msg = msg

    def __str__(self):
        return str(self.msg)


class ServerAPI5(ServerAPI):

    def setup_local_system(self, server_url, new_password, system_name):
        with requests.Session() as s:
            credentials = {'username': 'admin', 'password': 'admin', 'setCookie': True}
            logger.trace(f"{server_url}/rest/v1/login/sessions")
            login_response = s.post(f'{server_url}/rest/v1/login/sessions', json=credentials, verify=False)
            login_response.raise_for_status()
            data = {
                'name': system_name,
                'settings': {
                    'statisticsAllowed': False,
                    'trafficEncryptionForced': False
                },
                'local': {
                    'password': new_password
                }
            }
            r = s.post(f'{server_url}/rest/v1/system/setup', json=data, verify=False)
            r.raise_for_status()

    @staticmethod
    def api_connect_to_cloud(server_url, bind_info: Mapping[str, str]):
        with requests.Session() as s:
            credentials = {'username': 'admin', 'password': 'qweasd 123', 'setCookie': True}
            s.post(f'{server_url}/rest/v1/login/sessions', json=credentials, verify=False)
            cloud_bind_response = s.post(f'{server_url}/rest/v1/system/cloudBind', json=bind_info)
            logger.trace(cloud_bind_response.content)
            cloud_bind_response.raise_for_status()
            logger.trace(cloud_bind_response)

    def save_user(
            self,
            token,
            server_url,
            name,
            permissions,
            email,
            full_name,
            password,
            user_id=None,
            user_role_id=None,
            is_enabled=True,
            is_cloud=True,
            patch=False,
    ):
        body = {
            'email': email,
            'name': name,
            'fullName': full_name,
            'permissions': permissions,
            'isCloud': is_cloud,
        }
        if password:
            body['password'] = password
        if user_id:
            body['id'] = user_id
        if is_cloud:
            body['fullName'] = full_name
        else:
            body['type'] = 'local'
        if user_role_id:
            body['id'] = user_role_id
        logger.trace(f"patch={patch}, name={name}")
        if patch:
            users_response = requests.patch(
                f'{server_url}/rest/v1/users/{user_id}',
                headers={'x-runtime-guid': token},
                json=body,
                verify=False,
            )
        else:
            users_response = requests.post(
                f'{server_url}/rest/v1/users',
                headers={'x-runtime-guid': token},
                json=body,
                verify=False,
            )
        logger.trace(users_response.json())
        users_response.raise_for_status()
        return users_response.json()

    def remove_user(self, token, server_url, user_id):
        users_response = requests.delete(
            f'{server_url}/rest/v1/users/{user_id}',
            headers={'x-runtime-guid': token},
            verify=False,
        )
        users_response.raise_for_status()

    def set_system_settings(self, server_url, settings, token):
        settings_response = requests.patch(
            f'{server_url}/rest/v1/system/settings',
            headers={'x-runtime-guid': token},
            json=settings,
            verify=False,
        )
        settings_response.raise_for_status()
        return settings_response.json()

    def get_system_settings_from_server(self, auth, server_url):
        with requests.Session() as s:
            credentials = {'username': auth[0], 'password': auth[1], 'setCookie': True}
            login_response = s.post(f'{server_url}/rest/v1/login/sessions', json=credentials, verify=False)
            settings_response = s.get(
                f'{server_url}/rest/v1/system/settings?_keepDefault=true',
                auth=HTTPBasicAuth(auth[0], auth[1]),
                verify=False,
            )
            s.delete(f'{server_url}/rest/v1/login/sessions/{login_response.json()["token"]}')
            settings_response.raise_for_status()
            return settings_response.json()

    def get_users(self, token, server_url):
        users_response = requests.get(
            f'{server_url}/rest/v1/users?_format=JSON&_keepDefault=true',
            headers={'x-runtime-guid': token},
            verify=False,
        )
        users_response.raise_for_status()
        return users_response.json()

    def get_storages_via_api(self, server_url):
        with requests.Session() as s:
            credentials = {'username': 'admin', 'password': 'qweasd 123', 'setCookie': True}
            login_response = s.post(f'{server_url}/rest/v1/login/sessions', json=credentials, verify=False)
            token = login_response.json().get('token')
            s.headers.update({'Authorization': 'Bearer ' + token})
            time.sleep(1)
            storages_response = s.get(f'{server_url}/rest/v1/servers/this/storages?_format=JSON', verify=False)
            storages_response.raise_for_status()
            logger.trace(storages_response.text)
            return storages_response.json()

    def save_storages_via_api(self, data, server_url):
        with requests.Session() as s:
            credentials = {'username': 'admin', 'password': 'qweasd 123', 'setCookie': True}
            login_response = s.post(f'{server_url}/rest/v1/login/sessions', json=credentials, verify=False)
            token = login_response.json().get('token')
            list_of_responses = []
            for storage in data:
                s.headers.update({'Authorization': 'Bearer ' + token})
                time.sleep(1)
                logger.trace(storage)
                storages_response = s.patch(
                    f'{server_url}/rest/v1/servers/this/storages/{storage["id"]}',
                    json=storage,
                    verify=False,
                )
                logger.info(storages_response.json())
                list_of_responses.append(storages_response.json())
                storages_response.raise_for_status()
            return list_of_responses

    @staticmethod
    def get_server_token(auth, server_url):
        credentials = {'username': auth[0], 'password': auth[1], 'setCookie': False}
        login_response = requests.post(f'{server_url}/rest/v1/login/sessions', json=credentials, verify=False)
        login_response.raise_for_status()
        return login_response.json()['token']

    @staticmethod
    def get_log_level(auth, server_url):
        with requests.session() as s:
            credentials = {'username': auth[0], 'password': auth[1], 'setCookie': True}
            login_response = s.post(f'{server_url}/rest/v1/login/sessions', json=credentials, verify=False)
            login_response.raise_for_status()
            token = login_response.json().get('token')
            s.headers.update({'Authorization': 'Bearer ' + token})
            log_level_response = s.get(f'{server_url}/api/logLevel', verify=False)
            log_level_response.raise_for_status()
            logger.trace(log_level_response.json())
            return log_level_response.json()['reply']
