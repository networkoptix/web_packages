import base64
import json
import logging
import os
import random
import re
import string
import tempfile
import uuid
from contextlib import contextmanager
from pathlib import Path
from typing import ContextManager
from typing import Mapping

import certifi
import requests
import urllib3
from requests.auth import HTTPBasicAuth
from requests.auth import HTTPDigestAuth

from NoptixLibrary.cloud_2fa import TimeBasedOtp
from NoptixLibrary.cloud_session import CloudSession

#from CloudSession import CloudSession

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

    def __init__(self, env='https://cloud-test.hdw.mx', customization='default', password='qweasd 123', email='noptixautoqa@gmail.com'):
        self.env = env
        self.customization = customization
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
                verify_ssl_cert=_ssl_certs_path
        ) as session:
            yield session

    def api_log_in(self, email, password, backup_code=None, verification_code=None):
        cloud_session = CloudSession(
            self.env,
            email,
            password,
            backup_code,
            verification_code,
            verify_ssl_cert=_ssl_certs_path)
        cloud_session.login()
        return cloud_session

    def api_log_out(self, session_id, csrftoken):
        with requests.session() as s:
            s.headers.update({'X-CSRFToken': csrftoken})
            s.headers.update({'cookie': 'csrftoken=' + csrftoken + '; sessionid=' + session_id})
            s.headers.update({'Referer': self.env})
            logout_response = s.post(f'{self.env}/api/account/logout', verify=_ssl_certs_path)
            logger.debug(logout_response.content)
            logout_response.raise_for_status()
            return logout_response.status_code

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

    def merge_cloud_systems(self, master_id, slave_id, email, password):
        with self._session(email, password) as s:
            logger.debug(f'The headers are {s.headers}')
            data = {'master_system_id': master_id, 'password': password, 'slave_system_id': slave_id}
            s.headers.update({"referer": f"{self.env}"})
            merge_response = s.post(f'{self.env}/api/systems/merge', data)
            logger.debug(f'Value of merge_response.content: {merge_response.content}')
            merge_response.raise_for_status()
            return merge_response.json()

    def cdb_merge_cloud_systems(self, master_id, slave_id, email, password):
        cdb_merge_response = requests.post(
            url=f'{self.env}/cdb/system/{master_id}/merged_systems/',
            auth=HTTPBasicAuth(email, password),
            json={"systemId": slave_id},
            verify=False,
            )
        cdb_merge_response.raise_for_status()
        return cdb_merge_response.json()

    def change_password(self, email, old_password, new_password):
        with self._session(email, old_password) as s:
            s.headers.update({"referer": f"{self.env}/account/password"})
            data = {'old_password': old_password, 'new_password': new_password}
            change_pass_response = s.post(f'{self.env}/api/account/changePassword', data)
            return change_pass_response.raise_for_status()

    def api_restore_password(self, email, code=None, new_password=None):
        with requests.Session() as s:
            s.headers.update({'X-CSRFToken': s.cookies['csrftoken']})
            data = {'user_email': email}
            if code and new_password:
                data.update({'code': code, 'new_password': new_password})
            restore_pass_response = s.post(
                f'{self.env}/api/account/restorePassword',
                data,
                verify=_ssl_certs_path,
                )
            restore_pass_response.raise_for_status()
            return restore_pass_response.status_code

    def get_language_anonymous(self, env):
        language_response = requests.get(
            f'{env}/api/utils/language',
            verify=_ssl_certs_path,
            )
        language_response.raise_for_status()
        return language_response.json()['language']

    def get_account_language(self, email, password):
        with self._session(email, password) as s:
            s.headers.update({"Referer": self.env})
            account_language_response = s.get(f'{self.env}/api/utils/language')
            account_language_response.raise_for_status()
            return account_language_response.json()['language']

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
            s.headers.update({"Referer":self.env})
            set_user_theme_response = s.post(
                f'{self.env}/api/custom-properties/theme/{email}',
                auth=HTTPBasicAuth(email, password),
                data={"theme": f"{theme}"})
            set_user_theme_response.raise_for_status()
            return set_user_theme_response.json()

    def set_account_name(self, email, password, first_name, last_name):
        with self._session(email, password) as s:
            s.headers.update({"referer": f"{self.env}"})
            set_name_response = s.post(
                f'{self.env}/api/account/',
                json={'first_name': first_name, 'last_name': last_name})
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
                json={'system_id': system_id, 'password': password})
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
                verify=_ssl_certs_path
                )
        else:
            with self._session(self.baseEmail, self.password) as s:
                s.headers.update({"referer": f"{self.env}/authorize"})
                logger.debug(message_type)
                get_code_response = s.post(
                    f'{self.env}/api/robot/get_code',
                    json={'email': email, 'type': message_type})
        logger.debug(get_code_response.content)
        get_code_response.raise_for_status()
        return get_code_response.json()['code']

    def disconnect_from_account(self, email, password, system_id):
        """Doesn't completely remove user from system users, but sets their role to none instead.
        Should be used to emulate disconnection by clicking "Disconnect my account" button on system's page."""
        with self._session(email, password) as s:
            disconnect_response = s.post(
                f'{self.env}/api/systems/{system_id}/users',
                json={'user_email': email, 'role': 'none'})
            disconnect_response.raise_for_status()
            return disconnect_response.json()

    def subscribe_push_notification(self, env, email, password, token, name):
        auth_ascii = f'{email}:{password}'
        auth_ascii = auth_ascii.encode('ascii')
        auth = b"Basic " + base64.b64encode(auth_ascii)
        headers = {'Authorization': auth}
        subscription_response = requests.put(
            f'{self.env}/api/notifications/subscriptions/{token}', headers=headers,
            json={
                'type': 'notification',
                'systems': ['all'],
                'deviceInfo': {'name': name, 'os': 'web'},
                'provider': 'firebase',
            },
            verify=_ssl_certs_path
        )
        subscription_response.raise_for_status()
        return subscription_response.json()

    def get_new_FCM_token(self, key, auth, body):
        headers = {
            'Content-Type': 'application/json',
            'x-goog-api-key': key,
            'x-goog-firebase-installations-auth': auth,
            }
        registration_response = requests.post(
            url='https://fcmregistrations.googleapis.com/v1/projects/nx-push-test/registrations',
            headers=headers,
            data=body,
            )
        token = registration_response.json()['token']
        return token

    def push_notifications_requests(self, env, email, password, process, min, max):
        r = requests.get(
            url=f"{env}cdb/system/get",
            auth=HTTPDigestAuth(email, password),
            verify=_ssl_certs_path,
            )
        self.systemsDict = r.json()
        self.systemsList = []

        for system in self.systemsDict['systems']:
            self.systemsList.append(system)

        self.sortedList = sorted(self.systemsList, key=lambda i: i['registrationTime'])
        uid = 0
        self.userId = str(uuid.uuid1())
        txtFile = os.environ['LOCUSTTEXT']
        f = open(f'{txtFile}.txt', 'a')
        min = int(min)
        max = int(max)
        for system in self.sortedList[min:max]:
            authKey = system["authKey"]
            id = system["id"]
            name = system["name"]
            title = process + " " + str(uid) + "_" + self.userId

            emailIntStart = (int(name.strip(string.ascii_letters))) * 10
            emailIntEnd = emailIntStart + 10

            targetList = []
            for x in range(emailIntStart, emailIntEnd):
                targetList.append(f"noptixautoqa+notifications{x}@gmail.com")
            body = {
                "systemId": id,
                "targets": targetList,
                "notification": {
                    "title": title,
                    "body": name,
                    "payload": {
                        "url": "nx-vms://test4.cloud.hdw.mx/client/" + id + "/view",
                        "imageUrl": "https://0b04fa6d-877c-48ba-aaf0-74dbfd87f082/ec2/cameraThumbnail?cameraId=ed93120e-0f50-3cdf-39c8-dd52a640688c",
                    },
                },
            }
            # to test script comment o6ut the post and write to file instead
            r = requests.post(
                f'{self.env}api/notifications/push_notification',
                auth=HTTPBasicAuth(id, authKey),
                headers={'Content-Type': 'application/json'},
                data=json.dumps(body),
                verify=_ssl_certs_path,
                )
            f.write(f"{r.text} {title}\n")
            uid += 1
        f.close()

    def create_systems_json(self, env, email, password):
        r = requests.get(
            url=f"{env}cdb/system/get",
            auth=HTTPBasicAuth(email, password),
            verify=_ssl_certs_path,
            )
        systemsDict = r.json()
        systemsList = []

        for system in systemsDict['systems']:
            systemsList.append(system)

        sortedList = sorted(systemsList, key=lambda i: i['registrationTime'])
        sysID = 1
        systemsJson = []

        for system in sortedList:

            authKey = system["authKey"]
            id = system["id"]
            name = system["name"]

            title = str(sysID) + " " + str(uuid.uuid1())

            emailIntStart = (int(name.strip(string.ascii_letters))) * 10
            emailIntEnd = emailIntStart + 10

            targetList = []
            for x in range(emailIntStart, emailIntEnd):
                targetList.append(f"noptixautoqa+notifications{x}@gmail.com")
            body = {
                "process": True,
                "object": True,
                "queue": True,
                "pre-authenticate": True,
                "systemId": id,
                "targets": targetList,
                "notification": {
                    "title": title,
                    "body": name,
                    "payload": {
                        "url": "nx-vms://test4.cloud.hdw.mx/client/" + id + "/view",
                        "imageUrl": "https://0b04fa6d-877c-48ba-aaf0-74dbfd87f082/ec2/cameraThumbnail?cameraId=ed93120e-0f50-3cdf-39c8-dd52a640688c",
                    },
                },
            }
            systemsJson.append({"authKey": authKey, "id": id, "body": json.dumps(body), "title": title})
            sysID += 1
        f = open('systems.json', 'w')
        f.write(json.dumps(systemsJson))
        f.close()

    def check_connection(self, url, verify=True):
        try:
            r = requests.get(url, verify=verify)
        except requests.exceptions.SSLError:
            return 'SSL Error'
        return r.status_code

    def camera_search(self, serverUrl, cameraPort, camFile, serverIp, user='mark', password='hamill'):
        search_response = requests.get(
            url=f"{serverUrl}/api/manualCamera/search",
            auth=HTTPDigestAuth('admin', 'qweasd 123'),
            params={
                'url': f'http://{serverIp}:{cameraPort}/{camFile}.mjpeg',
                'user': user,
                'password': password,
                },
            verify=False,
            )
        search_response.raise_for_status()
        return search_response.json()['reply']['processUuid']

    def camera_status(self, serverUrl, uuid):
        status_response = requests.get(
            url=f"{serverUrl}/api/manualCamera/status",
            auth=HTTPDigestAuth('admin', 'qweasd 123'),
            params={'uuid': uuid},
            verify=False,
            )
        status_response.raise_for_status()
        return status_response.json()

    def add_fake_camera(self, serverUrl, cameras, user="mark", password="hamill"):
        logger.debug("cameras value")
        logger.debug(cameras)
        body = {"cameras": cameras, "user": "mark", "password": "hamill"}
        logger.debug(body)
        add_camera_response = requests.post(
            url=f'{serverUrl}/api/manualCamera/add',
            auth=HTTPDigestAuth('admin', 'qweasd 123'),
            headers={'Content-Type': 'application/json'},
            json=body,
            verify=False,
            )
        add_camera_response.raise_for_status()
        return add_camera_response.text

    def bind_system(self, auth, cloudUrl, name="API made system"):
        with self._session(auth[0], auth[1]) as s:
            logger.debug(self.customization)
            body = {
                "name": name,
                "customization": self.customization
            }
            bind_response = s.post(
                url=f'{cloudUrl}/cdb/system/bind',
                auth=HTTPBasicAuth(auth[0], auth[1]),
                json=body,
                verify=False,
                )
            logger.debug(bind_response.json())
            bind_response.raise_for_status()
            return bind_response.json()

    def unbind_system(self, auth, cloudUrl, systemId):
        unbind_response = requests.post(
            url=f'{cloudUrl}/cdb/system/unbind',
            auth=HTTPBasicAuth(auth[0], auth[1]),
            json={"systemId": systemId},
            verify=False,
            )
        unbind_response.raise_for_status()
        return unbind_response.json()

    def save_cloud_system_credentials(self, auth, serverUrl, authKey, cloudSystemId, ownerEmail):
        body = {
            "cloudAuthKey": authKey,
            "cloudSystemID": cloudSystemId,
            "cloudAccountName": ownerEmail
            }
        save_credentials_response = requests.post(
            url=f"{serverUrl}/api/saveCloudSystemCredentials",
            auth=HTTPBasicAuth(auth[0], auth[1]),
            json=body,
            verify=False,
            )
        logger.debug(f'status:{save_credentials_response.status_code}')
        save_credentials_response.raise_for_status()
        return save_credentials_response.json()

    def rename_system(self, auth, systemId, newName):
        body = {
            "systemId": systemId,
            "name": newName
            }
        rename_response = requests.post(
            url=f'{self.env}/cdb/system/rename',
            auth=HTTPBasicAuth(auth[0], auth[1]),
            json=body,
            verify=False,
            )
        rename_response.raise_for_status()
        return rename_response.json()

    def share(self, auth, systemId, accessRole, accountEmail, customPermissions):
        body = {
            "accessRole": accessRole,
            "accountEmail": accountEmail,
            "customPermissions": customPermissions,
            "userRoleId": "",
            "isEnabled": True,
            "vmsUserId": "",
            "sendNotification": "",
            "systemId": systemId,
            }
        share_response = requests.post(
            url=f'{self.env}/cdb/systems/{systemId}/users',
            auth=HTTPBasicAuth(auth[0], auth[1]),
            json=body,
            verify=False,
            )
        share_response.raise_for_status()
        return share_response.json()

    def get_cloud_system_settings(self, auth, systemId):
        get_settings_response = requests.get(
            url=f'{self.env}/cdb/system/get?systemId={systemId}',
            auth=HTTPBasicAuth(auth[0], auth[1]),
            verify=_ssl_certs_path)
        get_settings_response.raise_for_status()
        return get_settings_response.json()['systems'][0]

    def get_cloud_system_users(self, auth, systemId):
        system_users_response = requests.get(
            url=f'{self.env}/cdb/system/getCloudUsers?systemId={systemId}',
            auth=HTTPBasicAuth(auth[0], auth[1]),
            verify=False,
            )
        system_users_response.raise_for_status()
        return system_users_response.json()['sharing']

    def _check_user_is_in_cloud(self, email, systemId, auth):
        users = self.get_cloud_system_users(auth, systemId)
        for user in users:
            if user["accountEmail"] == email:
                return True

    def add_user_to_cloud(self, systemId, accessRole, email, auth, customPermissions):
        in_cloud = self._check_user_is_in_cloud(email, systemId, auth)
        if in_cloud:
            logger.info(email + " already in system")
        else:
            r = self.share(
                auth,
                systemId,
                accessRole,
                email,
                customPermissions,
                )
            logger.debug(r)

    def get_account_info(self, email, password):
        account_info_response = requests.get(
            f'{self.env}/cdb/account/get',
            auth=HTTPBasicAuth(email, password),
            verify=_ssl_certs_path,
            )
        account_info_response.raise_for_status()
        return account_info_response.json()

    def integration_store_is_enabled(self, auth):
        capabilities_response = requests.get(
            url=f'{self.env}/api/utils/cloudCapabilites',
            auth=HTTPBasicAuth(auth[0], auth[1]),
            verify=_ssl_certs_path,
            )
        capabilities_response.raise_for_status()
        return capabilities_response.json()['integrationStoreEnabled']

    def register_account(self, firstName, lastName, email, password):
        body = {
            "email": email,
            "password": password,
            "first_name": firstName,
            "last_name": lastName,
            }
        register_response = requests.post(
            url=f'{self.env}/api/account/register',
            auth=HTTPBasicAuth(self.baseEmail, self.password),
            json=body,
            verify=False,
            )
        logger.debug(register_response.status_code)
        register_response.raise_for_status()
        return register_response.json()

    def activate_account_via_api(self, email, password):
        code = self.get_code_from_api(email, "activate_account")
        code = re.sub(r'%3D', '=', code)
        code = re.sub(r'%2B', '+', code)
        activate_response = requests.post(
            url=f'{self.env}/api/account/activate',
            auth=HTTPBasicAuth(email, password),
            json={"code":code},
            verify=False,
            )
        activate_response.raise_for_status()
        return f"{self.env}/authorize/activate/{activate_response.json()}"

    def disconnect_server_via_api(self, auth, sysId, password, email):
        body = {
            "password": password,
            "system_id": sysId,
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
            verificationRes = s.post(
                url=f'{self.env}/api/2fa/verification',
                data=None,
                )
            dataString = str(verificationRes.json().get("keyUrl"))
            logger.info(verificationRes)
            _, secretKey = dataString.split('secret=')
            totp = TimeBasedOtp(secretKey)
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

    def generate_2fa_backup_codes_api(self, email, password, backup_code=None, verification_code=None):
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
            backupList = backup_post_response.json()
            return [backup['backup_code'] for backup in backupList]

    def get_2fa_backup_codes_api(self, email, password, backup_code=None, verification_code=None):
        with self._session(
                email, password,
                backup_code=backup_code,
                verification_code=verification_code) as s:
            s.headers.update({'Referer': self.env})
            backup_code_response = s.get(
                f'{self.env}/api/2fa/backup/codes', data=None)
            backup_code_response.raise_for_status()
            backupList = backup_code_response.json()
            backupDict = backupList[random.randint(0, 7)]
            backupCode = backupDict.get("backup_code")
            return backupCode

    def set_feature_flags(self, featuresDict):
        set_flags_response = requests.post(
            url=f'{self.env}/api/robot/set_flags',
            data=featuresDict,
            verify=_ssl_certs_path,
            )
        if set_flags_response.status_code != 200:
            raise CannotSetFeatureFlags()

    def get_cloud_settings(self):
        settings_response = requests.get(
            url=f'{self.env}/api/utils/settings',
            verify=_ssl_certs_path,
            )
        return settings_response.json()

    def _check_debug_status(self):
        try:
            self.set_feature_flags({})
        except CannotSetFeatureFlags:
            print(f"Debug is not enabled on the {self.env} instance")
            return False
        return True


class CannotSetFeatureFlags(Exception):
    pass


logger = logging.getLogger(__name__)
