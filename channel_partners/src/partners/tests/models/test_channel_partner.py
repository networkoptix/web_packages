
import pytest

from partners.models import (
    ChannelPartnerRoles,
    ChannelPartnerStates,
    OrganizationRoles,
)
from partners.tasks.notification import (
    run_organization_state_changed_tasks,
    run_partner_state_changed_tasks,
)


@pytest.mark.no_tasks_autofix
class TestChannelPartnerStateChangeNotification:
    @pytest.fixture(autouse=True)
    def setup_method(self, channel_partner_factory, cp_user_factory,
                     organization_factory, org_user_factory, mocker,
                     root_nx_channel_partner):
        self.cp = channel_partner_factory(parent_channel_partner=root_nx_channel_partner)
        self.cp_admin = cp_user_factory(channel_partner=self.cp)
        self.cp_manager = cp_user_factory(channel_partner=self.cp, role=ChannelPartnerRoles.MANAGER)
        self.org = organization_factory(channel_partner=self.cp)
        self.org_admin = org_user_factory(organization=self.org, 
                                          role=OrganizationRoles.ORGANIZATION_ADMINISTRATOR)
        self.org_viewer = org_user_factory(organization=self.org, 
                                           role=OrganizationRoles.VIEWER)
        self.cp_0 = channel_partner_factory(parent_channel_partner=self.cp)
        self.cp_0_admin = cp_user_factory(channel_partner=self.cp_0)
        self.cp_0_manager = cp_user_factory(channel_partner=self.cp_0, role=ChannelPartnerRoles.MANAGER)
        self.org_0 = organization_factory(channel_partner=self.cp_0)
        self.org_0_admin = org_user_factory(organization=self.org_0, 
                                            role=OrganizationRoles.ORGANIZATION_ADMINISTRATOR)
        self.org_0_viewer = org_user_factory(organization=self.org_0, 
                                             role=OrganizationRoles.VIEWER)
        self.cp_1 = channel_partner_factory(parent_channel_partner=self.cp)
        self.cp_1_admin = cp_user_factory(channel_partner=self.cp_1)
        self.cp_1_manager = cp_user_factory(channel_partner=self.cp_1, role=ChannelPartnerRoles.MANAGER)
        self.org_1 = organization_factory(channel_partner=self.cp_1, state=ChannelPartnerStates.SUSPENDED)
        self.org_1_admin = org_user_factory(organization=self.org_1,
                                            role=OrganizationRoles.ORGANIZATION_ADMINISTRATOR,)
        self.org_1_viewer = org_user_factory(organization=self.org_1,
                                             role=OrganizationRoles.VIEWER)
        self.cp_0_0 = channel_partner_factory(parent_channel_partner=self.cp_0)
        self.cp_0_0_admin = cp_user_factory(channel_partner=self.cp_0_0)
        self.cp_0_0_manager = cp_user_factory(channel_partner=self.cp_0_0, role=ChannelPartnerRoles.MANAGER)
        self.org_0_0 = organization_factory(channel_partner=self.cp_0_0)
        self.org_0_0_admin = org_user_factory(organization=self.org_0_0,
                                              role=OrganizationRoles.ORGANIZATION_ADMINISTRATOR)
        self.org_0_0_viewer = org_user_factory(organization=self.org_0_0,
                                               role=OrganizationRoles.VIEWER)
        self.cp_0_1 = channel_partner_factory(parent_channel_partner=self.cp_0, state=ChannelPartnerStates.SUSPENDED)
        self.cp_0_1_admin = cp_user_factory(channel_partner=self.cp_0_1)
        self.cp_0_1_manager = cp_user_factory(channel_partner=self.cp_0_1, role=ChannelPartnerRoles.MANAGER)
        self.org_0_1 = organization_factory(channel_partner=self.cp_0_1, state=ChannelPartnerStates.SHUTDOWN)
        self.org_0_1_admin = org_user_factory(organization=self.org_0_1,
                                               role=OrganizationRoles.ORGANIZATION_ADMINISTRATOR)
        self.org_0_1_viewer = org_user_factory(organization=self.org_0_1,
                                               role=OrganizationRoles.VIEWER)
        self.partner_task_spy = mocker.spy(run_partner_state_changed_tasks, 'apply_async')
        self.organization_task_spy = mocker.spy(run_organization_state_changed_tasks, 'apply_async')
        self.mocked_partner_notification_task = mocker.patch(
            'partners.tasks.notification.notification_partner_state_changed_task.apply_async')
        self.mocked_organization_notification_task = mocker.patch(
            'partners.tasks.notification.notification_organization_state_changed_task.apply_async')
        self.all_partners_and_organizations = {
            self.cp.id,
            self.cp_1.id,
            self.cp_0.id,
            self.cp_0_0.id,
            self.cp_0_1.id,
            self.org.id,
            self.org_1.id,
            self.org_0.id,
            self.org_0_0.id,
            self.org_0_1.id,

        }

    def test_partner_changed_only(self, django_capture_on_commit_callbacks, cloud_test_host):
        self.cp_0_1.state = ChannelPartnerStates.SHUTDOWN
        expected_changes = [self.cp_0_1.id]
        with django_capture_on_commit_callbacks(execute=False) as callbacks:
            self.cp_0_1.save()

        # This is due to the caching -- out of scope for this test
        callbacks = [callback for callback in callbacks if "on_channel_partner_saved" not in str(callback)]

        assert len(callbacks) == 2
        for callback in callbacks:
            callback()
        self.partner_task_spy.assert_called_once_with(args=[expected_changes])
        self.organization_task_spy.assert_called_once_with(args=[expected_changes])
        self.mocked_partner_notification_task.assert_called_once_with(args=[
            self.cp_0_1_admin.user.email,
            ChannelPartnerStates.SHUTDOWN,
            self.cp_0_1.name,
            cloud_test_host.hostname
        ])

    def test_partner_and_org(self, django_capture_on_commit_callbacks, cloud_test_host):
        self.cp_0_0.state = ChannelPartnerStates.SUSPENDED
        expected_changes = [self.cp_0_0.id, self.org_0_0.id]
        with django_capture_on_commit_callbacks(execute=False) as callbacks:
            self.cp_0_0.save()

        callbacks = [callback for callback in callbacks if "on_channel_partner_saved" not in str(callback)]

        assert len(callbacks) == 2
        for callback in callbacks:
            callback()
        self.partner_task_spy.assert_called_once()
        partner_task_call_args = self.partner_task_spy.call_args.kwargs['args'][0]
        assert set(partner_task_call_args) == set(expected_changes)
        self.organization_task_spy.assert_called_once()
        organization_task_call_args = self.organization_task_spy.call_args.kwargs['args'][0]
        assert set(organization_task_call_args) == set(expected_changes)
        self.mocked_partner_notification_task.assert_called_once_with(args=[
            self.cp_0_0_admin.user.email,
            ChannelPartnerStates.SUSPENDED,
            self.cp_0_0.name,
            cloud_test_host.hostname
        ])
        self.mocked_organization_notification_task.assert_called_once_with(args=[
            self.org_0_0_admin.user.email,
            ChannelPartnerStates.SUSPENDED,
            self.org_0_0.name,
            cloud_test_host.hostname
        ])

    def test_top_cp_suspend(self, django_capture_on_commit_callbacks, cloud_test_host):
        expected_changes = self.all_partners_and_organizations.difference({
            self.org_1.id,
            self.cp_0_1.id,
            self.org_0_1.id,
        })
        self.cp.state = ChannelPartnerStates.SUSPENDED
        with django_capture_on_commit_callbacks(execute=False) as callbacks:
            self.cp.save()

        callbacks = [callback for callback in callbacks if "on_channel_partner_saved" not in str(callback)]

        assert len(callbacks) == 2
        for callback in callbacks:
            callback()
        self.partner_task_spy.assert_called_once()
        partner_task_call_args = self.partner_task_spy.call_args.kwargs['args'][0]
        assert set(partner_task_call_args) == expected_changes
        self.organization_task_spy.assert_called_once()
        organization_task_call_args = self.organization_task_spy.call_args.kwargs['args'][0]
        assert set(organization_task_call_args) == expected_changes
        assert self.mocked_partner_notification_task.call_count == 4
        assert self.mocked_organization_notification_task.call_count == 3


@pytest.mark.no_tasks_autofix
class TestChannelPartnerUpdateState:
    @pytest.fixture(autouse=True)
    def setup_method(self, channel_partner_factory, cp_user_factory,
                     organization_factory, org_user_factory, mocker,
                     root_nx_channel_partner):
        self.cp = channel_partner_factory(parent_channel_partner=root_nx_channel_partner)
        self.org = organization_factory(channel_partner=self.cp)
        self.cp_0 = channel_partner_factory(parent_channel_partner=self.cp)
        self.org_0 = organization_factory(channel_partner=self.cp_0)
        self.cp_1 = channel_partner_factory(parent_channel_partner=self.cp)
        self.org_1 = organization_factory(channel_partner=self.cp_1, state=ChannelPartnerStates.SUSPENDED)
        self.cp_0_0 = channel_partner_factory(parent_channel_partner=self.cp_0)
        self.org_0_0 = organization_factory(channel_partner=self.cp_0_0)
        self.cp_0_1 = channel_partner_factory(parent_channel_partner=self.cp_0, state=ChannelPartnerStates.SUSPENDED)
        self.org_0_1 = organization_factory(channel_partner=self.cp_0_1, state=ChannelPartnerStates.SHUTDOWN)
        self.all_partners_and_organizations = {
            self.cp.id,
            self.cp_1.id,
            self.cp_0.id,
            self.cp_0_0.id,
            self.cp_0_1.id,
            self.org.id,
            self.org_1.id,
            self.org_0.id,
            self.org_0_0.id,
            self.org_0_1.id,
        }

    def test_shutdown(self):
        self.cp.state = ChannelPartnerStates.SHUTDOWN
        changed = self.cp.update_state()
        assert self.all_partners_and_organizations.difference(set(changed)) == {self.org_0_1.id}

    def test_suspend(self):
        self.cp.state = ChannelPartnerStates.SUSPENDED
        diff = {
            self.org_1.id,
            self.cp_0_1.id,
            self.org_0_1.id,
        }
        changed = self.cp.update_state()
        assert self.all_partners_and_organizations.difference(set(changed)) == diff
