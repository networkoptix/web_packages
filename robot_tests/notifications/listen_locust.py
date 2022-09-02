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
import websockets

env = "https://test4.cloud.hdw.mx/"

CLOUD_HOST = 'test4.cloud.hdw.mx'

SYSTEM_ID = '2d431e69-39ee-4899-b372-e76f5b32dad8'
SYSTEM_AUTH_KEY = 'lBFCHJBWPKCvnfVeIbXc'
TARGET_USERS = ['noptixautoqa+notifications0@gmail.com', 'noptixautoqa+notifications1@gmail.com']


class UserBehavior(HttpUser):
    # def get_users_from_json(self):
    #     f = open('systems.json', 'r')
    #     systemsList = json.load(f)
    #     CLOUD_USERS = []
    #     for system in systemsList:
    #         for target in system['targets']:
    #             CLOUD_USERS.append(target)
    #     return CLOUD_USERS

    async def listen_to_notifications(self, user, access_token):
        try:
            async with websockets.connect(f"wss://{CLOUD_HOST}/cloud_notifications/provider/api/v1/subscribe?access-token={access_token}") as websocket:
                while True:
                    response = await websocket.recv()
                    if 'noptixautoqa' in str(response):
                        print(response + ' ' + str(self.idx) + ' Recieved ' + os.environ[str(self.idx)])
                        # if int(os.environ['RECEIVED']) == 99000:
                        #     print('Recieved ' + os.environ['RECEIVED'])
                        os.environ[str(self.idx)] = str(int(os.environ[str(self.idx)]) + 1)
                    elif 'authenticationResponse' in str(response):
                        print(response + ' Listener ' + str(self.idx))
                        # if int(os.environ['LISTENERS']) == 9999:
                        #     print('Listeners ' + os.environ['LISTENERS'])
                        # os.environ['LISTENERS'] = str(int(os.environ['LISTENERS']) + 1)
        except Exception as ex:
            print(os.environ['LISTENERS'], user)
            raise

    @task()
    def listen_locust(self):
        f = open('systems.json', 'r')
        systemsList = json.load(f)
        CLOUD_USERS = []
        for system in systemsList:
            for target in system['targets']:
                CLOUD_USERS.append(target)
        self.idx = int(os.environ['LISTENERS'])
        os.environ['LISTENERS'] = str(self.idx + 1)
        os.environ[str(self.idx)] = str(0)
        print(os.environ['LISTENERS'])
        # os.environ['LISTENERS'] = str(0)
        # CLOUD_USERS = self.get_users_from_json()
        self.body = {
            "grant_type": "password",
            "response_type": "token",
            "password": "qweasd 123",
            "username": CLOUD_USERS[self.idx]}
        r = self.client.post(f'https://{CLOUD_HOST}/cdb/oauth2/token', json=self.body, headers={'Content-Type': 'application/json'})
        access_token = r.json().get('access_token')
        print(access_token, CLOUD_USERS[self.idx])
        self.listen_to_notifications(CLOUD_USERS[self.idx], access_token)
        time.sleep(700)



# class WebsiteUser(HttpUser):
#     TaskSet = [UserBehavior]
#     # wait_time = between(200, 300)