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
