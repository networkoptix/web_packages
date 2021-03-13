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

    def log_out(self, env, session_id, csrftoken):
        with requests.Session() as s:
            s.headers.update({'X-CSRFToken': csrftoken})
            s.headers.update({'cookie': 'csrftoken=' + csrftoken + '; sessionid=' + session_id})
            r = s.post(f'{env}/api/account/logout')
            assert 200 == r.status_code, 'Log out failed.'
            return r.status_code

    def merge_cloud_systems(self, env, master_id, slave_id, email, password):
        with self.log_in(env, email, password) as s:
            data = {'master_system_id': master_id, 'password': password, 'slave_system_id': slave_id}
            s.headers.update({'X-CSRFToken': s.cookies['csrftoken']})
            r = s.post(f'{env}/api/systems/merge', data)
            assert r.status_code == 200
            return r.json()

    def change_password(self, env, email, old_password, new_password):
        with self.log_in(env, email, old_password) as s:
            data = {'old_password': old_password, 'new_password': new_password}
            s.headers.update({'X-CSRFToken': s.cookies['csrftoken']})
            r = s.post(f'{env}/api/account/changePassword', data)
            return r.status_code

    def restore_password(self, env, email, code=None, new_password=None):
        with requests.Session() as s:
            data = {'user_email': email}
            if code and new_password:
                data.update({'code': code, 'new_password': new_password})
            r = s.post(f'{env}/api/account/restorePassword', data)
            return r.status_code

    def get_language_anonymous(self, env):
        r = requests.get(env + '/api/utils/language')
        return r.json()['language']

    def get_account_language(self, env, email, password):
        with self.log_in(env, email, password) as s:
            r = s.get(f'{env}/api/utils/language')
            return r.json()['language']

    def get_account_data(self, env, email, password):
        with self.log_in(env, email, password) as s:
            r = s.get(f'{env}/api/account/')
            return r.json()

    def get_account_systems(self, env, email, password):
        with self.log_in(env, email, password) as s:
            data = s.get(f'{env}/api/systems/')
            # systems = []
            # for system in data.json():
            #     systems.append(system['id'])
            # return systems
        return data.json()

    def get_system_settings(self, server_url, local_auth):
        r = requests.get(f'{server_url}/ec2/getSettings', auth=(local_auth[0],  local_auth[1]), verify=False)
        assert r.status_code == 200, 'Failed to get system settings'
        return r.json()

    def get_cloud_system_id(self, server_url, local_auth):
        system_settings = self.get_system_settings(server_url, local_auth)
        for obj in system_settings:
            if obj['name'] == 'cloudSystemID':
                return obj['value']
        else:
            return 'Cannot find cloudSystemID key'

    def get_local_system_name(self, server_url, local_auth):
        system_settings = self.get_system_settings(server_url, local_auth)
        for obj in system_settings:
            if obj['name'] == 'systemName':
                return obj['value']
        else:
            return 'Cannot find systemName key'

    def get_local_system_owner(self, server_url, local_auth):
        system_settings = self.get_system_settings(server_url, local_auth)
        for obj in system_settings:
            if obj['name'] == 'cloudAccountName':
                return obj['value']
        else:
            return 'Cannot find cloudAccountName key'

    def set_account_language(self, env, email, password, new_language='en_US'):
        with self.log_in(env, email, password) as s:
            s.headers.update({'X-CSRFToken': s.cookies['csrftoken']})
            r = s.post(f'{env}/api/utils/language', json={'language': new_language})
            return r.json()

    def set_account_name(self, env, email, password, first_name, last_name):
        with self.log_in(env, email, password) as s:
            s.headers.update({'X-CSRFToken': s.cookies['csrftoken']})
            r = s.post(f'{env}/api/account/', json={'first_name': first_name, 'last_name': last_name})
            return r.json()

    def disconnect(self, env, email, password, system_id):
        with self.log_in(env, email, password) as s:
            s.headers.update({'X-CSRFToken': s.cookies['csrftoken']})
            r = s.post(f'{env}/api/systems/disconnect', json={'system_id': system_id, 'password': password})
            assert r.status_code == 200
            return r.json()

    def delete_account(self, env, email, password):
        with self.log_in(env, email, password) as s:
            s.headers.update({'X-CSRFToken': s.cookies['csrftoken']})
            r = s.post(f'{env}/api/account/delete', json={'password': password})
            return r.json()

    def get_code_from_email(self, env, auth, email, message_type):
        with self.log_in(env, auth[0], auth[1]) as s:
            s.headers.update({'X-CSRFToken': s.cookies['csrftoken']})
            r = s.post(f'{env}/api/robot/get_code', json={'email': email, 'type': message_type})
            return r.json()['code']

    def disconnect_from_account(self, env, email, password, system_id):
        """Doesn't completely remove user from system users, but sets their role to none instead.
        Should be used to emulate disconnection by clicking "Disconnect my account" button on system's page."""
        with self.log_in(env, email, password) as s:
            s.headers.update({'X-CSRFToken': s.cookies['csrftoken']})
            r = s.post(f'{env}/api/systems/{system_id}/users', json={'user_email': email, 'role': 'none'})
            return r.json()

    def subscribe_push_notification(self, env, email, password, token, name):
        authAscii = email+":"+password
        authAscii = authAscii.encode('ascii')
        auth = b"Basic "+base64.b64encode(authAscii)
        headers = {'Authorization': auth}
        r = requests.put(f'{env}/api/notifications/subscriptions/{token}', headers=headers, json={'type': 'notification','systems': ['all'],'deviceInfo': {'name': name, 'os':'web'}})
        return r.json()

    def get_new_FCM_token(self, key, auth, body):
        headers = {'Content-Type': 'application/json','x-goog-api-key': key, 'x-goog-firebase-installations-auth': auth}
        print(headers)
        r = requests.post('https://fcmregistrations.googleapis.com/v1/projects/nx-push-test/registrations', headers=headers, data=body)
        print(r)
        token = r.json()['token']
        return token

    def push_notifications_requests(self, env, email, password, process, min, max):
        r = requests.get(env+"cdb/system/get", auth=HTTPDigestAuth(email, password))
#        print(r)
#        print(r.json())
        self.systemsDict = r.json()
        self.systemsList = []

        for system in self.systemsDict['systems']:
            self.systemsList.append(system)

        self.sortedList = sorted(self.systemsList, key = lambda i: i['registrationTime'])
        uid = 0
        self.userId = str(uuid.uuid1())
#        systemStart = int(self.minEmail/10)
#        systemEnd = int(self.maxEmail/10)
        txtFile = os.environ['LOCUSTTEXT']
        f= open(f'{txtFile}.txt', 'a')
#        print(len(systemsList))
        min = int(min)
        max = int(max)
        for system in self.sortedList[min:max]:
#            print(system)
            authKey = system["authKey"]
            id = system["id"]
            name = system["name"]
#            f2= open("posts.txt", "w+")
            title = process+" "+str(uid)+"_"+self.userId
#            print(authKey, id, name)
 #           print(system)

            emailIntStart = (int(name.strip(string.ascii_letters)))*10
 #           print(name+" stripped number "+str(emailIntStart)+" minEmail "+str(self.minEmail))
            emailIntEnd = emailIntStart+10

 #           if  emailIntStart == self.maxEmail:
 #              break
 #           elif emailIntStart >= self.minEmail:
            targetList = []
            for x in range(emailIntStart, emailIntEnd):
                targetList.append(f"noptixautoqa+notifications{x}@gmail.com")
            body = {
                "systemId":id,
                "targets":targetList,
                "notification":{
                    "title": title,
                    "body": name,
                    "payload": {
                        "url": "nx-vms://test3.cloud.hdw.mx/client/"+id+"/view",
                        "imageUrl": "https://0b04fa6d-877c-48ba-aaf0-74dbfd87f082/ec2/cameraThumbnail?cameraId=ed93120e-0f50-3cdf-39c8-dd52a640688c"
                        }
                    }
                }
    # to test script comment out the post and write to file instead
            r = requests.post(f'{env}api/notifications/push_notification', auth=HTTPBasicAuth(id, authKey), headers={'Content-Type':'application/json'}, data=json.dumps(body))
            f.write(f"{r.text} {title}\n")
            uid += 1
        f.close()
#       print("Sleeping for 300 secs")
#        time.sleep(300)

    def create_systems_json(self, env, email, password):
        r = requests.get(env+"cdb/system/get", auth=HTTPDigestAuth(email, password))

        systemsDict = r.json()
        systemsList = []

        for system in systemsDict['systems']:
            systemsList.append(system)

        sortedList = sorted(systemsList, key = lambda i: i['registrationTime'])
        sysID = 1
        systemsJson = []

        for system in sortedList:

            authKey = system["authKey"]
            id = system["id"]
            name = system["name"]

            title = str(sysID)+" "+str(uuid.uuid1())


            emailIntStart = (int(name.strip(string.ascii_letters)))*10
            emailIntEnd = emailIntStart+10


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
                "notification":{
                    "title": title,
                    "body": name,
                    "payload": {
                        "url": "nx-vms://test3.cloud.hdw.mx/client/"+id+"/view",
                        "imageUrl": "https://0b04fa6d-877c-48ba-aaf0-74dbfd87f082/ec2/cameraThumbnail?cameraId=ed93120e-0f50-3cdf-39c8-dd52a640688c"
                        }
                    }
                }
            systemsJson.append({"authKey": authKey, "id": id, "body": json.dumps(body), "title": title})
            sysID += 1
        f= open('systems.json', 'w')
        f.write(json.dumps(systemsJson))
        f.close()

    @staticmethod
    def check_connection(url, verify=True):
        try:
            r = requests.get(url, verify=verify)
        except requests.exceptions.SSLError:
            return 'SSL Error'
        return r.status_code

    def add_camera(self, serverUrl, camuser, campassword, uniqueId, url, manufacturer):
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
        r = requests.post(f'{serverUrl}/api/manualCamera/add', auth=HTTPDigestAuth('admin', 'qweasd 123'), headers={'Content-Type':'application/json'}, json=body, verify=False)
        return r.text
    
    def turn_on_analytics(self, serverUrl):
#         r = requests.get(f'{serverUrl}/ec2/getCamerasEx', auth=HTTPDigestAuth('admin', 'qweasd 123'), verify=False)
#         cameraDict = r.json()
#         cameraID = cameraDict["id"]      
        body = [
                    {
                    "name": "userEnabledAnalyticsEngines",
                    "value": "[\"{687611a2-fd30-94e7-7f4c-8705642b0bcc}\"]", 
                    "resourceId": "{d6de2b74-9c74-2dad-8bc0-f1e10ba7b6b2}"
                    }
                ]
            
        p = requests.post(f'{serverUrl}/ec2/setResourceParams', auth=HTTPDigestAuth('admin', 'qweasd 123'), headers={'Content-Type':'application/json'}, json=body, verify=False)
        return p.text
        