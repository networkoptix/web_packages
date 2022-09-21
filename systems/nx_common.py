import asyncio
import json
import os
import requests

from models import Group

from debug_tools import PrintDebug
from quart import current_app, websocket

CLOUD_HOST = os.getenv('CLOUD_HOST') or 'cloud-test.hdw.mx'  # or 'localhost:8001'
RELAY = os.getenv('CLOUD_RELAY') or 'https://{systemId}.relay.vmsproxy.hdw.mx'


class NxSystem:
    def __init__(self, system_id, name, version, state_of_health):
        self.loop = asyncio.get_event_loop()
        self.session = requests.Session()
        self.id = system_id
        self.name = name
        self.is_logged_in = False
        self.use_rest = int(version.split('.')[0] or '0') > 4
        self.is_online = state_of_health == 'online'
        self.relay = RELAY.replace("{systemId}", self.id)

    def _legacy_login(self, auth):
        return self.session.post(f'{self.relay}/api/cookieLogin', json={'auth': auth})

    def _rest_login(self, auth):
        return self.session.get(f'{self.relay}/rest/v1/login/sessions/{auth}?setCookie=true')

    def get_wrapper(self, route, data=None):
        return self.session.get(f'{self.relay}{route}')

    def post_wrapper(self, route, data=None):
        return self.session.post(f'{self.relay}{route}', json=data)

    async def login(self, auth):
        try:
            res = await self.loop.run_in_executor(None, self._rest_login if self.use_rest else self._legacy_login, auth)
            res.raise_for_status()
        except requests.exceptions.HTTPError:
            return False
        self.is_logged_in = True
        return True

    def update(self, authenticated=None, name=None, state=None):
        if name:
            self.name = name
        if state:
            self.is_online = state == 'online'
        if authenticated is not None:
            self.is_logged_in = False


class CloudConnector:
    def __init__(self):
        self.loop = asyncio.get_event_loop()
        self.session = requests.Session()
        self.account = {}
        self.systems = {}

    def _get_wrapper(self, route, params=None, _websocket=None):
        res = None
        try:
            res = self.session.get(f'https://{CLOUD_HOST}{route}', params=params)
            res.raise_for_status()
            if res and res.status_code == 401:
                websocket.close(res.status_code, 'Failed auth')
                return
            return res.json()
        except requests.exceptions.HTTPError as e:
            if res is not None and 400 <= res.status_code < 500:
                if _websocket:
                    return websocket.close(res.status_code, 'Failed auth')
                raise e

    def _post_wrapper(self, route, data=None, _websocket=None):
        res = None
        try:
            res = self.session.post(f'https://{CLOUD_HOST}{route}', json=data)  # , verify=False)
            res.raise_for_status()
            return res.json()
        except requests.exceptions.HTTPError as e:
            if res is not None and 400 <= res.status_code < 500:
                if _websocket:
                    return websocket.close(res.status_code, 'Failed auth')
            raise e

    async def _get_token_for_system(self, system_id):
        return await self.loop.run_in_executor(None, self._post_wrapper, f'/api/systems/{system_id}/token')

    async def _get_auth_for_system(self, system_id):
        return await self.loop.run_in_executor(None, self._get_wrapper, f'/api/systems/{system_id}/auth')

    async def _update_connections_to_systems(self):
        await self.get_systems()
        for system_id, system in self.systems.items():
            if not system.is_online:
                continue

            if not system.is_logged_in:
                if system.use_rest:
                    auth = (await self._get_token_for_system(system_id)).get('access_token')
                else:
                    auth = (await self._get_auth_for_system(system_id)).get('authGet')
                await system.login(auth)
                if not system.is_logged_in:
                    continue

    async def login(self, code):
        res = await self.loop.run_in_executor(
            None, self._post_wrapper, f'/api/account/loginCode', {"code": code}, websocket)
        self.session.headers.update({'X-CSRFToken': self.session.cookies.get('csrftoken')})
        self.session.headers.update({'Referer': f'https://{CLOUD_HOST}'})  # Get referer from request
        return res

    async def aggregate_request(self, request_url, method=None, post_body=None, allowed_systems=None):
        data = {}
        await self._update_connections_to_systems()
        for system_id, system in self.systems.items():
            if allowed_systems and system_id not in allowed_systems:
                continue

            request_method = system.post_wrapper if method == 'post' else system.get_wrapper
            res = None
            try:
                res = await self.loop.run_in_executor(None, request_method, request_url, post_body)
                res.raise_for_status()
                data[system_id] = res.json()
            except Exception as e:
                if not res:
                    continue

                if res.status > 400:
                    system.update(authenticated=False)

                with PrintDebug(current_app.logger.debug) as p:
                    p.log(e)
                    p.log(res.content)
                    p.log(system.name, system_id, request_url, system.is_online)
        return data

    async def aggregate_request_by_group(self, group_id, request_url, method=None, post_body=None):
        group = Group.query.get(group_id)
        systems = group.get_all_system_ids_in_group()
        return await self.aggregate_request(request_url, method=method, post_body=post_body, allowed_systems=systems)

    async def get_account_info(self):
        self.account = await self.loop.run_in_executor(None, self._get_wrapper, '/api/account')

    async def get_systems(self, system_id=None):
        system_id = system_id or ''
        request_url = '/api/systems'
        if system_id:
            request_url = f'{request_url}/{system_id}'
        res = await self.loop.run_in_executor(None, self._get_wrapper, request_url)

        for system in res:
            _system_id = system.get('id')
            state_of_health = system.get('stateOfHealth')
            system_name = system.get('name')
            if _system_id not in self.systems:
                self.systems[_system_id] = NxSystem(_system_id, system_name, system.get('version'), state_of_health)
            else:
                self.systems[_system_id].update(name=system_name, state=state_of_health)

        if system_id and len(res) > 0:
            return res[0]
        return res

    async def share_system(self, systems, users):
        request_url = f'/api/systems/group-users'
        data = {
            'systems': systems,
            'users': users
        }
        current_app.logger.debug(json.dumps(data, indent=4))
        return await self.loop.run_in_executor(None, self._post_wrapper, request_url, data)

