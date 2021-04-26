import requests
from requests.auth import HTTPDigestAuth, AuthBase
import urllib3
import time

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class APIError(Exception):
    def __init__(self, msg):
        self.msg = msg

    def __str__(self):
        return str(self.msg)


class BearerAuth(AuthBase):
    def __init__(self, token=None):
        self._token = token

    def __str__(self):
        return self._token

    def __call__(self, r):
        r.headers["Authorization"] = "Bearer " + self._token
        return r


class ServerAPI:
    def __init__(self):
        pass

    def _login(self, server_url, username, password):
        data = {
            "username": username,
            "password": password
        }

        try:
            r = requests.session().post(f'{server_url}/rest/v1/login/sessions', json=data, verify=False)
            if r.status_code != 200:
                raise APIError(f'Cannot log in. Request status: {r.status_code}')
            token = r.json()["token"]
            self._auth = BearerAuth(token)

        except APIError as e:
            print(e)

        except ConnectionError as e:
            print('Cannot log in: connection to the server failed: ', e)

        except Exception as e:
            print('Cannot log in: unexpected error occurred: ', e)

    def rest_get_system_settings(self, auth, server_url):
        with requests.session() as s:
            self._login(server_url, auth[0], auth[1])
            time.sleep(1)
            r = s.get(f'{server_url}/rest/v1/system/info', auth=self._auth, verify=False)
            if r.status_code != 200:
                raise APIError(f'Cannot get system settings: {r.status_code}')
            return r.json()

    def rest_save_user(self, auth, server_url, name, permissions, email, full_name, password, is_cloud=True):

        if is_cloud and (name != email):
            raise APIError('Cannot save user. Email should be the same as name.')

        data = {
            "name": name,
            "email": email,
            "fullName": full_name,
            "permissions": permissions,
            "isEnabled": True,
            "isHttpDigestEnabled": True
        }

        user_type = 'cloud' if is_cloud else 'local'
        data.update({"type": user_type})
        if not is_cloud:
            data.update({"password": password})

        with requests.session() as s:
            self._login(server_url, auth[0], auth[1])
            time.sleep(2)
            r = s.post(f'{server_url}/rest/v1/users', auth=self._auth, json=data, verify=False)
            if r.status_code != 200:
                raise APIError(f'Cannot save user: {r.status_code}')
            return r.json()

    @staticmethod
    def rest_setup_local_system(server_url, password, name):

        data = {
            "name": name,
            "settings": {
                "statisticsAllowed": False,
                "trafficEncryptionForced": False
            },
            "local": {
                "password": password
            }
        }

        with requests.session() as s:
            r = s.post(
                f'{server_url}/rest/v1/system/setup',
                auth=HTTPDigestAuth('admin', 'admin'),
                json=data,
                verify=False
            )
            if r.status_code != 200:
                raise APIError(f'Cannot get system settings: {r.status_code}')
