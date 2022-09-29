import queue
import uuid

from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()


def generate_uuid():
    return str(uuid.uuid4())


class Group(db.Model):
    id = db.Column(db.String(64), primary_key=True, default=generate_uuid)
    name = db.Column(db.String(1024), nullable=False)
    owner_account_email = db.Column(db.String(255), nullable=False)
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
