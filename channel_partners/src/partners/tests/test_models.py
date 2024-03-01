from datetime import timedelta
from unittest import mock
from uuid import uuid4

import pytest
from django.core.cache import caches
from django.utils import timezone

from partners.models import (
    ChannelPartner,
    ChannelPartnerEvent,
    ChannelPartnerService,
    ChannelPartnerStates,
    ChannelPartnerToUser,
    CloudSystemId,
    Organization,
    OrganizationPermissions,
    OrganizationRoles,
    OrganizationToUser,
    ServiceUsage,
    SystemGroup,
    VmsRoles,
)
from partners.utils.cache_keys import (
    cache_key_cloud_system_group_children_count,
    organization_system_count,
)


class TestChannelPartnerEvent:
    def test_new_event(self, cloud_test_host, channel_partner_factory, organization_factory,
                    system_factory, cp_service_factory, service_record_factory):
        cp = channel_partner_factory()
        org = organization_factory(channel_partner=cp)
        service = cp_service_factory(channel_partner=cp)
        system = system_factory(organization=org)
        service_record_factory(service=service, cloud_system=system, organization=organization_factory)

        ChannelPartnerEvent.new_event(ChannelPartnerEvent.SYSTEM_UPDATED, system=system, service=None)
        assert ChannelPartnerEvent.objects.filter(service=None, cloud_system=system).count() == 1
        assert ChannelPartnerEvent.objects.filter(service=None, cloud_system=system).first().cloud_host == cloud_test_host
        ChannelPartnerEvent.new_event(ChannelPartnerEvent.SYSTEM_UPDATED, system=system, service=None)
        assert ChannelPartnerEvent.objects.filter(service=None, cloud_system=system).count() == 1

        ChannelPartnerEvent.new_event(ChannelPartnerEvent.SERVICE_CHANGED, system=None, service=service)
        assert ChannelPartnerEvent.objects.filter(service=service, cloud_system=None).count() == 1
        assert ChannelPartnerEvent.objects.filter(service=service,
                                                  cloud_system=None).first().cloud_host == cloud_test_host
        ChannelPartnerEvent.new_event(ChannelPartnerEvent.SERVICE_CHANGED, system=None, service=service)
        assert ChannelPartnerEvent.objects.filter(service=service, cloud_system=None).count() == 1

class TestChannelPartner:
    def test_create(self, cloud_test_host, channel_partner_factory):
        root = channel_partner_factory()
        partner = ChannelPartner.objects.create(
            name=f'{uuid4()}',
            parent_channel_partner=root,
            cloud_host=cloud_test_host
        )
        assert partner.id
        assert partner.cloud_host == cloud_test_host

        sub_partner = ChannelPartner.objects.create(
            name=f'{uuid4()}',
            parent_channel_partner=partner,
        )
        assert sub_partner.id
        assert sub_partner.cloud_host == cloud_test_host

    def test_get_ancestors(self, channel_partner_factory, root_nx_channel_partner):
        count = 10
        partners = []
        parent = None
        for _ in range(count):
            parent = channel_partner_factory(parent_channel_partner=parent)
            partners.append(parent)

        ancestors = ChannelPartner.get_ancestors(successor_id=partners[4].id)

        assert ancestors.count() == 4 + 1 # 4 channel partners and root nx channel partner
        partners_ids = [channel_partner.id for channel_partner in ancestors]
        assert set(partners_ids) == set([p.id for p in partners[:4] + [root_nx_channel_partner]])

    def test_get_successors(self, channel_partner_factory):
        count = 10
        partners = []
        parent = None
        for _ in range(count):
            parent = channel_partner_factory(parent_channel_partner=parent)
            partners.append(parent)

        successors = ChannelPartner.get_successors(ancestor_id=partners[5].id)

        assert successors.count() == 5
        partners_ids = [channel_partner.id for channel_partner in successors]
        assert set(partners_ids) == set([p.id for p in partners[5:]])

        successors = ChannelPartner.get_successors(ancestor_id=partners[5].id, include_ancestor=False)

        assert successors.count() == 4
        partners_ids = [channel_partner.id for channel_partner in successors]
        assert set(partners_ids) == set([p.id for p in partners[6:]])
        assert set(partners_ids) == {cp.id for cp in partners[5].successors()}

    def test_get_direct_children_count(self, channel_partner_factory):
        parent = channel_partner_factory()

        # Create some children for the parent
        child1 = channel_partner_factory(parent_channel_partner=parent)
        child2 = channel_partner_factory(parent_channel_partner=parent)
        child3 = channel_partner_factory(parent_channel_partner=parent)

        # Test the method with the parent
        assert ChannelPartner.get_direct_channel_partner_children_count(parent) == 3

        # Create a grandchild for one of the children
        grandchild = channel_partner_factory(parent_channel_partner=child1)

        # Test the method with the parent again, it should still return 3
        assert ChannelPartner.get_direct_channel_partner_children_count(parent) == 3

        # Test the method with the child that has a grandchild, it should return 1
        assert ChannelPartner.get_direct_channel_partner_children_count(child1) == 1

    def test_get_direct_children_count_cache(self, channel_partner_factory):
        parent = channel_partner_factory()

        # Create some children for the parent
        child1 = channel_partner_factory(parent_channel_partner=parent)
        child2 = channel_partner_factory(parent_channel_partner=parent)
        child3 = channel_partner_factory(parent_channel_partner=parent)

        # Test the method with the parent, it should return 3 and cache the result
        assert ChannelPartner.get_direct_channel_partner_children_count(parent) == 3
        cached_result = caches['default'].get(f'cp_direct_children-count-{str(parent.id)}')
        assert cached_result == 3

        # Test the method with the parent again, it should return 3 and not hit the database
        with mock.patch.object(ChannelPartner.objects, 'filter', wraps=ChannelPartner.objects.filter) as filter_mock:
            assert ChannelPartner.get_direct_channel_partner_children_count(parent) == 3
            filter_mock.assert_not_called()  # The database should not be hit again

        # Create a grandchild for one of the children and test the method with the parent again
        grandchild = channel_partner_factory(parent_channel_partner=child1)
        assert ChannelPartner.get_direct_channel_partner_children_count(parent) == 3

        # The cached result should be updated
        cached_result = caches['default'].get(f'cp_direct_children-count-{str(parent.id)}')
        assert cached_result == 3

    def test_get_direct_children_count_cache_flow(self, channel_partner_factory):
        # Create a parent ChannelPartner
        parent = channel_partner_factory()

        cache_key: str = f'cp_direct_children-count-{str(parent.id)}'

        # Check that the cache is initially empty for this parent
        assert caches['default'].get(cache_key) is None

        # Call get_direct_children_count for the first time, it should return 0 and cache the result
        ChannelPartner.get_direct_channel_partner_children_count(parent)
        assert caches['default'].get(cache_key) == 0

        # Create a child for the parent
        child1 = channel_partner_factory(parent_channel_partner=parent)

        # The cache should be invalidated now, so it should return None
        assert caches['default'].get(cache_key) is None

        # Call get_direct_children_count again, it should return 1 and cache the result
        ChannelPartner.get_direct_channel_partner_children_count(parent)
        assert caches['default'].get(cache_key) == 1

    def test_get_direct_organization_children_count(self, channel_partner_factory, organization_factory):
        cp = channel_partner_factory()

        # Create some organizations for the ChannelPartner
        org1 = organization_factory(channel_partner=cp)
        org2 = organization_factory(channel_partner=cp)
        org3 = organization_factory(channel_partner=cp)

        # Test the method with the ChannelPartner, it should return 3
        assert ChannelPartner.get_direct_organization_children_count(cp) == 3
    def test_get_direct_organization_children_count_cache(self, channel_partner_factory, organization_factory):
        cp = channel_partner_factory()
        cache_key = f'direct_organization_children_count_{str(cp.id)}'

        # Create some organizations for the ChannelPartner
        org1 = organization_factory(channel_partner=cp)
        org2 = organization_factory(channel_partner=cp)
        org3 = organization_factory(channel_partner=cp)

        # Test the method with the ChannelPartner, it should return 3
        assert ChannelPartner.get_direct_organization_children_count(cp) == 3
        cached_result = caches['default'].get(cache_key)
        assert cached_result == 3

        # Test the method with the parent again, it should return 3 and not hit the database
        with mock.patch.object(Organization.objects, 'filter', wraps=Organization.objects.filter) as filter_mock:
            assert ChannelPartner.get_direct_organization_children_count(cp) == 3
            filter_mock.assert_not_called()  # The database should not be hit again

        # Create another Organization that has the same ChannelPartner
        org4 = organization_factory(channel_partner=cp)
        assert ChannelPartner.get_direct_organization_children_count(cp) == 4

        # The Cache should be updated
        cached_result = caches['default'].get(cache_key)
        assert cached_result == 4

    def test_get_direct_organization_children_count_cache_flow(self, channel_partner_factory, organization_factory):
        cp = channel_partner_factory()
        cache_key = f'direct_organization_children_count_{str(cp.id)}'
        # Check that the cache is initially empty
        assert caches['default'].get(cache_key) is None
        # Call for the first time, it should return 0 and cache the result
        assert ChannelPartner.get_direct_organization_children_count(cp) == 0
        # Create an association
        org1 = organization_factory(channel_partner=cp)
        # Cache should be None
        assert caches['default'].get(cache_key) is None
        # Cache should now be 1
        assert ChannelPartner.get_direct_organization_children_count(cp) == 1
        assert caches['default'].get(cache_key) == 1

    def test_can_modify_organization_service_quantities(self, channel_partner_factory, cp_user_factory):
        root = channel_partner_factory(parent_channel_partner=None)
        child = channel_partner_factory(parent_channel_partner=root)
        root_user = cp_user_factory(channel_partner=root)
        child_user = cp_user_factory(channel_partner=child)
        assert root.can_modify_organization_service_quantities(root_user.user) is True
        assert child.can_modify_organization_service_quantities(child_user.user) is True
        assert root.can_modify_organization_service_quantities(child_user.user) is False
        assert child.can_modify_organization_service_quantities(root_user.user) is False


    def test_calculate_monthly_changes(self, channel_partner_factory, organization_factory, system_factory,
                                       cp_service_factory, service_record_factory):
        root_cp = channel_partner_factory(parent_channel_partner=None)
        cp = channel_partner_factory(parent_channel_partner=root_cp)
        sub_cp = channel_partner_factory(parent_channel_partner=cp)
        cp_orgs = [organization_factory(channel_partner=cp) for _ in range(3)]
        sub_cp_orgs = [organization_factory(channel_partner=sub_cp) for _ in range(3)]
        systems = []
        cp_services = [cp_service_factory(channel_partner=cp, service_type=tid)
                       for tid, tname in ChannelPartnerService.SERVICE_TYPES]
        sub_cp_services = [cp_service_factory(channel_partner=sub_cp, parent_service=service, service_type=service.type)
                           for service in cp_services]
        for org in cp_orgs:
            for state in [ChannelPartnerStates.SHUTDOWN, ChannelPartnerStates.SUSPENDED, ChannelPartnerStates.ACTIVE]:
                sys = system_factory(organization=org, state=state)
                for service in cp_services:
                    systems.append(sys)
                    service_record_factory(service=service, cloud_system=sys)

        for org in sub_cp_orgs:
            for state in [ChannelPartnerStates.SHUTDOWN, ChannelPartnerStates.SUSPENDED, ChannelPartnerStates.ACTIVE]:
                sys = system_factory(organization=org, state=state)
                systems.append(sys)
                for service in sub_cp_services:
                    service_record_factory(service=service, cloud_system=sys)
                    old_record = service_record_factory(service=service, cloud_system=sys, quantity=1)
                    old_record.created_ts = old_record.created_ts - timedelta(days=40)
                    old_record.save()
        changes = sub_cp.calculate_monthly_changes(use_cache=False)

        for tid, tname in ChannelPartnerService.SERVICE_TYPES:
            assert changes[tid] == len(sub_cp_orgs) * 2

        changes = cp.calculate_monthly_changes(use_cache=False)

        for tid, tname in ChannelPartnerService.SERVICE_TYPES:
            assert changes[tid] == len(sub_cp_orgs) * 2 * 2


class TestChannelPartnerAttributes:
    @pytest.fixture(autouse=True)
    def setUp(self, channel_partner_factory):
        self.channel_partner = channel_partner_factory(parent_channel_partner=None)

    def test_set_attributes(self):
        attributes = {'key1': 'value1', 'key2': 'value2'}
        self.channel_partner.set_attributes(attributes)
        self.channel_partner.refresh_from_db()
        assert self.channel_partner.attributes == attributes

        partial_attributes = {'key1': 'new_value1', 'key3': 'value3'}
        self.channel_partner.set_attributes(partial_attributes, partial=True)
        self.channel_partner.refresh_from_db()
        assert self.channel_partner.attributes == {'key1': 'new_value1', 'key2': 'value2', 'key3': 'value3'}

        self.channel_partner.set_attributes({'key2': '*unset*'}, partial=True)
        self.channel_partner.refresh_from_db()
        assert self.channel_partner.attributes == {'key1': 'new_value1', 'key3': 'value3'}


class TestChannelPartnerCanAccess:
    @pytest.fixture(autouse=True)
    def setUp(self, channel_partner_factory, organization_factory, cp_user_factory):
        # Channel Partner
        self.cp_root: ChannelPartner = channel_partner_factory(
            parent_channel_partner=None,
            name="Root CP")
        self.cp_child_lvl1: ChannelPartner = channel_partner_factory(
            parent_channel_partner=
            self.cp_root,
            name="Child CP - lvl1")
        self.cp_child_lvl2: ChannelPartner = channel_partner_factory(
            parent_channel_partner=self.cp_child_lvl1,
            name="Child CP - lvl2")

        # Users & Assignments
        self.cptu_root: ChannelPartnerToUser = cp_user_factory(
            email="root@example.com",
            channel_partner=self.cp_root)
        self.cptu_child: ChannelPartnerToUser = cp_user_factory(
            email="child@example.com",
            channel_partner=self.cp_child_lvl1)
        self.cptu_unrelated: ChannelPartnerToUser = cp_user_factory(
            email="unrelated@example.com")

        # Organization
        self.org_lvl1: Organization = organization_factory(
            name="Child Org - lvl1",
            channel_partner=self.cp_child_lvl1)

    def test_user_can_access_own_channel_partner(self):
        assert self.cp_root.can_access(self.cptu_root.user)
        assert self.cp_child_lvl1.can_access(self.cptu_child.user)

    def test_user_can_access_descendant_channel_partner(self):
        assert self.cp_child_lvl1.can_access(self.cptu_root.user)

    def test_user_cannot_access_ancestor_channel_partner(self):
        assert not self.cp_root.can_access(self.cptu_child.user)

    def test_unrelated_user_cannot_access_channel_partner(self):
        assert not self.cp_root.can_access(self.cptu_unrelated.user)
        assert not self.cp_child_lvl1.can_access(self.cptu_unrelated.user)

    def test_user_can_access_via_organization(self):
        OrganizationToUser.objects.create(organization=self.org_lvl1, user=self.cptu_child.user)
        assert self.cp_child_lvl1.can_access(self.cptu_root.user)


class TestOrganization:

    def test_current_services(self, default_channel_partner, organization_factory, system_factory,
                              cp_service_factory, org_service_factory, service_record_factory):
        org = organization_factory()
        systems = [system_factory(organization=org) for _ in range(5)]
        systems[4].state = ChannelPartnerStates.SUSPENDED
        systems[4].save()
        disabled_system = system_factory(organization=org)
        services = [cp_service_factory() for _ in range(3)]
        org_service_properties = [org_service_factory(organization=org, service=service, price=10-i) for i, service in enumerate(services)]
        service_records = []
        for i, service in enumerate(services):
            service_records += [service_record_factory(service, sys, quantity=1+i) for sys in systems[i:]]
            service_record_factory(service, disabled_system)
        disabled_system.state = ChannelPartnerStates.SHUTDOWN
        disabled_system.save()
        current_services = org.current_services()

        assert set(current_services.keys()) == set([str(service.id) for service in services])
        for i, service in enumerate(services):
            assert current_services[str(service.id)]["price"] == 10 - i
            assert current_services[str(service.id)]["quantity"] == (1 + i) * (len(systems) - i)
            assert current_services[str(service.id)]["total"] == (1 + i) * (10 - i) * (len(systems) - i)


    def test_has_perm(self, channel_partner_factory, cp_user_factory, organization_factory):
        cp = channel_partner_factory()
        admin = cp_user_factory(channel_partner=cp)
        org = organization_factory(channel_partner=cp)

        # test ORGANIZATION_ADMINISTRATOR

        assert org.channel_partner_access_level_id == OrganizationRoles.ORGANIZATION_ADMINISTRATOR
        assert org.has_perm(admin.user, OrganizationPermissions.manage_users) is True
        assert org.has_perm(admin.user, OrganizationPermissions.manage_systems) is True
        assert org.has_perm(admin.user, OrganizationPermissions.configure_organization) is True
        assert org.has_perm(admin.user, OrganizationPermissions.access_systems) is True
        assert org.has_perm(admin.user, OrganizationPermissions.view_service_reports) is True
        assert org.has_perm(admin.user, OrganizationPermissions.view_health_monitoring) is True

        #  test SYSTEM_HEALTH_VIEWER
        org.channel_partner_access_level_id = OrganizationRoles.SYSTEM_HEALTH_VIEWER
        org.save()
        assert org.has_perm(admin.user, OrganizationPermissions.manage_users) is False
        assert org.has_perm(admin.user, OrganizationPermissions.manage_systems) is False
        assert org.has_perm(admin.user, OrganizationPermissions.configure_organization) is False
        assert org.has_perm(admin.user, OrganizationPermissions.view_service_reports) is False
        assert org.has_perm(admin.user, OrganizationPermissions.access_systems) is True
        assert org.has_perm(admin.user, OrganizationPermissions.view_health_monitoring) is True

        #  test SYSTEM_HEALTH_VIEWER.
        org.channel_partner_access_level_id = OrganizationRoles.SYSTEM_HEALTH_VIEWER
        org.save()
        assert org.has_perm(admin.user, OrganizationPermissions.manage_users) is False
        assert org.has_perm(admin.user, OrganizationPermissions.manage_systems) is False
        assert org.has_perm(admin.user, OrganizationPermissions.configure_organization) is False
        assert org.has_perm(admin.user, OrganizationPermissions.view_service_reports) is False
        assert org.has_perm(admin.user, OrganizationPermissions.access_systems) is True
        assert org.has_perm(admin.user, OrganizationPermissions.view_health_monitoring) is True

    def test_get_groups_structure_for_user(self, channel_partner_factory, cp_user_factory, organization_factory, org_user_factory,
                    system_group_factory, sys_group_user_factory, system_factory, arf, mock_auth_with_user):
        root = channel_partner_factory()
        cp = channel_partner_factory(parent_channel_partner=root)
        cp_user = cp_user_factory(channel_partner=cp)
        org = organization_factory(channel_partner=cp)

        def creat_groups(organization, degree=3):
            groups = [[system_group_factory(organization=organization) for _ in range(degree)]]
            for level in range(degree):
                siblings = []
                for group in groups[level]:
                    for _ in range(degree):
                        siblings.append(system_group_factory(organization=organization, parent=group))
                groups.append(siblings)
            return groups

        org_groups = creat_groups(organization=org)

        single_group_user = sys_group_user_factory(organization=org, group=org_groups[-1][-1])

        single_group_structure = org.get_groups_structure_for_user(single_group_user.user)

        assert len(single_group_structure) == 1
        assert single_group_structure[0]['id'] == org_groups[-1][-1].id

        one_sublevel_user = sys_group_user_factory(organization=org, group=org_groups[-2][-1])

        one_sublevel_struct = org.get_groups_structure_for_user(one_sublevel_user.user)

        assert len(one_sublevel_struct) == 1
        assert one_sublevel_struct[0]['id'] == org_groups[-2][-1].id
        assert len(one_sublevel_struct[0]['children']) == 3

        combo_user = sys_group_user_factory(organization=org, group=org_groups[1][0])
        sys_group_user_factory(organization=org, group=org_groups[-2][-1], cloud_user=combo_user.user)
        combo_struct = org.get_groups_structure_for_user(combo_user.user)
        assert len(combo_struct) == 2
        assert combo_struct[1]['id'] == org_groups[-2][-1].id
        assert len(combo_struct[1]['children']) == 3
        assert len(combo_struct[1]['children'][0]['children']) == 0
        assert combo_struct[0]['id'] == org_groups[1][0].id
        assert len(combo_struct[0]['children']) == 3
        assert len(combo_struct[0]['children'][0]['children']) == 3
        assert all(g['id'] in (SystemGroup.objects
                               .filter(parent__parent=org_groups[1][0]).values_list('id', flat=True))
                   for g in combo_struct[0]['children'][0]['children'])
        assert len(combo_struct[0]['children'][0]['children'][0]['children']) == 0

        def check_all(children, parent_id=None):
            parent_children = (SystemGroup.objects
                                .filter(parent=parent_id, organization=org).values_list('id', flat=True))
            cnt = 1 if parent_id else 0
            for group in children:
                assert group['parent_id'] == parent_id
                assert group['id'] in parent_children
                cnt += check_all(group['children'], group['id'])
            return cnt

        org_user = org_user_factory(organization=org)
        org_struct = org.get_groups_structure_for_user(org_user.user)
        assert len(org_struct) == 3
        assert len(org_struct[0]['children']) == 3
        assert len(org_struct[0]['children'][0]['children']) == 3
        assert len(org_struct[0]['children'][0]['children'][0]['children']) == 3
        assert len(org_struct[0]['children'][0]['children'][0]['children'][0]['children']) == 0
        count = check_all(org_struct)
        assert count == SystemGroup.objects.filter(organization=org).count()

        org_struct = org.get_groups_structure_for_user(cp_user.user)
        assert len(org_struct) == 3
        assert len(org_struct[0]['children']) == 3
        assert len(org_struct[0]['children'][0]['children']) == 3
        assert len(org_struct[0]['children'][0]['children'][0]['children']) == 3
        assert len(org_struct[0]['children'][0]['children'][0]['children'][0]['children']) == 0
        check_all(org_struct)
        assert count == SystemGroup.objects.filter(organization=org).count()

    def test_system_count(self, channel_partner_factory, organization_factory,
                          system_group_factory, system_factory):

        cp = channel_partner_factory()
        org = organization_factory(channel_partner=cp)
        system_group = system_group_factory(organization=org)
        org_system = system_factory(organization=org)
        group_system = system_factory(organization=org, system_group=system_group)
        cache_key = organization_system_count(org.id)
        assert org.system_count == 2
        assert caches['default'].get(cache_key) == 2
        group_system.disconnect_system()
        assert caches['default'].get(cache_key) is None
        assert org.system_count == 1
        assert caches['default'].get(cache_key) == 1
        org_system.disconnect_system()
        assert caches['default'].get(cache_key) is None
        assert org.system_count == 0
        assert caches['default'].get(cache_key) == 0



class TestEffectiveStates:

    @pytest.fixture(autouse=True, scope='function')
    def setup(self, channel_partner_factory, organization_factory, system_factory,
              cp_service_factory, service_record_factory):
        self.degree = 2
        depth = 3

        def gen_from_cp(parent, cur_depth=0):
            if (cur_depth := cur_depth+1) > depth:
                return
            for _ in range(self.degree):
                child = channel_partner_factory(parent_channel_partner=parent)
                gen_from_cp(child, cur_depth=cur_depth)

        self.root: ChannelPartner = channel_partner_factory()
        self.unchanged_parent: ChannelPartner = channel_partner_factory(parent_channel_partner=self.root)
        gen_from_cp(self.unchanged_parent, cur_depth=0)
        self.changed_parent: ChannelPartner = channel_partner_factory(parent_channel_partner=self.root)
        gen_from_cp(self.changed_parent, cur_depth=0)
        self.services = [cp_service_factory(channel_partner=self.root) for _ in range(self.degree)]
        for cp in ChannelPartner.get_successors(self.root.id):
            orgs = [organization_factory(channel_partner=cp) for _ in range(self.degree)]
            for org in orgs:
                for _ in range(self.degree):
                    system = system_factory(organization=org)
                    self.last_system = system
                    for service in self.services:
                        service_record_factory(service=service, cloud_system=system)

        self.changed_organizations = Organization.objects.filter(
            channel_partner__in=ChannelPartner.get_successors(self.changed_parent.id, include_ancestor=False))
        self.last_system = (CloudSystemId.objects.filter(organization__in=self.changed_organizations).last())

    def ensure_unchanged(self):
        unchanged_tree = ChannelPartner.get_successors(self.unchanged_parent.id)
        for cp in unchanged_tree:
            assert cp.state == ChannelPartnerStates.ACTIVE
            assert cp.effective_state == ChannelPartnerStates.ACTIVE
            for org in cp.organizations.all():
                assert org.state == ChannelPartnerStates.ACTIVE
                assert org.effective_state == ChannelPartnerStates.ACTIVE
                for sys in org.cloud_systems.all():
                    assert sys.state == ChannelPartnerStates.ACTIVE
                    assert sys.effective_state == ChannelPartnerStates.ACTIVE

    def test_initial_tree(self):
        tree = ChannelPartner.get_successors(self.root.id)
        for cp in tree:
            assert cp.organizations.count() == self.degree
            for org in cp.organizations.all():
                assert org.cloud_systems.count() == self.degree

    def test_suspend_with_all_active(self):
        self.changed_parent.state = ChannelPartnerStates.SUSPENDED
        self.changed_parent.save()
        assert self.changed_parent.effective_state == ChannelPartnerStates.SUSPENDED
        tree = ChannelPartner.get_successors(self.changed_parent.id)
        for cp in tree:
            if cp == self.changed_parent:
                assert cp.state == ChannelPartnerStates.SUSPENDED
            else:
                assert cp.state == ChannelPartnerStates.ACTIVE
            assert cp.effective_state == ChannelPartnerStates.SUSPENDED
            for org in cp.organizations.all():
                assert org.state == ChannelPartnerStates.ACTIVE
                assert org.effective_state == ChannelPartnerStates.SUSPENDED
                for sys in org.cloud_systems.all():
                    assert sys.state == ChannelPartnerStates.ACTIVE
                    assert sys.effective_state == ChannelPartnerStates.SUSPENDED
        self.ensure_unchanged()

    def test_shutdown_with_all_active(self):
        assert self.last_system.service_records.count() == self.degree
        self.changed_parent.state = ChannelPartnerStates.SHUTDOWN
        self.changed_parent.save()
        assert self.changed_parent.effective_state == ChannelPartnerStates.SHUTDOWN
        tree = ChannelPartner.get_successors(self.changed_parent.id)
        for cp in tree:
            if cp == self.changed_parent:
                assert cp.state == ChannelPartnerStates.SHUTDOWN
            else:
                assert cp.state == ChannelPartnerStates.ACTIVE
            assert cp.effective_state == ChannelPartnerStates.SHUTDOWN
            for org in cp.organizations.all():
                assert org.state == ChannelPartnerStates.ACTIVE
                assert org.effective_state == ChannelPartnerStates.SHUTDOWN
                for sys in org.cloud_systems.all():
                    assert sys.state == ChannelPartnerStates.ACTIVE
                    assert sys.effective_state == ChannelPartnerStates.SHUTDOWN
        self.ensure_unchanged()

        assert self.last_system.service_records.count() == self.degree * 2
        last_sys_current_services = self.last_system.calculate_current_services()['services']
        assert len(last_sys_current_services) == self.degree
        for service, usage in last_sys_current_services.items():
            assert usage['quantity'] == 0

    def test_system_states(self):
        # Test SUSPENDED
        assert self.last_system.service_records.count() == self.degree
        self.last_system.state = ChannelPartnerStates.SUSPENDED
        self.last_system.save()
        self.last_system.refresh_from_db()
        assert self.last_system.effective_state == ChannelPartnerStates.SUSPENDED
        assert self.last_system.service_records.count() == self.degree
        # Test SHUTDOWN
        self.last_system.state = ChannelPartnerStates.SHUTDOWN
        self.last_system.save()
        self.last_system.refresh_from_db()
        assert self.last_system.service_records.count() == self.degree * 2
        last_sys_current_services = self.last_system.calculate_current_services()['services']
        assert len(last_sys_current_services) == self.degree
        for service, usage in last_sys_current_services.items():
            assert usage['quantity'] == 0
        self.ensure_unchanged()

    def test_organization_states(self):
        last_org = self.last_system.organization
        suspended_system = self.last_system.organization.cloud_systems.last()
        shutdown_system = self.last_system.organization.cloud_systems.first()
        assert suspended_system.id != shutdown_system.id
        assert suspended_system.organization_id == shutdown_system.organization_id
        assert suspended_system.service_records.count() == self.degree
        assert shutdown_system.service_records.count() == self.degree
        suspended_system.state = ChannelPartnerStates.SUSPENDED
        suspended_system.save()
        shutdown_system.state = ChannelPartnerStates.SHUTDOWN
        shutdown_system.save()
        suspended_system.refresh_from_db()
        shutdown_system.refresh_from_db()
        assert suspended_system.effective_state == ChannelPartnerStates.SUSPENDED
        assert shutdown_system.effective_state == ChannelPartnerStates.SHUTDOWN
        assert suspended_system.service_records.count() == self.degree
        assert shutdown_system.service_records.count() == self.degree * 2

        # Test suspended
        last_org.state = ChannelPartnerStates.SUSPENDED
        last_org.save()
        last_org.refresh_from_db()
        suspended_system.refresh_from_db()
        shutdown_system.refresh_from_db()
        assert last_org.effective_state == ChannelPartnerStates.SUSPENDED
        assert suspended_system.effective_state == ChannelPartnerStates.SUSPENDED
        assert shutdown_system.effective_state == ChannelPartnerStates.SHUTDOWN
        assert suspended_system.service_records.count() == self.degree
        assert shutdown_system.service_records.count() == self.degree * 2

        # Test shurdown

        last_org.state = ChannelPartnerStates.SHUTDOWN
        last_org.save()
        last_org.refresh_from_db()
        suspended_system.refresh_from_db()
        shutdown_system.refresh_from_db()
        assert last_org.effective_state == ChannelPartnerStates.SHUTDOWN
        assert suspended_system.effective_state == ChannelPartnerStates.SHUTDOWN
        assert shutdown_system.effective_state == ChannelPartnerStates.SHUTDOWN
        assert suspended_system.service_records.count() == self.degree * 2
        assert shutdown_system.service_records.count() == self.degree * 2
        self.ensure_unchanged()

    def test_partners_states(self):
        first_org = self.changed_parent.organizations.first()
        last_org = self.last_system.organization
        first_org.state = ChannelPartnerStates.SUSPENDED
        first_org.save()
        last_org.state = ChannelPartnerStates.SHUTDOWN
        last_org.save()
        first_org.refresh_from_db()
        last_org.refresh_from_db()
        assert first_org.effective_state == ChannelPartnerStates.SUSPENDED
        assert last_org.effective_state == ChannelPartnerStates.SHUTDOWN

        self.changed_parent.state = ChannelPartnerStates.SUSPENDED
        self.changed_parent.save()

        self.changed_parent.refresh_from_db()
        first_org.refresh_from_db()
        last_org.refresh_from_db()
        assert self.changed_parent.effective_state == ChannelPartnerStates.SUSPENDED
        assert first_org.effective_state == ChannelPartnerStates.SUSPENDED
        assert last_org.effective_state == ChannelPartnerStates.SHUTDOWN
        assert first_org.cloud_systems.first().service_records.count() == self.degree
        assert last_org.cloud_systems.first().service_records.count() == self.degree * 2
        assert first_org.cloud_systems.first().effective_state == ChannelPartnerStates.SUSPENDED
        assert last_org.cloud_systems.first().effective_state == ChannelPartnerStates.SHUTDOWN

        self.changed_parent.state = ChannelPartnerStates.SHUTDOWN
        self.changed_parent.save()
        self.changed_parent.refresh_from_db()
        first_org.refresh_from_db()
        last_org.refresh_from_db()
        assert self.changed_parent.effective_state == ChannelPartnerStates.SHUTDOWN
        assert first_org.effective_state == ChannelPartnerStates.SHUTDOWN
        assert last_org.effective_state == ChannelPartnerStates.SHUTDOWN
        assert first_org.cloud_systems.first().service_records.count() == self.degree * 2
        assert last_org.cloud_systems.first().service_records.count() == self.degree * 2
        assert first_org.cloud_systems.first().effective_state == ChannelPartnerStates.SHUTDOWN
        assert last_org.cloud_systems.first().effective_state == ChannelPartnerStates.SHUTDOWN
        self.ensure_unchanged()


class TestSystemGroup:

    @pytest.fixture(autouse=True)
    def setup(self, organization_factory, system_group_factory,
              sys_group_user_factory, cloud_user_factory, system_factory):
        self.organization = organization_factory()
        self.user = cloud_user_factory()
        groups = []
        self.group_0 = system_group_factory(organization=self.organization)
        groups.append(self.group_0)
        self.group_1 = system_group_factory(organization=self.organization)
        groups.append(self.group_1)
        self.group_0_0 = system_group_factory(organization=self.organization, parent=self.group_0)
        groups.append(self.group_0_0)
        self.group_1_0 = system_group_factory(organization=self.organization, parent=self.group_1)
        self.group_0_1 = system_group_factory(organization=self.organization, parent=self.group_0)
        groups.append(self.group_0_1)
        self.group_1_1 = system_group_factory(organization=self.organization, parent=self.group_1)
        self.rel_0_0 = sys_group_user_factory(organization=self.organization,
                                              group=self.group_0_0, cloud_user=self.user)
        self.rel_1_1 = sys_group_user_factory(organization=self.organization,
                                              group=self.group_1_1, cloud_user=self.user)
        for group in groups:
            system_factory(organization=self.organization, system_group=group)


    def test_has_overlap(self):
        has_overlap = self.group_0_1.has_overlaps(self.user)
        assert has_overlap is False
        has_overlap = self.group_1_1.has_overlaps(self.user)
        assert has_overlap is False
        has_overlap = self.group_0.has_overlaps(self.user)
        assert has_overlap is True
        has_overlap = self.group_1.has_overlaps(self.user)
        assert has_overlap is True

    def test_system_count(self):
        assert self.group_0_0.system_count == 1
        assert self.group_1_0.system_count == 0
        assert self.group_0_1.system_count == 1
        assert self.group_1_1.system_count == 0
        assert self.group_0.system_count == 3
        assert self.group_1.system_count == 1

    def test_system_count_invalidation_on_create(self, system_factory):
        group_key_1 = cache_key_cloud_system_group_children_count(self.group_1.id)
        group_key_1_0 = cache_key_cloud_system_group_children_count(self.group_1_0.id)
        group_key_1_1 = cache_key_cloud_system_group_children_count(self.group_1_1.id)
        assert self.group_1_0.system_count == 0
        assert self.group_1_1.system_count == 0
        assert self.group_1.system_count == 1
        assert caches['default'].get(group_key_1) == 1
        assert caches['default'].get(group_key_1_0) == 0
        assert caches['default'].get(group_key_1_1) == 0

        # Create new system
        sys = system_factory(organization=self.organization, system_group=self.group_1)
        assert caches['default'].get(group_key_1) == None
        assert caches['default'].get(group_key_1_0) == 0
        assert caches['default'].get(group_key_1_1) == 0
        assert self.group_1_0.system_count == 0
        assert self.group_1_1.system_count == 0
        assert self.group_1.system_count == 2
        assert caches['default'].get(group_key_1) == 2

        # Create new system
        sys = system_factory(organization=self.organization, system_group=self.group_1_1)
        assert caches['default'].get(group_key_1) == None
        assert caches['default'].get(group_key_1_0) == 0
        assert caches['default'].get(group_key_1_1) == None
        assert self.group_1_0.system_count == 0
        assert self.group_1_1.system_count == 1
        assert self.group_1.system_count == 3
        assert caches['default'].get(group_key_1) == 3
        assert caches['default'].get(group_key_1_1) == 1

    def test_system_count_invalidation_on_change(self, system_factory):
        group_key_1 = cache_key_cloud_system_group_children_count(self.group_1.id)
        group_key_1_0 = cache_key_cloud_system_group_children_count(self.group_1_0.id)
        group_key_1_1 = cache_key_cloud_system_group_children_count(self.group_1_1.id)
        sys = system_factory(organization=self.organization, system_group=self.group_1_1)
        assert self.group_1_0.system_count == 0
        assert self.group_1_1.system_count == 1
        assert self.group_1.system_count == 2
        assert caches['default'].get(group_key_1_0) == 0
        assert caches['default'].get(group_key_1_1) == 1
        assert caches['default'].get(group_key_1) == 2

        # Change group
        sys.system_group = self.group_1_0
        sys.save()
        assert caches['default'].get(group_key_1) == None
        assert caches['default'].get(group_key_1_0) == None
        assert caches['default'].get(group_key_1_1) == None
        assert self.group_1_0.system_count == 1
        assert self.group_1_1.system_count == 0
        assert self.group_1.system_count == 2

        assert caches['default'].get(group_key_1_0) == 1
        assert caches['default'].get(group_key_1_1) == 0
        assert caches['default'].get(group_key_1) == 2

    def test_disconnected_system(self, system_factory):
        group_key_1 = cache_key_cloud_system_group_children_count(self.group_1.id)
        group_key_1_0 = cache_key_cloud_system_group_children_count(self.group_1_0.id)
        group_key_1_1 = cache_key_cloud_system_group_children_count(self.group_1_1.id)
        sys = system_factory(organization=self.organization, system_group=self.group_1_1)
        assert self.group_1_0.system_count == 0
        assert self.group_1_1.system_count == 1
        assert self.group_1.system_count == 2
        sys.disconnect_system()
        assert caches['default'].get(group_key_1) == None
        assert caches['default'].get(group_key_1_0) == 0
        assert caches['default'].get(group_key_1_1) == None
        assert self.group_1_0.system_count == 0
        assert self.group_1_1.system_count == 0
        assert self.group_1.system_count == 1
        assert caches['default'].get(group_key_1_0) == 0
        assert caches['default'].get(group_key_1_1) == 0
        assert caches['default'].get(group_key_1) == 1


class TestCloudSystemId:

    def test_get_organization_users(self, channel_partner_factory, cp_user_factory, organization_factory,
                                    org_user_factory, system_group_factory, system_factory,
                                    sys_group_user_factory, cloud_user_factory):
        cp = channel_partner_factory()
        cp_admin = cp_user_factory(channel_partner=cp)
        org = organization_factory(channel_partner=cp)
        org_admin = org_user_factory(organization=org)
        org_sys = system_factory(organization=org)
        group = system_group_factory(organization=org)
        group_sys = system_factory(organization=org, system_group=group)
        group_user = sys_group_user_factory(organization=org, group=group, role_id=OrganizationRoles.SYSTEM_HEALTH_VIEWER)

        users = org_sys.get_organization_users()

        assert users.count() == 1
        assert users.first()['user__email'] == org_admin.user.email
        assert users.first()['roles'] == org_admin.roles

        users = group_sys.get_organization_users()
        assert users.count() == 2
        for user in users:
            assert user['user__email'] in [org_admin.user.email, group_user.user.email]
            assert user['roles'][0] in org_admin.roles + group_user.roles

    def test_get_channel_partner_users(self, channel_partner_factory, cp_user_factory, organization_factory,
                                    org_user_factory, system_group_factory, system_factory,
                                    sys_group_user_factory, cloud_user_factory):
        cp = channel_partner_factory()
        cp_admin = cp_user_factory(channel_partner=cp)
        org = organization_factory(channel_partner=cp)
        org_sys = system_factory(organization=org)

        users = org_sys.get_channel_partner_users()

        assert users.count() == 1
        assert users.first()['user__email'] == cp_admin.user.email
        assert users.first()['roles'] == cp_admin.roles

    def test_get_all_users(self, channel_partner_factory, cp_user_factory, organization_factory,
                                    org_user_factory, system_group_factory, system_factory,
                                    sys_group_user_factory, cloud_user_factory):
        cp = channel_partner_factory()
        org = organization_factory(channel_partner=cp)
        org.channel_partner_access_level_id = OrganizationRoles.POWER_USER
        org.save()
        org_sys = system_factory(organization=org)
        group = system_group_factory(organization=org)
        group_sys = system_factory(organization=org, system_group=group)

        assert group_sys.get_all_users().count() == 0
        assert org_sys.get_all_users().count() == 0

        cp_admin = cp_user_factory(channel_partner=cp)
        org_admin = org_user_factory(organization=org)
        group_user = sys_group_user_factory(organization=org, group=group,
                                            role_id=OrganizationRoles.SYSTEM_HEALTH_VIEWER)

        users = group_sys.get_all_users()
        assert users.count() == 3
        for user in users:
            assert user['user__email'] in [org_admin.user.email, cp_admin.user.email, group_user.user.email]
            assert user['roles'][0] in [org.channel_partner_access_level_id] + org_admin.roles + group_user.roles

    def test_get_user_role_by_email(self, channel_partner_factory, cp_user_factory, organization_factory,
                                    org_user_factory, system_group_factory, system_factory,
                                    sys_group_user_factory, cloud_user_factory):
        cp = channel_partner_factory()
        org = organization_factory(channel_partner=cp)
        org.channel_partner_access_level_id = OrganizationRoles.POWER_USER
        org.save()
        org_sys = system_factory(organization=org)
        group = system_group_factory(organization=org)
        group_sys = system_factory(organization=org, system_group=group)
        cp_admin = cp_user_factory(channel_partner=cp)
        org_admin = org_user_factory(organization=org)
        group_user = sys_group_user_factory(organization=org, group=group,
                                            role_id=OrganizationRoles.SYSTEM_HEALTH_VIEWER)
        user_rel = group_sys.get_user_role_by_email(email='not_existing')
        assert user_rel is None

        user_rel = group_sys.get_user_role_by_email(email=group_user.user.email)
        assert user_rel['user__email'] == group_user.user.email
        assert user_rel['roles'] == group_user.roles
        assert user_rel['type'] == 'organization'

        user_rel = group_sys.get_user_role_by_email(email=org_admin.user.email)
        assert user_rel['user__email'] == org_admin.user.email
        assert user_rel['roles'] == org_admin.roles
        assert user_rel['type'] == 'organization'

        user_rel = group_sys.get_user_role_by_email(email=cp_admin.user.email)
        assert user_rel['user__email'] == cp_admin.user.email
        assert user_rel['roles'] == [org.channel_partner_access_level_id]
        assert user_rel['type'] == 'channel_partner'

    def test_has_vms_role(self, channel_partner_factory, cp_user_factory, organization_factory,
                          org_user_factory, system_group_factory, system_factory,
                          sys_group_user_factory, cloud_user_factory):
        cp = channel_partner_factory()
        org = organization_factory(channel_partner=cp)
        org.channel_partner_access_level_id = OrganizationRoles.SYSTEM_HEALTH_VIEWER
        org.save()
        org_sys = system_factory(organization=org)
        group = system_group_factory(organization=org)
        group_sys = system_factory(organization=org, system_group=group)
        cp_admin = cp_user_factory(channel_partner=cp)
        org_admin = org_user_factory(organization=org)
        group_user = sys_group_user_factory(organization=org, group=group,
                                            role_id=OrganizationRoles.SYSTEM_HEALTH_VIEWER)

        assert group_sys.has_vms_role(group_user.user, vms_roles=[VmsRoles.POWER_USER]) is False
        assert group_sys.has_vms_role(group_user.user, vms_roles=[VmsRoles.SYSTEM_HEALTH_VIEWER]) is True
        assert org_sys.has_vms_role(group_user.user, vms_roles=[VmsRoles.SYSTEM_HEALTH_VIEWER]) is False
        assert group_sys.has_vms_role(org_admin.user, vms_roles=[VmsRoles.POWER_USER]) is False
        assert group_sys.has_vms_role(org_admin.user, vms_roles=[VmsRoles.ADMINISTRATOR]) is True
        assert org_sys.has_vms_role(org_admin.user, vms_roles=[VmsRoles.ADMINISTRATOR]) is True
        assert group_sys.has_vms_role(cp_admin.user, vms_roles=[VmsRoles.SYSTEM_HEALTH_VIEWER]) is True
        assert group_sys.has_vms_role(cp_admin.user, vms_roles=[VmsRoles.ADMINISTRATOR]) is False
        assert org_sys.has_vms_role(cp_admin.user, vms_roles=[VmsRoles.ADMINISTRATOR]) is False



class TestCloudUser:

    def test_all_systems(self, channel_partner_factory, cp_user_factory, organization_factory,
                                    org_user_factory, system_group_factory, system_factory,
                                    sys_group_user_factory, cloud_user_factory):
        root = channel_partner_factory()
        cp = channel_partner_factory(parent_channel_partner=root)

        org = organization_factory(channel_partner=cp, channel_partner_access_level_id=None)

        org_sys = system_factory(organization=org)
        group = system_group_factory(organization=org)
        group_sys = system_factory(organization=org, system_group=group)
        group_1 = system_group_factory(organization=org)
        group_1_sys = system_factory(organization=org, system_group=group_1)
        cp_admin = cp_user_factory(channel_partner=cp)
        org_admin = org_user_factory(organization=org)
        group_user = sys_group_user_factory(organization=org, group=group,
                                            role_id=OrganizationRoles.SYSTEM_HEALTH_VIEWER)

        systems = cp_admin.user.all_systems()
        # no CPAl - no system
        assert systems.count() == 0

        org.channel_partner_access_level_id = OrganizationRoles.POWER_USER
        org.save()

        systems = cp_admin.user.all_systems()
        # with cpal
        assert systems.count() == 3
        systems = {system for system in systems}
        assert systems == {org_sys, group_sys, group_1_sys}

        # two orgs with cpal
        other_org = organization_factory(channel_partner=cp)
        other_sys = system_factory(organization=other_org)
        other_group = system_group_factory(organization=other_org)
        other_group_sys = system_factory(organization=other_org, system_group=other_group)

        systems = cp_admin.user.all_systems()

        assert systems.count() == 5
        systems = {system for system in systems}
        assert systems == {org_sys, group_sys, group_1_sys, other_sys, other_group_sys}
        # group membership
        systems = group_user.user.all_systems()

        assert systems.count() == 1
        assert systems.first() == group_sys
        # org membership
        systems = org_admin.user.all_systems()

        assert systems.count() == 3
        systems = {system for system in systems}
        assert systems == {org_sys, group_sys, group_1_sys}

        org.channel_partner_access_level = None
        org.save()
        cp_admin.refresh_from_db()
        org.refresh_from_db()
        systems = cp_admin.user.all_systems()
        # only other org systems must be in the list
        assert systems.count() == 2

    def test_systems_memberships(self, channel_partner_factory, cp_user_factory, organization_factory,
                                    org_user_factory, system_group_factory, system_factory,
                                    sys_group_user_factory, cloud_user_factory):
        root = channel_partner_factory()
        cp = channel_partner_factory(parent_channel_partner=root)

        org = organization_factory(channel_partner=cp, channel_partner_access_level_id=None)

        org_sys = system_factory(organization=org)
        group = system_group_factory(organization=org)
        group_sys = system_factory(organization=org, system_group=group)
        group_1 = system_group_factory(organization=org)
        group_1_sys = system_factory(organization=org, system_group=group_1)
        cp_admin = cp_user_factory(channel_partner=cp)
        org_admin = org_user_factory(organization=org)
        group_user = sys_group_user_factory(organization=org, group=group,
                                            role_id=OrganizationRoles.SYSTEM_HEALTH_VIEWER)
        org_sys_ids = {org_sys.system_id, group_sys.system_id, group_1_sys.system_id}
        systems = cp_admin.user.systems_memberships()
        # no CPAl - no system
        assert len(systems) == 0

        org.channel_partner_access_level_id = OrganizationRoles.ORGANIZATION_ADMINISTRATOR
        org.save()

        systems = cp_admin.user.systems_memberships()
        # with cpal
        assert len(systems) == 3
        systems_ids = {system['system_id'] for system in systems}
        assert systems_ids == org_sys_ids
        assert all([system['membership_type'] == 'channel_partner'
                    and system['org_roles'] == [org.channel_partner_access_level_id]
                    for system in systems])
        # two orgs with cpal
        other_org = organization_factory(channel_partner=cp)
        other_sys = system_factory(organization=other_org)
        other_group = system_group_factory(organization=other_org)
        other_group_sys = system_factory(organization=other_org, system_group=other_group)
        all_sys_ids = {org_sys.system_id, group_sys.system_id, group_1_sys.system_id,
                       other_sys.system_id, other_group_sys.system_id}

        systems = cp_admin.user.systems_memberships()

        assert systems.count() == 5
        systems_ids = {system['system_id'] for system in systems}
        assert systems_ids == all_sys_ids
        # group membership
        systems = group_user.user.systems_memberships()

        assert systems.count() == 1
        assert systems[0]['system_id'] == group_sys.system_id
        assert systems[0]['org_roles'] == group_user.roles

        # org membership
        systems = org_admin.user.systems_memberships()
        systems_ids = {system['system_id'] for system in systems}

        assert len(systems) == 3
        assert systems_ids == org_sys_ids

        org.channel_partner_access_level = None
        org.save()
        cp_admin.refresh_from_db()
        org.refresh_from_db()
        systems = cp_admin.user.systems_memberships()
        # only other org systems must be in the list
        assert systems.count() == 2


class TestServiceUsage:
    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, cp_service_factory, organization_factory, system_factory,
              service_record_factory):
        self.cp = channel_partner_factory()
        self.organization = organization_factory(channel_partner=self.cp)
        self.system = system_factory(organization=self.organization)
        self.service_quantity = 10
        self.local_recording_service = cp_service_factory(
            channel_partner=self.cp, service_type=ChannelPartnerService.LOCAL_RECORDING)
        self.local_recording_service_record = service_record_factory(self.local_recording_service,
                                                                     cloud_system=self.system,
                                                                     organization=self.organization,
                                                                     quantity=self.service_quantity)
        self.cloud_storage_service = cp_service_factory(
            channel_partner=self.cp, service_type=ChannelPartnerService.CLOUD_STORAGE)
        self.cloud_storage_service_record = service_record_factory(self.cloud_storage_service,
                                                                   cloud_system=self.system,
                                                                   organization=self.organization,
                                                                   quantity=self.service_quantity)
        self.analytics_service = cp_service_factory(
            channel_partner=self.cp, service_type=ChannelPartnerService.ANALYTICS)
        self.analytics_service_2 = cp_service_factory(
            channel_partner=self.cp, service_type=ChannelPartnerService.ANALYTICS)
        self.analytics_service_record = service_record_factory(self.analytics_service,
                                                               cloud_system=self.system,
                                                               organization=self.organization,
                                                               quantity=self.service_quantity)

    def test_check_excess_ok(self, service_usage_factory, cloud_storage_usage_factory):
        now = timezone.now()
        analytics_service_usage = service_usage_factory(
            system=self.system,
            service=self.analytics_service,
            usage=5,
            to_ts=now,
        )
        analytics_service_usage = service_usage_factory(
            system=self.system,
            service=self.analytics_service,
            usage=1,
            to_ts=now,
        )
        local_recording_service_usage = service_usage_factory(
            system=self.system,
            service=self.local_recording_service,
            usage=5,
            to_ts=now,
        )
        cloud_storage_service_usage = cloud_storage_usage_factory(
            system=self.system,
            service=self.cloud_storage_service,
            usage=5,
            ts=now,

        )
        types_statuses = ServiceUsage.check_excess(self.system)['types']
        assert types_statuses[ChannelPartnerService.LOCAL_RECORDING] == ServiceUsage.STATUS_OK
        assert types_statuses[ChannelPartnerService.ANALYTICS] == ServiceUsage.STATUS_OK
        assert types_statuses[ChannelPartnerService.CLOUD_STORAGE] == ServiceUsage.STATUS_OK

        services_statuses = ServiceUsage.check_excess(self.system)['services']
        assert services_statuses[str(self.analytics_service.id)] == ServiceUsage.STATUS_OK
        assert services_statuses[str(self.local_recording_service.id)] == ServiceUsage.STATUS_OK
        assert services_statuses[str(self.cloud_storage_service.id)] == ServiceUsage.STATUS_OK

    def test_check_excess_ok_wrong_current_statuses(self, service_usage_factory, cloud_storage_usage_factory):
        now = timezone.now()
        analytics_service_usage = service_usage_factory(
            system=self.system,
            service=self.analytics_service,
            usage=5,
            to_ts=now,
        )
        analytics_service_usage = service_usage_factory(
            system=self.system,
            service=self.analytics_service,
            usage=1,
            to_ts=now,
        )
        local_recording_service_usage = service_usage_factory(
            system=self.system,
            service=self.local_recording_service,
            usage=5,
            to_ts=now,
        )
        cloud_storage_service_usage = cloud_storage_usage_factory(
            system=self.system,
            service=self.cloud_storage_service,
            usage=5,
            ts=now,

        )
        self.system.security_statuses = {'wrong_key': ServiceUsage.STATUS_OK}
        self.system.save()
        types_statuses = ServiceUsage.check_excess(self.system)['types']
        assert types_statuses[ChannelPartnerService.LOCAL_RECORDING] == ServiceUsage.STATUS_OK
        assert types_statuses[ChannelPartnerService.ANALYTICS] == ServiceUsage.STATUS_OK
        assert types_statuses[ChannelPartnerService.CLOUD_STORAGE] == ServiceUsage.STATUS_OK

        services_statuses = ServiceUsage.check_excess(self.system)['services']
        assert services_statuses[str(self.analytics_service.id)] == ServiceUsage.STATUS_OK
        assert services_statuses[str(self.local_recording_service.id)] == ServiceUsage.STATUS_OK
        assert services_statuses[str(self.cloud_storage_service.id)] == ServiceUsage.STATUS_OK

    def test_check_excess_over_use(self, service_usage_factory, cloud_storage_usage_factory):
        now = timezone.now()
        minus_12_hours = now - timedelta(hours=12)
        yesterday = now - timedelta(days=1)
        analytics_service_usage = service_usage_factory(
            system=self.system,
            service=self.analytics_service,
            usage=ServiceUsage.get_usage_from_quantity(
                ChannelPartnerService.LOCAL_RECORDING, self.service_quantity * 2),
            to_ts=yesterday,

        )
        local_recording_service_usage = service_usage_factory(
            system=self.system,
            service=self.local_recording_service,
            usage=ServiceUsage.get_usage_from_quantity(
                ChannelPartnerService.ANALYTICS, self.service_quantity * 2),
            from_ts=timezone.now() - timedelta(days=1),
            to_ts=yesterday,

        )
        cloud_storage_service_usage = cloud_storage_usage_factory(
            system=self.system,
            service=self.cloud_storage_service,
            usage=ServiceUsage.get_usage_from_quantity(
                ChannelPartnerService.CLOUD_STORAGE, self.service_quantity * 2),
            ts=yesterday,
        )

        analytics_service_usage = service_usage_factory(
            system=self.system,
            service=self.analytics_service,
            usage=ServiceUsage.get_usage_from_quantity(
                ChannelPartnerService.LOCAL_RECORDING, self.service_quantity * 2),
            to_ts=now,
        )
        local_recording_service_usage = service_usage_factory(
            system=self.system,
            service=self.local_recording_service,
            usage=ServiceUsage.get_usage_from_quantity(
                ChannelPartnerService.ANALYTICS, self.service_quantity * 2),
            to_ts=now,
        )
        cloud_storage_service_usage = cloud_storage_usage_factory(
            system=self.system,
            service=self.cloud_storage_service,
            usage=ServiceUsage.get_usage_from_quantity(
                ChannelPartnerService.CLOUD_STORAGE, self.service_quantity * 2),
            ts=minus_12_hours,
        )
        types_statuses = ServiceUsage.check_excess(self.system)['types']
        assert types_statuses[ChannelPartnerService.LOCAL_RECORDING] == ServiceUsage.STATUS_OVER_USE
        assert types_statuses[ChannelPartnerService.ANALYTICS] == ServiceUsage.STATUS_OVER_USE
        assert types_statuses[ChannelPartnerService.CLOUD_STORAGE] == ServiceUsage.STATUS_OVER_USE

    def test_check_excess_not_assigned_services(self, service_usage_factory, cloud_storage_usage_factory):
        now = timezone.now()
        minus_12_hours = now - timedelta(hours=12)
        yesterday = now - timedelta(days=1)
        # creating usage records with usage quantity far below allocated
        analytics_service_usage = service_usage_factory(
            system=self.system,
            service=self.analytics_service,
            usage=2,
            to_ts=yesterday,
        )
        analytics_service_usage = service_usage_factory(
            system=self.system,
            service=self.analytics_service_2,
            usage=2,
            to_ts=yesterday,
        )
        local_recording_service_usage = service_usage_factory(
            system=self.system,
            service=self.local_recording_service,
            usage=2,
            to_ts=yesterday,
        )
        cloud_storage_service_usage = cloud_storage_usage_factory(
            system=self.system,
            service=self.cloud_storage_service,
            usage=2,
            ts=yesterday,
        )

        types_statuses = ServiceUsage.check_excess(self.system)['types']
        assert types_statuses[ChannelPartnerService.LOCAL_RECORDING] == ServiceUsage.STATUS_OK
        assert types_statuses[ChannelPartnerService.ANALYTICS] == ServiceUsage.STATUS_OVER_USE
        assert types_statuses[ChannelPartnerService.CLOUD_STORAGE] == ServiceUsage.STATUS_OK

        services_statuses = ServiceUsage.check_excess(self.system)['services']
        assert services_statuses[str(self.analytics_service.id)] == ServiceUsage.STATUS_OK
        assert services_statuses[str(self.analytics_service_2.id)] == ServiceUsage.STATUS_OVER_USE
        assert services_statuses[str(self.local_recording_service.id)] == ServiceUsage.STATUS_OK
        assert services_statuses[str(self.cloud_storage_service.id)] == ServiceUsage.STATUS_OK

        # add some usages without a service as services were deallocated for this system
        analytics_service_usage = service_usage_factory(
            system=self.system,
            service=self.analytics_service,
            usage=2,
            to_ts=minus_12_hours,
        )
        analytics_service_usage = service_usage_factory(
            system=self.system,
            service=self.analytics_service_2,
            usage=2,
            to_ts=minus_12_hours,
        )
        local_recording_service_usage = service_usage_factory(
            system=self.system,
            service=self.local_recording_service,
            usage=2,
            to_ts=minus_12_hours,
        )
        local_recording_service_usage = service_usage_factory(
            system=self.system,
            service=self.local_recording_service,
            usage=2,
            to_ts=minus_12_hours,
        )
        cloud_storage_service_usage = cloud_storage_usage_factory(
            system=self.system,
            service=self.cloud_storage_service,
            usage=2,
            ts=now,
        )
        cloud_storage_service_usage = cloud_storage_usage_factory(
            system=self.system,
            service=self.cloud_storage_service,
            usage=20,
            ts=now,
        )

        types_statuses = ServiceUsage.check_excess(self.system)['types']
        assert types_statuses[ChannelPartnerService.LOCAL_RECORDING] == ServiceUsage.STATUS_OK
        assert types_statuses[ChannelPartnerService.ANALYTICS] == ServiceUsage.STATUS_OVER_USE
        assert types_statuses[ChannelPartnerService.CLOUD_STORAGE] == ServiceUsage.STATUS_OVER_USE

        services_statuses = ServiceUsage.check_excess(self.system)['services']
        assert services_statuses[str(self.analytics_service.id)] == ServiceUsage.STATUS_OK
        assert services_statuses[str(self.analytics_service_2.id)] == ServiceUsage.STATUS_OVER_USE
        assert services_statuses[str(self.local_recording_service.id)] == ServiceUsage.STATUS_OK
        assert services_statuses[str(self.cloud_storage_service.id)] == ServiceUsage.STATUS_OVER_USE

        cloud_storage_service_usage = cloud_storage_usage_factory(
            system=self.system,
            service=self.cloud_storage_service,
            usage=2,
            ts=now + timedelta(hours=1)
        )


        types_statuses = ServiceUsage.check_excess(self.system)['types']
        assert types_statuses[ChannelPartnerService.LOCAL_RECORDING] == ServiceUsage.STATUS_OK
        assert types_statuses[ChannelPartnerService.ANALYTICS] == ServiceUsage.STATUS_OVER_USE
        assert types_statuses[ChannelPartnerService.CLOUD_STORAGE] == ServiceUsage.STATUS_OK

        services_statuses = ServiceUsage.check_excess(self.system)['services']
        assert services_statuses[str(self.analytics_service.id)] == ServiceUsage.STATUS_OK
        assert services_statuses[str(self.analytics_service_2.id)] == ServiceUsage.STATUS_OVER_USE
        assert services_statuses[str(self.local_recording_service.id)] == ServiceUsage.STATUS_OK
        assert services_statuses[str(self.cloud_storage_service.id)] == ServiceUsage.STATUS_OK

        self.system.refresh_from_db()
        assert self.system.usage_issue_detected

        analytics_service_usage = service_usage_factory(
            system=self.system,
            service=self.analytics_service,
            usage=2,
            to_ts=now,
        )

        types_statuses = ServiceUsage.check_excess(self.system)['types']
        assert types_statuses[ChannelPartnerService.LOCAL_RECORDING] == ServiceUsage.STATUS_OK
        assert types_statuses[ChannelPartnerService.ANALYTICS] == ServiceUsage.STATUS_OK
        assert types_statuses[ChannelPartnerService.CLOUD_STORAGE] == ServiceUsage.STATUS_OVER_USE

        services_statuses = ServiceUsage.check_excess(self.system)['services']
        assert services_statuses[str(self.analytics_service.id)] == ServiceUsage.STATUS_OK
        assert services_statuses[str(self.local_recording_service.id)] == ServiceUsage.STATUS_OK
        assert services_statuses[str(self.cloud_storage_service.id)] == ServiceUsage.STATUS_OVER_USE

        self.system.refresh_from_db()
        assert self.system.usage_issue_detected is True

        analytics_service_usage = service_usage_factory(
            system=self.system,
            service=self.analytics_service,
            usage=2,
            to_ts=now + timedelta(hours=3),
        )
        services_statuses = ServiceUsage.check_excess(self.system)['services']
        self.system.refresh_from_db()
        assert self.system.usage_issue_detected is False


    def test_get_latest_usages(self, service_usage_factory, cloud_storage_usage_factory):
        now = timezone.now()
        minus_12_hours = now - timedelta(hours=12)
        yesterday = now - timedelta(days=1)
        # creating usage records with usage quantity far below allocated
        analytics_service_usage_yesterday = service_usage_factory(
            system=self.system,
            service=self.analytics_service,
            usage=2,
            to_ts=yesterday,
        )
        local_recording_service_usage_yesterday = service_usage_factory(
            system=self.system,
            service=self.local_recording_service,
            usage=2,
            to_ts=yesterday,
        )
        cloud_storage_service_usage_yesterday = cloud_storage_usage_factory(
            system=self.system,
            service=self.cloud_storage_service,
            usage=2,
            ts=yesterday,
        )

        latest_usages = ServiceUsage.get_latest_usages(self.system)
        id_list = list([usage['service'] for usage in latest_usages])
        assert latest_usages.count() == 3
        assert self.analytics_service.id in id_list
        assert self.local_recording_service.id in id_list
        assert self.cloud_storage_service.id in id_list
        for usage in latest_usages:
            assert usage['usage'] == 2

        # add some usages without a service as services were deallocated for this system
        analytics_service_usage_minus_12 = service_usage_factory(
            system=self.system,
            service=self.analytics_service,
            usage=2,
            to_ts=minus_12_hours,
        )
        analytics_service_usage_dealloc_minus_12 = service_usage_factory(
            system=self.system,
            service=None,
            service_type=ChannelPartnerService.ANALYTICS,
            usage=2,
            to_ts=minus_12_hours,
        )
        local_recording_service_usage_minus_12 = service_usage_factory(
            system=self.system,
            service=self.local_recording_service,
            usage=2,
            to_ts=minus_12_hours,
        )
        local_recording_service_usage_minus_12_1 = service_usage_factory(
            system=self.system,
            service=self.local_recording_service,
            usage=2,
            to_ts=minus_12_hours,
        )
        cloud_storage_service_usage_minus_12 = cloud_storage_usage_factory(
            system=self.system,
            service=self.cloud_storage_service,
            usage=2,
            ts=minus_12_hours,
        )
        cloud_storage_service_usage_dealloc_minus_12 = cloud_storage_usage_factory(
            system=self.system,
            service=None,
            service_type=ChannelPartnerService.CLOUD_STORAGE,
            usage=2,
            ts=minus_12_hours,
        )

        latest_usages = ServiceUsage.get_latest_usages(self.system)
        id_list = list([usage['service'] for usage in latest_usages])
        assert latest_usages.count() == 5
        assert self.local_recording_service.id in id_list
        assert self.analytics_service.id in id_list
        assert self.cloud_storage_service.id in id_list
        assert None in id_list

        cloud_storage_service_usage_now = cloud_storage_usage_factory(
            system=self.system,
            service=self.cloud_storage_service,
            usage=2,
            ts=now
        )

        latest_usages = ServiceUsage.get_latest_usages(self.system)
        assert latest_usages.count() == 4
        assert self.local_recording_service.id in id_list
        assert self.analytics_service.id in id_list
        assert self.cloud_storage_service.id in id_list
        assert None in id_list

    def make_usage_dict(self, usages):
        ret = {}
        for usage in usages:
            ret[usage['service'], usage['service__type']] = usage['usage']
        return ret

    def test_get_latest_usages(self, service_usage_factory, cloud_storage_usage_factory):
        now = timezone.now()
        minus_12_hours = now - timedelta(hours=12)
        yesterday = now - timedelta(days=1)
        # creating usage records with usage quantity far below allocated
        analytics_service_usage_yesterday = service_usage_factory(
            system=self.system,
            service=self.analytics_service,
            usage=2,
            to_ts=yesterday,
        )
        local_recording_service_usage_yesterday = service_usage_factory(
            system=self.system,
            service=self.local_recording_service,
            usage=2,
            to_ts=yesterday,
        )
        cloud_storage_service_usage_yesterday = cloud_storage_usage_factory(
            system=self.system,
            service=self.cloud_storage_service,
            usage=2,
            ts=yesterday,
        )

        latest_usages = ServiceUsage.get_latest_usages(self.system)
        id_list = list([usage['service'] for usage in latest_usages])
        usages_dict = self.make_usage_dict(latest_usages)
        assert latest_usages.count() == 3
        assert self.analytics_service.id in id_list
        assert self.local_recording_service.id in id_list
        assert self.cloud_storage_service.id in id_list
        assert usages_dict[self.analytics_service.id, ChannelPartnerService.ANALYTICS] == 2
        assert usages_dict[self.local_recording_service.id, ChannelPartnerService.LOCAL_RECORDING] == 2
        assert usages_dict[self.cloud_storage_service.id, ChannelPartnerService.CLOUD_STORAGE] == 2

        cloud_storage_service_usage_yesterday = cloud_storage_usage_factory(
            system=self.system,
            service=self.cloud_storage_service,
            usage=2,
            ts=yesterday,
        )

        latest_usages = ServiceUsage.get_latest_usages(self.system)
        id_list = list([usage['service'] for usage in latest_usages])
        usages_dict = self.make_usage_dict(latest_usages)
        assert latest_usages.count() == 3
        assert self.analytics_service.id in id_list
        assert self.local_recording_service.id in id_list
        assert self.cloud_storage_service.id in id_list
        assert usages_dict[self.analytics_service.id, ChannelPartnerService.ANALYTICS] == 2
        assert usages_dict[self.local_recording_service.id, ChannelPartnerService.LOCAL_RECORDING] == 2
        assert usages_dict[self.cloud_storage_service.id, ChannelPartnerService.CLOUD_STORAGE] == 4

        local_recording_service_usage_yesterday = service_usage_factory(
            system=self.system,
            service=self.local_recording_service,
            usage=2,
            to_ts=yesterday,
        )

        latest_usages = ServiceUsage.get_latest_usages(self.system)
        id_list = list([usage['service'] for usage in latest_usages])
        usages_dict = self.make_usage_dict(latest_usages)
        assert latest_usages.count() == 3
        assert self.analytics_service.id in id_list
        assert self.local_recording_service.id in id_list
        assert self.cloud_storage_service.id in id_list
        assert usages_dict[self.analytics_service.id, ChannelPartnerService.ANALYTICS] == 2
        assert usages_dict[self.local_recording_service.id, ChannelPartnerService.LOCAL_RECORDING] == 4
        assert usages_dict[self.cloud_storage_service.id, ChannelPartnerService.CLOUD_STORAGE] == 4
