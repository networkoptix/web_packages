import json
from uuid import uuid4

import httpx
import pytest
from celery.exceptions import Ignore
from django.conf import settings
from django.core.cache import caches
from mock.mock import MagicMock

from partners.models import (
    ChannelPartnerRoles,
    NotificationTypes,
    OrganizationRoles,
)
from partners.tasks.notification import (
    MessageNotPosted,
    get_customization,
    get_user_by_email,
    is_existing_user,
    organization_name_change_task,
    partner_name_change_task,
    run_organization_name_change_tasks,
    run_partner_name_change_tasks,
)


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
            mocker.call(args=(admin.user.email, 'old_name', 'new_name', self.cp.cloud_host.hostname))
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
            mocker.call(args=(admin.user.email, old_name, 'new_name', self.cp.cloud_host.hostname))
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
            mocker.call(args=(admin.user.email, 'old_name', 'new_name', self.cp.cloud_host.hostname))
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
            mocker.call(args=(admin.user.email, old_name, 'new_name', self.cp.cloud_host.hostname))
            for admin in self.admins
        ]

        task_mock.assert_has_calls(calls, any_order=True)
