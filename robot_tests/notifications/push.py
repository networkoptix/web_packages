from locust import HttpUser, TaskSet, task, between, events
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
import requests
import uuid
import json
import string
from waiting import wait

env = "https://test4.cloud.hdw.mx/"

CLOUD_HOST = 'test4.cloud.hdw.mx'

SYSTEM_ID = '2d431e69-39ee-4899-b372-e76f5b32dad8'
SYSTEM_AUTH_KEY = 'lBFCHJBWPKCvnfVeIbXc'
TARGET_USERS = ['noptixautoqa+notifications0@gmail.com', 'noptixautoqa+notifications1@gmail.com']

class UserBehavior(HttpUser):
    def order(self):
        # self.randDelay = random.uniform(0, 3)
        # time.sleep(self.randDelay)
        time.sleep(100/1000)
        # txtFile = os.environ['LOCUSTTEXT']
        # f= open(f'{txtFile}.txt', 'r')
        # if f.mode == 'r':
        #     contents = f.read()
        # lines = f.readlines()
        # self.currentProc = len(lines)
        # self.minSys = (self.currentProc-1)*5
        # self.maxSys = self.currentProc * 5
        self.currentProc = int(os.environ['PROC'])
        self.minSys = self.currentProc * 5
        self.maxSys = (self.currentProc + 1) * 5
        # self.minSys = 0
        # self.maxSys = 1
        print(self.minSys, self.maxSys)
        # f= open(f'{txtFile}.txt', 'a')
        # f.write(f"{self.currentProc+1}\n")
        # f.close()
        os.environ['PROC'] = str(self.currentProc + 1)
        return [self.minSys, self.maxSys]
#         self.delay = int(200 - (self.currentProc/5))
#         print(self.delay) 


    def create_systems_list(self):
    #     r = requests.get("https://" + CLOUD_HOST + "/cdb/system/get", auth=HTTPBasicAuth(email, password))
        with open('systems.json') as f:
            self.systemsList = json.load(f)
        # systemsDict = r.json()
        # print(systemsDict)
        # systemsList = []
        # for system in systemsDict['systems']:
        #     systemsList.append(system)
        # sortedList = sorted(systemsList, key=lambda i: i['registrationTime'])
        # sysID = 1
        # systemsList = []
        # for system in systemsList:
        #     # authKey = system["authKey"]
        #     # id = system["id"]
        #     name = system["name"]
        #     # title = str(sysID) + " " + str(uuid.uuid1())
        #     emailIntStart = (int(name.strip(string.ascii_letters))) * 5
        #     emailIntEnd = emailIntStart + 5
        #     targetList = []
        #     for x in range(emailIntStart, emailIntEnd):
        #         targetList.append(f"noptixautoqa+notifications{x}@gmail.com")
        #     system.update({"targets": targetList})
        #     # sysID += 1
        #     f = open('systems.json', 'w')
        #     f.write(json.dumps(systemsList))
        #     f.close()
        return self.systemsList

    # @events.test_start.add_listener
    # def on_start(self):
    #     global systems
    #     global minMax
    #     systems = self.create_systems_list("noptixautoqa+owner@gmail.com", "qweasd 123")
    #     minMax = self.order()

    # def send_notification(self, notification_dict, targets, system_id, system_auth_key):
    #     self.client.post(
    #         f'https://{CLOUD_HOST}/cloud_notifications/receiver/api/v1/send_notification',
    #         auth=HTTPBasicAuth(system_id, system_auth_key),
    #         json={
    #             'targets': targets,
    #             'systemId': system_id,
    #             'notification': notification_dict
    #         }
    #     )

    # def all_locusts_ready(self, procs):
    #     if os.environ['PROC'] == procs:
    #         return True
    #     return False

    @task()
    def push(self):
        # self.systems = self.create_systems_list()
        f = open('systems.json', 'r')
        self.systems = json.load(f)
        self.idx = int(os.environ['PROC'])
        os.environ['PROC'] = str(self.idx + 1)
        # self.sys = int(self.idx / 2)
        # print(systems)
        # minMax = self.order()
        # print(minMax)
        # print(os.environ['PROC'])
        # wait(os.environ['PROC'] == '2')
        print(os.environ['PROC'])
        # for system in self.systems[int(os.environ['PROC'])]:
        self.system = self.systems[self.idx]
        self.authKey = self.system['authKey']
        self.id = self.system['id']
        self.targets = self.system['targets']
        self.idr = int(os.environ['READY'])
        os.environ['READY'] = str(self.idr + 1)
        print(os.environ['READY'] + ' ready')
        for x in range(1000):
            if os.environ['READY'] != '800':
                time.sleep(10/1000)
            else:
                break
        # self.body = {"targets": self.targets,
        #               "systemId": self.id,
        #               "notification": {"targets": self.targets, "count": self.idr}}
        # r = self.client.post(f'https://{CLOUD_HOST}/cloud_notifications/receiver/api/v1/send_notification', auth=HTTPBasicAuth(self.id, self.authKey), headers={'Content-Type': 'application/json'}, json=self.body)
        # print(r.text, self.idr)
        for x in range(25):
            self.body = {"targets": self.targets,
                         "systemId": self.id,
                         "notification": {"targets": self.targets, "count": str(self.idx) + ' ' + str(x)}}
            r = self.client.post(f'https://{CLOUD_HOST}/cloud_notifications/receiver/api/v1/send_notification', auth=HTTPBasicAuth(self.id, self.authKey), headers={'Content-Type': 'application/json'}, json=self.body)
            print(self.idx, x)
        time.sleep(200)
            
        
# class WebsiteUser(HttpUser):
#     TaskSet = [UserBehavior]
#     # wait_time = between(200, 300)