from quart import Quart, websocket

import redis.asyncio as redis

from functools import wraps
import json

from cloud import CloudAPI
from protocol import ProviderProtocol
from subscription import *


class QuartCustom(Quart):
    shutting_down = False
    cloud_auth: CloudAPI = None


app = QuartCustom(__name__)
app.config.from_object('config')
redis_client = redis.Redis.from_url(app.config['REDIS_URL'])
redis_pubsub = redis_client.pubsub()


def collect_websocket(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        queue = asyncio.Queue()
        return await func(queue, *args, **kwargs)
    return wrapper


async def authenticate(provider_protocol, init_msg, cloud_host):
    access_token = init_msg.get('accessToken', '')
    email = init_msg.get('username', '')
    if not (email and access_token):
        await provider_protocol.send_auth_failure('Missing email or access token')
        await websocket.close(3000)
        return None

    if not await app.cloud_auth.validate_token(email, access_token, cloud_host):
        await provider_protocol.send_auth_failure('Could not validate access token with email')
        await websocket.close(3000)
        return None
    return email


@app.websocket('/api/v1/subscribe')
@collect_websocket
async def subscribe(socket_queue):
    msg = json.loads(await websocket.receive())
    provider_protocol = ProviderProtocol(websocket)
    email = await authenticate(provider_protocol, msg, websocket.headers['Host'])
    if not email:
        return

    try:
        await start_listening(email, socket_queue, provider_protocol)

        while True:
            message = await socket_queue.get()
            data = json.loads(message.get('data', b'').decode())
            await provider_protocol.send_notification(data['systemId'], payload=data['notification'])
    finally:
        await stop_lisening(email, socket_queue)


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
    app.run()
