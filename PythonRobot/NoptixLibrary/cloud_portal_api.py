import logging
import os
import tempfile
import time
from contextlib import contextmanager
from pathlib import Path
from typing import ContextManager
from typing import Mapping

import certifi
import requests
import urllib3
from requests.exceptions import ReadTimeout
from urllib.parse import unquote
from requests import HTTPError
from requests.auth import HTTPBasicAuth

from NoptixLibrary.cloud_2fa import TimeBasedOtp
from NoptixLibrary.cloud_session import CloudSession

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

_letsencrypt_stage_cert_path = str(Path(__file__).parent / 'letsencrypt-stg.crt')
if os.getenv('LETSENCRYPT_STAGE_CERT_REQUIRED'):
    with tempfile.NamedTemporaryFile(mode='a+b', suffix='.pem', delete=False) as certs_file:
        with open(_letsencrypt_stage_cert_path, 'rb') as letsencrypt_stage_cert:
            certs_file.write(letsencrypt_stage_cert.read())
        with open(certifi.where(), 'rb') as trusted_certs:
            certs_file.write(trusted_certs.read())
        _ssl_certs_path = Path(certs_file.name)
else:
    _ssl_certs_path = Path(certifi.where())


class CloudPortalAPI(object):

    def __init__(
            self,
            env='https://test.ft-cloud.hdw.mx',
            password='qweasd 123',
            email='noptixautoqa@gmail.com',
            ):
        self.env = env
        self.password = password
        self.baseEmail = email
        self._is_debug = self._check_debug_status()

    @contextmanager
    def _session(
            self,
            email,
            password,
            *,
            backup_code=None,
            verification_code=None,
            logout=True,
            ) -> ContextManager[requests.Session]:
        with CloudSession(
                self.env, email, password, backup_code, verification_code, logout,
                verify_ssl_cert=_ssl_certs_path) as session:
            yield session

    def api_log_in(self, email, password, backup_code=None, verification_code=None):
        cloud_session = CloudSession(
            self.env,
            email,
            password,
            backup_code,
            verification_code,
            verify_ssl_cert=_ssl_certs_path,
            )
        cloud_session.login()
        return cloud_session

    def get_access_code(self, email, password):
        data = {
            "client_id": "cloud_portal",
            "grant_type": "password",
            "response_type": "code",
            "email": email,
            "password": password,
            "redirect_uri": self.env,
            }
        with requests.session() as s:
            authenticate_response = s.post(
                url=f'{self.env}/oauth/authenticate',
                data=data,
                verify=_ssl_certs_path,
                )
            logger.debug(authenticate_response.content)
            authenticate_response.raise_for_status()
            return authenticate_response.json()

    def cdb_merge_cloud_systems(
            self,
            master_id: str,
            slave_id: str,
            email: str,
            password: str,
            master_vms_token: str,
            slave_vms_token: str,
            ):
        cdb_merge_response = requests.post(
            url=f'{self.env}/cdb/systems/{master_id}/merged_systems/',
            auth=HTTPBasicAuth(email, password),
            json={
                "systemId": slave_id,
                "masterSystemAccessToken": master_vms_token,
                "slaveSystemAccessToken": slave_vms_token,
                },
            verify=False,
            )
        cdb_merge_response.raise_for_status()
        return cdb_merge_response.json()

    def cdb_system_status(self, system_id: str, email: str, password: str):
        cdb_system_status_response = requests.get(
            url=f'{self.env}/cdb/systems/{system_id}',
            auth=HTTPBasicAuth(email, password),
            verify=False,
            )
        cdb_system_status_response.raise_for_status()
        return cdb_system_status_response.json()

    def change_password(self, email, old_password, new_password):
        with self._session(email, old_password) as s:
            s.headers.update({"referer": f"{self.env}/account/password"})
            data = {'old_password': old_password, 'new_password': new_password}
            change_pass_response = s.post(f'{self.env}/api/account/changePassword', data)
            return change_pass_response.raise_for_status()

    def get_account_data(self, email, password):
        with self._session(email, password) as s:
            account_response = s.get(f'{self.env}/api/account/')
            account_response.raise_for_status()
            return account_response.json()

    def get_account_systems(self, email, password):
        with self._session(email, password) as s:
            s.headers.update({"Referer": self.env})
            systems_response = s.get(f'{self.env}/api/systems/')
            systems_response.raise_for_status()
            return systems_response.json()

    def set_account_language(self, email, password, new_language='en_US'):
        with self._session(email, password) as s:
            s.headers.update({"Referer": self.env})
            set_language_response = s.post(
                url=f'{self.env}/api/utils/language/',
                json={'language': new_language},
                )
            set_language_response.raise_for_status()
            return set_language_response.json()

    def set_user_theme(self, email, password, theme):
        with self._session(email, password) as s:
            s.headers.update({"Referer": self.env})
            set_user_theme_response = s.post(
                f'{self.env}/api/custom-properties/theme/{email}',
                auth=HTTPBasicAuth(email, password),
                data={"theme": f"{theme}"},
                )
            set_user_theme_response.raise_for_status()
            return set_user_theme_response.json()

    def set_account_name(self, email, password, first_name, last_name):
        with self._session(email, password) as s:
            s.headers.update({"referer": f"{self.env}"})
            set_name_response = s.post(
                f'{self.env}/api/account/',
                json={'first_name': first_name, 'last_name': last_name},
                )
            logger.debug(set_name_response.content)
            set_name_response.raise_for_status()
            return set_name_response.json()

    def connect(self, system_name: str, email: str, password: str) -> Mapping[str, str]:
        credentials = {'name': system_name, 'email': email, 'password': password}
        logger.debug(f"cloud credentials {credentials}")
        with requests.Session() as session:
            response = session.post(
                f'{self.env}/api/systems/connect',
                json=credentials,
                verify=False,
                )
            data = response.json()
        logger.debug(data)
        return {
            'systemId': data['id'],
            'authKey': data['authKey'],
            'owner': data['ownerAccountEmail'],
            }

    def disconnect(self, email, password, system_id, verification_code=None):
        with self._session(email, password, verification_code=verification_code) as s:
            s.headers.update({"referer": f"{self.env}"})
            disconnect_system_response = s.post(
                f'{self.env}/api/systems/disconnect',
                json={'system_id': system_id, 'password': password},
                )
            disconnect_system_response.raise_for_status()
            return disconnect_system_response.json()

    def delete_account(self, email, password, verification_code=None):
        with self._session(
                email,
                password,
                verification_code=verification_code,
                logout=False,
                ) as s:
            s.headers.update({"referer": f"{self.env}"})
            delete_account_response = s.post(
                f'{self.env}/api/account/delete', json={'password': password})
            logger.debug(password)
            logger.debug(delete_account_response.json())
            delete_account_response.raise_for_status()
            return delete_account_response.json()

    def get_code_from_api(self, email, message_type):
        # If cloud is in debug mode, use anonymous call
        if self._is_debug:
            get_code_response = requests.post(
                f'{self.env}/api/robot/get_code',
                json={'email': email, 'type': message_type},
                verify=_ssl_certs_path,
                )
        else:
            with self._session(self.baseEmail, self.password) as s:
                s.headers.update({"referer": f"{self.env}/authorize"})
                logger.debug(message_type)
                get_code_response = s.post(
                    f'{self.env}/api/robot/get_code',
                    json={'email': email, 'type': message_type},
                    )
        logger.debug(get_code_response.content)
        get_code_response.raise_for_status()
        return get_code_response.json()['code']

    def share(self, auth, system_id, access_role, account_email, custom_permissions):
        body = {
            "accessRole": access_role,
            "accountEmail": account_email,
            "customPermissions": custom_permissions,
            "userRoleId": "",
            "isEnabled": True,
            "vmsUserId": "",
            "sendNotification": "",
            "systemId": system_id,
            }
        share_response = requests.post(
            url=f'{self.env}/cdb/v0/systems/{system_id}/users',
            auth=HTTPBasicAuth(auth[0], auth[1]),
            json=body,
            verify=False,
            )
        share_response.raise_for_status()
        return share_response.json()

    def get_cloud_system_settings(self, auth, system_id):
        get_settings_response = requests.get(
            url=f'{self.env}/cdb/system/get?systemId={system_id}',
            auth=HTTPBasicAuth(auth[0], auth[1]),
            verify=_ssl_certs_path)
        get_settings_response.raise_for_status()
        return get_settings_response.json()['systems'][0]

    def get_cloud_system_users(self, auth, system_id):
        system_users_response = requests.get(
            url=f'{self.env}/cdb/system/getCloudUsers?systemId={system_id}',
            auth=HTTPBasicAuth(auth[0], auth[1]),
            verify=False,
            )
        system_users_response.raise_for_status()
        return system_users_response.json()['sharing']

    def _check_user_is_in_cloud(self, email, system_id, auth):
        users = self.get_cloud_system_users(auth, system_id)
        for user in users:
            if user["accountEmail"] == email:
                return True

    def add_user_to_cloud(self, system_id, access_role, email, auth, custom_permissions):
        in_cloud = self._check_user_is_in_cloud(email, system_id, auth)
        if in_cloud:
            logger.info(email + " already in system")
        else:
            r = self.share(
                auth,
                system_id,
                access_role,
                email,
                custom_permissions,
                )
            logger.debug(r)
            return r

    def register_account(self, first_name, last_name, email, password):
        body = {
            "email": email,
            "password": password,
            "first_name": first_name,
            "last_name": last_name,
            }
        # The Cloud Portal could be flooded by requests. Give it a few chances.
        timeout = 5
        started_at = time.monotonic()
        while True:
            register_response = requests.post(
                url=f'{self.env}/api/account/register',
                auth=HTTPBasicAuth(self.baseEmail, self.password),
                json=body,
                verify=False,
                )
            logger.debug(register_response.status_code)
            try:
                register_response.raise_for_status()
                break
            except HTTPError as exc:
                if exc.response.status_code != 500:
                    raise exc
                time_elapsed = time.monotonic() - started_at
                if time_elapsed > timeout:
                    raise TimeoutError("Failed to register account after %dsec", time_elapsed)
                logger.info("Failed to register account. Retrying in 1 sec.")
                time.sleep(1)
        return register_response.json()

    def _wait_for_activation_code(self, email, timeout=5):
        started_at = time.monotonic()
        while True:
            code = self.get_code_from_api(email, "activate_account")
            if code != "Does not exist":
                return unquote(code)
            if time.monotonic() - started_at > timeout:
                raise TimeoutError("Failed to retrieve activation code after %dsec", timeout)
            time.sleep(0.5)

    def activate_account_via_api(self, email, password):
        code = self._wait_for_activation_code(email)
        activate_response = requests.post(
            url=f'{self.env}/api/account/activate',
            auth=HTTPBasicAuth(email, password),
            json={"code": code},
            verify=False,
            )
        activate_response.raise_for_status()

    def disconnect_server_via_api(self, auth, system_id, password, email):
        body = {
            "password": password,
            "system_id": system_id,
            "email": email,
            }
        disconnect_response = requests.post(
            url=f'{self.env}/api/systems/disconnect',
            auth=HTTPBasicAuth(auth[0], auth[1]),
            json=body,
            verify=False,
            )
        disconnect_response.raise_for_status()

    def toggle_2fa_on_api(self, cloud_account, backup_code=None, verification_code=None):
        with self._session(
                cloud_account.email,
                cloud_account.password,
                backup_code=backup_code,
                verification_code=verification_code) as s:
            s.headers.update({'Referer': self.env})
            verification_res = s.post(
                url=f'{self.env}/api/2fa/verification',
                data=None,
                )
            data_string = str(verification_res.json().get("keyUrl"))
            logger.info(verification_res)
            _, secret_key = data_string.split('secret=')
            totp = TimeBasedOtp(secret_key)
            totp_code = totp.generate_otp()
            body = {"action": "toggle", "mfaCode": totp_code}
            security_response = s.post(
                f'{self.env}/api/account/security', data=body)
            logger.info(security_response)
            security_response.raise_for_status()
            cloud_account.setup_totp(totp)

    def toggle_2fa_off_api(self, cloud_account, verification_code=None):
        with self._session(
                cloud_account.email,
                cloud_account.password,
                verification_code=verification_code) as s:
            s.headers.update({'Referer': self.env})
            refresh_response = s.post(f'{self.env}/api/account/refreshAccessToken')
            refresh_response.raise_for_status()
            logger.debug(f"/api/account json: {refresh_response.json()}")
            s.headers.update({"Authorization": f"Bearer {refresh_response.json()['access_token']}"})
            security_get_response = s.get(f'{self.env}/cdb/account/self/settings/security')
            security_get_response.raise_for_status()
            del s.headers["Authorization"]
            is_two_fa_enabled = security_get_response.json().get('account2faEnabled')
            totp_exists = security_get_response.json().get('totpExistsForAccount')
            if is_two_fa_enabled or totp_exists:
                s.headers.update({'Referer': self.env})
                body = {"action": "deactivate", "mfaCode": verification_code}
                security_post_response = s.post(
                    f'{self.env}/api/account/security',
                    data=body,
                    )
                logger.debug(security_post_response.status_code)
                security_post_response.raise_for_status()
            cloud_account.disable_2fa()

    def generate_2fa_backup_codes_api(
            self,
            email,
            password,
            backup_code=None,
            verification_code=None,
            ):
        with self._session(
                email, password,
                backup_code=backup_code,
                verification_code=verification_code) as s:
            s.headers.update({'Referer': self.env})
            backup_post_response = s.post(
                url=f'{self.env}/api/2fa/backup',
                data={"count": "8"},
                )
            backup_post_response.raise_for_status()
            backup_list = backup_post_response.json()
            return [backup['backup_code'] for backup in backup_list]

    def set_feature_flags(self, features_dict):
        set_flags_response = requests.post(
            url=f'{self.env}/api/robot/set_flags',
            data=features_dict,
            verify=_ssl_certs_path,
            timeout=10)
        if set_flags_response.status_code != 200:
            raise CannotSetFeatureFlags()

    def get_cloud_settings(self):
        settings_response = requests.get(
            url=f'{self.env}/api/utils/settings',
            verify=_ssl_certs_path,
            )
        return settings_response.json()

    def get_oauth2_token(self, system_id: str, email: str, password: str) -> str:
        body = {
            'username': email,
            'password': password,
            'grant_type': 'password',
            'response_type': 'token',
            'scope': f'cloudSystemId={system_id}',
            }
        response = requests.post(
            url=f'{self.env}/cdb/oauth2/token',
            json=body,
            verify=_ssl_certs_path,
            )
        response.raise_for_status()
        json_response = response.json()
        return json_response['access_token']

    def _check_debug_status(self):
        try:
            self.set_feature_flags({})
        except (CannotSetFeatureFlags, ReadTimeout):
            print(f"Debug is not enabled on the {self.env} instance")
            return False
        return True

    def get_services(self, email, password, uuid):
        with self._session(email, password) as s:
            s.headers.update({"Referer": self.env})
            refresh_response = s.post(f'{self.env}/api/account/refreshAccessToken')
            refresh_response.raise_for_status()
            logger.debug(f"/api/account json: {refresh_response.json()}")
            s.headers.update({"Authorization": f"Bearer {refresh_response.json()['access_token']}"})
            return s.get(f'{self.env}/partners/api/v2/cloud_systems/{uuid}/services')

    def change_sub(self, email, password, uuid, id, amount):
        body = {
            "services": {
                id: {
                    "quantity": amount
                }
            }
        }
        with self._session(email, password) as s:
            s.headers.update({"Referer": self.env})
            refresh_response = s.post(f'{self.env}/api/account/refreshAccessToken')
            refresh_response.raise_for_status()
            logger.debug(f"/api/account json: {refresh_response.json()}")
            s.headers.update({"Authorization": f"Bearer {refresh_response.json()['access_token']}"})
            r = s.patch(f'{self.env}/partners/api/v2/cloud_systems/{uuid}/service_quantity/', json=body)
            r.raise_for_status()
            return r

class CannotSetFeatureFlags(Exception):
    pass


logger = logging.getLogger(__name__)
