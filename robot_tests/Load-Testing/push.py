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
        time.sleep(random.uniform(0, 1))
        txtFile = os.environ['LOCUSTTEXT']
        f= open(f'{txtFile}.txt', 'r')
#        if f.mode == 'r':
#            contents = f.read()
        lines = f.readlines()
        self.currentProc = math.ceil(len(lines)/2)
        f= open(f'{txtFile}.txt', 'a')
        f.write(f"{self.currentProc+1}\n")
        f.close()
#         self.delay = int(200 - (self.currentProc/5))
#         print(self.delay) 
        
           
    def get_systems(self):
        with open('systems.json') as f:
            self.systemsJson = json.load(f)
        self.authKey = self.systemsJson[str(self.currentProc)]['authKey']
        self.id = self.systemsJson[str(self.currentProc)]['id']
        self.body = self.systemsJson[str(self.currentProc)]['body']
  
    def on_start(self):
        self.order()
        self.get_systems()
        

    @task()
    def push(self):
#         f= open("responses.txt", 'w+')
#         time.sleep(self.delay)
        print(str(self.currentProc)+" proc started push")
        for x in range(5): 
            r = self.client.post(f'{env}api/notifications/push_notification', auth=HTTPBasicAuth(self.id, self.authKey), headers={'Content-Type':'application/json'}, data=self.body)
            time.sleep(random.uniform(0, 5))
            print(f'{self.currentProc}_{x}')
#             f.write(f'{self.currentProc} {x} {r.text}\n\n')
        print(str(self.currentProc)+" proc ended push")
#         f.close()
            
        
class WebsiteUser(HttpLocust):
    task_set = UserBehavior
    wait_time = between(200, 300)