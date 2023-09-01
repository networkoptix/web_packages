import time
from typing import Any
from typing import Mapping
from typing import Optional
from typing import Union

import requests
import urllib3
from robot.api import logger

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

_DEFAULT_USERNAME = 'admin'
INITIAL_PASSWORD = 'admin'
_DEFAULT_PASSWORD = 'qweasd 123'  # noqa


class ServerApi:

    def __init__(
            self,
            url: Optional[str] = None,
            username: str = _DEFAULT_USERNAME,
            password: str = _DEFAULT_PASSWORD,
    ):
        self._url = url
        self._username = username
        self._password = password
        self._token: Optional[str] = None

    def setup_local_system(self, new_password, system_name):
        self._post('rest/v1/system/setup', {
            'name': system_name,
            'settings': {
                'statisticsAllowed': False,
                'trafficEncryptionForced': False
            },
            'local': {
                'password': new_password
            }
        })
        self._set_password(new_password)

    def api_connect_to_cloud(self, bind_info: Mapping[str, str]):
        self._post('rest/v1/system/cloudBind', bind_info)

    def save_user(
            self,
            name,
            permissions,
            email,
            full_name,
            password,
            user_id=None,
            user_role_id=None,
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
            return self._patch(f'rest/v1/users/{user_id}', body)
        return self._post('rest/v1/users', body)

    def remove_user(self, user_id):
        self._delete(f'rest/v1/users/{user_id}')

    def get_system_settings_from_server(self):
        return self._get('rest/v1/system/settings?_keepDefault=true')

    def get_users(self):
        return self._get('rest/v1/users?_format=JSON&_keepDefault=true')

    def get_storages_via_api(self):
        return self._get('rest/v1/servers/this/storages?_format=JSON')

    def save_storages_via_api(self, data):
        list_of_responses = []
        for storage in data:
            time.sleep(1)
            response = self._patch(
                f'rest/v1/servers/this/storages/{storage["id"]}', storage)
            list_of_responses.append(response)
        return list_of_responses

    def get_log_level(self):
        return self._get('api/logLevel')

    def _get(self, path: str):
        return self._request('GET', path)

    def _post(self, path: str, data: Mapping[str, Any]):
        return self._request('POST', path, data)

    def _patch(self, path: str, data: Mapping[str, Any]):
        return self._request('PATCH', path, data)

    def _delete(self, path: str):
        return self._request('DELETE', path)

    def _request(
            self,
            method: str,
            path: str,
            data: Optional[Mapping[str, Any]] = None,
    ) -> Union[Mapping[str, Any], Optional[bytes]]:
        response = requests.request(
            method,
            f'{self._url}/{path.rstrip("/")}',
            json=data,
            headers={'Authorization': self._auth_header()},
            verify=False,
        )
        response.raise_for_status()
        try:
            return response.json()
        except requests.exceptions.JSONDecodeError:
            return response.content

    def _auth_header(self) -> str:
        if self._token is None:
            self._token = self._obtain_token(self._username, self._password)
        return f'Bearer {self._token}'

    def _obtain_token(self, username: str, password: str) -> str:
        data = {
            'username': username,
            'password': password,
            'setCookie': False,
        }
        response = requests.post(f'{self._url}/rest/v1/login/sessions', json=data, verify=False)
        response.raise_for_status()
        json_response = response.json()
        return json_response['token']

    def _set_password(self, new_password: str):
        self._password = new_password
        self._token = None
