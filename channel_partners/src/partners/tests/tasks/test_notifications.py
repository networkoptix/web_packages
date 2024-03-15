import json
from uuid import uuid4

import httpx
import pytest
from celery.exceptions import Ignore
from django.conf import settings
from django.core.cache import caches
from mock.mock import (
    MagicMock,
    call,
)

from partners.models import (
    ChannelPartnerRoles,
    ChannelPartnerStates,
    NotificationTypes,
    OrganizationRoles,
)
from partners.tasks.notification import (
    MessageNotPosted,
    get_customization,
    get_user_by_email,
    is_existing_user,
    notification_organization_state_changed_task,
    notification_partner_state_changed_task,
    organization_name_change_task,
    partner_name_change_task,
    run_organization_name_change_tasks,
    run_organization_state_changed_tasks,
    run_partner_name_change_tasks,
    run_partner_state_changed_tasks,
)


@pytest.mark.no_tasks_autofix
def test_get_customization(mock_get_customization_request, request_host, httpx_mock):
    caches['default'].clear()
    customization = f'{uuid4()}'
    url = mock_get_customization_request(customization_name=customization)
    assert get_customization(request_host) == customization
    sent_requset = httpx_mock.get_request(url=url)
    assert sent_requset
    # Test cached
    httpx_mock.reset(False)
    url = mock_get_customization_request(customization_name=customization)
    assert get_customization(request_host) == customization
    sent_requset = httpx_mock.get_request(url=url)
    assert sent_requset is None


@pytest.mark.no_tasks_autofix
def test_get_general_notification_type(mock_account_status, request_host, httpx_mock):
    email = f'{uuid4()}@example.com'
    mock_account_status(email=email, active=True)
    assert is_existing_user(host=request_host, email=email)

    httpx_mock.reset(True)
    mock_account_status(email=email, active=False)
    assert is_existing_user(host=request_host, email=email) is False


def test_get_user_by_email(cloud_user_factory):
    task = MagicMock()
    task.update_state = MagicMock()
    user = cloud_user_factory()
    result = get_user_by_email(task, user.email)
    assert user == result
    task.update_state.assert_not_called()
    try:
        get_user_by_email(task, f'{uuid4()}@example.com')
    except Ignore:
        assert True
    else:
        assert False, 'Ignore must be raised'
    task.update_state.assert_called_once()

class TestPartnerNameChangeTask:
    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, cp_user_factory):
        self.cp = channel_partner_factory()
        self.admin = cp_user_factory(channel_partner=self.cp)
        auth = httpx.BasicAuth(*settings.NOTIFICATION_SECRET)
        self.basic_auth_header = auth._build_auth_header(*settings.NOTIFICATION_SECRET)
        caches['default'].clear()

    @pytest.mark.no_tasks_autofix
    def test_success(self, httpx_mock, mocker, mock_get_customization_request, cloud_test_host):
        post_notification_url = f'https://{cloud_test_host.hostname}/notifications/send'
        customization_url = mock_get_customization_request()
        httpx_mock.add_response(status_code=200, json={}, url=post_notification_url)
        partner_name_change_task(self.admin.user.email,
                                 'old_name',
                                 'new_name',
                                 cloud_test_host.hostname)
        assert httpx_mock.get_request(url=customization_url) is not None
        post_notification_request = httpx_mock.get_request(url=post_notification_url)
        assert post_notification_request.headers['Authorization'] == self.basic_auth_header
        notification_data = json.loads(post_notification_request.content)
        assert notification_data['userFullName'] is None
        assert notification_data['type'] == NotificationTypes.cps_partner_name_change
        assert notification_data['customization'] == 'default'
        assert notification_data['user_email'] == self.admin.user.email
        assert notification_data['message'] == {
            'userFullName': self.admin.user.email,
            'old_partner_name': 'old_name',
            'new_partner_name': 'new_name',
        }
        httpx_mock.reset(False)
        post_notification_url = f'https://{cloud_test_host.hostname}/notifications/send'
        customization_url = mock_get_customization_request()
        httpx_mock.add_response(status_code=200, json={}, url=post_notification_url)
        self.admin.user.full_name = 'Full Name'
        self.admin.user.save()
        partner_name_change_task(self.admin.user.email,
                                 'old_name',
                                 'new_name',
                                 cloud_test_host.hostname)
        # customization cached
        assert httpx_mock.get_request(url=customization_url) is None
        post_notification_request = httpx_mock.get_request(url=post_notification_url)
        assert post_notification_request.headers['Authorization'] == self.basic_auth_header
        notification_data = json.loads(post_notification_request.content)
        assert notification_data['userFullName'] == 'Full Name'
        assert notification_data['type'] == NotificationTypes.cps_partner_name_change
        assert notification_data['user_email'] == self.admin.user.email
        assert notification_data['message'] == {
            'userFullName': 'Full Name',
            'old_partner_name': 'old_name',
            'new_partner_name': 'new_name',
        }

    @pytest.mark.no_tasks_autofix
    def test_failed_response(self, httpx_mock, random_email, mock_get_customization_request, cloud_test_host):
        post_notification_url = f'https://{cloud_test_host.hostname}/notifications/send'
        customization_url = mock_get_customization_request()
        httpx_mock.add_response(status_code=400, json={}, url=post_notification_url)
        try:
            partner_name_change_task(self.admin.user.email,
                                     'old_name',
                                     'new_name',
                                     cloud_test_host.hostname)
        except MessageNotPosted:
            assert True
        else:
            assert False, 'Message not posted must be raised'
        assert httpx_mock.get_request(url=customization_url) is not None
        post_notification_request = httpx_mock.get_request(url=post_notification_url)
        assert post_notification_request.headers['Authorization'] == self.basic_auth_header
        notification_data = json.loads(post_notification_request.content)
        assert notification_data['userFullName'] is None
        assert notification_data['type'] == NotificationTypes.cps_partner_name_change
        assert notification_data['user_email'] == self.admin.user.email
        assert notification_data['message'] == {
            'userFullName': self.admin.user.email,
            'old_partner_name': 'old_name',
            'new_partner_name': 'new_name',
        }


class TestOrganizationNameChangeTask:
    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory, org_user_factory):
        self.cp = channel_partner_factory()
        self.organization = organization_factory(channel_partner=self.cp)
        self.admin = org_user_factory(organization=self.organization)
        auth = httpx.BasicAuth(*settings.NOTIFICATION_SECRET)
        self.basic_auth_header = auth._build_auth_header(*settings.NOTIFICATION_SECRET)
        caches['default'].clear()

    @pytest.mark.no_tasks_autofix
    def test_success(self, httpx_mock, mocker, mock_get_customization_request, cloud_test_host):
        post_notification_url = f'https://{cloud_test_host.hostname}/notifications/send'
        customization_url = mock_get_customization_request()
        httpx_mock.add_response(status_code=200, json={}, url=post_notification_url)
        organization_name_change_task(self.admin.user.email,
                                      'old_name',
                                      'new_name',
                                      cloud_test_host.hostname)
        assert httpx_mock.get_request(url=customization_url) is not None
        post_notification_request = httpx_mock.get_request(url=post_notification_url)
        assert post_notification_request.headers['Authorization'] == self.basic_auth_header
        notification_data = json.loads(post_notification_request.content)
        assert notification_data['userFullName'] is None
        assert notification_data['type'] == NotificationTypes.cps_organization_name_change
        assert notification_data['user_email'] == self.admin.user.email
        assert notification_data['customization'] == 'default'
        assert notification_data['message'] == {
            'userFullName': self.admin.user.email,
            'old_organization_name': 'old_name',
            'new_organization_name': 'new_name',
        }
        httpx_mock.reset(False)
        post_notification_url = f'https://{cloud_test_host.hostname}/notifications/send'
        customization_url = mock_get_customization_request()
        httpx_mock.add_response(status_code=200, json={}, url=post_notification_url)
        self.admin.user.full_name = 'Full Name'
        self.admin.user.save()
        organization_name_change_task(self.admin.user.email,
                                      'old_name',
                                      'new_name',
                                      cloud_test_host.hostname)
        # customization cached
        assert httpx_mock.get_request(url=customization_url) is None
        post_notification_request = httpx_mock.get_request(url=post_notification_url)
        assert post_notification_request.headers['Authorization'] == self.basic_auth_header
        notification_data = json.loads(post_notification_request.content)
        assert notification_data['userFullName'] == 'Full Name'
        assert notification_data['type'] == NotificationTypes.cps_organization_name_change
        assert notification_data['user_email'] == self.admin.user.email
        assert notification_data['message'] == {
            'userFullName': 'Full Name',
            'old_organization_name': 'old_name',
            'new_organization_name': 'new_name',
        }

    @pytest.mark.no_tasks_autofix
    def test_failed_response(self, httpx_mock, random_email, mock_get_customization_request, cloud_test_host):
        post_notification_url = f'https://{cloud_test_host.hostname}/notifications/send'
        customization_url = mock_get_customization_request('hanwha')
        httpx_mock.add_response(status_code=400, json={}, url=post_notification_url)
        try:
            organization_name_change_task(self.admin.user.email,
                                          'old_name',
                                          'new_name',
                                          cloud_test_host.hostname)
        except MessageNotPosted:
            assert True
        else:
            assert False, 'Message not posted must be raised'
        assert httpx_mock.get_request(url=customization_url) is not None
        post_notification_request = httpx_mock.get_request(url=post_notification_url)
        assert post_notification_request.headers['Authorization'] == self.basic_auth_header
        notification_data = json.loads(post_notification_request.content)
        assert notification_data['userFullName'] is None
        assert notification_data['customization'] == 'hanwha'
        assert notification_data['type'] == NotificationTypes.cps_organization_name_change
        assert notification_data['user_email'] == self.admin.user.email
        assert notification_data['message'] == {
            'userFullName': self.admin.user.email,
            'old_organization_name': 'old_name',
            'new_organization_name': 'new_name',
        }


class TestRunOrganizationNameChangeTask:
    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory, org_user_factory):
        self.cp = channel_partner_factory()
        self.organization = organization_factory(channel_partner=self.cp)
        self.admins = [org_user_factory(organization=self.organization) for _ in range(5)]
        self.users = [
            org_user_factory(organization=self.organization, role=OrganizationRoles.VIEWER)
            for _ in range(5)
        ]
        auth = httpx.BasicAuth(*settings.NOTIFICATION_SECRET)
        self.basic_auth_header = auth._build_auth_header(*settings.NOTIFICATION_SECRET)
        caches['default'].clear()

    def test_success_run(self, mocker):
        task_mock = mocker.patch('partners.tasks.notification.organization_name_change_task.apply_async')

        run_organization_name_change_tasks(self.organization, 'old_name', 'new_name')
        assert task_mock.call_count == len(self.admins)
        calls = [
            mocker.call(args=[admin.user.email, 'old_name', 'new_name', self.cp.cloud_host.hostname])
            for admin in self.admins
        ]

        task_mock.assert_has_calls(calls, any_order=True)

    def test_model_save(self, mocker):
        task_mock = mocker.patch('partners.tasks.notification.organization_name_change_task.apply_async')

        old_name = self.organization.name
        self.organization.save()
        task_mock.assert_not_called()

        self.organization.name = 'new_name'
        self.organization.save()

        assert task_mock.call_count == len(self.admins)
        calls = [
            mocker.call(args=[admin.user.email, old_name, 'new_name', self.cp.cloud_host.hostname])
            for admin in self.admins
        ]

        task_mock.assert_has_calls(calls, any_order=True)


class TestRunPartnerNameChangeTask:
    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory, cp_user_factory):
        self.cp = channel_partner_factory()
        self.admins = [cp_user_factory(channel_partner=self.cp) for _ in range(5)]
        self.users = [
            cp_user_factory(channel_partner=self.cp, role=ChannelPartnerRoles.MANAGER)
            for _ in range(5)
        ]
        auth = httpx.BasicAuth(*settings.NOTIFICATION_SECRET)
        self.basic_auth_header = auth._build_auth_header(*settings.NOTIFICATION_SECRET)
        caches['default'].clear()

    def test_success_run(self, mocker):
        task_mock = mocker.patch('partners.tasks.notification.partner_name_change_task.apply_async')

        run_partner_name_change_tasks(self.cp, 'old_name', 'new_name')
        assert task_mock.call_count == len(self.admins)
        calls = [
            mocker.call(args=[admin.user.email, 'old_name', 'new_name', self.cp.cloud_host.hostname])
            for admin in self.admins
        ]

        task_mock.assert_has_calls(calls, any_order=True)

    def test_model_save(self, mocker):
        task_mock = mocker.patch('partners.tasks.notification.partner_name_change_task.apply_async')

        old_name = self.cp.name
        self.cp.save()
        task_mock.assert_not_called()

        self.cp.name = 'new_name'
        self.cp.save()

        assert task_mock.call_count == len(self.admins)
        calls = [
            mocker.call(args=[admin.user.email, old_name, 'new_name', self.cp.cloud_host.hostname])
            for admin in self.admins
        ]

        task_mock.assert_has_calls(calls, any_order=True)


class TestNotificationOrganizationStateChangedTask:

    @pytest.fixture(autouse=True)
    def setup(self, organization_factory, org_user_factory, mock_post_notification, mock_get_customization_request):
        self.active_organization = organization_factory(state=ChannelPartnerStates.ACTIVE)
        self.suspended_organization = organization_factory(state=ChannelPartnerStates.SUSPENDED)
        self.shutdown_organization = organization_factory(state=ChannelPartnerStates.SHUTDOWN)
        roles = [OrganizationRoles.ORGANIZATION_ADMINISTRATOR, OrganizationRoles.ADMINISTRATOR]
        for role in roles:
            for _ in range(2):
                org_user_factory(organization=self.active_organization, role=role)
                org_user_factory(organization=self.suspended_organization, role=role)
                org_user_factory(organization=self.shutdown_organization, role=role)
        self.post_notification_url = mock_post_notification()
        mock_get_customization_request()

    def test_active_state(self, httpx_mock, cloud_test_host):
        user = self.active_organization.users.first()
        notification_organization_state_changed_task(
            user.email,
            self.active_organization.effective_state,
            self.active_organization.name,
            cloud_test_host
        )
        notification_request = httpx_mock.get_request(url=self.post_notification_url)
        assert notification_request
        notification_data = json.loads(notification_request.content)
        assert notification_data['userFullName'] == user.full_name
        assert notification_data['user_email'] == user.email
        assert notification_data['type'] == NotificationTypes.cps_organization_state_active
        assert notification_data['message']['userFullName'] == (user.full_name or user.email)
        assert notification_data['message']['organization_name'] == self.active_organization.name
        assert notification_data['message']['status_name'] == 'active'

    def test_active_suspended(self, httpx_mock, cloud_test_host):
        user = self.suspended_organization.users.first()
        notification_organization_state_changed_task(
            user.email,
            self.suspended_organization.effective_state,
            self.suspended_organization.name,
            cloud_test_host
        )
        notification_request = httpx_mock.get_request(url=self.post_notification_url)
        assert notification_request
        notification_data = json.loads(notification_request.content)
        assert notification_data['userFullName'] == user.full_name
        assert notification_data['user_email'] == user.email
        assert notification_data['type'] == NotificationTypes.cps_organization_state_suspended
        assert notification_data['message']['userFullName'] == (user.full_name or user.email)
        assert notification_data['message']['organization_name'] == self.suspended_organization.name
        assert notification_data['message']['status_name'] == 'suspended'

    def test_active_shutdown(self, httpx_mock, cloud_test_host):
        user = self.shutdown_organization.users.first()
        notification_organization_state_changed_task(
            user.email,
            self.shutdown_organization.effective_state,
            self.shutdown_organization.name,
            cloud_test_host
        )
        notification_request = httpx_mock.get_request(url=self.post_notification_url)
        assert notification_request
        notification_data = json.loads(notification_request.content)
        assert notification_data['userFullName'] == user.full_name
        assert notification_data['user_email'] == user.email
        assert notification_data['type'] == NotificationTypes.cps_organization_state_suspended
        assert notification_data['message']['userFullName'] == (user.full_name or user.email)
        assert notification_data['message']['organization_name'] == self.shutdown_organization.name
        assert notification_data['message']['status_name'] == 'shutdown'


class TestNotificationPartnerStateChangedTask:

    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, cp_user_factory, mock_post_notification, mock_get_customization_request):
        self.active_partner = channel_partner_factory(state=ChannelPartnerStates.ACTIVE)
        self.suspended_partner = channel_partner_factory(state=ChannelPartnerStates.SUSPENDED)
        self.shutdown_partner = channel_partner_factory(state=ChannelPartnerStates.SHUTDOWN)
        roles = [OrganizationRoles.ORGANIZATION_ADMINISTRATOR, OrganizationRoles.ADMINISTRATOR]
        for role in roles:
            for _ in range(2):
                cp_user_factory(channel_partner=self.active_partner, role=role)
                cp_user_factory(channel_partner=self.suspended_partner, role=role)
                cp_user_factory(channel_partner=self.shutdown_partner, role=role)
        self.post_notification_url = mock_post_notification()
        mock_get_customization_request()

    def test_active_state(self, httpx_mock, cloud_test_host):
        user = self.active_partner.users.first()
        notification_partner_state_changed_task(
            user.email,
            self.active_partner.effective_state,
            self.active_partner.name,
            cloud_test_host
        )
        notification_request = httpx_mock.get_request(url=self.post_notification_url)
        assert notification_request
        notification_data = json.loads(notification_request.content)
        assert notification_data['userFullName'] == user.full_name
        assert notification_data['user_email'] == user.email
        assert notification_data['type'] == NotificationTypes.cps_partner_state_active
        assert notification_data['message']['userFullName'] == (user.full_name or user.email)
        assert notification_data['message']['partner_name'] == self.active_partner.name
        assert notification_data['message']['status_name'] == 'active'

    def test_active_suspended(self, httpx_mock, cloud_test_host):
        user = self.suspended_partner.users.first()
        notification_partner_state_changed_task(
            user.email,
            self.suspended_partner.effective_state,
            self.suspended_partner.name,
            cloud_test_host
        )
        notification_request = httpx_mock.get_request(url=self.post_notification_url)
        assert notification_request
        notification_data = json.loads(notification_request.content)
        assert notification_data['userFullName'] == user.full_name
        assert notification_data['user_email'] == user.email
        assert notification_data['type'] == NotificationTypes.cps_partner_state_suspended
        assert notification_data['message']['userFullName'] == (user.full_name or user.email)
        assert notification_data['message']['partner_name'] == self.suspended_partner.name
        assert notification_data['message']['status_name'] == 'suspended'

    def test_active_shutdown(self, httpx_mock, cloud_test_host):
        user = self.shutdown_partner.users.first()
        notification_partner_state_changed_task(
            user.email,
            self.shutdown_partner.effective_state,
            self.shutdown_partner.name,
            cloud_test_host
        )
        notification_request = httpx_mock.get_request(url=self.post_notification_url)
        assert notification_request
        notification_data = json.loads(notification_request.content)
        assert notification_data['userFullName'] == user.full_name
        assert notification_data['user_email'] == user.email
        assert notification_data['type'] == NotificationTypes.cps_partner_state_suspended
        assert notification_data['message']['userFullName'] == (user.full_name or user.email)
        assert notification_data['message']['partner_name'] == self.shutdown_partner.name
        assert notification_data['message']['status_name'] == 'shutdown'


class TestRunOrganizationStateChangedTask:

    @pytest.fixture(autouse=True)
    def setup(self, organization_factory, org_user_factory,
              mock_post_notification, mock_get_customization_request,
              mocker):
        self.active_organization = organization_factory(state=ChannelPartnerStates.ACTIVE)
        self.suspended_organization = organization_factory(state=ChannelPartnerStates.SUSPENDED)
        self.shutdown_organization = organization_factory(state=ChannelPartnerStates.SHUTDOWN)
        self.organizations = [self.active_organization, self.suspended_organization, self.shutdown_organization]
        roles = [OrganizationRoles.ORGANIZATION_ADMINISTRATOR, OrganizationRoles.ADMINISTRATOR]
        for role in roles:
            for _ in range(2):
                org_user_factory(organization=self.active_organization, role=role)
                org_user_factory(organization=self.suspended_organization, role=role)
                org_user_factory(organization=self.shutdown_organization, role=role)
        self.notification_mock = (
            mocker.patch('partners.tasks.notification.notification_organization_state_changed_task.apply_async'))

    def test_run_organization_state_changed_tasks(self, cloud_test_host):
        args = [
            self.active_organization.id,
            self.shutdown_organization.id,
            self.suspended_organization.id,
            uuid4(),
            uuid4(),
            uuid4(),
        ]
        run_organization_state_changed_tasks(args)
        self.notification_mock.assert_called()
        calls = []
        for organization in self.organizations:
            for relation in organization.organizationtouser_set.filter(
                    roles__contains=[OrganizationRoles.ORGANIZATION_ADMINISTRATOR]):
                calls.append(
                    call(
                        args=[
                            relation.user.email,
                            organization.state,
                            organization.name,
                            cloud_test_host.hostname
                        ]
                    )
                )
        assert len(calls) == 2 * len(self.organizations)
        assert len(calls) == self.notification_mock.call_count
        self.notification_mock.assert_has_calls(calls, any_order=True)


class TestRunChannelPartnerStateChangedTask:

    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, cp_user_factory,
              mock_post_notification, mock_get_customization_request,
              mocker):
        self.active_partner = channel_partner_factory(state=ChannelPartnerStates.ACTIVE)
        self.suspended_partner = channel_partner_factory(state=ChannelPartnerStates.SUSPENDED)
        self.shutdown_partner = channel_partner_factory(state=ChannelPartnerStates.SHUTDOWN)
        self.partners = [self.active_partner, self.suspended_partner, self.shutdown_partner]
        roles = [ChannelPartnerRoles.ADMINISTRATOR, ChannelPartnerRoles.MANAGER]
        for role in roles:
            for _ in range(2):
                cp_user_factory(channel_partner=self.active_partner, role=role)
                cp_user_factory(channel_partner=self.suspended_partner, role=role)
                cp_user_factory(channel_partner=self.shutdown_partner, role=role)
        self.notification_mock = (
            mocker.patch('partners.tasks.notification.notification_partner_state_changed_task.apply_async'))

    def test_run_partner_state_changed_tasks(self, cloud_test_host):
        args = [
            self.active_partner.id,
            self.shutdown_partner.id,
            self.suspended_partner.id,
            uuid4(),
            uuid4(),
            uuid4(),
        ]
        run_partner_state_changed_tasks(args)
        self.notification_mock.assert_called()
        calls = []
        for partner in self.partners:
            for relation in partner.channelpartnertouser_set.filter(
                    roles__contains=[ChannelPartnerRoles.ADMINISTRATOR]):
                calls.append(
                    call(
                        args=[
                            relation.user.email,
                            partner.state,
                            partner.name,
                            cloud_test_host.hostname
                        ]
                    )
                )
        assert len(calls) == 2 * len(self.partners)
        assert len(calls) == self.notification_mock.call_count
        self.notification_mock.assert_has_calls(calls, any_order=True)