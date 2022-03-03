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
    def __init__(self):
        self.image = BuiltIn().get_variable_value('${IMAGE}', None)

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
                s.delete(f"{serverUrl}/res/v1/login/sessions")
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
        isCloud=True
        ):
        body= {
            "email":email,
            "name":name,
            "permissions":permissions,
            "isCloud":isCloud,
            "isEnabled":isEnabled,
            "password":password
        }
        if userId:
            body["id"]=userId
        if isCloud:
            body["fullName"]=fullName
        if userRoleId:
            body["id"]=userRoleId
            with requests.session() as s:
                self.login(s, serverUrl, password=password)
                r = requests.post(f'{serverUrl}/ec2/saveUser', auth=HTTPBasicAuth(auth[0], auth[1]), json=body, verify=False)
                return r.json()

    @keyword
    def set_system_settings(self, auth, serverUrl, settings):
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            r = s.patch(f'{serverUrl}/rest/v1/system/settings', json=settings, auth=HTTPBasicAuth(auth[0], auth[1]), verify=False)
            return r.json()

    @keyword
    def get_system_settings_from_server(self, auth, serverUrl):
        with requests.Session() as s:
            credentials = {"username": auth[0], "password": auth[1], "setCookie": True}
            s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            r = s.get(f'{serverUrl}/rest/v1/system/settings?_keepDefault=true', auth=HTTPBasicAuth(auth[0], auth[1]), verify=False)
            s.delete(f"{serverUrl}/res/v1/login/sessions")
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
