import base64
import codecs
import json
import os
import random
import re
import string
import tempfile
import uuid
from contextlib import contextmanager
from pathlib import Path
from typing import ContextManager

import certifi
import requests
import urllib3
from requests.auth import HTTPDigestAuth, HTTPBasicAuth
from robot.api import logger
from robot.api.deco import keyword, library

import Encode
from Cloud2fa import Cloud2fa
from CloudSession import CloudSession

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


@library
class CloudPortalAPI(object):

    def __init__(self, env='https://cloud-test.hdw.mx', customization='default', password='qweasd 123', email='noptixautoqa@gmail.com'):
        self.env = env
        self.customization = customization
        self.password = password
        self.baseEmail = email

    @contextmanager
    def _session(
            self, email, password,
            *,
            backup_code=None, verification_code=None, logout=True
    ) -> ContextManager[requests.Session]:
        with CloudSession(
                self.env, email, password, backup_code, verification_code, logout,
                verify_ssl_cert=_ssl_certs_path
        ) as session:
            yield session

    @keyword
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

    @keyword
    def api_log_out(self, session_id, csrftoken):
        with requests.session() as s:
            s.headers.update({'X-CSRFToken': csrftoken})
            s.headers.update({'cookie': 'csrftoken=' + csrftoken + '; sessionid=' + session_id})
            s.headers.update({'Referer': self.env})
            r = s.post(f'{self.env}/api/account/logout', verify=_ssl_certs_path)
            logger.trace(r.content)
            assert 200 == r.status_code, 'Log out failed.'
            return r.status_code

    @keyword
    def get_access_code(self, email, password):
        data = {
            "client_id": "cloud_portal",
            "grant_type": "password",
            "response_type": "code",
            "email": email,
            "password": password,
            "redirect_uri": self.env
        }
        with requests.session() as s:
            r = s.post(f'{self.env}/oauth/authenticate', data=data, verify=_ssl_certs_path)
            logger.trace(r.content)
            assert 200 == r.status_code, 'Log in failed.'
            return r.json()

    @keyword
    def merge_cloud_systems(self, master_id, slave_id, email, password):
        with self._session(email, password) as s:
            logger.trace(f'The headers are {s.headers}')
            data = {'master_system_id': master_id, 'password': password, 'slave_system_id': slave_id}
            s.headers.update({"referer": f"{self.env}"})
            r = s.post(f'{self.env}/api/systems/merge', data)
            logger.trace(f'Value of r.content: {r.content}')
            assert r.status_code == 200, f'merge failed with {r.status_code}'
            return r.json()

    @keyword
    def cdb_merge_cloud_systems(self, master_id, slave_id, email, password):
        r = requests.post(f'{self.env}/cdb/system/{master_id}/merged_systems/', auth=HTTPBasicAuth(email, password),
                          json={"systemId": slave_id}, verify=False)
        assert 200 == r.status_code, f'Merge failed with code:{r.status_code}'
        return r.json()

    @keyword
    def change_password(self, email, old_password, new_password):
        with self._session(email, old_password) as s:
            s.headers.update({"referer": f"{self.env}/account/password"})
            data = {'old_password': old_password, 'new_password': new_password}
            r = s.post(f'{self.env}/api/account/changePassword', data)
            return r.status_code

    @keyword
    def api_restore_password(self, email, code=None, new_password=None):
        with requests.Session() as s:
            s.headers.update({'X-CSRFToken': s.cookies['csrftoken']})
            data = {'user_email': email}
            if code and new_password:
                data.update({'code': code, 'new_password': new_password})
            r = s.post(f'{self.env}/api/account/restorePassword', data, verify=_ssl_certs_path)
            return r.status_code

    @keyword
    def get_language_anonymous(self, env):
        r = requests.get(env + '/api/utils/language', verify=_ssl_certs_path)
        return r.json()['language']

    @keyword
    def get_account_language(self, email, password):
        with self._session(email, password) as s:
            s.headers.update({"Referer": self.env})
            r = s.get(f'{self.env}/api/utils/language')
            return r.json()['language']

    @keyword
    def get_account_data(self, email, password):
        with self._session(email, password) as s:
            r = s.get(f'{self.env}/api/account/')
            return r.json()

    @keyword
    def get_account_systems(self, email, password):
        with self._session(email, password) as s:
            s.headers.update({"Referer": self.env})
            data = s.get(f'{self.env}/api/systems/')
            return data.json()

    @keyword
    def set_account_language(self, email, password, new_language='en_US'):
        with self._session(email, password) as s:
            s.headers.update({"Referer":self.env})
            r = s.post(f'{self.env}/api/utils/language/', json={'language': new_language})
            assert 200 == r.status_code, f"api/utils/language failed: {r.status_code}"
            return r.json()            

    @keyword
    def set_user_theme(self, email, password, theme):
        with self._session(email, password) as s:
            s.headers.update({"Referer":self.env})
            r = s.post(
                f'{self.env}/api/custom-properties/theme/{email}',
                auth=HTTPBasicAuth(email, password),
                data={"theme": f"{theme}"})
            assert r.status_code==201
            return r.json()

    @keyword
    def set_account_name(self, email, password, first_name, last_name):
        with self._session(email, password) as s:
            r = s.post(
                f'{self.env}/api/account/',
                json={'first_name': first_name, 'last_name': last_name})
            return r.json()

    @keyword
    def disconnect(self, email, password, system_id):
        with self._session(email, password) as s:
            s.headers.update({"referer": f"{self.env}"})
            r = s.post(
                f'{self.env}/api/systems/disconnect',
                json={'system_id': system_id, 'password': password})
            assert r.status_code == 200
            return r.json()

    @keyword
    def delete_account(self, email, password):
        with self._session(email, password, logout=False) as s:
            s.headers.update({"referer": f"{self.env}"})
            r = s.post(
                f'{self.env}/api/account/delete', json={'password': password})
            logger.trace(password)
            logger.trace(r.json())
            return r.json()

    @keyword
    def get_code_from_api(self, email, message_type):
        with self._session(self.baseEmail, self.password) as s:
            s.headers.update({"referer": f"{self.env}/authorize"})
            r = s.post(
                f'{self.env}/api/robot/get_code',
                json={'email': email, 'type': message_type})
            logger.trace(r.content)
            return r.json()['code']

    @keyword
    def disconnect_from_account(self, email, password, system_id):
        """Doesn't completely remove user from system users, but sets their role to none instead.
        Should be used to emulate disconnection by clicking "Disconnect my account" button on system's page."""
        with self._session(email, password) as s:
            r = s.post(
                f'{self.env}/api/systems/{system_id}/users',
                json={'user_email': email, 'role': 'none'})
            return r.json()

    @keyword
    def subscribe_push_notification(self, env, email, password, token, name):
        auth_ascii = f'{email}:{password}'
        auth_ascii = auth_ascii.encode('ascii')
        auth = b"Basic " + base64.b64encode(auth_ascii)
        headers = {'Authorization': auth}
        r = requests.put(
            f'{self.env}/api/notifications/subscriptions/{token}', headers=headers,
            json={
                'type': 'notification',
                'systems': ['all'],
                'deviceInfo': {'name': name, 'os': 'web'},
                'provider': 'firebase'
            },
            verify=_ssl_certs_path
        )
        return r.json()

    @keyword
    def get_new_FCM_token(self, key, auth, body):
        headers = {'Content-Type': 'application/json', 'x-goog-api-key': key,
                   'x-goog-firebase-installations-auth': auth}
        print(headers)
        r = requests.post('https://fcmregistrations.googleapis.com/v1/projects/nx-push-test/registrations',
                          headers=headers, data=body)
        print(r)
        token = r.json()['token']
        return token

    @keyword
    def push_notifications_requests(self, env, email, password, process, min, max):
        r = requests.get(
            env + "cdb/system/get", auth=HTTPDigestAuth(email, password), verify=_ssl_certs_path)
        #        print(r)
        #        print(r.json())
        self.systemsDict = r.json()
        self.systemsList = []

        for system in self.systemsDict['systems']:
            self.systemsList.append(system)

        self.sortedList = sorted(self.systemsList, key=lambda i: i['registrationTime'])
        uid = 0
        self.userId = str(uuid.uuid1())
        #        systemStart = int(self.minEmail/10)
        #        systemEnd = int(self.maxEmail/10)
        txtFile = os.environ['LOCUSTTEXT']
        f = open(f'{txtFile}.txt', 'a')
        #        print(len(systemsList))
        min = int(min)
        max = int(max)
        for system in self.sortedList[min:max]:
            #            print(system)
            authKey = system["authKey"]
            id = system["id"]
            name = system["name"]
            #            f2= open("posts.txt", "w+")
            title = process + " " + str(uid) + "_" + self.userId
            #            print(authKey, id, name)
            #           print(system)

            emailIntStart = (int(name.strip(string.ascii_letters))) * 10
            #           print(name+" stripped number "+str(emailIntStart)+" minEmail "+str(self.minEmail))
            emailIntEnd = emailIntStart + 10

            #           if  emailIntStart == self.maxEmail:
            #              break
            #           elif emailIntStart >= self.minEmail:
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
                        "imageUrl": "https://0b04fa6d-877c-48ba-aaf0-74dbfd87f082/ec2/cameraThumbnail?cameraId=ed93120e-0f50-3cdf-39c8-dd52a640688c"
                    }
                }
            }
            # to test script comment o6ut the post and write to file instead
            r = requests.post(
                f'{self.env}api/notifications/push_notification',
                auth=HTTPBasicAuth(id, authKey),
                headers={'Content-Type': 'application/json'},
                data=json.dumps(body),
                verify=_ssl_certs_path)
            f.write(f"{r.text} {title}\n")
            uid += 1
        f.close()

    #       print("Sleeping for 300 secs")
    #        time.sleep(300)

    @keyword
    def create_systems_json(self, env, email, password):
        r = requests.get(
            env + "cdb/system/get", auth=HTTPBasicAuth(email, password), verify=_ssl_certs_path)

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
                        "imageUrl": "https://0b04fa6d-877c-48ba-aaf0-74dbfd87f082/ec2/cameraThumbnail?cameraId=ed93120e-0f50-3cdf-39c8-dd52a640688c"
                    }
                }
            }
            systemsJson.append({"authKey": authKey, "id": id, "body": json.dumps(body), "title": title})
            sysID += 1
        f = open('systems.json', 'w')
        f.write(json.dumps(systemsJson))
        f.close()

    @keyword
    def check_connection(self, url, verify=True):
        try:
            r = requests.get(url, verify=verify)
        except requests.exceptions.SSLError:
            return 'SSL Error'
        return r.status_code

    @keyword
    def camera_search(self, serverUrl, cameraPort, camFile, serverIp, user='mark', password='hamill'):
        r = requests.get(f"{serverUrl}/api/manualCamera/search", auth=HTTPDigestAuth('admin', 'qweasd 123'),
                         params={'url': f'http://{serverIp}:{cameraPort}/{camFile}.mjpeg', 'user': user,
                                 'password': password}, verify=False)
        return r.json()['reply']['processUuid']

    @keyword
    def camera_status(self, serverUrl, uuid):
        r = requests.get(f"{serverUrl}/api/manualCamera/status", auth=HTTPDigestAuth('admin', 'qweasd 123'),
                         params={'uuid': uuid}, verify=False)
        return r.json()


    # @keyword
    # def add_fake_camera(self, erverUrl, cameras, user="mark", password="hamill"):
    #    logger.trace("cameras value")
    #    logger.trace(cameras)
    #    body= {"cameras":cameras, "user":user, "password":password}
    #    logger.trace(body)
    #    r = requests.post(f'{serverUrl}/api/manualCamera/add', auth=HTTPDigestAuth('admin', 'qweasd 123'), headers={'Content-Type':'application/json'}, json=body, verify=False)
    #    return r.text

    # @staticmethod
    # def add_camera(serverUrl, camuser, campassword, uniqueId, url, manufacturer=None):
    #    body = {
    #        "user": camuser,
    #        "password": campassword,
    #        "cameras":
    #            [
    #                {
    #                "uniqueId": uniqueId,
    #                "url": url,
    #                "manufacturer": manufacturer
    #                }
    #            ]
    #        }
    #    logger.trace(body)
    #    r = requests.post(f'{serverUrl}/api/manualCamera/add', auth=HTTPDigestAuth('admin', 'qweasd 123'), headers={'Content-Type':'application/json'}, json=body, verify=False)
    #    logger.trace(r.status_code)
    #    return r.text

    @keyword
    def add_fake_camera(self, serverUrl, cameras, user="mark", password="hamill"):
        logger.trace("cameras value")
        logger.trace(cameras)
        body = {"cameras": cameras, "user": "mark", "password": "hamill"}
        logger.trace(body)
        r = requests.post(f'{serverUrl}/api/manualCamera/add', auth=HTTPDigestAuth('admin', 'qweasd 123'),
                          headers={'Content-Type': 'application/json'}, json=body, verify=False)
        return r.text

    @keyword
    def bind_system(self, auth, cloudUrl, name="API made system"):
        with self._session(auth[0], auth[1]) as s:
            logger.trace(self.customization)
            body = {
                "name": name,
                "customization": self.customization
            }
            r = s.post(f'{cloudUrl}/cdb/system/bind', auth=HTTPBasicAuth(auth[0], auth[1]), json=body, verify=False)
            logger.trace(r.json())
            return r.json()

    @keyword
    def unbind_system(self, auth, cloudUrl, systemId):
        r = requests.post(f'{cloudUrl}/cdb/system/unbind', auth=HTTPBasicAuth(auth[0], auth[1]),
                          json={"systemId": systemId}, verify=False)
        return r.json()

    @keyword
    def save_cloud_system_credentials(self, auth, serverUrl, authKey, cloudSystemId, ownerEmail):
        body = {
            "cloudAuthKey": authKey,
            "cloudSystemID": cloudSystemId,
            "cloudAccountName": ownerEmail
        }
        r = requests.post(f"{serverUrl}/api/saveCloudSystemCredentials", auth=HTTPBasicAuth(auth[0], auth[1]),
                          json=body, verify=False)
        logger.trace(f'status:{r.status_code}')
        assert r.status_code==200
        return r.json()

    @keyword
    def rename_system(self, auth, systemId, newName):
        body = {
            "systemId": systemId,
            "name": newName
        }
        r = requests.post(f'{self.env}/cdb/system/rename', auth=HTTPBasicAuth(auth[0], auth[1]), json=body,
                          verify=False)
        return r.json()

    @keyword
    def share(self, auth, systemId, accessRole, accountEmail, customPermissions):
        body = {
            "accessRole": accessRole,
            "accountEmail": accountEmail,
            "customPermissions": customPermissions,
            "userRoleId": "",
            "isEnabled": True,
            "vmsUserId": "",
            "sendNotification": ""
        }
        r = requests.post(f'{self.env}/cdb/systems/{systemId}/users', auth=HTTPBasicAuth(auth[0], auth[1]), json=body, verify=False)
        assert r.status_code == 200, r.json()
        return r.json()

    @keyword
    def get_cloud_system_settings(self, auth, systemId):
        r = requests.get(
            f'{self.env}/cdb/system/get?systemId={systemId}',
            auth=HTTPBasicAuth(auth[0], auth[1]),
            verify=_ssl_certs_path)
        return r.json()['systems'][0]

    @keyword
    def get_cloud_system_users(self, auth, systemId):
        r = requests.get(f'{self.env}/cdb/system/getCloudUsers?systemId={systemId}', auth=HTTPBasicAuth(auth[0], auth[1]), verify=False)
        return r.json()['sharing']

    @keyword
    def get_account_info(self, email, password):
        r = requests.get(
            f'{self.env}/cdb/account/get',
            auth=HTTPBasicAuth(email, password),
            verify=_ssl_certs_path)
        return r.json()

    @keyword
    def set_account_password(self, email, oldPassword, newPassword):
        passwordHa1 = Encode.get_ha1_password(email, newPassword)
        passwordHa1Sha256 = Encode.get_ha1_sha256_password(email, newPassword)
        body = {
            "passwordHa1": passwordHa1,
            "passwordHa1Sha256": passwordHa1Sha256

        }
        r = requests.post(f'{self.env}/cdb/account/update', auth=HTTPBasicAuth(email, oldPassword), json=body,
                          verify=False)
        return r.json()

    @keyword
    def integration_store_is_enabled(self, auth):
        r = requests.get(
            f'{self.env}/api/utils/cloudCapabilites',
            auth=HTTPBasicAuth(auth[0], auth[1]),
            verify=_ssl_certs_path)
        return r.json()['integrationStoreEnabled']

    @keyword
    def register_account(self, firstName, lastName, email, password):
        body = {
            "email": email,
            "password": password,
            "first_name": firstName,
            "last_name": lastName
        }
        r = requests.post(f'{self.env}/api/account/register', auth=HTTPBasicAuth(self.baseEmail, self.password),
                          json=body, verify=False)
        return r.json()

    @keyword
    def activate_account_via_api(self, email, password):
        code = self.get_code_from_api(email, "activate_account")
        code = re.sub(r'%3D', '=', code)
        code = re.sub(r'%2B', '+', code)
        r = requests.post(f'{self.env}/api/account/activate', auth=HTTPBasicAuth(email, password), json={"code":code}, verify=False)
        return f"{self.env}/authorize/activate/{r.json()}"

    @keyword
    def disconnect_server_via_api(self, auth, sysId, password, email):
        body = {
            "password": password,
            "system_id": sysId,
            "email": email
        }
        r = requests.post(f'{self.env}/api/systems/disconnect', auth=HTTPBasicAuth(auth[0], auth[1]), json=body,
                          verify=False)

    @keyword
    def toggle_2fa_on_api(self, email, password, backup_code=None, verification_code=None):
        with self._session(
                email, password,
                backup_code=backup_code, verification_code=verification_code) as s:
            s.headers.update({'Referer': self.env})
            verificationRes = s.post(
                f'{self.env}/api/2fa/verification', data=None)
            dataString = str(verificationRes.json().get("keyUrl"))
            splitString = dataString.split("secret=")
            secretKey = splitString[1]
            api2fa = Cloud2fa()
            totp = api2fa.get_2fa_verification_code(secretKey)
            body = {"action": "toggle", "mfaCode": totp}
            securityRes = s.post(
                f'{self.env}/api/account/security', data=body)
            assert securityRes.status_code == 200, 'Toggle 2fa on failed'
            return secretKey

    @keyword
    def toggle_2fa_off_api(self, email, password, backup_code=None, verification_code=None):
        with self._session(
                email, password,
                backup_code=backup_code, verification_code=verification_code) as s:
            s.headers.update({'Referer': self.env})
            r = s.get(f'{self.env}/api/account')
            logger.trace(r.json())
            if r.json()['account2faEnabled'] == True or r.json()['totpExistsForAccount'] == True:
                s.headers.update({'Referer': self.env})
                body = {"action": "deactivate", "mfaCode": verification_code}
                securityRes = s.post(
                    f'{self.env}/api/account/security', data=body)
                logger.trace(securityRes.status_code)
                assert securityRes.status_code == 200, 'Turning off 2fa failed'

    @keyword
    def generate_2fa_backup_codes_api(self, email, password, backup_code=None, verification_code=None):
        with self._session(
                email, password,
                backup_code=backup_code, verification_code=verification_code) as s:
            s.headers.update({'Referer': self.env})
            backupPostRes = s.post(
                f'{self.env}/api/2fa/backup', data={"count": "8"})
            assert backupPostRes.status_code == 200, 'Generate backup codes failed'
            backupList = backupPostRes.json()
            backupDict = backupList[random.randint(0, 7)]
            backupCode = backupDict.get("backup_code")
            return backupCode

    @keyword
    def get_2fa_backup_codes_api(self, email, password, backup_code=None, verification_code=None):
        with self._session(
                email, password,
                backup_code=backup_code, verification_code=verification_code) as s:
            s.headers.update({'Referer': self.env})
            backupGetRes = s.get(
                f'{self.env}/api/2fa/backup/codes', data=None)
            assert backupGetRes.status_code == 200, 'Get backup codes failed'
            backupList = backupGetRes.json()
            backupDict = backupList[random.randint(0, 7)]
            backupCode = backupDict.get("backup_code")
            return backupCode

    @keyword
    def set_feature_flags(self):
        with codecs.open("NoptixLibrary/features.json", encoding="utf-8") as featuresJson:
            featuresDict = json.load(featuresJson)
            res = requests.post(f'{self.env}/api/robot/set_flags', data=featuresDict, verify=False)
            assert res.status_code == 200
