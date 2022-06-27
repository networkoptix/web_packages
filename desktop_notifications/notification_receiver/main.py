import asyncio
import json
import pickle
from typing import Tuple

from quart import Quart, request, abort, Response


from marshmallow import Schema, fields, ValidationError, validate, EXCLUDE
import redis.asyncio as redis

from cloud import CloudAPI


class QuartCustom(Quart):
    shutting_down = False
    cloud: CloudAPI = None


app = QuartCustom(__name__)
app.config.from_object('config')

redis_client = redis.Redis.from_url(app.config['REDIS_URL'])


async def set_credentials_in_cache(system_id, auth_key):
    key = f'{system_id}:{auth_key}'
    await redis_client.set(key, 0, ex=60)


async def check_credentials_from_cache(system_id, auth_key):
    key = f'{system_id}:{auth_key}'
    return await redis_client.get(key)


async def set_users_in_cache(system_id, users):
    key = f'{system_id}/users'
    await redis_client.set(key, pickle.dumps(users), ex=180)


async def check_users_from_cache(system_id):
    key = f'{system_id}/users'
    val = await redis_client.get(key)
    if val is not None:
        return pickle.loads(val) or set()
    return set()


async def authenticate_system() -> Tuple[bool, str]:
    auth = request.authorization
    system_id = auth.get('username')
    system_auth_key = auth.get('password')

    if not auth or not system_id or not system_auth_key:
        abort(Response('Missing system authentication credentials', 401))

    if await check_credentials_from_cache(system_id, system_auth_key):
        return True, system_id
    else:
        if not await app.cloud.check_system_credentials(system_id, system_auth_key, request.headers['Host']):
            abort(Response('Could not authenticate system credentials', 401))
        else:
            await set_credentials_in_cache(system_id, system_auth_key)
            return True, system_id


async def authenticate_user() -> Tuple[bool, str]:
    auth_header = request.headers.get('Authorization')
    auth_header = auth_header.split(' ')
    if len(auth_header) == 2 and auth_header[0] == 'Bearer':
        token = auth_header[1]
        host = request.headers.get('Host')
        user_data = await app.cloud.validate_token(token, host)
        if user_data:
            return True, user_data.get('username')
        else:
            abort(Response('Failed to authenticate Bearer token'), 401)
    else:
        abort(Response('Malformed Authorization header'), 401)


async def authenticate() -> Tuple[bool, str, str]:
    if request.authorization:
        auth_result, auth_id = await authenticate_system()
        return auth_result, auth_id, 'system'
    elif 'Authorization' in request.headers:
        auth_result, auth_id = await authenticate_user()
        return auth_result, auth_id, 'user'
    else:
        abort(Response('Authentication not provided'), 401)


async def filter_targets(system_id, system_auth_key, targets):
    cached_users = await check_users_from_cache(system_id)
    if targets.issubset(cached_users):
        return targets
    else:
        users = await app.cloud.system_users(system_id, system_auth_key, request.headers['Host'])
        user_emails = {user['accountEmail'].lower() for user in users}
        await set_users_in_cache(system_id, user_emails)
        return user_emails.intersection(targets)


class NotificationRequestSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    targets = fields.List(fields.Email(), required=False, default=[])
    notification = fields.Dict(required=True)


@app.route('/api/v1/send_notification', methods=['POST'])
async def send_notification():
    data = await request.get_json()
    try:
        request_data = NotificationRequestSchema().load(data)
    except ValidationError as err:
        return err.messages, 400

    targets = {target.lower() for target in request_data.get('targets', [])}
    notification = request_data.get('notification')

    verified, auth_id, auth_type = await authenticate()
    if auth_type == 'system':
        system_id = auth_id
        if not targets:
            return {'targets': ['Must not be empty for system notification']}, 400
        filtered_targets = await filter_targets(request.authorization['username'], request.authorization['password'], targets)
        message = json.dumps({'systemId': system_id, 'notification': notification})
        await asyncio.gather(*(redis_client.publish(target, message) for target in filtered_targets))
        return {'validatedTargets': list(filtered_targets)}
    elif auth_type == 'user':
        user_email = auth_id
        message = json.dumps({'userId': user_email, 'notification': notification})
        await redis_client.publish(user_email, message)
        return {'validatedTargets': [user_email]}


@app.before_serving
async def startup():
    app.cloud = await CloudAPI.create()


@app.after_serving
async def shutdown():
    app.shutting_down = True
    await app.cloud.close()


@app.route('/api/v1/ping', methods=['GET'])
def ping():
    return 'pong'


if __name__ == "__main__":
    app.run(port=5001)
