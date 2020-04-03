from locust import HttpLocust, TaskSet, task, between
import requests
from requests.auth import HTTPDigestAuth, HTTPBasicAuth
import uuid
import json

env = "https://test3.cloud.hdw.mx/"
user = "noptixautoqa+owner@gmail.com"
password = "qweasd 123"

class UserBehavior(TaskSet):
   
   
    def on_start(self):
        r = requests.get(env+"cdb/system/get", auth=HTTPDigestAuth(user, password))

        systemsDict = r.json()
        systemsList = []
        
        for system in systemsDict['systems']:
            systemsList.append(system)
            
        sortedList = sorted(systemsList, key = lambda i: i['registrationTime'])
        sysID = 1
        self.systemsJson = []

        for system in sortedList:         
            authKey = system["authKey"]
            id = system["id"]
            name = system["name"]

            title = str(sysID)+" "+str(uuid.uuid1())
            
            targetList = []
            targetList.append(user)

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
            self.systemsJson.append({"authKey": authKey, "id": id, "body": json.dumps(body), "title": title})
            sysID += 1


    @task(1)
    def get_something(self):
        for system in self.systemsJson:
            self.authKey = system['authKey']
            self.id = system['id']
            self.body = system['body']
            r = self.client.post(f"{env}api/notifications/push_notification", auth=HTTPBasicAuth(self.id, self.authKey), headers={'Content-Type':'application/json'}, data=self.body)



class WebsiteUser(HttpLocust):
    task_set = UserBehavior
    wait_time = between(1, 2)