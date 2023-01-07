import json
from enum import Enum
# from quart import current_app used for logging

from models import Group, System, User, db


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
            return {'msg': 'You cannot delete a group that doesn\'t exist', 'error': 404}, 404
        if group.owner_account_email != email:
            return {'msg': 'You can only delete groups that you own', 'error': 403}, 403
        return group, None

    @staticmethod
    def create_group(name, email, parent_id=None):
        group = Group(name=name, owner_account_email=email)
        if parent_id:
            group.parent_group_id = parent_id
        db.session.add(group)
        db.session.commit()
        return group.data()

    @staticmethod
    async def delete_group(modify_users, group_id, email):
        group, error_code = GroupView._check_group(group_id, email)
        if error_code:
            return group, error_code
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
    def list_groups(email, group_id=None):
        if group_id:
            groups = Group.query.filter(Group.id == group_id)
        else:
            groups = Group.query.filter(Group.parent_group_id == None)
        if email:
            groups = groups.filter(Group.owner_account_email == email)
        groups_list = [group.data() for group in groups]

        shared_group_ids = [user_group.group_id for user_group in User.query.filter(User.email == email, User.enabled == True)]
        shared_groups = Group.query.filter(Group.id.in_(shared_group_ids))
        for shared_group in shared_groups:
            groups_list.append(shared_group.data())

        return groups_list

    @staticmethod
    async def move_system_to_group(modify_users, group_id, system, current_email):
        if system.get('ownerAccountEmail') != current_email:
            return {'msg': 'You can only move systems that you own.', 'error': 403}

        group = Group.query.filter(Group.id == group_id).first()
        if not group or group.owner_account_email != current_email:
            return {'msg': 'You can only move systems into groups that you own.', 'error': 403}

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
    async def move_group_to_group(modify_users, dst_group_id, src_group_id, current_email):
        if src_group_id == dst_group_id:
            return {'msg': 'You cannot add a group to itself', 'error': 403}
        src = Group.query.get(src_group_id)
        if not src or src.owner_account_email != current_email:
            return {'msg': 'You can only move groups that you own.', 'error': 403}
        dst = None
        root = None
        if dst_group_id:
            dst = Group.query.get(dst_group_id)
            if not dst and dst.owner_account_email != current_email:
                return {'msg': 'You can only move groups that you own.', 'error': 403}
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
    def update_group(group_id, email, name):
        group, error_code = GroupView._check_group(group_id, email)
        if error_code:
            return group, error_code
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
        user = User.query.filter(User.email == email and User.group_id == group_id)
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
