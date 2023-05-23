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
            logger.trace(f"{serverUrl}/rest/v1/login/sessions")
            login_response = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            login_response.raise_for_status()
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
            r.raise_for_status()
            credentials = {"username": "admin", "password": newPassword, "setCookie": True}
            login_response = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            login_response.raise_for_status()
            self.set_system_settings(serverUrl, {"statisticsAllowed": False}, login_response.json()['token'])
    
    @keyword
    def setup_local_system_42(self, server_url, new_password, system_name):
        logger.trace("4.2")
        body = {
            "password": new_password,
            "systemName": system_name
        }
        r = requests.post(f"{server_url}/api/setupLocalSystem", auth=HTTPBasicAuth("admin", "admin"), json=body,
                          verify=False)

        auth = ("admin", new_password)
        self.set_system_settings_42(auth, server_url, {"statisticsAllowed": 'false'})

        return r.json()

    @keyword
    def get_server_id(self, serverUrl, auth, serverName=None):
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            login_response = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            servers_response = s.get(f"{serverUrl}/rest/v1/servers")
            s.delete(f"{serverUrl}/rest/v1/login/sessions/{login_response.json()['token']}")
            #logger.info(f"{systemName} has been setup on {serverUrl}")
            servers_response.raise_for_status()
            return servers_response.json()[0]['id']

    @keyword
    def API_connect_to_cloud(self, auth, serverUrl, cloudHost, name="API Made System"):
        with requests.Session() as s:
            logger.trace(auth[1])
            credentials = {"username": "admin", "password": "qweasd 123", "setCookie": True}
            login_response = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            cloud_credentials = { "name": name, "email": auth[0], "password": auth[1]}
            logger.trace(f'cloud credentials {cloud_credentials}')
            connect_response = s.post(f"{cloudHost}/api/systems/connect", json=cloud_credentials, verify=False)
            data = connect_response.json()
            logger.trace(connect_response.json())
            cloud_info = {
                "systemId": data["id"],
                "authKey": data["authKey"],
                "owner": data["ownerAccountEmail"]
            }
            cloudBind_response = s.post(f"{serverUrl}/rest/v1/system/cloudBind", json=cloud_info)
            logger.trace(cloudBind_response.content)
            s.delete(f"{serverUrl}/rest/v1/login/sessions/{login_response.json()['token']}")
            cloudBind_response.raise_for_status()
            logger.info(f"{name} has been connected to {cloudHost} with {cloud_info['owner']}'s account.")
            logger.trace(cloudBind_response)
            return cloud_info["systemId"]

    @keyword
    def save_user(self,
        token,
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
        patch=False,
        ):
        body= {
            "email":email,
            "name":name,
            "fullName":fullName,
            "permissions":permissions,
            "isCloud":isCloud,
        }
        if userId:
            body["id"]=userId
        if isCloud:
            body["fullName"]=fullName
        else:
            body["type"] = "local"
        if userRoleId:
            body["id"]=userRoleId
        if patch:
            users_response = requests.patch(f'{serverUrl}/rest/v1/users/{userId}', headers={"x-runtime-guid": token}, json=body, verify=False)
        else:
            users_response = requests.post(f'{serverUrl}/rest/v1/users', headers={"x-runtime-guid": token}, json=body, verify=False)
        users_response.raise_for_status()
        return users_response.json()

    @keyword
    def remove_user(self, token, serverUrl, userId):
        users_response = requests.delete(f'{serverUrl}/rest/v1/users/{userId}', headers={"x-runtime-guid": token}, verify=False)
        users_response.raise_for_status()


    @keyword
    def set_system_settings(self, serverUrl, settings, token):
        settings_response = requests.patch(f'{serverUrl}/rest/v1/system/settings', headers={"x-runtime-guid": token}, json=settings, verify=False)
        settings_response.raise_for_status()
        return settings_response.json()

    @keyword
    def set_system_settings_42(self, auth, serverUrl, settings):
        query = "/api/systemSettings?"
        for key, val in zip(settings.keys(), settings.values()):
            settings[key] = str(val).lower()
        #    query = query + f'{key}={val}&'
        #query = query[:-1]
        r = requests.get(f'{serverUrl}{query}', params=settings, auth=HTTPBasicAuth(auth[0], auth[1]), verify=False)
        r.raise_for_status()

        return r.json()

    @keyword
    def get_system_settings_from_server(self, auth, serverUrl):
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            login_response = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            settings_response = s.get(f'{serverUrl}/rest/v1/system/settings?_keepDefault=true', auth=HTTPBasicAuth(auth[0], auth[1]), verify=False)
            s.delete(f"{serverUrl}/rest/v1/login/sessions/{login_response.json()['token']}")
            settings_response.raise_for_status()
            return settings_response.json()

    @keyword
    def get_user_roles(self, serverUrl, auth):
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            login_response = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            userRoles_response = s.get(f'{serverUrl}/rest/v1/userRoles?_keepDefault=true', auth=HTTPBasicAuth(auth[0], auth[1]), verify=False)
            s.delete(f"{serverUrl}/rest/v1/login/sessions/{login_response.json()['token']}")
            userRoles_response.raise_for_status()
            return userRoles_response.json()

    @keyword
    def get_users(self, auth, serverUrl):
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            login_response = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            users_response = s.get(f'{serverUrl}/rest/v1/users?_format=JSON&_keepDefault=true', auth=HTTPBasicAuth(auth[0], auth[1]), verify=False)
            s.delete(f"{serverUrl}/rest/v1/login/sessions/{login_response.json()['token']}")
            users_response.raise_for_status()
            return users_response.json()

    @keyword
    def restart_server(self, serverUrl, auth):
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            login_response = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            logger.trace(login_response.json())
            token = login_response.json().get("token")
            s.headers.update({'Authorization': "Bearer " + token})
            time.sleep(1)
            restart_response = s.post(f'{serverUrl}/rest/v1/servers/this/restart', verify=False)
            restart_response.raise_for_status()

    @keyword
    def set_system_name(self, serverUrl, auth, newName):
        settings = {"systemName": newName}
        return ServerAPI5.set_system_settings(self, serverUrl, settings, auth)

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
            login_response = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            users_response = s.patch(f'{serverUrl}/rest/v1/users/{userId}', auth=HTTPBasicAuth(auth[0], auth[1]), json=body,
                          verify=False)
            s.delete(f"{serverUrl}/rest/v1/login/sessions/{login_response.json()['token']}")
            users_response.raise_for_status()
        return users_response.json()

    @keyword
    def change_server_name_via_api(self, auth, newName, serverId, serverUrl):
        body = {
            "name": newName
        }
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            login_response = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            servers_response =  s.patch(f'{serverUrl}/rest/v1/servers/this', auth=HTTPBasicAuth(auth[0], auth[1]), json=body, verify=False)
            s.delete(f"{serverUrl}/rest/v1/login/sessions/{login_response.json()['token']}")
            servers_response.raise_for_status()
            return servers_response.json()

    @keyword
    def change_server_port_via_api(self, serverUrl, newPort, token):
        body = {"port": newPort}
        confgure_response = requests.post(f'{serverUrl}/api/configure', headers={"x-runtime-guid": token}, json=body, verify=False)
        confgure_response.raise_for_status()
        return confgure_response
            
    @keyword
    def save_user_role(self, auth, serverUrl, name, permissions):
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            body = {
                "name": name,
                "permissions": permissions
            }
            userRoles_response = s.post(f'{serverUrl}/rest/v1/userRoles', auth=HTTPDigestAuth(auth[0], auth[1]), json=body,
                              verify=False)
            userRoles_response.raise_for_status()
        return userRoles_response.json()

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
            login_response = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            for i in range(len(url)):
                if url[i].isdigit():
                    cam_ip = url[i:]
                    break
            time.sleep(1)
            body = {"ip": cam_ip, "credentials":{"user": camuser, "password": campassword}, "mode": "addFoundDevices"}
            searches_response = s.post(f'{serverUrl}/rest/v1/devices/*/searches', json=body, verify=False)
            searches_response.raise_for_status()
            payload = {"credentials":{"user": camuser, "password": campassword}}
            devices_response = s.patch(f'{serverUrl}/rest/v1/devices/{uniqueId}', json=payload, verify=False)
            logger.debug(devices_response.text)
            devices_response.raise_for_status()
            return devices_response.json()

    @keyword
    def get_cameras(self, auth, serverUrl):
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            login_response = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            time.sleep(1)
            devices_response = s.get(f'{serverUrl}/rest/v1/devices', verify=False)
            devices_response.raise_for_status()
            return devices_response.json()

    @keyword
    def set_camera_attribute(self, serverUrl, auth, cameraId, attribute, value, camera_auth=['root','QAbur777%']):
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            login_response = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            time.sleep(1)
            body = {f"{attribute}": value, "credentials":{"user": camera_auth[0], "password": camera_auth[1]}}
            devices_response = s.patch(f'{serverUrl}/rest/v1/devices/{cameraId}', json=body, verify=False)
            devices_response.raise_for_status()
            return devices_response.json()

    @keyword
    def modify_device_record(self, serverUrl, auth, cameraId, payload):
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            login_response = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            time.sleep(1)
            devices_response = s.patch(f'{serverUrl}/rest/v1/devices/{cameraId}', json=payload, verify=False)
            logger.debug(devices_response.text)
            devices_response.raise_for_status()
            return devices_response.json()

    @keyword
    def start_recording_api(self, serverUrl, token, cameraId, camera_auth=['root','QAbur777%']):
        # with requests.Session() as s:
        # credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
        payload = {"credentials":{"user": camera_auth[0], "password": camera_auth[1]},
                   "schedule": {"isEnabled": True},
                   "tasks":
                    [
                       {
                           "endTime": 86400,
                           "fps": 30,
                           "streamQuality": "low"
                       },
                       {
                           "dayOfWeek": 2,
                           "endTime": 86400,
                           "fps": 30,
                           "streamQuality": "low"
                       },
                       {
                           "dayOfWeek": 3,
                           "endTime": 86400,
                           "fps": 30,
                           "streamQuality": "low"
                       },
                       {
                           "dayOfWeek": 4,
                           "endTime": 86400,
                           "fps": 30,
                           "streamQuality": "low"
                       },
                       {
                           "dayOfWeek": 5,
                           "endTime": 86400,
                           "fps": 30,
                           "streamQuality": "low"
                       },
                       {
                           "dayOfWeek": 6,
                           "endTime": 86400,
                           "fps": 30,
                           "streamQuality": "low"
                       },
                       {
                           "dayOfWeek": 7,
                           "endTime": 86400,
                           "fps": 30,
                           "streamQuality": "low"
                       }
                   ]
                }
        # r = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
        # time.sleep(1)
        devices_response = requests.patch(f'{serverUrl}/rest/v1/devices/{cameraId}', headers={"x-runtime-guid": token}, json=payload, verify=False)
        logger.debug(devices_response.text)
        devices_response.raise_for_status()
        return devices_response.json()

    @keyword
    def activate_license(self, auth, serverUrl, license):
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            login_response = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            token = login_response.json().get("token")
            s.headers.update({'Authorization': "Bearer " + token})
            time.sleep(1)
            body = {"licenseKey": str(license)}
            activateLicense_response = s.post(f'{serverUrl}/api/activateLicense', json=body, verify=False)
            activateLicense_response.raise_for_status()
            return activateLicense_response.json()


    @keyword
    def set_all_camera_add_params(self, serverUrl, auth, cameraJson):
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            login_response = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            token = login_response.json().get("token")
            s.headers.update({'Authorization': "Bearer " + token})
            time.sleep(1)
            setResourceParam_response = s.post(f'{serverUrl}/ec2/setResourceParams', json=cameraJson, verify=False)
            setResourceParam_response.raise_for_status()
            return setResourceParam_response.json()
    
    @keyword
    def set_all_camera_attributes(self, serverUrl, auth, cameraJson):
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            login_response = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            token = login_response.json().get("token")
            s.headers.update({'Authorization': "Bearer " + token})
            time.sleep(1)
            saveCameraUserAttributes_response = s.post(f'{serverUrl}/ec2/saveCameraUserAttributes',json=cameraJson, verify=False)
            saveCameraUserAttributes_response.raise_for_status()
            return saveCameraUserAttributes_response.json()

    @keyword
    def get_storages_via_api(self, serverUrl):
        with requests.Session() as s:
            credentials = {"username": "admin", "password": "qweasd 123", "setCookie": True}
            login_response = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            token = login_response.json().get("token")
            s.headers.update({'Authorization': "Bearer " + token})
            time.sleep(1)
            storages_response = s.get(f'{serverUrl}/rest/v1/servers/this/storages?_format=JSON', verify=False)
            storages_response.raise_for_status()
            logger.trace(storages_response.text)
            return storages_response.json()

    @keyword
    def save_storages_via_api(self, data, serverUrl):
        with requests.Session() as s:
            credentials = {"username": "admin", "password": "qweasd 123", "setCookie": True}
            login_response = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            token = login_response.json().get("token")
            listOfResponses = []
            for storage in data:
                s.headers.update({'Authorization': "Bearer " + token})
                time.sleep(1)
                logger.trace(storage)
                storages_response = s.patch(f'{serverUrl}/rest/v1/servers/this/storages/{storage["id"]}', json=storage, verify=False)
                logger.info(storages_response.json())
                listOfResponses.append(storages_response.json())
                storages_response.raise_for_status()
            return listOfResponses

    @keyword
    def detach_server_from_cloud(self, serverUrl, auth):
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            login_response = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            body= {
                "password":f"{auth[1]}"
            }
            cloudUnbind_response = s.post(f'{serverUrl}/rest/v1/system/cloudUnbind', json=body, verify=False)
            cloudUnbind_response.raise_for_status()
            return cloudUnbind_response

    @keyword
    def turn_on_analytics(self, serverUrl, value, resourceId, auth):
        body = [
            {
                "name": "userEnabledAnalyticsEngines",
                # "value": "[\"{687611a2-fd30-94e7-7f4c-8705642b0bcc}\"]",
                # "value": "[\"{0bfb37a3-06bd-3505-47f5-8fb8d2712e7f\"]",
                "value": value,
                "resourceId": resourceId
            }
        ]
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            login_response = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            token = login_response.json().get("token")
            s.headers.update({'Authorization': "Bearer " + token})
            time.sleep(1)
            setResourceParams_response = s.post(f'{serverUrl}/ec2/setResourceParams', auth=HTTPDigestAuth('admin', 'qweasd 123'),
                              headers={'Content-Type': 'application/json'}, json=body, verify=False)
            setResourceParams_response.raise_for_status()
        return setResourceParams_response.text

    @keyword
    def save_user_existing_legacy(self, token, serverUrl, name, permissions, email, userRoleId, userId, isEnabled=True):
        body = {
            "email": email,
            "name": name,
            "permissions": permissions,
            "isCloud": True,
            "isEnabled": isEnabled,
            "id": userId,
            "userRoleId": userRoleId
        }
        saveUser_response = requests.post(f'{serverUrl}/ec2/saveUser', headers={"x-runtime-guid": token}, json=body, verify=False)
        saveUser_response.raise_for_status()
        return saveUser_response.json()

    @keyword
    def get_server_token(self, auth, serverUrl):
        credentials = {"username": auth[0], "password": auth[1], "setCookie": False}
        login_response = requests.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
        login_response.raise_for_status()
        return login_response.json()['token']
    
    @keyword
    def get_log_level(self, auth, serverUrl):
        with requests.session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            login_response = s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            login_response.raise_for_status()
            token = login_response.json().get("token")
            s.headers.update({'Authorization': "Bearer " + token})
            logLevel_response = s.get(f'{serverUrl}/api/logLevel', verify=False)
            logLevel_response.raise_for_status()
            logger.trace(logLevel_response.json())
            return logLevel_response.json()['reply']