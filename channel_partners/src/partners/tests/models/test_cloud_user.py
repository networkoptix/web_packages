from uuid import uuid4

import pytest
from django.db.models import Value

from partners.models import (
    ChannelPartnerToUser,
    CloudUser,
    OrganizationRoles,
)


class TestCloudUserAllSystems:

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


class TestCloudUserSystemsMembership:

    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, cp_user_factory, organization_factory,
              org_user_factory, system_group_factory, system_factory,
              sys_group_user_factory, cloud_user_factory):
        self.root = channel_partner_factory()
        self.cp = channel_partner_factory(parent_channel_partner=self.root)

        self.org = organization_factory(channel_partner=self.cp, channel_partner_access_level_id=None)

        self.org_sys = system_factory(organization=self.org)
        self.group_0 = system_group_factory(organization=self.org)
        self.group_0_sys = system_factory(organization=self.org, system_group=self.group_0)
        self.group_0_1 = system_group_factory(organization=self.org, parent=self.group_0)
        self.group_0_1_sys = system_factory(organization=self.org, system_group=self.group_0_1)
        self.cp_admin = cp_user_factory(channel_partner=self.cp)
        self.org_admin = org_user_factory(organization=self.org)
        self.group_user = sys_group_user_factory(organization=self.org, group=self.group_0,
                                                 role_id=OrganizationRoles.SYSTEM_HEALTH_VIEWER)
        self.org_sys_ids = {self.org_sys.system_id, self.group_0_sys.system_id, self.group_0_1_sys.system_id}

    def test_cp_admin(self, organization_factory, system_factory, system_group_factory):
        systems = self.cp_admin.user.systems_memberships()
        # no CPAl - no system
        assert len(systems) == 0

        self.org.channel_partner_access_level_id = OrganizationRoles.ORGANIZATION_ADMINISTRATOR
        self.org.save()

        systems = self.cp_admin.user.systems_memberships()
        # with cpal
        assert len(systems) == 3
        systems_ids = {system['sys_id'] for system in systems}
        assert systems_ids == self.org_sys_ids
        assert all([system['membership_type'] == 'channel_partner'
                    and system['org_roles'] == [self.org.channel_partner_access_level_id]
                    for system in systems])
        # two orgs with cpal
        other_org = organization_factory(channel_partner=self.cp)
        other_sys = system_factory(organization=other_org)
        other_group = system_group_factory(organization=other_org)
        other_group_sys = system_factory(organization=other_org, system_group=other_group)
        all_sys_ids = {self.org_sys.system_id, self.group_0_sys.system_id, self.group_0_1_sys.system_id,
                       other_sys.system_id, other_group_sys.system_id}

        systems = self.cp_admin.user.systems_memberships()

        assert systems.count() == 5
        systems_ids = {system['sys_id'] for system in systems}
        assert systems_ids == all_sys_ids

        # disable cpal on first organization
        self.org.channel_partner_access_level = None
        self.org.save()
        self.cp_admin.refresh_from_db()
        self.org.refresh_from_db()
        systems = self.cp_admin.user.systems_memberships()
        # only other org systems must be in the list
        assert systems.count() == 2

    def test_cp_admin_org_without_systems(self, organization_factory, system_factory, system_group_factory):
        all_sys_ids = {self.org_sys.system_id, self.group_0_sys.system_id, self.group_0_1_sys.system_id}
        systems = self.cp_admin.user.systems_memberships()
        # no CPAl - no system
        assert len(systems) == 0

        # with CPAL
        self.org.channel_partner_access_level_id = OrganizationRoles.ORGANIZATION_ADMINISTRATOR
        self.org.save()

        systems = self.cp_admin.user.systems_memberships()
        assert len(systems) == 3
        for system in systems:
            assert system['sys_id']
            assert system['sys_id'] in all_sys_ids

        # adding organization with CPAL without systems
        other_org = organization_factory(channel_partner=self.cp)

        systems = self.cp_admin.user.systems_memberships()

        assert systems.count() == 3
        for system in systems:
            assert system['sys_id']
            assert system['sys_id'] in all_sys_ids


    def test_group_user(self):
        # group membership
        systems = self.group_user.user.systems_memberships()

        assert systems.count() == 2
        assert systems[0]['sys_id'] in (self.group_0_sys.system_id, self.group_0_1_sys.system_id)
        assert systems[0]['org_roles'] == self.group_user.roles
        assert systems[0]['org_id'] == self.org.id
        assert systems[0]['org_name'] == self.org.name
        assert systems[1]['sys_id'] in (self.group_0_sys.system_id, self.group_0_1_sys.system_id)
        assert systems[1]['org_roles'] == self.group_user.roles
        assert systems[1]['org_id'] == self.org.id
        assert systems[1]['org_name'] == self.org.name

    def test_org_admin(self, organization_factory):
        # org membership
        systems = self.org_admin.user.systems_memberships()
        systems_ids = {system['sys_id'] for system in systems}

        assert len(systems) == 3
        assert systems_ids == self.org_sys_ids

    def test_org_admin_org_without_systems(self, organization_factory, org_user_factory):
        # org membership
        systems = self.org_admin.user.systems_memberships()
        systems_ids = {system['sys_id'] for system in systems}

        assert len(systems) == 3
        assert systems_ids == self.org_sys_ids

        # adding org
        other_org = organization_factory(channel_partner=self.cp)
        org_user_factory(organization=other_org, email=self.org_admin.user.email)

        systems = self.org_admin.user.systems_memberships()
        systems_ids = {system['sys_id'] for system in systems}

        assert len(systems) == 3
        assert systems_ids == self.org_sys_ids

    def test_systems_memberships_queries(self, django_assert_num_queries):
        expected_queries = 2

        with django_assert_num_queries(expected_queries):
            self.org_admin.user.systems_memberships()


class TestCloudUserEmail:

    @pytest.fixture(autouse=True)
    def setup(self, cp_user_factory, cloud_user_factory):
        self.email_lower = f'some-{uuid4()}@networkoptix.com'
        self.email_upper = self.email_lower.upper()
        self.user_lower = CloudUser.objects.create(email=self.email_upper)


    def test_created(self):
        assert self.user_lower.email == self.email_lower

    def test_save(self):
        email = f'1-{self.email_upper}'
        user = CloudUser(email=email)
        user.save()
        assert user.email == email.lower()

    def test_to_python(self):
        self.user_lower.email = Value(self.email_upper)
        self.user_lower.save()

        user_lower = CloudUser.objects.filter(email=self.email_lower).first()
        assert user_lower is None

        user_upper = CloudUser.objects.first()
        assert user_upper.email == self.email_upper

        user_upper = CloudUser.objects.get(email=Value(self.email_upper))
        assert user_upper.email == self.email_upper

    def test_lookup(self):
        user_lower = CloudUser.objects.get(email=self.email_upper)
        assert user_lower == self.user_lower
        assert user_lower.email == self.email_lower

    def test_lookup_related(self, cp_user_factory):
        relation = cp_user_factory(email=self.email_lower)
        assert relation.user.email == self.email_lower

        lookup = ChannelPartnerToUser.objects.get(user__email=self.email_upper)

        assert lookup.user == self.user_lower
        assert lookup.user.email == self.email_lower
