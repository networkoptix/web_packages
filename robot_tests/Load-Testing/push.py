from locust import HttpLocust, TaskSet, task, between
import json
from random import *
import time
import base64
from requests.auth import HTTPDigestAuth, HTTPBasicAuth
import string

env = "https://test3.cloud.hdw.mx/"
email = "noptixautoqa+owner@gmail.com"
password = "qweasd 123"  



class UserBehavior(TaskSet):
    def get_systems(self):
#         self.client.headers.update({'X-CSRFToken': self.client.cookies['csrftoken']})
        self.check_cookies()
        r = self.client.get(env+"cdb/system/get", auth=HTTPDigestAuth(email, password))
        print(r.text)
        print(r.json())
        self.systemsDict = r.json()
        
    def log_in(self, user):
        r = self.client.post(env+"api/account/login", json={'email': user, 'password': password})
        print("Logged in as: "+user)
        print(r)
        print(r.text)
        time.sleep(3)
        self.check_cookies()
        
    def check_cookies(self):
        if 'sessionid' in self.client.cookies:
            print("csrftoken= "+self.client.cookies['csrftoken'])
            print("sessionid= "+self.client.cookies['sessionid'])

  
    def on_start(self):
 #       self.log_in(email)
        self.get_systems()

    @task()
    def push(self):
        delay = randint(1, 30)
        time.sleep(delay)
        
        for system in self.systemsDict['systems']:
            print(system)
            authKey = system["authKey"]
            id = system["id"]
            name = system["name"]
            
            print(authKey, id, name)
            print(system)
            
            if name != "notifications0":
                break
            
            emailIntStart = (int(name.strip(string.ascii_letters)))
            emailIntEnd = emailIntStart+10

            targetList = []
            for x in range(emailIntStart, emailIntEnd):
                x = str(x) 
                targetList.append("noptixautoqa+notifications"+x+"@gmail.com")
            body = {
                "systemId":id,
                "targets":targetList,
                "notification":{
                    "title": "PUSH NOTIFICATIONS TEST",
                    "body": name,
                    "payload": {
                        "url": "nx-vms://test3.cloud.hdw.mx/client/"+id+"/view",
                        "imageUrl": "https://0b04fa6d-877c-48ba-aaf0-74dbfd87f082/ec2/cameraThumbnail?cameraId=ed93120e-0f50-3cdf-39c8-dd52a640688c"
                        }
                    }
                }
            
            r = self.client.post(f'{env}api/notifications/push_notification', auth=HTTPBasicAuth(id, authKey), headers={'Content-Type':'application/json'}, data=json.dumps(body))
            print (r.text)
        delay2 = 60-delay
        time.sleep(delay2)
        print(delay, delay2)    
            
        
class WebsiteUser(HttpLocust):
    task_set = UserBehavior
    wait_time = between(5, 6)