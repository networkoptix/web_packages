from abc import ABC, abstractmethod
from collections import defaultdict
from typing import List, Dict, TypedDict

from models import db, Group, User


class Batch(TypedDict):
    role: str
    systems: List[str]
    users: List[str]


class CdbBatches(TypedDict):
    data: List[Batch]


class UsersManager(ABC):
    add_users: Dict[str, User]
    remove_users: Dict[str, User]
    changes: Dict[str, List[User]]

    def __init__(self, *, override_db=None):
        self.add_users = {}
        self.remove_users = {}
        self.changes = {}
        self.db = override_db or db

    @abstractmethod
    def _make_batch(self, change_type: str) -> List[Batch]:
        pass

    def users_to_remove(self, users: List[User]) -> None:
        users_dict = {user.id: user for user in users}
        self.remove_users.update(users_dict)

    def users_to_add(self, users: List[User]) -> None:
        users_dict = {user.id: user for user in users}
        self.add_users.update(users_dict)

    @staticmethod
    def _check_if_role_is_same(user_a: User, user_b: User) -> bool:
        return user_a.role == user_b.role

    @staticmethod
    def _check_if_group_is_same(user_a: User, user_b: User) -> bool:
        return user_a.group_id == user_b.group_id

    def _calculate_transaction(self) -> None:
        changes: Dict[str, List[User]] = {
            'add': [],
            'update': [],
            'remove': []
        }
        for (user_id, user) in self.remove_users.items():
            if add_user := self.add_users.get(user_id):
                has_same_role = self._check_if_role_is_same(user, add_user)
                has_same_group = self._check_if_group_is_same(user, add_user)
                if not has_same_role or not has_same_group:
                    changes['update'].append(add_user)
                del self.add_users[user_id]
            else:
                changes['remove'].append(user)

        changes['add'].extend(self.add_users.values())
        self.changes = changes

    def _build_batches(self) -> CdbBatches:
        items = []
        items.extend(self._make_batch('remove'))
        items.extend(self._make_batch('add'))
        items.extend(self._make_batch('update'))
        return {"data": items}

    def _build_groups(self, change_type) -> Dict[str, List[str]]:
        groups = defaultdict(list)
        for user in self.changes[change_type]:
            if group_id := user.group_id:
                groups[f"{group_id}|{'none' if change_type == 'remove' else user.role}"].append(user.email)
        return groups

    async def execute_transaction(self, modify_users) -> None:
        self._calculate_transaction()
        batches = self._build_batches()
        if any([len(batch) for batch in batches["data"]]):
            await modify_users(batches)


class GroupUsersManager(UsersManager):
    def _make_batch(self, change_type: str) -> List[Batch]:
        batches = []
        group_system_ids = {}
        for key, users in self._build_groups(change_type).items():
            if not users:
                continue

            group_id, role = key.split('|')
            system_ids = group_system_ids.get(group_id)
            if not system_ids:
                if group := self.db.session.query(Group).get(group_id):
                    system_ids = group.get_all_system_ids_in_group()
                    group_system_ids[group_id] = system_ids

            if not system_ids:
                continue

            batches.append({
                "users": users,
                "systems": system_ids,
                "role": role
            })
        return batches


class SystemUsersManager(UsersManager):
    system_id: str

    def __init__(self, system_id: str):
        super(SystemUsersManager, self).__init__()
        self.system_id = system_id

    def _make_batch(self, change_type: str) -> List[Batch]:
        batches = []
        for key, users in self._build_groups(change_type).items():
            if not users:
                continue
            group_id, role = key.split('|')
            batches.append({
                "users": users,
                "systems": [self.system_id],
                "role": role
            })
        return batches
