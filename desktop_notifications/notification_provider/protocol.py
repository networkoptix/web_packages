import asyncio
import json
import time

from typing import Union

from marshmallow import Schema, fields, ValidationError, validate


class PingSchema(Schema):
    type = fields.Str(validate=validate.Equal('ping'))


class AuthenticateSchema(Schema):
    type = fields.Str(validate=validate.Equal('authenticate'))
    access_token = fields.Str()


SCHEMA_MAP = {
    'authenticate': AuthenticateSchema,
    'ping': PingSchema
}


class ProviderProtocol:
    RECEIVE_MESSAGE_TYPES = [
        'ping',
        'authenticate'
    ]

    SEND_MESSAGE_TYPES = [
        'pong',
        'notification',
        'authenticationRequest',
        'authenticationResponse'
    ]

    def __init__(self, websocket, cloud_host, cloud_auth_provider):
        self.websocket = websocket
        self.access_token = ''
        self.expires_at = 0
        self.email = ''
        self.cloud_host = cloud_host
        self.last_auth_check = 0
        self.cloud_auth = cloud_auth_provider

    async def send_json(self, msg_dict):
        await self.websocket.send(json.dumps(msg_dict))

    async def send_pong(self):
        await self.send_json({
            'type': 'pong'
        })

    async def send_notification(self, system_id=None, user_id=None, payload=None):
        body_dict = {
            'type': 'notification',
            'notification': payload
        }
        if system_id:
            body_dict['systemId'] = system_id
        if user_id:
            body_dict['userId'] = user_id
        await self.send_json(body_dict)

    async def send_auth_request(self, time_remaining=0):
        await self.send_json({
            'type': 'authenticationRequest',
            'timeRemaining': time_remaining
        })

    async def send_auth_response(self, success=False, message=''):
        status = 'success' if success else 'failure'
        await self.send_json({
            'type': 'authenticationResponse',
            'status': status,
            'message': message
        })
        if success is False:
            await self.websocket.close(1000)

    async def authenticate(self, access_token='') -> (bool, str):
        if access_token:
            self.access_token = access_token
        else:
            access_token = self.access_token
        token_info = await self.cloud_auth.validate_token(access_token, self.cloud_host)
        if not token_info:
            return False, 'Invalid token'

        email = token_info.get('username', '').lower()
        if self.email:
            if email != self.email:
                return False, 'Access token does not correspond to the user'
        else:
            self.email = email

        self.last_auth_check = time.time()
        self.expires_at = round(int(token_info.get('expires_at', 0)) / 1000)  # ms to s

        return True, ''

    async def watcher(self):
        expires_in = self.expires_at - int(time.time())
        while True:
            # Check every 5m. If token is scheduled to expire in less than 10m, then check every minute.
            wait_time = 60 * 5 if expires_in > 60 * 10 else 60
            await asyncio.sleep(wait_time)  # 5 minutes
            if self.last_auth_check > time.time() - 60:
                expires_in = self.expires_at - int(time.time())
                continue

            success, message = await self.authenticate()
            expires_in = self.expires_at - int(time.time())

            if not success or expires_in <= 0:
                await self.send_auth_response(success=False, message='Access token is no long valid. Open a new connection')
                break
            elif expires_in < 60 * 10:  # 10 minutes
                await self.send_auth_request(expires_in)

    # Handlers
    async def handle_message(self, message: str):
        message_dict = await self.load_json(message)
        if message_dict:
            message_type = message_dict.get('type')
            if message_type and message_type in self.RECEIVE_MESSAGE_TYPES:
                validated_dict = await self.validate_message(message_dict, message_type)
                if validated_dict:
                    await getattr(self, f'receive_{message_type}')(message_dict)

    async def load_json(self, message: str) -> Union[dict, None]:
        try:
            message_dict = json.loads(message)
        except json.JSONDecodeError:
            await self.send_json({
                'type': 'error',
                'error': 'Could not decode JSON'
            })
            return
        else:
            return message_dict

    async def validate_message(self, message_dict: dict, message_type: str) -> Union[dict, None]:
        try:
            schema = SCHEMA_MAP.get(message_type, AuthenticateSchema)()
            validated_message_dict = schema.load(message_dict)
        except ValidationError as err:
            await self.send_json({
                'type': 'error',
                'error': err.messages
            })
            return
        else:
            return validated_message_dict

    # Receivers
    async def receive_ping(self, message_dict):
        await self.send_pong()

    async def receive_authenticate(self, message_dict):
        access_token = message_dict.get('access_token')
        success, message = await self.authenticate(access_token)
        if success:
            await self.send_auth_response(success=True)
        else:
            await self.send_auth_response(success=False, message=message)

