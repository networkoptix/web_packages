from http import server
from sre_constants import FAILURE
from xml.etree.ElementTree import iselement
import requests
from requests.auth import HTTPDigestAuth, HTTPBasicAuth, AuthBase
from robot.api.deco import keyword, library
from robot.api import logger
import LicenseManagement
from robot.libraries.BuiltIn import BuiltIn
import time
from ServerAPI import ServerAPI
import urllib3


urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class APIError(Exception):
    def __init__(self, msg):
        self.msg = msg

    def __str__(self):
        return str(self.msg)

@library
class ServerAPI5(ServerAPI):
    def __init__(self, image=None):
        self.image = image

    def login(self, session, host, password="admin"):
        credentials = {"username": "admin", "password": password, "setCookie": True}
        session.post(f"{host}/rest/v1/login/sessions", json=credentials, verify=False)

    @keyword
    def setup_local_system(self, serverUrl, newPassword, systemName):
        with requests.Session() as s:
            credentials = {"username": "admin", "password": "admin", "setCookie": True}
            s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            data = {
                "name": systemName,
                "settings": {
                    "statisticsAllowed": False,
                    "trafficEncryptionForced": False
                },
                "local": {
                    "password": newPassword
                }
            }
            r = s.post(
                f'{serverUrl}/rest/v1/system/setup',
                auth=HTTPDigestAuth('admin', 'admin'),
                json=data,
                verify=False
            )
            if r.status_code != 200:
                raise APIError(f'Cannot setup local system: {r.status_code}')
            self.set_system_settings(["admin","qweasd 123"], serverUrl, {"statisticsAllowed": False})

    @keyword
    def get_server_id(self, serverUrl, auth, serverName=None):
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)

            r = s.get(f"{serverUrl}/rest/v1/servers")
            s.delete(f"{serverUrl}/rest/v1/login/sessions")
            #logger.info(f"{systemName} has been setup on {serverUrl}")
            logger.trace(r.status_code)
            return r.json()[0]['id']

    @keyword
    def API_connect_to_cloud(self, auth, serverUrl, cloudHost, name="API Made System"):
        try:
            with requests.Session() as s:
                logger.trace(auth[1])
                self.login(s, serverUrl, password=auth[1])
                cloud_credentials = { "name": name, "email": auth[0], "password": auth[1]}
                logger.trace(f'cloud credentials {cloud_credentials}')
                res = s.post(f"{cloudHost}/api/systems/connect", json=cloud_credentials, verify=False)

                data = res.json()
                logger.trace(res.json())
                cloud_info = {
                    "systemId": data["id"],
                    "authKey": data["authKey"],
                    "owner": data["ownerAccountEmail"]
                }
                r = s.post(f"{serverUrl}/rest/v1/system/cloudBind", json=cloud_info)
                s.delete(f"{serverUrl}/rest/v1/login/sessions")
                logger.info(f"{name} has been connected to {cloudHost} with {cloud_info['owner']}'s account.")
                logger.trace(r)
                return cloud_info["systemId"]
        except requests.exceptions.HTTPError as e:
            logger.info("Something went wrong. System will be setup without connecting to cloud")
            logger.warning(res.status_code)
            logger.warning(res.content)
            logger.error(e)

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
        body= {
            "email":email,
            "name":name,
            "fullName":fullName,
            "permissions":permissions,
            "isCloud":isCloud,
            "isEnabled":isEnabled,
            "password":password
        }
        if userId:
            body["id"]=userId
        if isCloud:
            body["fullName"]=fullName
        else:
            body["type"] = "local"
        if userRoleId:
            body["id"]=userRoleId
        with requests.session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            if patch:
                r = s.patch(f'{serverUrl}/rest/v1/users/{userId}', auth=HTTPBasicAuth(auth[0], auth[1]), json=body, verify=False)
            else:
                r = s.post(f'{serverUrl}/rest/v1/users', auth=HTTPBasicAuth(auth[0], auth[1]), json=body, verify=False)
            return r.json()

    @keyword
    def remove_user(self, auth, serverUrl, userId):
        with requests.session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            r = s.delete(f'{serverUrl}/rest/v1/users/{userId}', auth=HTTPBasicAuth(auth[0], auth[1]), verify=False)
            assert r.status_code == 200
            # return r.json()

    @keyword
    def set_system_settings(self, auth, serverUrl, settings):
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            r = s.patch(f'{serverUrl}/rest/v1/system/settings', json=settings, auth=HTTPBasicAuth(auth[0], auth[1]), verify=False)
            s.delete(f"{serverUrl}/rest/v1/login/sessions")
            return r.json()

    @keyword
    def get_system_settings_from_server(self, auth, serverUrl):
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            r = s.get(f'{serverUrl}/rest/v1/system/settings?_keepDefault=true', auth=HTTPBasicAuth(auth[0], auth[1]), verify=False)
            s.delete(f"{serverUrl}/rest/v1/login/sessions")
            return r.json()

    @keyword
    def get_user_roles(self, serverUrl, auth):
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            r = s.get(f'{serverUrl}/rest/v1/userRoles?_keepDefault=true', auth=HTTPBasicAuth(auth[0], auth[1]), verify=False)
            s.delete(f"{serverUrl}/rest/v1/login/sessions")
            return r.json()

    @keyword
    def get_users(self, auth, serverUrl):
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            r = s.get(f'{serverUrl}/rest/v1/users?_format=JSON&_keepDefault=true', auth=HTTPBasicAuth(auth[0], auth[1]), verify=False)
            s.delete(f"{serverUrl}/rest/v1/login/sessions")
            return r.json()

    @keyword
    def restart_server(self, serverUrl, auth):
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            f = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            logger.trace(f.json())
            r = s.post(f'{serverUrl}/rest/v1/servers/this/restart', auth=HTTPBasicAuth(auth[0], auth[1]), verify=False)
            s.delete(f"{serverUrl}/rest/v1/login/sessions")
            assert r.status_code == 200

    @keyword
    def set_system_name(self, serverUrl, auth, newName):
        settings = {"systemName": newName}
        response = ServerAPI5.set_system_settings(self, auth, serverUrl, settings)
        return response

    @keyword
    def save_user_existing(self, auth, serverUrl, name, permissions, email, userRoleId, userId):
        body = {
            "email": email,
            "name": name,
            "permissions": permissions,
            "userRoleId": userRoleId
        }
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            r = s.patch(f'{serverUrl}/rest/v1/users/{userId}', auth=HTTPBasicAuth(auth[0], auth[1]), json=body,
                          verify=False)
            s.delete(f"{serverUrl}/rest/v1/login/sessions")
        return r.json()

    @keyword
    def change_server_name_via_api(self, auth, newName, serverId, serverUrl):
        body = {
            "name": newName
        }
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            r =  r = s.patch(f'{serverUrl}/rest/v1/servers/this', auth=HTTPBasicAuth(auth[0], auth[1]), json=body, verify=False)
            s.delete(f"{serverUrl}/rest/v1/login/sessions")
            return r.json()

    @keyword
    def change_server_port_via_api(self, auth, serverUrl, newPort, serverId):
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)

            s.headers.update({'X-Runtime-Guid': s.cookies['x-runtime-guid'], "X-Server-guid": serverId})
            body = {"port": newPort}
            r = s.post(f'{serverUrl}/api/configure', json=body, verify=False)
            return r
            
    @keyword
    def save_user_role(self, auth, serverUrl, name, permissions):
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            body = {
                "name": name,
                "permissions": permissions
            }
            r = s.post(f'{serverUrl}/rest/v1/userRoles', auth=HTTPDigestAuth(auth[0], auth[1]), json=body,
                              verify=False)
        return r.json()

        #@keyword
    #def save_user(self, auth, server_url, name, permissions, email, full_name, password, is_cloud=True):
#
    #    if is_cloud and (name != email):
    #        raise APIError('Cannot save user. Email should be the same as name.')
#
    #    data = {
    #        "name": name,
    #        "email": email,
    #        "fullName": full_name,
    #        "permissions": permissions,
    #        "isEnabled": True
    #    }
#
    #    user_type = 'cloud' if is_cloud else 'local'
    #    data.update({"type": user_type})
    #    if not is_cloud:
    #        data.update({"password": password})
#
    #    with requests.session() as s:
    #        self.login(s, server_url, password=password)
    #        #time.sleep(3)
    #        r = s.post(f'{server_url}/rest/v1/users', json=data, verify=False)
    #        if r.status_code != 200:
    #            raise APIError(f'Cannot save user: {r.content}')
    #        return r.json()

    @keyword
    def get_cloud_system_id(self, server_url, local_auth):
        system_settings = ServerAPI5.get_system_settings_from_server(self, local_auth, server_url)
        logger.trace(system_settings)
        return system_settings["cloudSystemID"]

    @keyword
    def get_local_system_name(self, server_url, local_auth):
        system_settings = ServerAPI5.get_system_settings_from_server(self, local_auth, server_url)
        return system_settings["systemName"]

    @keyword
    def get_local_system_owner(self, server_url, local_auth):
        system_settings = ServerAPI5.get_system_settings_from_server(self, local_auth, server_url)
        return system_settings["cloudAccountName"]

    @keyword
    def add_camera(self, serverUrl, camuser, campassword, uniqueId, url, local_auth, manufacturer=None):
        with requests.Session() as s:
            credentials = {"username": local_auth[0], "password": local_auth[1], "setCookie": True}
            r = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            for i in range(len(url)):
                if url[i].isdigit():
                    cam_ip = url[i:]
                    break
            time.sleep(1)
            body = {"ip": cam_ip, "credentials":{"user": camuser, "password": campassword}, "mode": "addFoundDevices"}
            r = s.post(f'{serverUrl}/rest/v1/devices/*/searches', json=body, verify=False)
            assert r.status_code == 200, f"Endpoint /rest/v1/devices/*/searches status code is {r.status_code}"

    @keyword
    def get_cameras(self, auth, serverUrl):
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            r = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            time.sleep(1)
            r = s.get(f'{serverUrl}/rest/v1/devices', verify=False)
            assert r.status_code == 200, f"Endpoint /rest/v1/devices status code is {r.status_code}"
            return r.json()

    @keyword
    def set_camera_attribute(self, serverUrl, auth, cameraId, attribute, value, camera_auth=['admin','QAbur777$']):
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            r = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            time.sleep(1)
            body = {f"{attribute}": value, "credentials":{"user": camera_auth[0], "password": camera_auth[1]}}
            r = s.patch(f'{serverUrl}/rest/v1/devices/{cameraId}', json=body, verify=False)
            assert r.status_code == 200, f"Endpoint /rest/v1/devices status code is {r.status_code}"
            return r.json()

    @keyword
    def activate_license(self, auth, serverUrl, license):
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            r = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            token = r.json().get("token")
            s.headers.update({'Authorization': "Bearer " + token})
            time.sleep(1)
            body = {"licenseKey": str(license)}
            r = s.post(f'{serverUrl}/api/activateLicense', json=body, verify=False)
            assert r.status_code == 200, f"Endpoint /api/activateLicense status code is {r.status_code}"
            return r.json()


    @keyword
    def set_all_camera_add_params(self, serverUrl, auth, cameraJson):
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            r = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            token = r.json().get("token")
            s.headers.update({'Authorization': "Bearer " + token})
            time.sleep(1)
            r = s.post(f'{serverUrl}/ec2/setResourceParams', json=cameraJson, verify=False)
            return r.json()
    
    @keyword
    def set_all_camera_attributes(self, serverUrl, auth, cameraJson):
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            r = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            token = r.json().get("token")
            s.headers.update({'Authorization': "Bearer " + token})
            time.sleep(1)
            r = s.post(f'{serverUrl}/ec2/saveCameraUserAttributes',json=cameraJson, verify=False)
            return r.json()

    @keyword
    def get_storages_via_api(self, serverUrl):
        with requests.Session() as s:
            credentials = {"username": "admin", "password": "qweasd 123", "setCookie": True}
            r = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            token = r.json().get("token")
            s.headers.update({'Authorization': "Bearer " + token})
            time.sleep(1)
            r = s.get(f'{serverUrl}/rest/v1/servers/this/storages?_format=JSON', verify=False)
            logger.trace(r.text)
            return r.json()

    @keyword
    def save_storages_via_api(self, data, serverUrl):
        with requests.Session() as s:
            credentials = {"username": "admin", "password": "qweasd 123", "setCookie": True}
            r = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            token = r.json().get("token")
            listOfResponses = []
            for storage in data:
                s.headers.update({'Authorization': "Bearer " + token})
                time.sleep(1)
                logger.trace(storage)
                r = s.patch(f'{serverUrl}/rest/v1/servers/this/storages/{storage["id"]}', json=storage, verify=False)
                logger.info(r.json())
                listOfResponses.append(r.json())
                assert r.status_code == 200, f'Endpoint rest/v1/servers/this/storages/{storage["id"]} is {r.status_code}'
            return listOfResponses