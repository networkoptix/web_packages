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
import math

env = "https://test3.cloud.hdw.mx/"

class UserBehavior(TaskSet):
    def order(self):
        self.randDelay = random.uniform(0, 3)
        time.sleep(self.randDelay)
        txtFile = os.environ['LOCUSTTEXT']
        f= open(f'{txtFile}.txt', 'r')
#        if f.mode == 'r':
#            contents = f.read()
        lines = f.readlines()
        self.currentProc = len(lines)
        self.minSys = (self.currentProc-1)*20
        self.maxSys = self.currentProc * 20
#         print(self.minSys, self.maxSys)
        f= open(f'{txtFile}.txt', 'a')
        f.write(f"{self.currentProc+1}\n")
        f.close()
#         self.delay = int(200 - (self.currentProc/5))
#         print(self.delay) 
        
           
    def get_systems(self):
        with open('systems.json') as f:
            self.systemsJson = json.load(f)
#         self.authKey = self.systemsJson[str(self.currentProc)]['authKey']
#         self.id = self.systemsJson[str(self.currentProc)]['id']
#         self.body = self.systemsJson[str(self.currentProc)]['body']
  
    def on_start(self):
        self.order()
        self.get_systems()
        

    @task()
    def push(self):
#         f= open("responses.txt", 'w+')
#         time.sleep(self.delay)
        notificationSent = []
        print(str(self.currentProc)+" proc started push"+str(self.randDelay))
        n = 0
        for x in self.systemsJson[self.minSys:self.maxSys]:
#       for x in self.systemsJson[0:2]:
            self.authKey = x['authKey']
            self.id = x['id']
            self.body = x['body']
            self.title = x['title']
            for y in range(10): 
                self.client.post(f'{env}api/notifications/push_notification', auth=HTTPBasicAuth(self.id, self.authKey), headers={'Content-Type':'application/json'}, data=self.body)
                notificationSent.append({"Process": self.currentProc, "notification": n, "copy": y, "title": self.title})
#            time.sleep(random.uniform(0, 1))
#               print(f'{self.currentProc}_{n}_{y}')
#             f.write(f'{self.currentProc} {x} {r.text}\n\n')
            n += 1
        print(str(self.currentProc)+" proc ended push")
        f= open(f'{self.currentProc}_sent.json', 'w')
        f.write(json.dumps(notificationSent))
        f.close()
#         f.close()
            
        
class WebsiteUser(HttpLocust):
    task_set = UserBehavior
    wait_time = between(200, 300)