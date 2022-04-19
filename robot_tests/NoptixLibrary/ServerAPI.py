from http import server
from sre_constants import FAILURE
from xml.etree.ElementTree import iselement
import requests
from robot.libraries.BuiltIn import BuiltIn
from requests.auth import HTTPDigestAuth, HTTPBasicAuth, AuthBase
from robot.api.deco import keyword, library
from robot.api import logger
import re
import time
import urllib3

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


@library
class ServerAPI:
    def __init__(self, image=None):
        self.image = image

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

    @keyword
    def rest_get_system_settings(self, auth, server_url):
        with requests.session() as s:
            self._login(server_url, auth[0], auth[1])
            time.sleep(1)
            r = s.get(f'{server_url}/rest/v1/system/info', auth=self._auth, verify=False)
            if r.status_code != 200:
                raise APIError(f'Cannot get system settings: {r.status_code}')
            return r.json()

    @keyword
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
            time.sleep(3)
            r = s.post(f'{server_url}/rest/v1/users', auth=self._auth, json=data, verify=False)
            if r.status_code != 200:
                raise APIError(f'Cannot save user: {r.status_code}')
            return r.json()

    @keyword
    def rest_setup_local_system(self, server_url, password, name):

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
                raise APIError(f'Cannot setup local system: {r.status_code}')

    @keyword
    def merge_systems_local(self, primaryAuth, secondaryAuth, primaryUrl, secondaryUrl, currentPassword="qweasd 123"):
        body = {
            "currentPassword": currentPassword,
            "dryRun": False,
            "url": f"https://{secondaryAuth}@{secondaryUrl}"
        }
        r = requests.post(f'{primaryUrl}/api/mergeSystems', auth=HTTPBasicAuth(primaryAuth[0], primaryAuth[1]),
                          json=body, verify=False)
        return r.json()

    @keyword
    def setup_local_system(self, server_url, new_password, system_name):
        logger.trace("4.2")
        body = {
            "password": new_password,
            "systemName": system_name
        }
        r = requests.post(f"{server_url}/api/setupLocalSystem", auth=HTTPBasicAuth("admin", "admin"), json=body,
                          verify=False)

        auth = ("admin", new_password)
        self.set_system_settings(auth, server_url, {"statisticsAllowed": 'false'})

        return r.json()

    @keyword
    def setup_cloud_system(self, auth, serverUrl, authKey, systemName, cloudSystemId, ownerEmail):
        body = {
            "cloudAuthKey": authKey,
            "systemName": systemName,
            "cloudSystemID": cloudSystemId,
            "cloudAccountName": ownerEmail
        }
        r = requests.post(f'{serverUrl}/api/setupCloudSystem', auth=HTTPBasicAuth(auth[0], auth[1]), json=body,
                          verify=False)
        return r.json()

    @keyword
    def ping_server(self, serverUrl, auth):
        r = requests.get(f'{serverUrl}/api/ping', auth=HTTPBasicAuth(auth[0], auth[1]), verify=False)

    @keyword
    def restart_server(self, serverUrl, auth):
        r = requests.get(f'{serverUrl}/api/restart', auth=HTTPDigestAuth(auth[0], auth[1]), verify=False)
        return r.json()

    @keyword
    def restore_factory_defaults(self, serverUrl, auth):
        body = {
            "currentPassword": auth[1]
        }
        r = requests.post(f'{serverUrl}/api/restoreState', auth=HTTPBasicAuth(auth[0], auth[1]), json=body,
                          verify=False)

    @keyword
    def detach_server_from_system(self, serverUrl, auth):
        body = {
            "currentPassword": auth[1]
        }
        r = requests.post(f'{serverUrl}/api/detachFromSystem', auth=HTTPBasicAuth(auth[0], auth[1]), json=body,
                          verify=False)

    @keyword
    def detach_server_from_cloud(self, serverUrl, auth):
        body= {
            "currentPassword":auth[1],
            "password":auth[1]
        }
        r = requests.post(f'{serverUrl}/api/detachFromCloud', auth=HTTPBasicAuth(auth[0], auth[1]), json=body,
                          verify=False)
        return r.json()

    @keyword
    def get_server_name(self, serverUrl, auth):
        r = requests.get(f'{serverUrl}/ec2/getMediaServersEx', auth=HTTPBasicAuth(auth[0], auth[1]), verify=False)
        netAddress = re.sub(r'https://', "", serverUrl)
        netAddress = re.sub(r'http://', "", netAddress)
        logger.trace(netAddress)
        logger.trace(r.json())
        for server in r.json():
            if netAddress in server["networkAddresses"]:
                return server['name']
            else:
                raise AssertionError('No server with that URL')

    @keyword
    def get_server_id(self, serverUrl, auth, serverName=None):
        r = requests.get(f'{serverUrl}/ec2/getMediaServersEx', auth=HTTPBasicAuth(auth[0], auth[1]), verify=False)
        if not serverName:
            return r.json()[0]['id']
        else:
            for server in r.json():
                if serverName == server['name']:
                    return server['id']

    @keyword
    def rename_server(self, serverUrl, auth, newName):
        oldName = self.get_server_name(serverUrl, auth)
        id = self.get_server_id(serverUrl, auth, serverName=oldName)
        body = {
            "severId": id,
            "serverName": newName
        }
        r = requests.post(f'{serverUrl}/ec2/saveMediaServerUserAttributes', auth=HTTPBasicAuth(auth[0], auth[1]),
                          json=body, verify=False)

    @keyword
    def remove_resource_from_system(self, serverUrl, auth, resourceId):
        body = {
            "id": resourceId
        }
        r = requests.post(f'{serverUrl}/ec2/removeResource', auth=HTTPBasicAuth(auth[0], auth[1]), json=body,
                          verify=False)
        return r.json()

    @keyword
    def activate_license(self, auth, serverUrl, license):
        body = {
            "licenseKey": str(license)
        }
        r = requests.post(f'{serverUrl}/api/activateLicense', auth=HTTPDigestAuth(auth[0], auth[1]), json=body,
                          verify=False)
        return r.json()

    @keyword
    def remove_license(self, auth, serverUrl, license):
        body = {
            "key": license
        }
        r = requests.post(f'{serverUrl}/ec2/removeLicense', auth=HTTPBasicAuth(auth[0], auth[1]), json=body,
                          verify=False)
        return r.json()

    @keyword
    def get_licenses(self, auth, serverUrl):
        r = requests.get(f'{serverUrl}/ec2/getLicenses', auth=HTTPBasicAuth(auth[0], auth[1]), verify=False)
        return r.json()

    @keyword
    def license_is_activated(self, auth, serverUrl, license):
        licenses = self.get_licenses(auth, serverUrl)
        for lic in licenses:
            if lic['key'] == license:
                return True
        else:
            return False

    @keyword
    def change_license_portal_host(self, auth, serverUrl, newHost):
        r = requests.get(f'{serverUrl}/api/systemSettings?licenseServer={newHost}',
                         auth=HTTPBasicAuth(auth[0], auth[1]), verify=False)
        return r.json()

    @keyword
    def get_server_hwids(self, auth, serverUrl):
        r = requests.get(f'{serverUrl}/api/getHardwareIds', auth=HTTPDigestAuth(auth[0], auth[1]), verify=False)
        return r.json()['reply']

    @keyword
    def get_system_settings(self, auth, serverUrl):
        r = requests.get(f'{serverUrl}/ec2/getSettings', auth=HTTPBasicAuth(auth[0], auth[1]), verify=False)
        return r.json()

    @keyword
    def get_system_settings_from_server(self, auth, serverUrl):
        r = requests.get(f'{serverUrl}/api/systemSettings', auth=HTTPBasicAuth(auth[0], auth[1]), verify=False)
        system_settings = r.json()
        return system_settings['reply']['settings']

    @keyword
    def get_log_level(self, auth, serverUrl):
        r = requests.get(f'{serverUrl}/api/logLevel', auth=HTTPBasicAuth(auth[0], auth[1]), verify=False)
        return r.json()['reply']

    @keyword
    def get_users(self, auth, serverUrl):
        r = requests.get(f'{serverUrl}/ec2/getUsers', auth=HTTPBasicAuth(auth[0], auth[1]), verify=False)
        return r.json()

    @keyword
    def set_system_name(self, serverUrl, auth, newName):
        r = requests.get(f'{serverUrl}/api/systemSettings?systemName={newName}', auth=HTTPBasicAuth(auth[0], auth[1]), verify=False)

    @keyword
    def set_camera_attribute(self, serverUrl, auth, cameraId, attribute, value, camera_auth):
        body = {
            "cameraId": cameraId,
            f"{attribute}": value
        }
        r = requests.post(f'{serverUrl}/ec2/saveCameraUserAttributes', auth=HTTPBasicAuth(auth[0], auth[1]), json=body,
                          verify=False)
        return r.json()

    @keyword
    def set_all_camera_attributes(self, serverUrl, auth, cameraJson):
        r = requests.post(f'{serverUrl}/ec2/saveCameraUserAttributes', auth=HTTPBasicAuth(auth[0], auth[1]),
                          json=cameraJson, verify=False)
        return r.json()

    @keyword
    def set_all_camera_add_params(self, serverUrl, auth, cameraJson):
        r = requests.post(f'{serverUrl}/ec2/setResourceParams', auth=HTTPBasicAuth(auth[0], auth[1]), json=cameraJson,
                          verify=False)
        return r.json()

    @keyword
    def get_user_roles(self, serverUrl, auth):
        r = requests.get(f'{serverUrl}/ec2/getUserRoles', auth=HTTPBasicAuth(auth[0], auth[1]), verify=False)
        return r.json()

    @keyword
    def save_user(self,
                  auth,
                  serverUrl,
                  name,
                  permissions,
                  email,
                  fullName,
                  password,
                  userId=None,
                  userRoleId=None,
                  isEnabled=True,
                  isCloud=True,
                  patch=False
                  ):
        body = {
            "email": email,
            "name": name,
            "permissions": permissions,
            "isCloud": isCloud,
            "isEnabled": isEnabled,
            "password": password
        }
        if userId is not None:
            body["id"] = userId
        body["fullName"] = fullName
        if userRoleId is not None:
            body["id"] = userRoleId
        r = requests.post(f'{serverUrl}/ec2/saveUser', auth=HTTPBasicAuth(auth[0], auth[1]), json=body, verify=False)
        return r.json()

    @keyword
    def save_user_existing(self, auth, serverUrl, name, permissions, email, userRoleId, userId):
        body = {
            "email": email,
            "name": name,
            "permissions": permissions,
            "isCloud": True,
            "isEnabled": True,
            "id": userId,
            "userRoleId": userRoleId
        }
        r = requests.post(f'{serverUrl}/ec2/saveUser', auth=HTTPBasicAuth(auth[0], auth[1]), json=body, verify=False)
        return r.json()

    @keyword
    def save_user_role(self, auth, serverUrl, name, permissions):
        body = {
            "name": name,
            "permissions": permissions
        }
        r = requests.post(f'{serverUrl}/ec2/saveUserRole', auth=HTTPDigestAuth(auth[0], auth[1]), json=body,
                          verify=False)
        return r.json()

    @keyword
    def remove_user(self, auth, serverUrl, userId):
        r = requests.post(f'{serverUrl}/ec2/removeUser', auth=HTTPBasicAuth(auth[0], auth[1]), json={"id": userId},
                          verify=False)
        return r.json()

    @keyword
    def get_cameras(self, auth, serverUrl):
        r = requests.get(f'{serverUrl}/ec2/getCamerasEx', auth=HTTPDigestAuth(auth[0], auth[1]), verify=False)
        return r.json()

    @keyword
    def change_server_name_via_api(self, auth, newName, serverId, serverUrl):
        body = {
            "serverId": serverId,
            "serverName": newName
        }
        r = requests.post(f'{serverUrl}/ec2/saveMediaServerUserAttributes', auth=HTTPBasicAuth(auth[0], auth[1]),
                          json=body, verify=False)
        return r.json()

    @keyword
    def change_server_port_via_api(self, auth, serverUrl, newPort, serverId):
        header = {"X-Server-guid": serverId}
        body = {"port": newPort}
        r = requests.post(f'{serverUrl}/api/configure', auth=HTTPBasicAuth(auth[0], auth[1]), json=body, headers=header,
                          verify=False)
        return r

    @keyword
    def disable_stat_reports(self, auth, serverUrl):
        r = requests.get(f'{serverUrl}/api/systemSettings?statisticsAllowed=false&statisticsReportTimeCycle=null',
                         auth=HTTPBasicAuth(auth[0], auth[1]), verify=False)
        return r.json()

    @keyword
    def get_storages_via_api(self, serverUrl):
        r = requests.get(f'{serverUrl}/ec2/getStorages', auth=HTTPBasicAuth('admin', 'qweasd 123'), verify=False)
        return r.json()

    @keyword
    def save_storages_via_api(self, data, serverUrl):
        r = requests.post(f'{serverUrl}/ec2/saveStorages', auth=HTTPBasicAuth('admin', 'qweasd 123'), json=data,
                          verify=False)
        return r.json()

    @keyword
    def get_customizations(self, auth):
        r = requests.get(f'https://ireg.hdw.mx/api/v1/public/products/nxcloud/instances/prod/',
                         auth=HTTPBasicAuth(auth[0], auth[1]), verify=False)
        customizations = r.json["instance_customizations"]
        domains = []
        for customization in customizations:
            domains.append(customization["domain"])
        return domains

    @keyword
    def set_system_settings(self, auth, serverUrl, settings):
        query = "/api/systemSettings?"
        for key, val in zip(settings.keys(), settings.values()):
            settings[key] = str(val).lower()
        #    query = query + f'{key}={val}&'
        #query = query[:-1]
        r = requests.get(f'{serverUrl}{query}', params=settings, auth=HTTPBasicAuth(auth[0], auth[1]), verify=False)
        return r.json()

    @keyword
    def get_relays(self, auth):
        r = requests.get('https://ireg.hdw.mx/api/v1/public/products/traffic_relay/instances/?group__name=prod',
                         auth=HTTPBasicAuth(auth[0], auth[1]), verify=False)
        relays = []
        for relay in r.json():
            relays.append(relay["domain"])
        return relays

    @keyword
    def get_camera_user_attributes(self, serverUrl, auth):
        r = requests.get(f'{serverUrl}/ec2/getCameraUserAttributesList', auth=HTTPBasicAuth(auth[0], auth[1]),
                         verify=False)
        return r.json()

    @keyword
    def save_camera_user_attributes(self, serverUrl, auth, data):
        r = requests.post(f'{serverUrl}/ec2/saveCameraUserAttributesList', auth=HTTPBasicAuth(auth[0], auth[1]),
                          json=data, verify=False)

    @keyword
    def get_media_server_attributes(self, serverUrl, auth):
        r = requests.get(f'{serverUrl}/ec2/getMediaServerUserAttributesList', auth=HTTPBasicAuth(auth[0], auth[1]),
                         verify=False)
        return r.json()

    @keyword
    def save_media_server_attributes(self, serverUrl, auth, data):
        r = requests.post(f'{serverUrl}/ec2/saveMediaServerUserAttributesList', auth=HTTPBasicAuth(auth[0], auth[1]),
                          json=data, verify=False)

    @keyword
    def add_virtual_camera(self, serverUrl, auth, cameraName, image=None):
        image = image or self.image
        r = requests.post(f'{serverUrl}/api/wearableCamera/add?name={cameraName}', auth=HTTPBasicAuth(auth[0], auth[1]),
                          verify=False)

    @keyword
    def get_system_settings(self, server_url, local_auth):
        r = requests.get(f'{server_url}/ec2/getSettings', auth=(local_auth[0], local_auth[1]), verify=False)
        assert r.status_code == 200, 'Failed to get system settings'
        return r.json()

    @keyword
    def get_cloud_system_id(self, server_url, local_auth):
        system_settings = ServerAPI.get_system_settings(self, server_url, local_auth)
        for obj in system_settings:
            if obj['name'] == 'cloudSystemID':
                return obj['value']
        else:
            return 'Cannot find cloudSystemID key'

    @keyword
    def get_local_system_name(self, server_url, local_auth):
        system_settings = ServerAPI.get_system_settings(server_url, local_auth)
        for obj in system_settings:
            if obj['name'] == 'systemName':
                return obj['value']
        else:
            return 'Cannot find systemName key'

    @keyword
    def get_local_system_owner(self, server_url, local_auth):
        system_settings = ServerAPI.get_system_settings(server_url, local_auth)
        for obj in system_settings:
            if obj['name'] == 'cloudAccountName':
                return obj['value']
        else:
            return 'Cannot find cloudAccountName key'
    
    @keyword
    def add_camera(self, serverUrl, camuser, campassword, uniqueId, url, local_auth, manufacturer=None):
        body = {
            "user": camuser,
            "password": campassword,
            "cameras":
                [
                    {
                        "uniqueId": uniqueId,
                        "url": url,
                        "manufacturer": manufacturer
                    }
                ]
        }
        logger.trace(body)
        r = requests.post(f'{serverUrl}/api/manualCamera/add', auth=HTTPDigestAuth(local_auth[0], local_auth[1]),
                          headers={'Content-Type': 'application/json'}, json=body, verify=False)
        logger.trace(r.status_code)
        logger.trace(r.text)
        assert r.status_code == 200