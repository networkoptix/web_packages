import json
import httpx
import logging
from enum import Enum
# from quart import current_app used for logging

from models import Group, System, User, db
from asyncio import gather

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()

def get_role(role):
    admin_roles = ['Organization Administrator', 'Administrator']
    role = 'cloudAdmin' if role in admin_roles else 'advancedViewer'
    return role
    

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
    CREATE_ORG_USER = 'create_org_user'
    UPDATE_ORG_USER = 'update_org_user'

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
            ActionEnum.CREATE_GROUP: ['name', 'org_id'],
            ActionEnum.DELETE_GROUP: ['group_id', 'org_id'],
            ActionEnum.LIST_GROUP: [],
            ActionEnum.UPDATE_GROUP: ['group_id', 'org_id', 'name'],
            ActionEnum.MOVE_GROUP: ['group_id', 'org_id'],
            ActionEnum.MOVE_SYSTEM: ['org_id', 'system_id'],
            ActionEnum.SYSTEMS: [],
            ActionEnum.CREATE_USER: ['email', 'group_id', 'role'],
            ActionEnum.DELETE_USER: ['email', 'group_id'],
            ActionEnum.LIST_USERS: ['group_id'],
            ActionEnum.UPDATE_USER: ['email', 'group_id', 'role'],
            ActionEnum.CREATE_ORG_USER: ['org_id', 'email', 'role'],
            ActionEnum.UPDATE_ORG_USER: ['org_id', 'email', 'role'],
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
    def create_group(name, org_id, parent_id=None):
        group = Group(name=name, org_id=org_id)
        if parent_id:
            group.parent_group_id = parent_id
        db.session.add(group)
        db.session.commit()
        return group.data()

    @staticmethod
    async def delete_group(modify_users, group_id):
        group = Group.query.get(group_id)
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

        await group.add_users_from_above_group(modify_users)
        db.session.delete(group)
        db.session.commit()
        return {'msg': 'Group was deleted.'}

    @staticmethod
    def list_groups(org_id, group_id=None):
        groups = Group.query.filter((Group.org_id == org_id) and (Group.id == group_id) if group_id else True)
        return [group.data() for group in groups]

    @staticmethod
    async def move_system_to_group(modify_users, group_id, system):
        group = Group.query.filter(Group.id == group_id).first()
        if not group:
            return {'msg': "Couldn't find group", 'error': 404}

        system_id = system.get('id')
        system = System.query.get(system_id)
        if not system:
            system = System(id=system_id)
            db.session.add(system)
            db.session.commit()

        elif system.group_id:
            if src_group := Group.query.get(system.group_id):
                await src_group.remove_users_from_system(modify_users, system.id)

        if group_id:
            system.group_id = group_id
        else:
            db.session.delete(system)
        db.session.commit()

        if group:
            await group.add_users_to_system(modify_users, system.id)

        return {'msg': 'System was moved to target group.'}

    @staticmethod
    async def move_group_to_group(modify_users, dst_group_id, src_group_id):
        if src_group_id == dst_group_id:
            return {'msg': 'You cannot add a group to itself', 'error': 403}
        src = Group.query.get(src_group_id)
        if not src:
            return {'msg': "Couldn't find source group.", 'error': 404}
        dst = None
        root = None
        if dst_group_id:
            dst = Group.query.get(dst_group_id)
            if not dst:
                return {'msg': "Couldn't find destination group.", 'error': 404}
            if dst.parent_group_id == src_group_id:
                return {'msg': 'You cannot add a parent group to its child.', 'error': 403}
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
    def update_group(group_id, name):
        group = Group.query.get(group_id)
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
        user = User.query.filter(User.email == email, User.group_id == group_id).first()
        if user:
            return {'msg': f'{email} already exists in group {group_id}', 'err': 403}
        user = [UserView.add_user_to_db(group_id, email, role)]
        group = Group.query.get(group_id)
        if not group:
            return {'msg': f'Group not found. Failed to add {email}'}, 404
        await group.add_users_to_group(add_user_to_cloud, user)
        return {'msg': f'{email} was added to the group'}

    @staticmethod
    def list_users(group_id):
        group = Group.query.get(group_id)
        if not group:
            return []

        return [user.as_dict() for user in group.get_all_users()]

    @staticmethod
    def remove_user_from_db(group_id, email):
        user = User.query.filter(User.email == email, User.group_id == group_id).first()
        if not user:
            return {'msg': 'User does not exist in group', 'err': 404}

        db.session.delete(user)
        db.session.commit()
        return {'msg': f'{email} was removed from group.'}

    @staticmethod
    async def remove_user_from_group(remove_user_from_system, group_id, email):
        res = UserView.remove_user_from_db(group_id, email)
        group = Group.query.get(group_id)
        if not group:
            return {'msg': f'Group not found. Failed to remove {email}'}, 404
        await group.remove_users_from_group(remove_user_from_system, email)
        return res

    @staticmethod
    async def update_users_in_group(modify_user, group_id, users):
        group = Group.query.get(group_id)
        if not group:
            return {'msg': f'Group not found. Failed to update users'}, 404
        await group.update_users_in_group(modify_user, users)
        return {'msg': 'Users have been updated for group'}
    
class OrganizationView:
    async def _users_post(cloud_api, system_id, authToken, email, accessRole):
        body = {
            "accountEmail": email,
            "accessRole": accessRole,
            "userRoleId": "",
            "customPermissions": "",
            "isEnabled": True,
            "vmsUserId": ""
        }
        try:
            res = await cloud_api._post_wrapper(f'/cdb/systems/{system_id}/users', body, auth=authToken)
            return res
        except httpx.HTTPStatusError as err:
            log_msg = f'\nPOST: /cdb/systems/{system_id}/users\nJson: {body}'
            logger.error(f'{log_msg}\n{err}')
            pass

    @classmethod
    async def add_user_to_org(self, cloud_api, license_api, authToken, org_id, email, role, groups=None):
        try:
            res = await gather(license_api._license_post(f'/nxlicensed/api/v2/partners/organizations/{org_id}/users/', {"email": email, "role": role}),license_api._license_get(f'/nxlicensed/api/v2/partners/organizations/{org_id}/cloud_systems/'))
            systems = res[1]
            groups = GroupView.list_groups(org_id) if not groups else groups
            added_groups = []
            added_systems = []
            access_role = get_role(role)
            
            for group in groups:
                group_id = group['id']
                res = await UserView.add_user_to_group(cloud_api.share_system, group_id, email, access_role)
                added_groups.append(res)

            for system in systems:
                system_id = system['systemId']
                res = await self._users_post(cloud_api, system_id, authToken, email, access_role)
                added_systems.append(res)
            return {"added_groups": added_groups, "added_systems": added_systems}
        except httpx.HTTPStatusError as e:
            raise(e)
        
    @classmethod
    async def update_org_user(self, cloud_api, license_api, authToken, org_id, email, role, groups=None):
        try:
            body = {
                "email": email,
                "role": role,
            }
            updated_org = await license_api._license_post(f'/nxlicensed/api/v2/partners/organizations/{org_id}/users/', body)
            
            access_role = get_role(role)
            updated_systems = []
            groups = GroupView.list_groups(org_id) if not groups else groups
            for group in groups:
                for system in group['systems']:
                    system_id = system['id']
                    res = await self._users_post(cloud_api, system_id, authToken, email, access_role)
                    updated_systems.append(res)
            return { "updated_org": updated_org, "updated_systems": updated_systems}
        except httpx.HTTPStatusError as e:
            raise(e)
