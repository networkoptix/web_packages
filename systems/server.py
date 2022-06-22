import quart.flask_patch  # Keep needed for using flask things in quart
import asyncio
import json
import os
import queue
import requests
import uuid

from enum import Enum
from logging.config import dictConfig

from quart import Quart, current_app, websocket
from flask_sqlalchemy import SQLAlchemy

CLOUD_HOST = os.getenv('CLOUD_HOST') or 'https://localhost:8001'
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
# Database url should be 'mysql+pymysql://{username}:{password}@{db_host}:{db_port}/{db_name}'
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
    id = db.Column(db.String(64), primary_key=True, default=generate_uuid)
    name = db.Column(db.String(1024), nullable=False)
    owner_account_email = db.Column(db.String(255), nullable=False)
    parent_group_id = db.Column(db.String(64), db.ForeignKey(id), nullable=True)
    parent = db.relationship('Group', backref='groups', remote_side=id, lazy=True)
    systems = db.relationship('System', lazy=True)
    users = db.relationship('User', lazy=True)

    def __repr__(self):
        return f'<Group {self.name}>'

    def find_root(self):
        if self.parent:
            return self.parent.find_root()
        return self

    def as_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}

    def data(self):
        data = self.as_dict()
        groups = [group.data() for group in self.groups]
        systems = [system.as_dict() for system in self.systems]
        users = [user.as_dict() for user in self.users]
        data.update({
            "groups": groups,
            "systems": systems,
            "systemsCount": sum([group.get('systemsCount', 0) for group in groups]) + len(systems),
            "type": "group",
            "users": users

        })
        # Todo: Decide if this needs to be hidden
        # del data['owner_account_email']
        # del data['parent_group_id']
        return data

    def get_all_system_ids_in_group(self):
        systems = [system.id for system in self.systems]
        systems_in_child_groups = [group.get_all_system_ids_in_group() for group in self.groups]
        return systems + systems_in_child_groups

    def get_all_groups(self):
        groups = self.groups or []
        for group in self.groups:
            groups.extend(group.get_all_groups())
        return groups

    def get_all_users(self):
        users = list(self.users)
        for group in self.groups:
            users.extend(group.get_all_users())
        return users

    def get_users_to_root(self):
        users = set(self.users)
        if self.parent:
            self.parent.get_users_to_root().update(users)
        return users

    # Moving groups
    async def _move_users_in_group(self, modify_users, remove_user=False):
        users = set(self.parent.get_users_to_root()) - set(self.users)
        users_to_update = [{'email': '', 'role': '' if remove_user else user.role} for user in users]
        return await modify_users(self.get_all_system_ids_in_group(), users_to_update)

    async def add_users_from_above_group(self, modify_users):
        return await self._move_users_in_group(modify_users, remove_user=True)

    async def remove_users_from_above_group(self, modify_users):
        return await self._move_users_in_group(modify_users, remove_user=False)

    # Modifying users in a system
    async def add_users_to_system(self, modify_users, system_id):
        users = [user.as_dict() for user in self.get_users_to_root()]
        return await modify_users([system_id], users)

    async def remove_users_from_system(self, modify_users, system_id):
        users = [{'email': user.email, 'role': ''} for user in self.get_users_to_root()]
        return await modify_users([system_id], users)

    # Modifying users in a group
    async def _change_users_in_group(self, modify_users, users, action=None):
        no_update = action != 'update'
        bulk_user_user = []
        remaining_users = []
        group_users = [user.email for user in self.users]
        systems = [system.id for system in self.systems]
        for user in users:
            email = user['email']
            role = user['role']

            if email in group_users:
                # if we are not updating roles the user can be skipped for nodes down the tree
                if no_update:
                    continue
                user_entry = User.query.filter(User.email == email and User.group_id == self.id)
                user_entry.role = role
                bulk_user_user.append(user_entry)
            remaining_users.append(user)
        await modify_users(systems, [user.as_dict() for user in remaining_users])

        if len(bulk_user_user):
            db.session.bulk_save_objects(bulk_user_user)
            db.session.commit()

        group: Group  # Added type hint so prevent error with private method
        for group in self.groups:
            await group._change_users_in_group(modify_users, remaining_users, action=action)

    async def add_users_to_group(self, add_user_to_system, users):
        await self._change_users_in_group(add_user_to_system, users, action='add')

    async def update_users_in_group(self, modify_users, users):
        await self._change_users_in_group(modify_users, users, action='update')

    async def remove_users_from_group(self, remove_user_from_system, users):
        users = [{'email': user, 'role': ''} for user in users]
        await self._change_users_in_group(remove_user_from_system, users, action='remove')

    # Operates on the assumption that there are no cycles in the tree to begin with
    @staticmethod
    def has_cycle(root):
        if not root:
            return False
        q = queue.SimpleQueue()
        q.put(root)
        visited = set()
        while not q.empty():
            current = q.get()
            if current.id in visited:
                return True
            visited.add(current.id)
            for child in current.groups:
                q.put(child)
        return False


class System(db.Model):
    id = db.Column(db.String(64), primary_key=True, default=generate_uuid)
    group_id = db.Column(db.String(64), db.ForeignKey('group.id'), nullable=True)

    def __repr__(self):
        return f'<System {self.id}>'

    def as_dict(self):
        data = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        data.update({'type': 'system'})
        return data


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), nullable=False)
    group_id = db.Column(db.String(64), db.ForeignKey('group.id'), nullable=True)
    role = db.Column(db.String(64), nullable=False)
    enabled = db.Column(db.Boolean, unique=False, default=True)

    def as_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}


db.create_all(app=app)


# Code for views
class ActionEnum(Enum):
    AGGREGATE_SYSTEMS_REQUEST = 'aggregate_systems_request'
    AGGREGATE_REQUEST_BY_GROUP = 'aggregate_request_by_group'
    CREATE_GROUP = 'create_group'
    DELETE_GROUP = 'delete_group'
    LIST_GROUP = 'list_groups'
    UPDATE_GROUP = 'update_group'
    MOVE_GROUP = 'move_group'
    MOVE_SYSTEM = 'move_system'
    SYSTEMS = 'systems'
    CREATE_USER = 'create_user'
    DELETE_USER = 'delete_user'
    LIST_USERS = 'list_users'
    UPDATE_USER = 'update_user'

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
            ActionEnum.AGGREGATE_REQUEST_BY_GROUP: ['group_id', 'url', 'method'],
            ActionEnum.CREATE_GROUP: ['name'],
            ActionEnum.DELETE_GROUP: ['group_id'],
            ActionEnum.LIST_GROUP: [],
            ActionEnum.UPDATE_GROUP: ['group_id', 'name'],
            ActionEnum.MOVE_GROUP: ['group_id'],
            ActionEnum.MOVE_SYSTEM: ['system_id'],
            ActionEnum.SYSTEMS: [],
            ActionEnum.CREATE_USER: ['email', 'group_id', 'role'],
            ActionEnum.DELETE_USER: ['email', 'group_id'],
            ActionEnum.LIST_USERS: ['group_id'],
            ActionEnum.UPDATE_USER: ['email', 'group_id', 'role']
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
    def _check_group(group_id, email):
        group = Group.query.get(group_id)
        if not group:
            return {'msg': 'You cannot delete a group that doesn\'t exist', 'error': 404}
        if group.owner_account_email != email:
            return {'msg': 'You can only delete groups that you own', 'error': 403}
        return group

    @staticmethod
    def create_group(name, email):
        group = Group(name=name, owner_account_email=email)
        db.session.add(group)
        db.session.commit()
        return group.data()

    @staticmethod
    async def delete_group(modify_users, group_id, email):
        group = GroupView._check_group(group_id, email)
        if type(group) is dict:
            return group
        group.users.delete()
        users = list(set(group.get_users_to_root()) | set(group.get_all_users()))
        emails = [user.email for user in users]
        await group.remove_users_from_group(modify_users, emails)
        if group.parent_group_id:
            parent_group = Group.query.get(group.parent_group_id)
            for child_group in group.groups:
                parent_group.groups.append(child_group)

            for system in group.systems:
                parent_group.systems.append(system)

        db.session.delete(group)
        db.session.commit()
        await group.add_users_from_above(modify_users)
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
    async def move_system_to_group(modify_users, group_id, system, account):
        if system.get('ownerAccountEmail') != account.get('email'):
            return {'msg': 'You can only move systems that you own.', 'error': 403}

        group = Group.query.get(group_id)
        if group and group.owner_account_email != account.get('email'):
            return {'msg': 'You can only move systems into groups that you own.', 'error': 403}

        system = System.query.get(system.get('id'))
        if system.group_id:
            if src_group := Group.query.get(system.group_id):
                await src_group.remove_users_from_system(modify_users, system.id)

        system.group_id = group_id
        db.session.commit()

        if group:
            await group.add_users_to_system(modify_users, system.id)

        return {'msg': 'System was moved to target group.'}

    @staticmethod
    async def move_group_to_group(modify_users, src_group_id, dst_group_id):
        if src_group_id == dst_group_id:
            return {'msg': 'You cannot add a group to itself', 'error': 403}
        src = Group.query.get(src_group_id)
        dst = None
        root = None
        if dst_group_id:
            dst = Group.query.get(dst_group_id)

            if dst.parent_group_id == src_group_id:
                return {'msg': 'You cannot add a parent group to it\'s child.', 'error': 403}
            if src.owner_account_email != dst.owner_account_email:
                return {'msg': 'You can only move groups that you own.', 'error': 403}
            root = dst.find_root()

        src_parent_id = src.parent_group_id
        src.parent_group_id = dst_group_id
        if dst_group_id is not None and Group.has_cycle(root):
            return {'msg': 'Adding src group to dst group would create a cycle in tree.', 'error': 403}

        src.parent_group_id = src_parent_id
        await src.remove_users_from_above_group(modify_users)

        src.parent_group_id = dst_group_id
        db.session.commit()
        if dst:
            await dst.add_users_from_above_group(modify_users)

        return {'msg': 'Group was moved to target group.'}

    @staticmethod
    def update_group(group_id, email, name):
        group = GroupView._check_group(group_id, email)
        if type(group) is dict:
            return group
        old_name = group.name
        group.name = name
        db.session.commit()
        return {'msg': f"{old_name} was changed to {name}"}


class UserView:
    @staticmethod
    def add_user_to_db(group_id, email, role):
        user = User(email=email, group_id=group_id, role=role)
        db.session.add(user)
        db.session.commit()
        return user.as_dict()

    @staticmethod
    async def add_user_to_group(add_user_to_cloud, group_id, email, role):
        user = [UserView.add_user_to_db(group_id, email, role)]
        group = Group.query.filter(group_id)
        if not group:
            return False
        await group.add_users_to_group(add_user_to_cloud, user)
        return {'msg': f'{email} was added to the group'}

    @staticmethod
    def list_users(group_id):
        group = Group.query.filter(group_id)
        if not group:
            return []

        return [user.as_dict() for user in group.get_all_users()]

    @staticmethod
    def remove_user_from_db(group_id, email):
        user = User.query.filter(User.email == email and User.group_id == group_id)
        if not user:
            return {'msg': 'User does not exist in group', 'err': 404}

        db.session.delete(user)
        db.session.commit()
        return {'msg': f'{email} was removed from group.'}

    @staticmethod
    async def remove_user_from_group(remove_user_from_system, group_id, email):
        res = UserView.remove_user_from_db(group_id, email)
        group = Group.query.filter(group_id)
        if not group:
            return False
        await group.remove_users_from_group(remove_user_from_system, email)
        return res

    @staticmethod
    async def update_users_in_group(modify_user, group_id, users):
        group = Group.query.filter(group_id)
        if not group:
            return False
        await group.update_users_in_group(modify_user, users)
        return {'msg': 'Users have been updated for group'}


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
            res = self.session.get(f'{CLOUD_HOST}{route}', params=params)  # , verify=False)
            res.raise_for_status()
            return res.json()
        except requests.exceptions.HTTPError as e:
            if res is not None and 400 <= res.status_code < 500:
                if _websocket:
                    return websocket.close(res.status_code, 'Failed auth')
                raise e

    def _post_wrapper(self, route, data=None, _websocket=None):
        res = None
        try:
            res = self.session.post(f'{CLOUD_HOST}{route}', json=data)  # , verify=False)
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

    async def share_system(self, systems, users):
        request_url = f'/api/systems/group-users'
        data = {
            'systems': systems,
            'users': users
        }
        return await self.loop.run_in_executor(None, self._post_wrapper, request_url, data)


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
        elif action == 'create_group':
            res = GroupView.create_group(data['name'], cloud_connector.account.get('email'))
        elif action == 'delete_group':
            res = await GroupView.delete_group(data['group_id'], cloud_connector.account.get('email'))
        elif action == 'move_group':
            res = await GroupView.move_group_to_group(cloud_connector.share_system, data['group_id'], data['target_id'])
        elif action == 'move_system':
            system = await cloud_connector.get_systems(system_id=data['system_id'])
            res = await GroupView.move_system_to_group(
                cloud_connector.share_system, data['group_id'], system, cloud_connector.account)
        elif action == 'update_group':
            res = await GroupView.update_group(data['group_id'], cloud_connector.account.get('email'), data['name'])
        # User management
        elif action == 'create_user':
            res = await UserView.add_user_to_group(
                cloud_connector.share_system, data['group_id'], data['email'], data['role'])
        elif action == 'delete_user':
            res = await UserView.remove_user_from_group(cloud_connector.share_system, data['group_id'], data['email'])
        elif action == 'list_user':
            res = UserView.list_users(data['group_id'])
        elif action == 'update_user':
            user = [{'email': data['email'], 'role': data['role'], 'enabled': data.get('enabled', True)}]
            res = await UserView.update_users_in_group(data['group_id'], user)
        # End of user management
        elif action == 'systems':
            res = await cloud_connector.get_systems()
            app.logger.debug(res)
            create_missing_systems(res)
        elif action == 'aggregate_systems_request':
            res = await cloud_connector.aggregate_request(
                data['url'], method=data['method'], post_body=data.get('postBody')
            )
        elif action == 'aggregate_request_by_group':
            res = await cloud_connector.aggregate_request_by_group(
                data['group_id'], data['url'], method=data['method'], post_body=data.get('postBody')
            )
        elif action != 'list_groups':
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
                'action': 'list_groups',
                'data': GroupView.list_groups(data.get('account_id'))
            }))


# Actual views
@app.websocket('/ws')
async def ws():
    if code := websocket.args.get('code'):
        try:
            cloud_connector = CloudConnector()
            await cloud_connector.login(code)
            await cloud_connector.get_account_info()
            return await asyncio.create_task(receiving(cloud_connector))
        except requests.exceptions.HTTPError as e:
            return await websocket.close(500, 'Something went wrong')
    return await websocket.close(400, 'Missing code')


@app.route('/health')
def server_health():
    return 'OK', 200


if __name__ == "__main__":
    @app.route('/')
    async def index():
        return await current_app.send_static_file('index.html')
    app.run()
