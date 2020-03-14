from locust import HttpLocust, TaskSet, task, between
import json
from random import *
import random
import time
import base64
from requests.auth import HTTPDigestAuth, HTTPBasicAuth
import string
import uuid
import os

env = "https://test3.cloud.hdw.mx/"
email = "noptixautoqa+owner@gmail.com"
password = "qweasd 123"  



class UserBehavior(TaskSet):
    def order(self):
        time.sleep(random.uniform(1, 2))
        txtFile = os.environ['LOCUSTTEXT']
        f= open(f'{txtFile}.txt', 'r')
#        if f.mode == 'r':
#            contents = f.read()
        lines = f.readlines()
        self.currentProc = len(lines)-1
        if self.currentProc <= 10:
            self.minEmail = 0 
            self.maxEmail = int(os.environ['MAXLOCUST'])
        elif self.currentProc > 10 and self.currentProc <=20:
            self.minEmail = int(os.environ['MAXLOCUST'])
            self.maxEmail = int(os.environ['MAXLOCUST02'])
        elif self.currentProc > 20 and self.currentProc <=30:
            self.minEmail = int(os.environ['MAXLOCUST02'])
            self.maxEmail = int(os.environ['MAXLOCUST03'])
        elif self.currentProc > 30 and self.currentProc <=40:
            self.minEmail = int(os.environ['MAXLOCUST03'])
            self.maxEmail = int(os.environ['MAXLOCUST04'])
        elif self.currentProc > 40 and self.currentProc <=50:
            self.minEmail = int(os.environ['MAXLOCUST04'])
            self.maxEmail = int(os.environ['MAXLOCUST05'])
        elif self.currentProc > 50 and self.currentProc <=60:
            self.minEmail = int(os.environ['MAXLOCUST05'])
            self.maxEmail = int(os.environ['MAXLOCUST06'])
        elif self.currentProc > 60 and self.currentProc <=70:
            self.minEmail = int(os.environ['MAXLOCUST06'])
            self.maxEmail = int(os.environ['MAXLOCUST07'])
        elif self.currentProc > 70 and self.currentProc <=80:
            self.minEmail = int(os.environ['MAXLOCUST07'])
            self.maxEmail = int(os.environ['MAXLOCUST08'])           
        print(str(self.minEmail)+" to "+str(self.maxEmail))
        f= open(f'{txtFile}.txt', 'a')
        f.write(f"{self.currentProc+1}\n")
        f.close()
           
    def get_systems(self):
#         self.client.headers.update({'X-CSRFToken': self.client.cookies['csrftoken']})
#        self.check_cookies()
        r = self.client.get(env+"cdb/system/get", auth=HTTPDigestAuth(email, password))
        print(r)
#        print(r.json())
        self.systemsDict = r.json()
  
    def on_start(self):
 #       self.log_in(email)
        
        self.get_systems()
        

    @task()
    def push(self):
        self.order()
        #delay = randint(0, 1)
        #time.sleep(delay)
        uid = self.minEmail
        self.locust.userId = str(uuid.uuid1())
        
        for system in self.systemsDict['systems']:
#            print(system)
            authKey = system["authKey"]
            id = system["id"]
            name = system["name"]
            
            title = str(self.currentProc)+" "+str(uid)+"_"+self.locust.userId
#            print(authKey, id, name)
 #           print(system)
                      
            emailIntStart = (int(name.strip(string.ascii_letters)))*10
 #           print(name+" stripped number "+str(emailIntStart)+" minEmail "+str(self.minEmail))
            emailIntEnd = emailIntStart+10
            
            if  emailIntStart == self.maxEmail:
                break
            elif emailIntStart >= self.minEmail:
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
 #               f= open("posts.txt", "w+")
 #               f.write(f'{name} {title}\n')
                r = self.client.post(f'{env}api/notifications/push_notification', auth=HTTPBasicAuth(id, authKey), headers={'Content-Type':'application/json'}, data=json.dumps(body))
                print (r.text, title)
            uid += 1
            
        #delay2 = 60-delay
        time.sleep(60)
        #print(delay, delay2)    
            
        
class WebsiteUser(HttpLocust):
    task_set = UserBehavior
    wait_time = between(5, 6)