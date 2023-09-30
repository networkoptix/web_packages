import pytest

from models import generate_uuid, System, Group
from tests.helpers import DbManager


@pytest.fixture(autouse=True)
def org_id():
    return generate_uuid()


class BaseGroupTest:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.db = DbManager()

    def create_groups(self, org_id, *, num_groups=1):
        groups = []
        for x in range(num_groups):
            groups.append(Group(name=f"Group_{x}", org_id=org_id))
        self.db.create(groups, many=True)
        return groups

    def create_systems(self, *, num_systems=1):
        systems = []
        for id in [generate_uuid() for x in range(num_systems)]:
            systems.append(System(id=id))
        self.db.create(systems, many=True)
        return systems

    def create_simple_tree(self):
        org_id = generate_uuid()
        groups = self.create_groups(org_id, num_groups=3)
        [root_group, a, b] = groups
        a.parent_group_id = root_group.id
        b.parent_group_id = root_group.id
        self.db.session.commit()
        return groups

    def create_spec_tree(self):
        org_id = generate_uuid()
        groups = self.create_groups(org_id, num_groups=5)
        [root_group, a, b, c, d] = groups
        a.parent_group_id = root_group.id
        b.parent_group_id = root_group.id
        c.parent_group_id = root_group.id
        d.parent_group_id = a.id
        self.db.session.commit()
        return groups

    def create_spec_with_systems(self):
        groups = self.create_spec_tree()
        systems = self.create_systems(num_systems=len(groups))
        for group, system in zip(groups, systems):
            system.group_id = group.id
        self.db.session.commit()
        return groups