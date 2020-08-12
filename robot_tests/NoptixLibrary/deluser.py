import requests
from requests.auth import HTTPDigestAuth, HTTPBasicAuth
import base64
import uuid
import json
from random import *
import random
import time
import string
from urllib3.util.timeout import current_time
import os

class CloudPortalAPI(object):

    def log_in(self, env, email, password):
        s = requests.Session()
        r = s.post(f'{env}/api/account/login', json={'email': email, 'password': password})
        assert r.status_code == 200, "Log In Failed"
        return s
        
    def delete_account(self, env, email, password):
            with self.log_in(env, email, password) as s:
                s.headers.update({'X-CSRFToken': s.cookies['csrftoken']})
                r = s.post(f'{env}/api/account/delete', json={'password': password})
                print(dir(r.json))
                return r.json()

if __name__ == '__main__':
    newtest = CloudPortalAPI()
    newtest.delete_account("https://cloud-test.hdw.mx", "noptixautoqa+1591126736.02900629@gmail.com", "qweasd 123")