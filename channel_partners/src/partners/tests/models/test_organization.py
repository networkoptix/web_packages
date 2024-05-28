import pytest

from partners.models import (
    ChannelPartnerStates,
    CloudSystemId,
    OrganizationRoles,
)


class TestOrganizationStateChangeNotification:
    @pytest.fixture(autouse=True)
    def setup_method(self, organization_factory, mocker):
        self.organization = organization_factory()
        self.mocked_task = mocker.patch("partners.tasks.notification.run_organization_state_changed_tasks.apply_async")

    def test_no_changes(self, django_capture_on_commit_callbacks):
        self.organization.channel_partner_access_level_id = OrganizationRoles.SYSTEM_HEALTH_VIEWER
        with django_capture_on_commit_callbacks(execute=False) as callbacks:
            self.organization.save()
        assert len(callbacks) == 0

    def test_suspend(self, django_capture_on_commit_callbacks):
        self.organization.state = ChannelPartnerStates.SUSPENDED
        with django_capture_on_commit_callbacks(execute=False) as callbacks:
            self.organization.save()
        assert len(callbacks) == 1
        callbacks[0]()
        self.mocked_task.assert_called_once_with(args=[[self.organization.id]])

    def test_shutdown(self, django_capture_on_commit_callbacks):
        self.organization.state = ChannelPartnerStates.SHUTDOWN
        with django_capture_on_commit_callbacks(execute=False) as callbacks:
            self.organization.save()
        assert len(callbacks) == 1
        callbacks[0]()
        self.mocked_task.assert_called_once_with(args=[[self.organization.id]])

class TestOrganizationUserSystems:
    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, cp_user_factory,
              organization_factory, org_user_factory,
              system_group_factory, sys_group_user_factory,
              system_factory, cloud_test_host):
        self.parent_cp = channel_partner_factory()
        self.parent_cp_admin = cp_user_factory(channel_partner=self.parent_cp)

        self.cp = channel_partner_factory(parent_channel_partner=self.parent_cp)
        self.cp_admin = cp_user_factory(channel_partner=self.cp)

        self.organization = organization_factory(channel_partner=self.cp)
        self.organization_admin = org_user_factory(organization=self.organization)

        self.other_organization = organization_factory(channel_partner=self.cp)
        self.other_organization_admin = org_user_factory(organization=self.other_organization)

        self.system_group_0 = system_group_factory(organization=self.organization)
        self.system_group_0_admin = sys_group_user_factory(organization=self.organization, group=self.system_group_0)
        self.system_group_1 = system_group_factory(organization=self.organization)
        self.system_group_1_admin = sys_group_user_factory(organization=self.organization, group=self.system_group_1)
        self.system_group_0_0 = system_group_factory(organization=self.organization, parent=self.system_group_0)
        self.system_group_0_0_admin = sys_group_user_factory(organization=self.organization,
                                                             group=self.system_group_0_0)
        self.system_group_1_0 = system_group_factory(organization=self.organization, parent=self.system_group_1)
        self.system_group_1_0_admin = sys_group_user_factory(organization=self.organization,
                                                             group=self.system_group_1_0)
        self.other_organization_group = system_group_factory(organization=self.other_organization)
        self.organization_sys = system_factory(organization=self.organization)
        self.system_group_0_sys = system_factory(organization=self.organization, system_group=self.system_group_0)
        self.system_group_1_sys = system_factory(organization=self.organization, system_group=self.system_group_1)
        self.system_group_0_0_sys = system_factory(organization=self.organization, system_group=self.system_group_0_0)
        self.system_group_1_0_sys = system_factory(organization=self.organization, system_group=self.system_group_1_0)
        self.other_organization_sys = system_factory(organization=self.other_organization)
        self.other_organization_group_sys = system_factory(organization=self.other_organization,
                                                           system_group=self.other_organization_group)

    def test_initial(self):
        assert CloudSystemId.objects.filter(organization=self.organization).count() == 5

    def test_parent_cp_user(self):
        queryset = self.organization.user_systems(self.parent_cp_admin.user)
        assert queryset.count() == 5

    def test_parent_other_organization_user_none(self):
        queryset = self.organization.user_systems(self.other_organization_admin.user)
        assert queryset is None

    def test_cp_user(self):
        queryset = self.organization.user_systems(self.cp_admin.user)
        assert queryset.count() == 5

    def test_organization_user(self):
        queryset = self.organization.user_systems(self.organization_admin.user)
        assert queryset.count() == 5

    def test_bottom_group_user(self, mock_auth_with_user):
        queryset = self.organization.user_systems(self.system_group_0_0_admin.user)
        assert queryset.count() == 1
        assert queryset[0].system_id == self.system_group_0_0_sys.system_id

    def test_top_group_user(self, mock_auth_with_user):
        ids = [self.system_group_0_0_sys.system_id, self.system_group_0_sys.system_id]
        queryset = self.organization.user_systems(self.system_group_0_admin.user)
        assert queryset.count() == 2
        assert queryset[0].system_id in ids
        assert queryset[1].system_id in ids

    def test_multiple_branches_user(self, sys_group_user_factory):
        user = sys_group_user_factory(organization=self.organization,
                                      cloud_user=self.system_group_0_admin.user,
                                      group=self.system_group_1_0)
        ids = [self.system_group_0_0_sys.system_id,
               self.system_group_0_sys.system_id,
               self.system_group_1_0_sys.system_id]
        queryset = self.organization.user_systems(self.system_group_0_admin.user)
        assert queryset.count() == 3
        assert queryset[0].system_id in ids
        assert queryset[1].system_id in ids
        assert queryset[2].system_id in ids
