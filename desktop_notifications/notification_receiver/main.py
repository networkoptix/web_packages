import asyncio
from functools import wraps
import json

from quart import Quart, websocket, request, abort, Response


from marshmallow import Schema, fields, ValidationError, validate
import redis.asyncio as redis

from cloud import CloudAPI


class QuartCustom(Quart):
    shutting_down = False
    cloud: CloudAPI = None


app = QuartCustom(__name__)
app.config.from_object('config')

redis_client = redis.Redis.from_url(app.config['REDIS_URL'])


async def authenticate(target_system_id):
    auth = request.authorization

    if not auth or not (system_id := auth.get('username')) or not (system_auth_key := auth.get('password')):
        abort(Response('Missing system authentication credentials', 401))
    elif not await app.cloud.check_system_credentials(system_id, system_auth_key, request.headers['Host']):
        abort(Response('Could not authenticate system credentials', 401))
    elif target_system_id != system_id:
        abort(Response('System credentials do not match target system', 403))
    else:
        return True


async def filter_targets(system_id, system_auth_key, targets):
    users = await app.cloud.system_users(system_id, system_auth_key, request.headers['Host'])
    user_emails = {user['accountEmail'] for user in users}
    return user_emails.intersection(targets)


class NotificationRequestSchema(Schema):
    system_id = fields.Str(required=True, data_key='systemId', validate=validate.Length(min=1))
    targets = fields.List(fields.Email(), required=True)
    notification = fields.Dict(required=True)


@app.route('/api/v1/send_notification', methods=['POST'])
async def send_notification():
    data = await request.get_json()
    try:
        request_data = NotificationRequestSchema().load(data)
    except ValidationError as err:
        return err.messages, 400

    system_id = request_data.get('system_id')
    targets = request_data.get('targets')
    notification = request_data.get('notification')

    await authenticate(system_id)
    filtered_targets = await filter_targets(request.authorization['username'], request.authorization['password'], targets)

    message = json.dumps({'systemId': system_id, 'notification': notification})
    await asyncio.gather(*(redis_client.publish(target, message) for target in filtered_targets))
    return {'validatedTargets': list(filtered_targets)}


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
