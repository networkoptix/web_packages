from typing import Tuple

from quart import Quart, websocket, Response

import redis.asyncio as redis

from functools import wraps
import json

from cloud import CloudAPI
from protocol import ProviderProtocol
from subscription import *

MAX_CONNECTIONS = 10000


class QuartCustom(Quart):
    shutting_down = False
    cloud_auth: CloudAPI = None


app = QuartCustom(__name__)
app.config.from_object('config')
redis_client = redis.Redis.from_url(app.config['REDIS_URL'])
redis_pubsub = redis_client.pubsub()


connected = set()


def collect_websocket(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        global connected
        queue = asyncio.Queue()
        connected.add(websocket._get_current_object())
        try:
            return await func(queue, *args, **kwargs)
        finally:
            connected.remove(websocket._get_current_object())
    return wrapper


async def auth_with_query_param(provider_protocol: ProviderProtocol) -> Tuple[bool, str]:
    access_token = websocket.args.get('access-token')
    if not access_token:
        return False, 'Missing access-token query param'

    return await provider_protocol.authenticate(access_token)


async def sending(socket_queue, provider_protocol: ProviderProtocol):
    await start_listening(socket_queue, provider_protocol)
    while True:
        # Receive message from queue
        message = await socket_queue.get()

        # Send message
        data = json.loads(message.get('data', b'').decode())
        await provider_protocol.send_notification(data.get('systemId'), data.get('userId'), payload=data['notification'])


async def receiving(provider_protocol: ProviderProtocol):
    while True:
        await provider_protocol.handle_message(await websocket.receive())


@app.websocket('/api/v1/subscribe')
@collect_websocket
async def subscribe(socket_queue):
    cloud_host = websocket.headers['Host']
    provider_protocol = ProviderProtocol(websocket, cloud_host, app.cloud_auth)
    success, message = await auth_with_query_param(provider_protocol)
    if success:
        await provider_protocol.send_auth_response(success=True)
    else:
        return Response('', headers={'Authentication-Error': message})

    producer = asyncio.create_task(sending(socket_queue, provider_protocol))
    consumer = asyncio.create_task(receiving(provider_protocol))
    auth_watcher = asyncio.create_task(provider_protocol.watcher())
    try:
        await asyncio.gather(producer, consumer, auth_watcher)
    finally:
        await stop_lisening(provider_protocol.email, socket_queue)


@app.route('/api/v1/health', methods=['GET'])
def health():
    num_connected = len(connected)
    return {
        'connected': num_connected,
        'maximum': MAX_CONNECTIONS,
        'scaleWanted': num_connected > MAX_CONNECTIONS * 0.85
    }


@app.before_serving
async def startup():
    app.cloud_auth = await CloudAPI.create()
    app.add_background_task(setup_polling)


@app.after_serving
async def shutdown():
    app.shutting_down = True
    await app.cloud_auth.close()


@app.route('/api/v1/ping', methods=['GET'])
def ping():
    return 'pong'


if __name__ == "__main__":
    app.run(port=5002)
