import json


class ProviderProtocol:
    def __init__(self, websocket):
        self.websocket = websocket

    async def send_json(self, msg_dict):
        await self.websocket.send(json.dumps(msg_dict))

    async def send_listener_established(self, email):
        await self.send_json({
            'type': 'listnerSuccess',
            'message': f'Now subscribed to notifications for {email}'
        })

    async def send_notification(self, system_id, payload):
        await self.send_json({
            'type': 'notification',
            'systemId': system_id,
            'notification': payload
        })

    async def send_auth_failure(self, error='Authentication failed'):
        await self.send_json({
            'type': 'authFailure',
            'error': error
        })
