import pytest

from partners.models import (
    ChannelPartnerStates,
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
        self.mocked_task.assert_called_once_with(args=[self.organization.id])

    def test_shutdown(self, django_capture_on_commit_callbacks):
        self.organization.state = ChannelPartnerStates.SHUTDOWN
        with django_capture_on_commit_callbacks(execute=False) as callbacks:
            self.organization.save()
        assert len(callbacks) == 1
        callbacks[0]()
        self.mocked_task.assert_called_once_with(args=[self.organization.id])