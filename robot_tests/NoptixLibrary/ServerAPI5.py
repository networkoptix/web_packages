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

@library
class ServerAPI5(ServerAPI):

    @keyword
    def setup_local_system(self, serverUrl, newPassword, systemName):
        with requests.Session() as s:
            credentials = {"username": "admin", "password": "admin", "setCookie": True}
            s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)
            body = {
                "name": systemName,
                "settings": {},
                "local": {
                    "password": newPassword
                }
            }
            r = s.post(f"{serverUrl}/rest/v1/system/setup", json=body)
            s.delete(f"{serverUrl}/res/v1/login/sessions")
            logger.info(f"{systemName} has been setup on {serverUrl}")
            logger.trace(r.status_code)

    @keyword
    def get_server_id(self, serverUrl, auth, serverName=None):
        with requests.Session() as s:
            credentials = {"username": "admin", "password": "admin", "setCookie": True}
            s.post(f"{serverUrl}/rest/v1/login/sessions", json=credentials, verify=False)

            r = s.get(f"{serverUrl}/rest/v1/servers")
            s.delete(f"{serverUrl}/res/v1/login/sessions")
            #logger.info(f"{systemName} has been setup on {serverUrl}")
            logger.trace(r.status_code)