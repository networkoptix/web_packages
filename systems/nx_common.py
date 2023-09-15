import asyncio
import httpx
import os
import traceback

from models import Group

from debug_tools import PrintDebug

from functools import wraps
from quart import current_app, request, websocket

CLOUD_HOST = os.getenv('CLOUD_HOST') or 'cloud-test.hdw.mx'  # or 'localhost:8001'
LICENSE_PORTAL = os.getenv('LICENSE_PORTAL') or 'partners.test.hdw.mx'
RELAY = os.getenv('CLOUD_RELAY') or 'https://{systemId}.relay.relay.cloud.hdw.mx'

async def share(api, systems, users):
    shared_systems = []

    for system_id in systems:
        for user in users:
            try:
                email = user.get('email').lower()
                role = user.get('role', '')
                isEnabled = user.get('enabled', True)
                params = {
                    'systemId': system_id,
                    'accountEmail': email,
                    'accessRole': role,
                    'isEnabled': isEnabled
                }
                if not params['accessRole']:
                    del params['accessRole']

                res = await api.session.post(f'https://{CLOUD_HOST}/cdb/system/share', json=params)
                shared_systems.append(res)
            except APIException:
                current_app.logger.error(traceback.format_exc())
                pass
    return shared_systems


def is_org_admin(f):
    @wraps(f)
    async def check_role(*args, **kwargs):
        raw_data = await request.get_json()
        connector = RestConnector(request)
        license_api = LicenseConnector(connector.email, connector.token)
        if await license_api.is_admin_in_org(raw_data.get('org_id')):
            return await f(*args, **kwargs)
        return 'Unauthorized', httpx.codes.FORBIDDEN
    return check_role


class APIException(Exception):
    error_text = 'Unexpected error'
    status_code = httpx.codes.INTERNAL_SERVER_ERROR

    def __init__(self, error_text, status_code=httpx.codes.INTERNAL_SERVER_ERROR):
        self.error_text = error_text
        self.status_code = status_code
        super(Exception, self).__init__(error_text)


class NxSystem:
    def __init__(self, system_id, name, version, state_of_health):
        self.session = httpx.AsyncClient()
        self.id = system_id
        self.name = name
        self.is_logged_in = False
        self.use_rest = int(version.split('.')[0] or '0') > 4
        self.is_online = state_of_health == 'online'
        self.relay = RELAY.replace("{systemId}", self.id)

    async def _legacy_login(self, auth):
        return await self.session.post(f'{self.relay}/api/cookieLogin', json={'auth': auth})

    async  def _rest_login(self, auth):
        return await self.session.get(f'{self.relay}/rest/v1/login/sessions/{auth}?setCookie=true')

    async def get_wrapper(self, route, data=None):
        return await self.session.get(f'{self.relay}{route}')

    async def post_wrapper(self, route, data=None):
        return await self.session.post(f'{self.relay}{route}', json=data)

    async def login(self, auth):
        try:
            res = await (self._rest_login if self.use_rest else self._legacy_login)(auth)
            res.raise_for_status()
        except httpx.HTTPError:
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


class LicenseConnector:
    def __init__(self, email, token=None):
        self.session = httpx.AsyncClient()
        self.session.headers.update({'Cloud-host': CLOUD_HOST})
        self.email = email
        if token:
            self.update_token(token)

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args, **kwargs):
        await self.session.aclose()

    async def _license_get(self, route, params=None):
        url = f"https://{LICENSE_PORTAL}{route}"
        res = await self.session.get(url, params=params)
        res.raise_for_status()
        return res.json()

    async def _license_post(self, route, data=None):
        url = f"https://{LICENSE_PORTAL}{route}"
        res = await self.session.post(url, data=data)
        res.raise_for_status()
        return res.json()

    async def update_token(self, token):
        self.session.headers.update({'Authorization': f'Bearer {token}'})

    async def _get_user(self, org_id):
        return await self._license_get(f'/api/v2/partners/organizations/{org_id}/users/self/')

    async def is_admin_in_org(self, org_id):
        user = await self._get_user(org_id)
        return self.email == user.get('email') and any(role in ['Administrator', 'Organization Administrator'] for role in user.get('roles', []))

    async def is_user_in_org(self, org_id):
        user = await self._get_user(org_id)
        return self.email == user.get('email')


class CloudConnector:
    def __init__(self):
        self.session = httpx.AsyncClient()
        self.account = {}
        self.systems = {}

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args, **kwargs):
        await self.session.aclose()

    async def _get_wrapper(self, route, params=None, _websocket=None, auth=None):
        res = None
        try:
            res = await self.session.get(f'https://{CLOUD_HOST}{route}', params=params, headers=({"Authorization": f'Bearer {auth}'}) if auth else None)
            res.raise_for_status()
            if res and res.status_code == 401:
                await websocket.close(res.status_code, 'Failed auth')
                return
            return res.json()
        except httpx.HTTPError as e:
            if res is not None and 400 <= res.status_code < 500:
                if _websocket:
                    return await websocket.close(res.status_code, 'Failed auth')
                raise e

    async def _post_wrapper(self, route, data=None, _websocket=None, auth=None):
        res = None
        try:
            res = await self.session.post(f'https://{CLOUD_HOST}{route}', json=data, headers=({"Authorization": f'Bearer {auth}'}) if auth else None)  # , verify=False)
            res.raise_for_status()
            return res.json()
        except httpx.HTTPError as e:
            if res is not None and 400 <= res.status_code < 500:
                if _websocket:
                    return await websocket.close(res.status_code, 'Failed auth')
            raise e

    async def _get_token_for_system(self, system_id):
        return await self._post_wrapper(f'/api/systems/{system_id}/token')

    async def _get_auth_for_system(self, system_id):
        return await self._get_wrapper(f'/api/systems/{system_id}/auth')

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

    async def _aggregate_caller(self, system, request_url, method, post_body=None):
        request_method = system.post_wrapper if method == 'post' else system.get_wrapper
        res = None
        try:
            res = await request_method(request_url, post_body)
            res.raise_for_status()
            return res.json()
        except Exception as e:
            if not res:
                return None

            if res.status_code > 400:
                system.update(authenticated=False)

            with PrintDebug(print) as p:
                p.log(e)
                p.log(res.content)
                p.log(system.name, system.id, request_url, system.is_online)

    async def get_token(self):
        res = await self._post_wrapper("/api/account/refreshAccessToken")
        return res.get('access_token')

    async def login(self, code):
        res = await self._post_wrapper(f'/api/account/loginCode', {"code": code}, websocket)
        self.session.headers.update({'X-CSRFToken': self.session.cookies.get('csrftoken')})
        self.session.headers.update({'Referer': f'https://{CLOUD_HOST}'})  # Get referer from request
        return res

    async def aggregate_request(self, request_url, method=None, post_body=None, allowed_systems=None):
        requests = []

        await self._update_connections_to_systems()
        for system_id, system in self.systems.items():
            current_app.logger.debug(f"Making request for {system.name} ({system_id})")
            if allowed_systems and system_id not in allowed_systems or not system.is_online:
                continue

            requests.append(self._aggregate_caller(system, request_url, method, post_body))
        data = await asyncio.gather(*requests)
        return data

    async def aggregate_request_by_group(self, group_id, request_url, method=None, post_body=None):
        group = Group.query.get(group_id)
        systems = group.get_all_system_ids_in_group()
        return await self.aggregate_request(request_url, method=method, post_body=post_body, allowed_systems=systems)

    async def get_account_info(self):
        self.account = await self._get_wrapper('/api/account')

    async def get_systems(self, system_id=None):
        system_id = system_id or ''
        request_url = '/api/systems'
        if system_id:
            request_url = f'{request_url}/{system_id}'
        res = await self._get_wrapper(request_url)

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
        return await share(self, systems, users)


class RestConnector:
    def __init__(self, request):
        self.session = httpx.AsyncClient()
        self.token = request.headers.get('Authorization')
        self.session.headers.update({'Authorization': self.token})
        self.email = self._get_username_from_token(self.token.split(" ")[1])

    async def _get(self, route, params=None):
        url = f"https://{CLOUD_HOST}{route}"
        res = await self.session.get(url, params=params)
        res.raise_for_status()
        return res.json()

    async def _post(self, route, data=None):
        url = f"https://{CLOUD_HOST}{route}"
        res = await self.session.post(url, data=data)
        res.raise_for_status()
        return res.json()

    async def _get_username_from_token(self, token):
        user = await self._get(f'/cdb/oauth2/token/{token}')
        return user.get('username')

    async def share_system(self, systems, users):
        return await share(self, systems, users)

    async def get_system(self, system_id):
        system = await self._get("/cdb/systems/get", params={'systemId': system_id})
        return system.get('systems')[0]
