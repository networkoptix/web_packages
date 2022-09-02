import asyncio
import json
import requests
import websockets
import os


CLOUD_HOST = 'test4.cloud.hdw.mx'
# CLOUD_USERS = ['noptixautoqa+notifications00@gmail.com', 'noptixautoqa+notifications01@gmail.com']
#                'noptixautoqa+notifications2@gmail.com', 'noptixautoqa+notifications3@gmail.com',
#                'noptixautoqa+notifications4@gmail.com']
CLOUD_PASSWORD = 'qweasd 123'


async def get_auth_token(user, password):
    response = requests.post(
        f'https://{CLOUD_HOST}/cdb/oauth2/token',
        json={
            "grant_type": "password",
            "response_type": "token",
            "password": password,
            "username": user
        }
    )
    return response.json().get('access_token')

async def listen_to_notifications(user, access_token):
    async with websockets.connect(f"wss://{CLOUD_HOST}/cloud_notifications/provider/api/v1/subscribe?access-token={access_token}") as websocket:
        while True:
            print(await websocket.recv())
            if 'noptixautoqa' in str(await websocket.recv()):
                print('Recieved ' + os.environ['RECEIVED'])
                os.environ['RECEIVED'] = str(int(os.environ['RECEIVED'])+1)


def get_users_from_json():
    f = open('systems.json', 'r')
    systemsList = json.load(f)
    CLOUD_USERS = []
    for system in systemsList:
        for target in system['targets']:
            CLOUD_USERS.append(target)
    return CLOUD_USERS

async def main():
    listeners = []
    os.environ['RECEIVED'] = str(0)
    CLOUD_USERS = get_users_from_json()
    print(CLOUD_USERS[0],CLOUD_USERS[499])
    for user in CLOUD_USERS[0:499]:
        access_token = get_auth_token(user, CLOUD_PASSWORD)
        listeners.append(listen_to_notifications(user, access_token))
    await asyncio.gather(*listeners)
    # print('Recieved ' + os.environ['RECEIVED'])

if __name__ == '__main__':
    asyncio.run(main())

