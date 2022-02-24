import quart.flask_patch  # Keep needed for using flask things in quart
import asyncio
import json
import os
import requests
import uuid

from enum import Enum
from logging.config import dictConfig

from quart import Quart, current_app, websocket
from flask_sqlalchemy import SQLAlchemy

CLOUD_HOST = os.getenv('CLOUD_HOST') or 'https://cloud-test.hdw.mx'
RELAY = os.getenv('CLOUD_RELAY') or 'https://{systemId}.relay.vmsproxy.hdw.mx'

dictConfig({
    'version': 1,
    'loggers': {
        'quart.app': {
            'level': 'INFO',
        },
    },
})


app = Quart(__name__)
# Eventually add db auth.
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DB_URI') or 'sqlite:///test.sqlite3'
db = SQLAlchemy(app)


class PrintDebug:
    def __init__(self, output=None):
        self.output = output or print

    def __enter__(self):
        self.output('\n' * 3)
        self.output('=' * 30)
        return self

    def __exit__(self, *args, **kwargs):
        self.output('=' * 30)
        self.output('\n' * 3)

    def log(self, *args):
        self.output(args)


# Code for database
def generate_uuid():
    return str(uuid.uuid4())


class Group(db.Model):
    id = db.Column(db.String(16), primary_key=True, default=generate_uuid)
    name = db.Column(db.String(80), nullable=False)
    owner_account_email = db.Column(db.String(255), nullable=False)
    parent_group_id = db.Column(db.String(16), db.ForeignKey(id), nullable=True)
    parent = db.relationship('Group', backref='groups', remote_side=id, lazy=True)
    systems = db.relationship('System', lazy=True)

    def __repr__(self):
        return f'<Group {self.name}>'

    def as_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}

    def data(self):
        data = self.as_dict()
        groups = [group.data() for group in self.groups]
        systems = [system.as_dict() for system in self.systems]
        data.update({
            "groups": groups,
            "systems": systems,
            "systemsCount": sum([group.get('systemsCount', 0) for group in groups]) + len(systems),
            "type": "group"

        })
        # Todo: Decide if this needs to be hidden
        # del data['owner_account_email']
        # del data['parent_group_id']
        return data

    def get_all_system_ids_in_group(self):
        systems = [system.id for system in self.systems]
        systems_in_child_groups = [group.get_all_system_ids_in_group() for group in self.groups]
        return systems + systems_in_child_groups


class System(db.Model):
    id = db.Column(db.String(16), primary_key=True, default=generate_uuid)
    group_id = db.Column(db.String(16), db.ForeignKey('group.id'), nullable=True)

    def __repr__(self):
        return f'<System {self.id}>'

    def as_dict(self):
        data = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        data.update({'type': 'system'})
        return data


# Code for views
class ActionEnum(Enum):
    AGGREGATE_SYSTEMS_REQUEST = 'aggregateSystemsRequest'
    AGGREGATE_REQUEST_BY_GROUP = 'aggregateRequestByGroup'
    CREATE = 'create'
    DELETE = 'delete'
    LIST = 'list'
    MOVE_GROUP = 'moveGroup'
    MOVE_SYSTEM = 'moveSystem'
    SYSTEMS = 'systems'

    @classmethod
    def _get_actions(cls):
        return [item.value for item in cls.__members__.values()]

    @classmethod
    def has_action(cls, action):
        return action in cls._get_actions()

    @classmethod
    def values(cls):
        return cls._get_actions()


class ParamsValidator:

    @staticmethod
    def validate_group(data):
        try:
            data = json.loads(data, strict=False)
        except json.decoder.JSONDecodeError:
            return None, {'msg': 'Please send data in a json format', 'error': 400}

        action = data.get('action')
        if not action or not ActionEnum.has_action(action):
            return None, {'msg': f'{action} is not in {ActionEnum.values()}', 'error': 400}

        del data['action']

        params_to_actions = {
            ActionEnum.AGGREGATE_SYSTEMS_REQUEST: ['url', 'method'],
            ActionEnum.AGGREGATE_REQUEST_BY_GROUP: ['groupId', 'url', 'method'],
            ActionEnum.CREATE: ['name'],
            ActionEnum.DELETE: ['groupId'],
            ActionEnum.LIST: [],
            ActionEnum.MOVE_GROUP: ['groupId', 'targetId'],
            ActionEnum.MOVE_SYSTEM: ['groupId', 'systemId'],
            ActionEnum.SYSTEMS: []
        }

        enum_action = ActionEnum(action)
        if not all(data.get(key, False) for key in params_to_actions[enum_action]):
            return None, {
                'msg': f'{action} is must have the following params: {params_to_actions[enum_action]}',
                'error': 400
            }
        return action, data


class GroupView:

    @staticmethod
    def create_group(name, email):
        group = Group(name=name, owner_account_email=email)
        db.session.add(group)
        db.session.commit()
        return group.data()

    @staticmethod
    def delete_group(group_id, email):
        group = Group.query.get(group_id)
        if not group:
            return {'msg': 'You cannot delete a group that doesn\'t exist', 'error': 404}
        if group.owner_account_email != email:
            return {'msg': 'You can only delete groups that you own', 'error': 403}
        if group.parent_group_id:
            parent_group = Group.query.get(group.parent_group_id)
            for child_group in group.groups:
                parent_group.groups.append(child_group)

            for system in group.systems:
                parent_group.systems.append(system)

        db.session.delete(group)
        db.session.commit()
        return {'msg': 'Group was deleted.'}

    @staticmethod
    def list_groups(account_id=None):
        groups = Group.query.filter(Group.parent_group_id == None)
        if account_id and False:
            groups.filter(Group.owner_account_email == account_id)
        groups_list = [group.data() for group in groups]
        systems_list = [system.as_dict() for system in System.query.filter(System.group_id == None)]

        return groups_list + systems_list

    @staticmethod
    def move_system_to_group(group_id, system, account):
        if system.get('ownerAccountEmail') != account.get('email'):
            return {'msg': 'You can only move systems that you own.', 'error': 403}

        group = Group.query.get(group_id)
        if group.owner_account_email != account.get('email'):
            return {'msg': 'You can only move systems into groups that you own.', 'error': 403}

        system = System.query.get(system.get('id'))
        system.group_id = group_id
        db.session.commit()

        return {'msg': 'System was moved to target group.'}

    @staticmethod
    def move_group_to_group(src_group_id, dst_group_id):
        src = Group.query.get(src_group_id)
        dst = Group.query.get(dst_group_id)
        if src.owner_account_email != dst.owner_account_email:
            return {'msg': 'You can only move groups that you own.', 'error': 403}

        src.parent_group_id = dst_group_id
        db.session.commit()

        return {'msg': 'Group was moved to target group.'}


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
    def __init__(self, csrf_token, session_id):
        self.loop = asyncio.get_event_loop()
        self.session = requests.Session()
        self.session.headers.update({'X-CSRFToken': csrf_token})
        self.session.cookies.update({'csrftoken': csrf_token, 'sessionid': session_id})
        self.account = {}
        self.systems = {}

    def _get_wrapper(self, route, params=None):
        res = None
        try:
            res = self.session.get(f'{CLOUD_HOST}{route}', params=params)
            return res.json()
        except requests.exceptions.HTTPError as e:
            if res and 400 <= res.status_code < 500:
                websocket.close(res.status_code, 'Failed auth')

    def _post_wrapper(self, route, data=None):
        res = None
        try:
            res = self.session.post(f'{CLOUD_HOST}{route}', json=data)
            return res.json()
        except requests.exceptions.HTTPError as e:
            if res and 400 <= res.status_code < 500:
                websocket.close(res.status_code, 'Failed auth')

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

                with PrintDebug(app.logger.debug) as p:
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


def create_missing_systems(systems):
    system_ids = list(filter(lambda id: id is not None, map(lambda system: system.get('id'), systems)))
    existing_systems = list(map(lambda system: system.id, System.query.filter(System.id.in_(system_ids)).all()))
    missing_system_ids = list(set(system_ids) - set(existing_systems))
    app.logger.debug(f'Existing systems {existing_systems}')
    app.logger.debug(f'Missing systems {missing_system_ids}')
    for system_id in missing_system_ids:
        db.session.add(System(id=system_id))
    else:
        db.session.commit()


async def receiving(cloud_connector):
    await websocket.send(json.dumps({
        'action': 'connected',
        'data': {}
    }))
    while True:
        action, data = ParamsValidator.validate_group(await websocket.receive())
        res = None
        if 'error' in data:
            res = data
        elif action == 'create':
            res = GroupView.create_group(data['name'], cloud_connector.account.get('email'))
        elif action == 'delete':
            res = GroupView.delete_group(data['groupId'], cloud_connector.account.get('email'))
        elif action == 'moveGroup':
            res = GroupView.move_group_to_group(data['groupId'], data['targetId'])
        elif action == 'moveSystem':
            system = await cloud_connector.get_systems(system_id=data['systemId'])
            res = GroupView.move_system_to_group(data['groupId'], system, cloud_connector.account)
        elif action == 'systems':
            res = await cloud_connector.get_systems()
            app.logger.debug(res)
            create_missing_systems(res)
        elif action == 'aggregateSystemsRequest':
            res = await cloud_connector.aggregate_request(
                data['url'], method=data['method'], post_body=data.get('postBody')
            )
        elif action == 'aggregateRequestByGroup':
            res = await cloud_connector.aggregate_request_by_group(
                data['groupId'], data['url'], method=data['method'], post_body=data.get('postBody')
            )
        elif action != 'list':
            res = {'msg': 'Please send data in a json format', 'error': 400}

        if res:
            return_data = {
                'action': action or 'error',
                'data': res
            }
            app.logger.debug(return_data)
            await websocket.send(json.dumps(return_data))

        if not res or 'error' not in res:
            await websocket.send(json.dumps({
                'action': 'list',
                'data': GroupView.list_groups(data.get('accountId'))
            }))


# Actual views
@app.websocket('/ws')
async def ws():
    session_id = websocket.cookies.get('sessionid')
    csrf_token = websocket.cookies.get('csrftoken')
    if session_id and csrf_token:
        try:
            cloud_connector = CloudConnector(csrf_token, session_id)
            await cloud_connector.get_account_info()
            return await asyncio.create_task(receiving(cloud_connector))
        except requests.exceptions.HTTPError as e:
            print(e)
            return await websocket.close(500, 'Something went wrong')
    return await websocket.close(400, 'Missing cookies')


@app.route('/')
async def index():
    return await current_app.send_static_file('index.html')

if __name__ == "__main__":
    app.run()
