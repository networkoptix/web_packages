import asyncio
import aiohttp
import json
import websockets
import os
import random



CLOUD_HOST = 'test4.cloud.hdw.mx'
# CLOUD_USERS = ['noptixautoqa+notifications00@gmail.com', 'noptixautoqa+notifications01@gmail.com',
#                'noptixautoqa+notifications2@gmail.com', 'noptixautoqa+notifications3@gmail.com',
#                'noptixautoqa+notifications4@gmail.com']
CLOUD_PASSWORD = 'qweasd 123'


SESSION = None


async def get_auth_token(user, password):
    async with SESSION.post(
        f'https://{CLOUD_HOST}/cdb/oauth2/token',
        json={
            "grant_type": "password",
            "response_type": "token",
            "password": password,
            "username": user
        }, timeout=6000
    ) as response:
        # print(await response.json())
        # print(response.text)
        # print(user)
        return (await response.json()).get('access_token')


async def listen_to_notifications(user, access_token):
    try:
        async with websockets.connect(f"wss://{CLOUD_HOST}/cloud_notifications/provider/api/v1/subscribe?access-token={access_token}", open_timeout=200) as websocket:
            while True:
                response = await websocket.recv()
                # print(response)
                if 'noptixautoqa' in str(response):
                    # print(response + ' Recieved ' + os.environ['RECEIVED'])
                    if int(os.environ['RECEIVED']) == 99900:
                        print('Recieved ' + os.environ['RECEIVED'])
                    os.environ['RECEIVED'] = str(int(os.environ['RECEIVED'])+1)
                elif 'authenticationResponse' in str(response):
                    # print(response + ' Listener ' + os.environ['LISTENERS'])
                    if int(os.environ['LISTENERS']) == 3999:
                        print('Listeners ' + os.environ['LISTENERS'])
                    os.environ['LISTENERS'] = str(int(os.environ['LISTENERS']) + 1)
                await asyncio.sleep(0.2)
    except Exception as ex:
        print(os.environ['LISTENERS'], user, os.environ['RECEIVED'])
        raise


def get_users_from_json():
    f = open('systems.json', 'r')
    systemsList = json.load(f)
    CLOUD_USERS = []
    for system in systemsList:
        for target in system['targets']:
            CLOUD_USERS.append(target)
    f.close()
    return CLOUD_USERS


async def setup_listener(user):
    await asyncio.sleep(random.randint(1, 25))
    access_token = await get_auth_token(user, CLOUD_PASSWORD)
    await listen_to_notifications(user, access_token)


async def main(CLOUD_USERS):
    global SESSION
    session_timeout = aiohttp.ClientTimeout(total=None,sock_connect=0,sock_read=0)
    SESSION = aiohttp.ClientSession(timeout=session_timeout)
    listeners = []
    os.environ['RECEIVED'] = str(0)
    os.environ['LISTENERS'] = str(0)
    # CLOUD_USERS = get_users_from_json()
    print(CLOUD_USERS[0],CLOUD_USERS[3999])
    for user in CLOUD_USERS[0:4000]:
        listeners.append(setup_listener(user))
    # for user in CLOUD_USERS[5000:10000]:
    #     listeners.append(setup_listener(user))
    # for user in CLOUD_USERS[2000:2999]:
    #     listeners.append(setup_listener(user))
    # for user in CLOUD_USERS[3000:3999]:
    #     listeners.append(setup_listener(user))
    # for user in CLOUD_USERS[4000:4999]:
    #     listeners.append(setup_listener(user))
    # for user in CLOUD_USERS[5000:5999]:
    #     listeners.append(setup_listener(user))
    # for user in CLOUD_USERS[6000:6999]:
    #     listeners.append(setup_listener(user))
    # for user in CLOUD_USERS[7000:7999]:
    #     listeners.append(setup_listener(user))
    # for user in CLOUD_USERS[8000:8999]:
    #     listeners.append(setup_listener(user))
    # for user in CLOUD_USERS[9000:9999]:
    #     listeners.append(setup_listener(user))

    await asyncio.gather(*listeners)
    # print('Recieved ' + os.environ['RECEIVED'])
    await SESSION.close()

if __name__ == '__main__':
    CLOUD_USERS = get_users_from_json()
    asyncio.run(main(CLOUD_USERS))
    print('Listeners ' + os.environ['LISTENERS'])
    print('Recieved ' + os.environ['RECEIVED'])
