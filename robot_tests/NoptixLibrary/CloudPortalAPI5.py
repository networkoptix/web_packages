import requests
import base64
import uuid
import json
import string
import os
from robot.api.deco import keyword, library
import urllib3

from robot.libraries.BuiltIn import BuiltIn
from requests.auth import HTTPDigestAuth, HTTPBasicAuth
from robot.api import logger
#from NoptixLibrary import NoptixLibrary
from CloudPortalAPI import CloudPortalAPI

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
@library
class CloudPortalAPI5(CloudPortalAPI):

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