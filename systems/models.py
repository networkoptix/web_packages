import queue
import uuid

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import update


db = SQLAlchemy()


def generate_uuid():
    return str(uuid.uuid4())


class Group(db.Model):
    id = db.Column(db.String(64), primary_key=True, default=generate_uuid)
    name = db.Column(db.String(1024), nullable=False)
    org_id = db.Column(db.String(64))
    parent_group_id = db.Column(db.String(64), db.ForeignKey(id), nullable=True)
    parent = db.relationship('Group', backref='groups', remote_side=id, lazy=True)
    systems = db.relationship('System', lazy="dynamic")
    users = db.relationship('User', lazy="dynamic")

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
        users = {user.email: user for user in self.users}
        if self.parent:
            for user in self.parent.get_users_to_root():
                if user.email not in users:
                    users[user.email] = user
                elif users[user.email].is_parent_role_greater(user.role):
                    # TODO: w/ 5.2 change this to use permission group ids. Using legacy roles for testing!!!
                    users[user.email] = user
        return users.values()

    # Moving groups
    async def _move_users_in_group(self, modify_users, remove_user=False):
        users = set()
        if self.parent:
            users = set(self.parent.get_users_to_root())
        users = users - set(self.users)
        users_to_update = [{'email': '', 'role': '' if remove_user else user.role} for user in users]
        return await modify_users(self.get_all_system_ids_in_group(), users_to_update)

    async def add_users_from_above_group(self, modify_users):
        return await self._move_users_in_group(modify_users, remove_user=False)

    async def remove_users_from_above_group(self, modify_users):
        return await self._move_users_in_group(modify_users, remove_user=True)

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
        updated_users = False
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
                if(User.query.filter(User.email == email and User.group_id == self.id).update({'role': role})):
                    updated_users = True

            else:
                await self.add_users_to_group(modify_users, [user])
            remaining_users.append(user)
        if updated_users:
            db.session.commit()
        await modify_users(systems, remaining_users)
    
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

    def is_parent_role_greater(self, role_from_parent):
        role_access_by_index = ['owner', 'admin', 'cloudAdmin', 'advancedViewer', 'viewer', 'liveViewer', '']
        if self.role == role_from_parent:
            return False
        return role_access_by_index.index(role_from_parent) < role_access_by_index.index(self.role)
