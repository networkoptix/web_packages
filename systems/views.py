import json

import httpx
import marshmallow
from marshmallow import ValidationError
# from quart import current_app  # used for logging

from caches import OrgCache
from helpers.user_managers import GroupUsersManager, SystemUsersManager
from models import Group, System, User, db
from schema import ActionEnum, params_to_actions


class ParamsValidator:

    @staticmethod
    def validate_group(raw_data):
        try:
            raw_data = json.loads(raw_data, strict=False)
        except json.decoder.JSONDecodeError:
            return None, {'msg': 'Please send data in a json format', 'error': 400}

        action = raw_data.get('action')
        if not action or not ActionEnum.has_action(action):
            return None, {'msg': f'{action} is not in {ActionEnum.values()}', 'error': 400}

        del raw_data['action']

        enum_action = ActionEnum(action)
        try:
            data = params_to_actions[enum_action]().load(data=raw_data, unknown=marshmallow.EXCLUDE)
        except ValidationError as err:
            return None, {
                'msg': f'{action} is missing required params {err}',
                'error': 400
            }
        return action, data


class GroupView:
    def __init__(self, *, override_db=None):
        self.db = override_db or db

    def create_group(self, name, org_id, *, parent_id=None):
        if not parent_id:
            # Creates and/or assigns group to the root group
            for group in self.db.session.query(Group).filter(Group.org_id == org_id):
                if group.is_root:
                    parent_id = group.id
                    break
            else:
                parent = Group(name='', org_id=org_id)
                self.db.session.add(parent)
                self.db.session.commit()
                parent_id = parent.id

        group = Group(name=name, org_id=org_id)
        if parent_id:
            group.parent_group_id = parent_id
        self.db.session.add(group)
        self.db.session.commit()
        return group

    async def delete_group(self, modify_users, group_id):
        group_manager = GroupUsersManager()
        group = self.db.session.query(Group).get(group_id)
        if not group:
            return {'msg': "Couldn't find group", 'error': 404}

        if group.is_root:
            raise ValueError("Cannot delete the root group of an org")

        group_manager.users_to_remove(group.users)
        group_manager.users_to_add(list(set(group.get_users_to_root()) - set(group.users)))

        group.users.delete()

        parent_group = self.db.session.query(Group).get(group.parent_group_id)
        for child_group in group.groups:
            parent_group.groups.append(child_group)

        for system in group.systems:
            parent_group.systems.append(system)

        await group_manager.execute_transaction(modify_users)

        self.db.session.delete(group)
        self.db.session.commit()

        return {'msg': 'Group was deleted.'}

    async def list_groups(self, org_id, group_ids=None):
        cached, updater = await OrgCache(org_id).cached_list_groups()
        if cached and not group_ids:
            return cached

        if group_ids:
            groups = self.db.session.query(Group).filter(Group.id.in_(group_ids))
        else:
            groups = self.db.session.query(Group).filter(Group.org_id == org_id, Group.parent_group_id.is_(None))
        groups_data = [group.data() for group in groups]
        if not group_ids:
            await updater(groups_data)

        return groups_data

    async def move_system_to_group(self, modify_users, group_id, system):
        group = self.db.session.query(Group).filter(Group.id == group_id).first()
        if not group:
            return {'msg': "Couldn't find group", 'error': 404}

        system_id = system.get('id')
        system = self.db.session.query(System).get(system_id)

        system_manager = SystemUsersManager(system_id)
        system_manager.users_to_add(group.get_users_to_root())

        if not system:
            system = System(id=system_id)
            self.db.session.add(system)
            self.db.session.commit()

        elif system.group_id:
            if src_group := self.db.session.query(Group).get(system.group_id):
                system_manager.users_to_remove(src_group.get_users_to_root())

        if group_id:
            system.group_id = group_id
        else:
            self.db.session.delete(system)
        await system_manager.execute_transaction(modify_users)
        self.db.session.commit()

        return {'msg': 'System was moved to target group.'}

    async def move_group_to_group(self, modify_users, dst_group_id, src_group_id):
        if src_group_id == dst_group_id:
            return {'msg': 'You cannot add a group to itself', 'error': 403}
        src = self.db.session.query(Group).get(src_group_id)
        if not src:
            return {'msg': "Couldn't find source group.", 'error': 404}
        dst = None
        root = None
        if dst_group_id:
            dst = self.db.session.query(Group).get(dst_group_id)
            if not dst:
                return {'msg': "Couldn't find destination group.", 'error': 404}
            if dst.parent_group_id == src_group_id:
                return {'msg': 'You cannot add a parent group to its child.', 'error': 403}
            if src.org_id != dst.org_id:
                return {'msg': 'You can only move groups within the same org.', 'error': 403}
            root = dst.find_root()

        group_manager = GroupUsersManager()
        if src.parent:
            group_manager.users_to_remove(src.parent.get_users_to_root())
        src_parent_id = src.parent_group_id
        src.parent_group_id = dst_group_id
        if dst_group_id is not None and Group.has_cycle(root):
            return {'msg': 'Adding src group to dst group would create a cycle in tree.', 'error': 403}

        src.parent_group_id = src_parent_id

        src.parent_group_id = dst_group_id
        new_users = {user.id: user for user in dst.get_users_to_root()}
        old_users = {user.id: user for user in src.get_all_users()}
        for (old_user_id, old_user) in old_users.items():
            if old_user_id in new_users:
                self.db.session.delete(old_user)

        group_manager.users_to_add(dst.get_users_to_root())
        await group_manager.execute_transaction(modify_users)

        self.db.session.commit()

        return {'msg': 'Group was moved to target group.'}

    def update_group(self, group_id, name):
        group = self.db.session.query(Group).get(group_id)
        old_name = group.name
        group.name = name
        self.db.session.commit()
        return {'msg': f"{old_name} was changed to {name}"}

    def get_or_create_root_group(self, org_id):
        for group in self.db.session.query(Group).filter(Group.org_id == org_id):
            if group.is_root:
                return group

        root_group = Group(name='', org_id=org_id)
        self.db.session.add(root_group)
        self.db.session.commit()
        return root_group


class OrganizationView:
    def __init__(self, data, *, override_db=None):
        self.db = override_db or db
        self.org_id = data['org_id']
        self.email = data['email']
        self.role = data['role']
        self.access_role = self._get_role(self.role)
        self.group_ids = data.get('groups')
        self.enabled = data.get('enabled', True)

    @staticmethod
    def _get_role(role):
        admin_roles = ['Organization Administrator', 'Administrator', 'Power User']
        if role in admin_roles:
            role = 'cloudAdmin'
        elif not role:
            role = 'custom'
        return role

    def _create_missing_systems(self, root_group_id, org_system_ids):
        old_system_ids = [system.id for system in self.db.session.query(System).filter(System.id.in_(org_system_ids))]
        new_system_ids = set(org_system_ids) - set(old_system_ids)
        for system_id in new_system_ids:
            self.db.session.add(System(id=system_id, group_id=root_group_id))
        self.db.session.commit()

    async def sync_systems_from_channel_partner_service(self, license_api):
        try:
            system_ids = await license_api.get_org_systems(self.org_id)
        except httpx.HTTPStatusError as e:
            raise e

        root_group_id = GroupView(override_db=self.db).get_or_create_root_group(self.org_id).id
        if not self.group_ids:
            self.group_ids = [root_group_id]

        if system_ids:
            self._create_missing_systems(root_group_id, system_ids)

    async def sync_user_with_channel_partner_service(self, license_api):
        org_role = self.role if not self.group_ids else 'System Groups'  # Todo: need to check if org role and no id
        body = {
            "email": self.email,
            "role": org_role,
        }
        return await license_api.add_or_update_user_in_org(self.org_id, body)

    async def add_user_to_org(self, cloud_api, license_api):
        await self.sync_systems_from_channel_partner_service(license_api)
        await self.sync_user_with_channel_partner_service(license_api)
        user_for_other_groups = []
        for group_id in self.group_ids:
            user = User(email=self.email, role=self.access_role, group_id=group_id, enabled=True)
            self.db.session.add(user)
            user_for_other_groups.append(user)

        batch = GroupUsersManager()
        batch.users_to_add(user_for_other_groups)
        await batch.execute_transaction(cloud_api.send_batch)

        self.db.session.commit()
        return {"added_groups": [], "added_systems": []}

    async def update_org_user(self, cloud_api, license_api):
        await self.sync_systems_from_channel_partner_service(license_api)
        updated_org = await self.sync_user_with_channel_partner_service(license_api)
        updated_org['org_id'] = self.org_id

        user_for_other_groups = []
        for group_id in self.group_ids:
            user = self.db.session.query(User).filter(User.email == self.email, User.group_id == group_id).first()
            if user:
                user.role = self.access_role
                user.enabled = self.enabled
                user.group_id = group_id
            else:
                user = User(email=self.email, role=self.access_role, group_id=group_id, enabled=self.enabled)
                self.db.session.add(user)
            user_for_other_groups.append(user)
        self.db.session.commit()

        batch = GroupUsersManager()
        batch.users_to_add(user_for_other_groups)
        await batch.execute_transaction(cloud_api.send_batch)

        self.db.session.commit()
        return {"updated_org": updated_org, "updated_groups": [], "updated_systems": []}

    async def delete_org_user(self, cloud_api, license_api):
        await self.sync_systems_from_channel_partner_service(license_api)
        await license_api.remove_user_from_org(self.org_id, self.email)

        removed_user_groups = []
        for group_id in self.group_ids:
            if user := self.db.session.query(User).filter(User.email == self.email, User.group_id == group_id).first():
                self.db.session.delete(user)
                removed_user_groups.append(user)

        batch = GroupUsersManager()
        batch.users_to_remove(removed_user_groups)
        await batch.execute_transaction(cloud_api.send_batch)

        self.db.session.commit()
        return {"removed_groups": [], "removed_systems": []}
