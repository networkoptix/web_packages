import pytest
from django.core.cache import caches

from partners.models import (
    CloudSystemId,
    CloudUser,
    OrganizationToUser,
    SystemGroup,
)
from partners.utils.cache_keys import (
    cache_key_cloud_system_group_children_count,
    organization_system_count,
)
from tools.helpers import get_path_from_parent


class TestSystemGroupDelete:
    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory, system_group_factory,
              sys_group_user_factory, org_user_factory, system_factory):
        self.gen_count = 2
        self.cp = channel_partner_factory()
        self.org_name = 'Current Organization'
        self.org = organization_factory(channel_partner=self.cp, name='Organization')
        self.org_systems = [system_factory(organization=self.org)
                            for i in range(self.gen_count)]
        self.group_0 = system_group_factory(organization=self.org, name=f'Group 0')
        self.group_0_0 = system_group_factory(organization=self.org, parent=self.group_0, name=f'Group 0-0')
        self.group_0_0_0 = system_group_factory(organization=self.org, parent=self.group_0_0, name=f'Group 0-0-0')
        self.group_0_0_1 = system_group_factory(organization=self.org, parent=self.group_0_0, name=f'Group 0-0-1')
        self.group_0_1 = system_group_factory(organization=self.org, parent=self.group_0, name=f'Group 0-1')
        self.group_0_1_0 = system_group_factory(organization=self.org, parent=self.group_0_1, name=f'Group 0-1-0')
        self.group_0_1_1 = system_group_factory(organization=self.org, parent=self.group_0_1, name=f'Group 0-1-1')
        self.group_1 = system_group_factory(organization=self.org, name=f'Group 1')
        self.group_1_0 = system_group_factory(organization=self.org, parent=self.group_1, name=f'Group 1-0')
        self.group_1_0_0 = system_group_factory(organization=self.org, parent=self.group_1_0, name=f'Group 1-0-0')
        self.group_1_0_1 = system_group_factory(organization=self.org, parent=self.group_1_0, name=f'Group 1-0-1')
        self.group_1_1 = system_group_factory(organization=self.org, parent=self.group_1, name=f'Group 1-1')
        self.group_1_1_0 = system_group_factory(organization=self.org, parent=self.group_1_1, name=f'Group 1-1-0')
        self.group_1_1_1 = system_group_factory(organization=self.org, parent=self.group_1_1, name=f'Group 1-1-1')
        self.groups = [
            self.group_0,
            self.group_0_0,
            self.group_0_0_0,
            self.group_0_0_1,
            self.group_0_1,
            self.group_0_1_0,
            self.group_0_1_1,
            self.group_1,
            self.group_1_0,
            self.group_1_0_0,
            self.group_1_0_1,
            self.group_1_1,
            self.group_1_1_0,
            self.group_1_1_1,
        ]
        for group in self.groups:
            for _ in range(self.gen_count):
                system_factory(organization=self.org, system_group=group)
                sys_group_user_factory(organization=self.org, group=group)

    def check_systems_path(self):
        for sys in CloudSystemId.objects.all():
            path = get_path_from_parent(sys.system_group or sys.organization)
            assert path == sys.path

    def check_groups_path(self):
        for group in SystemGroup.objects.all():
            path = get_path_from_parent(group.parent or group.organization)
            assert path == group.path

    def test_delete_remove_users(self):
        group = self.group_0_0_0
        group_id = 0
        cloud_users_id = [rel.user_id for rel in group.organizationtouser_set.all()]
        assert group.organizationtouser_set.count() == self.gen_count
        assert OrganizationToUser.objects.filter(user_id__in=cloud_users_id).count() == self.gen_count
        assert CloudUser.objects.filter(id__in=cloud_users_id).count() == self.gen_count
        group.delete()
        assert OrganizationToUser.objects.filter(system_group_id=group_id).count() == 0
        assert OrganizationToUser.objects.filter(user_id__in=cloud_users_id).count() == 0
        assert CloudUser.objects.filter(id__in=cloud_users_id).count() == self.gen_count

    def test_delete_move_children_to_organization(self):
        group = self.groups.pop(0)
        group_systems = group.cloud_systems.all()
        group_id = group.id
        group.delete()
        for group in SystemGroup.objects.all():
            assert group.parent_id != group_id
            assert group_id not in group.path
        for system in CloudSystemId.objects.all():
            assert system.system_group_id != group_id
            assert group_id not in system.path
        for system in group_systems:
            system.refresh_from_db()
            assert system.system_group_id is None
            assert system.path[0] == self.org.id
        self.group_0_0.refresh_from_db()
        assert self.group_0_0.parent is None
        assert self.group_0_0.path[0] == self.org.id
        system = self.group_0_0.cloud_systems.first()
        assert system.system_group == self.group_0_0
        assert system.path[0] == self.group_0_0.id
        assert system.path[1] == self.org.id
        self.group_0_0_0.refresh_from_db()
        assert self.group_0_0_0.parent == self.group_0_0
        assert self.group_0_0_0.path[0] == self.group_0_0.id
        assert self.group_0_0_0.path[1] == self.org.id
        system = self.group_0_0_0.cloud_systems.first()
        assert system.system_group == self.group_0_0_0
        assert system.path[0] == self.group_0_0_0.id
        assert system.path[1] == self.group_0_0.id
        assert system.path[2] == self.org.id

    def test_delete_move_children_to_parent(self):
        group = self.groups.pop(1)
        group_systems = list(group.cloud_systems.all())
        group_id = group.id
        group.delete()
        for group in SystemGroup.objects.all():
            assert group.parent_id != group_id
            assert group_id not in group.path
        for system in CloudSystemId.objects.all():
            assert system.system_group_id != group_id
            assert group_id not in system.path
        for system in group_systems:
            system.refresh_from_db()
            assert system.system_group_id == self.group_0.id
            assert system.path[0] == self.group_0.id
            assert system.path[1] == self.org.id
        self.group_0_0_0.refresh_from_db()
        assert self.group_0_0_0.parent == self.group_0
        assert self.group_0_0_0.path[0] == self.group_0.id
        assert self.group_0_0_0.path[1] == self.org.id
        system = self.group_0_0_0.cloud_systems.first()
        assert system.system_group == self.group_0_0_0
        assert system.path[0] == self.group_0_0_0.id
        assert system.path[1] == self.group_0.id
        assert system.path[2] == self.org.id

    def test_delete_move_system_counters(self):
        for group in self.groups:
            assert group.system_count > 0
        assert self.org.system_count > 0
        self.group_0_0.delete()
        assert caches['default'].get(organization_system_count(self.org.id)) is None
        assert caches['default'].get(cache_key_cloud_system_group_children_count(self.group_0.id)) is None
        assert caches['default'].get(cache_key_cloud_system_group_children_count(self.group_0_0.id)) is None
        for group in self.groups[2:]:
            key = cache_key_cloud_system_group_children_count(group.id)
            assert caches['default'].get(key) > 0

    def test_save_without_changes(self, mocker):
        spy_move_children = mocker.spy(SystemGroup, 'move_children')
        for group in self.groups:
            group.save()
        self.check_groups_path()
        self.check_systems_path()
        assert spy_move_children.call_count == 0

    def test_save_move_to_group(self, mocker, sys_group_user_factory):
        spy_move_children = mocker.spy(SystemGroup, 'move_children')
        users = [
            rel.user for rel in
            OrganizationToUser.objects.filter(organization=self.org, system_group_id__isnull=False).all()
        ]
        users_0_0 = [rel.user for rel in self.group_0_0.organizationtouser_set.all()]
        users_0_0_0 = [rel.user for rel in self.group_0_0_0.organizationtouser_set.all()]
        rels_1_1 = [
            sys_group_user_factory(organization=self.org, group=self.group_1_1, cloud_user=user)
            for user in users_0_0
        ]
        rels_1 = [
            sys_group_user_factory(organization=self.org, group=self.group_1, cloud_user=user)
            for user in users_0_0_0
        ]
        self.group_0_0.parent = self.group_1_1
        self.group_0_0.save()
        self.check_groups_path()
        self.check_systems_path()
        self.group_0_0.refresh_from_db()
        assert self.group_0_0.path[0] == self.group_1_1.id
        assert spy_move_children.call_count == 1
        for user in users_0_0:
            assert OrganizationToUser.objects.filter(user=user).count() == 1
        for user in users_0_0:
            # check higher group membership exists
            assert OrganizationToUser.objects.filter(user=user, system_group=self.group_1_1).exists()
            # check lower group membership deleted
            assert OrganizationToUser.objects.filter(user=user, system_group=self.group_0_0).exists() is False
        for user in users_0_0_0:
            # check higher group membership exists
            assert OrganizationToUser.objects.filter(user=user, system_group=self.group_1).exists()
            # check lower group membership deleted
            assert OrganizationToUser.objects.filter(user=user, system_group=self.group_0_0_0).exists() is False

    def test_save_move_to_org(self):
        self.group_0_0.parent = None
        self.group_0_0.save()
        self.check_groups_path()
        self.check_systems_path()
        self.group_0_0.refresh_from_db()
        assert self.group_0_0.path[0] == self.org.id

    def test_system_counters_invalidation(self):
        for group in self.groups:
            assert group.system_count >= 0

        for group in self.org.groups.all():
            cache_key: str = cache_key_cloud_system_group_children_count(group.id)
            assert caches['default'].get(cache_key) >= 0

        self.group_0_0.parent = None
        self.group_0_0.save()

        for group in self.org.groups.all():
            cache_key: str = cache_key_cloud_system_group_children_count(group.id)
            assert caches['default'].get(cache_key) is None
