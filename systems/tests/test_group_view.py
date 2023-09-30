import logging
import json

import pytest

from conftest import BaseGroupTest
from models import Group, System, generate_uuid
from views import GroupView


class TestGroupView(BaseGroupTest):
    # Tests for group CRUD
    def test_create_root_group(self, org_id):
        org_groups = self.db.session.query(Group).filter(Group.org_id == org_id)
        assert len(list(org_groups)) == 0, "Org has groups"
        root_group = GroupView(override_db=self.db).get_or_create_root_group(org_id=org_id)

        assert root_group.is_root

    def test_get_existing_root_group(self, org_id):
        old_root_group = GroupView(override_db=self.db).get_or_create_root_group(org_id=org_id)
        existing_root_group = GroupView(override_db=self.db).get_or_create_root_group(org_id=org_id)

        assert old_root_group.id == existing_root_group.id

    def test_auto_create_root_group(self, org_id):
        created_group = GroupView(override_db=self.db).create_group(generate_uuid(), org_id=org_id)
        logging.debug(json.dumps(created_group.data(), indent=4))

        assert created_group.parent.is_root

    def test_adding_group_to_org_root(self, org_id):
        [root_group] = self.create_groups(org_id=org_id)
        assert root_group.org_id == org_id
        created_group = GroupView(override_db=self.db).create_group('Group_2', org_id, parent_id=root_group.id)
        logging.debug(json.dumps(created_group.data(), indent=4))

        assert created_group.parent_group_id == root_group.id

    def test_adding_group_to_org_under_a(self):
        [root_group, a] = self.create_simple_tree()[:2]
        created_group = GroupView(override_db=self.db).create_group('Group_2', root_group.org_id, parent_id=a.id)
        logging.debug(json.dumps(created_group.data(), indent=4))

        assert created_group.parent_group_id == a.id

    @pytest.mark.skip
    @pytest.mark.asyncio
    async def test_list_all_groups_in_org(self):
        root_group = self.create_spec_tree()[0]
        data = await GroupView(override_db=self.db).list_groups(root_group.org_id)

        assert data == [root_group.data()]

    @pytest.mark.skip
    @pytest.mark.asyncio
    async def test_list_some_groups_in_org(self):
        [root_group, a] = self.create_spec_tree()[:2]
        data = await GroupView(override_db=self.db).list_groups(root_group.org_id, [a.id])

        assert data == [a.data()]

    def test_updating_group_name(self, org_id):
        new_group_a_name = generate_uuid()
        [a] = self.create_groups(org_id)

        GroupView(override_db=self.db).update_group(a.id, new_group_a_name)

        assert a.name == new_group_a_name

    @pytest.mark.asyncio
    async def test_deleting_root_group(self, org_id):
        root_group = self.create_groups(org_id)[0]
        changes = []
        try:
            await GroupView(override_db=self.db).delete_group(lambda batch: changes.append(batch), root_group.id)
            assert False
        except ValueError:
            assert True

    @pytest.mark.asyncio
    async def test_deleting_child_group_without_children(self):
        [root_group, a] = self.create_simple_tree()[:2]
        changes = []
        await GroupView(override_db=self.db).delete_group(lambda batch: changes.append(batch), a.id)

        assert changes == []
        assert a.id not in [group.id for group in root_group.groups]

    @pytest.mark.asyncio
    async def test_deleting_child_group_with_children(self):
        [root_group, a, b, c, d] = self.create_spec_tree()
        changes = []
        await GroupView(override_db=self.db).delete_group(lambda batch: changes.append(batch), a.id)

        assert changes == []
        assert d.parent_group_id == root_group.id

    # Tests for group movement
    @pytest.mark.asyncio
    async def test_move_group_to_sibling(self):
        [root_group, a, b] = self.create_simple_tree()
        changes = []
        await GroupView(override_db=self.db).move_group_to_group(lambda batch: changes.append(batch), a.id, b.id)

        logging.debug(json.dumps(root_group.data(), indent=4))

        assert changes == []
        assert b.parent_group_id == a.id

    @pytest.mark.asyncio
    async def test_move_nested_group_to_root(self):
        [root_group, a, b, c, d] = self.create_spec_tree()
        changes = []
        await GroupView(override_db=self.db) \
            .move_group_to_group(lambda batch: changes.append(batch), root_group.id, d.id)

        logging.debug(json.dumps(root_group.data(), indent=4))

        assert changes == []
        assert d.parent_group_id == root_group.id

    # Test for system movement
    @pytest.mark.asyncio
    async def test_adding_system_to_group(self):
        [org_id, system_id] = [generate_uuid() for x in range(2)]
        [root_group] = self.create_groups(org_id)
        cdb_system = {"id": system_id}
        changes = []

        await GroupView(override_db=self.db)\
            .move_system_to_group(lambda batch: changes.append(batch), root_group.id, cdb_system)

        assert changes == []

        system = self.db.session.query(System).get(system_id)
        assert system.group_id == root_group.id

    @pytest.mark.asyncio
    async def test_moving_system_from_root_to_group(self):
        system_id = generate_uuid()
        [root_group, a, b] = self.create_simple_tree()
        cdb_system = {"id": system_id}
        changes = []

        await GroupView(override_db=self.db) \
            .move_system_to_group(lambda batch: changes.append(batch), root_group.id, cdb_system)

        await GroupView(override_db=self.db) \
            .move_system_to_group(lambda batch: changes.append(batch), a.id, cdb_system)

        assert changes == []

        system = self.db.session.query(System).get(system_id)
        assert system.group_id == a.id

    # Test group actions with systems
    @pytest.mark.asyncio
    async def test_deleting_groups_with_systems(self):
        [root_group, a, b, c, d] = self.create_spec_with_systems()
        b_system_ids = set([system.id for system in b.systems])
        changes = []
        await GroupView(override_db=self.db).delete_group(lambda batch: changes.append(batch), b.id)

        assert changes == []
        root_system_ids = set([system.id for system in root_group.systems])

        logging.debug(f"Missing systems: {b_system_ids - root_system_ids}")
        assert b_system_ids - root_system_ids == set()

    @pytest.mark.asyncio
    async def test_deleting_groups_with_groups_and_systems(self):
        [root_group, a, b, c, d] = self.create_spec_with_systems()
        a_system_ids = set([system.id for system in a.systems])
        a_group_ids = set([group.id for group in a.groups])

        changes = []
        await GroupView(override_db=self.db).delete_group(lambda batch: changes.append(batch), a.id)

        assert changes == []
        root_system_ids = set([system.id for system in root_group.systems])
        root_group_ids = set([group.id for group in root_group.groups])

        logging.debug(f"Missing systems: {a_system_ids - root_system_ids}")
        logging.debug(f"Missing groups: {a_group_ids - root_group_ids}")
        logging.debug(f"Checking if nested groups and systems were moved to the parent")
        assert a_system_ids - root_system_ids == set()
        assert a_group_ids - root_group_ids == set()

        logging.debug(f"Checking if child group's parent is grand parent")
        assert d.parent_group_id == root_group.id

        logging.debug(f"Checking if parent group was deleted from the db")
        assert not self.db.session.query(Group).get(a.id)
