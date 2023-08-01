import json
import requests
from robot.api import logger

USERNAME = ""
PASSWORD = ""
BACKUP_CODE = None
VERIFICATION_CODE = None


class CloudSession:
    def __init__(
            self,
            instance,
            username,
            password,
            backup_code=None,
            verification_code=None,
            logout=True,
            verify_ssl_cert=True):
        session = requests.Session()
        session.verify = verify_ssl_cert
        self.session = session
        self.instance = instance
        self.username = username
        self.password = password
        self.backup_code = backup_code
        self.verification_code = verification_code
        self.logout = logout

    def __enter__(self):
        return self.login()

    def __exit__(self, exc_type, exc_value, traceback):
        if self.logout:
            self.logout_session()
        pass

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

    def _get_access_code(self):
        data = {
            "client_id": "cloud_portal",
            "grant_type": "password",
            "response_type": "code",
            "email": self.username,
            "password": self.password,
            "redirect_uri": ""
        }
        return self._request_wrapper("/oauth/authenticate", method='post', data=data)

    def _verify_with_2fa(self, code):
        query = {
            "code": code,
            "verification_code": self.verification_code
        }
        return self._request_wrapper("/api/2fa/verification", query=query)

    def _verify_with_backup(self, code):
        query = {
            "code": code,
            "verification_code": self.backup_code
        }
        return self._request_wrapper("/api/2fa/backup", query=query)

    def login(self):
        data = self._get_access_code()
        code = data.get('code') or data.get('access_code')
        if 'error' in data:
            if not self.backup_code and not self.verification_code:
                raise Exception('Verification code is missing')
            try:
                if self.verification_code:
                    self._verify_with_2fa(code)
                else:
                    self._verify_with_backup(code)
            except requests.exceptions.HTTPError as e:
                print(e)
        login_response = self._request_wrapper("/api/account/loginCode", method='post', data={"code": code})
        self.session.headers.update({'X-CSRFToken': self.session.cookies['csrftoken']})
        return self.session

    def logout_session(self):
        self._request_wrapper("/api/account/logout", method='post')

#  Below is an example of use of the CloudSession class above.
# class CloudAuth:
#     def __init__(self, instance="https://cloud-test.hdw.mx"):
#         self.instance = instance
#
#     def _request_wrapper(self, session, url, method='get', query=None, data=None):
#         if method == 'get':
#             request = session.get
#         elif method == 'post':
#             request = session.post
#         elif method == 'put':
#             request = session.put
#         elif method == 'delete':
#             request = session.delete
#         else:
#             raise ValueError(f"method must be get, post, put, or delete not {method}")
#
#         res = request(f"{self.instance}{url}", params=query, json=data)
#         res.raise_for_status()
#         return res.json()
#
#     def get_systems(self, username, password, backup_code=None, verification_code=None):
#         with CloudSession(self.instance, username, password, backup_code, verification_code) as s:
#             return self._request_wrapper(s, "/api/systems")
#
#
#
# if __name__ == "__main__":
#     auth = CloudAuth()
#     systems = auth.get_systems(USERNAME, PASSWORD, backup_code=BACKUP_CODE, verification_code=VERIFICATION_CODE)
#     print(json.dumps(systems, indent=4))
