import queue
import asyncio

from flask_sqlalchemy import SQLAlchemy
from quart import current_app
from sqlalchemy import update, event
from caches import OrgCache
from utils import generate_uuid


db = SQLAlchemy()


class Group(db.Model):
    id = db.Column(db.String(64), primary_key=True, default=generate_uuid)
    name = db.Column(db.String(1024), nullable=False)
    org_id = db.Column(db.String(64))
    parent_group_id = db.Column(db.String(64), db.ForeignKey(id), nullable=True)
    parent = db.relationship('Group', backref='groups', remote_side=id, lazy=True)
    systems = db.relationship('System', backref='group', lazy="dynamic")
    users = db.relationship('User',backref='group', lazy="dynamic")

    def __repr__(self):
        return f'<Group {self.name}>'

    @property
    def is_root(self):
        return not self.parent

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
        for group in self.groups:
            if children_systems := group.get_all_system_ids_in_group():
                systems.extend(children_systems)
        return systems

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

    @property
    def org_id(self):
        return self.group.org_id if self.group else None

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

    @property
    def org_id(self):
        return self.group.org_id if self.group else None

    def as_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}

    def is_parent_role_greater(self, role_from_parent):
        role_access_by_index = ['owner', 'admin', 'cloudAdmin', 'advancedViewer', 'viewer', 'liveViewer', '']
        if self.role == role_from_parent:
            return False
        return role_access_by_index.index(role_from_parent) < role_access_by_index.index(self.role)


# Comment out below when running tests
def group_updated(mapper, connection, target, **kwargs):
    current_app.add_background_task(OrgCache(target.org_id).update_current)


event.listen(Group, "after_delete", group_updated)
event.listen(Group, "after_update", group_updated)
event.listen(Group, "after_insert", group_updated)
event.listen(System, "after_delete", group_updated)
event.listen(System, "after_update", group_updated)
event.listen(System, "after_insert", group_updated)
event.listen(User, "after_delete", group_updated)
event.listen(User, "after_update", group_updated)
event.listen(User, "after_insert", group_updated)