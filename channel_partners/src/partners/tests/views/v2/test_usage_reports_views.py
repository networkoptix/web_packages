import datetime
import json
from typing import Any
from urllib.parse import urlencode
from uuid import uuid4

import pytest
from dateutil.relativedelta import relativedelta
from django.core.cache import caches
from django.utils import timezone
from mock.mock import MagicMock
from moto import mock_aws
from rest_framework.reverse import reverse
from rest_framework.test import APIClient

from partners.models import (
    ChannelPartnerService,
    HierarchyLevels,
    OrganizationRoles,
    ReportSnapshot,
)
from partners.services.reports_export_service import ReportFormat
from partners.services.usage_reports_service import (
    ChannelPartnerReportsService,
    CloudSystemReportsService,
    OrganizationReportsService,
)
from partners.tasks.constants import ReportTaskState
from partners.tasks.service_reports_export import (
    ReportType,
    get_cached_requests_key,
    get_queued_report_key,
)
from partners.tasks.services import new_channel_partner_created
from partners.tasks.usage_reports import calculate_all_reports
from partners.views.v2.usage_reports_views import get_hierarchy_level
from tools.helpers import get_today


class TestOrganizationServiceReportsViewSet:

    @pytest.fixture(autouse=True)
    def setup_method(self, channel_partner_factory, organization_factory, org_user_factory,
                     system_factory, cp_service_factory, service_record_factory, cloud_test_host):
        self.requested_date = get_today() - relativedelta(days=1)
        self.requested_date = self.requested_date.replace(day=10)

        self.period_query_param = f'?periodStartDate={self.requested_date}'

        self.cp = channel_partner_factory()

        self.org = organization_factory(channel_partner=self.cp)
        self.org_admin = org_user_factory(organization=self.org)
        self.org_viewer = org_user_factory(organization=self.org, role=OrganizationRoles.VIEWER)

        self.system = system_factory(organization=self.org)
        self.system.created_ts = self.requested_date.replace(day=1)
        self.system.save()

        self.service = cp_service_factory(channel_partner=self.cp)

        self.service_record = service_record_factory(
            service=self.service,
            cloud_system=self.system,
            quantity=1,
            created_ts=self.requested_date.replace(day=1),
            effective_ts=self.requested_date.replace(day=1),
        )
        self.expiring_service = cp_service_factory(
            channel_partner=self.cp,
            parent_service=self.service,
            sub_type=ChannelPartnerService.DEMO,
            duration=30)

        self.expiring_service_record = service_record_factory(
            service=self.expiring_service,
            cloud_system=self.system,
            quantity=1,
            created_ts=datetime.datetime.now(),
            effective_ts=self.requested_date.replace(day=1),
        )

        self.client = APIClient(SERVER_NAME=cloud_test_host.hostname)
        calculate_all_reports()

    def test_403_forbidden(self, mock_auth_with_user, mocker):
        report_value = [{f'{uuid4()}': f'{uuid4()}'} for _ in range(3)]
        path_kwargs = {
            "parent_lookup_organization": self.org.pk,
            "service_id": self.service.pk,
        }
        path = reverse('v2:organizations-reports-regular-detail-table', kwargs=path_kwargs)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        mock_auth_with_user(self.org_viewer)
        response = self.client.get(path)
        assert response.status_code == 403

    def test_regular_detail_table(self, mock_auth_with_user, mocker):
        report_value = [{f'{uuid4()}': f'{uuid4()}'} for _ in range(3)]
        report_spy = mocker.spy(
            OrganizationReportsService, "get_regular_detail_table",
        )
        path_kwargs = {
            "parent_lookup_organization": self.org.pk,
            "service_id": self.service.pk,
        }
        path = reverse('v2:organizations-reports-regular-detail-table', kwargs=path_kwargs)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        mock_auth_with_user(self.org_admin)
        response = self.client.get(path + self.period_query_param)
        assert response.status_code == 200
        assert response.data
        report_spy.assert_called_once_with(
            organization=self.org, service=self.service, period_start=self.requested_date)

        # not existing for period
        path += '?periodStartDate=2020-06-26'
        report_spy.reset_mock()
        response = self.client.get(path)
        assert response.status_code == 403

    def test_expiring_detail_table(self, mock_auth_with_user, mocker):
        report_spy = mocker.spy(
            OrganizationReportsService, "get_expiring_detail_table",
        )
        path_kwargs = {
            "parent_lookup_organization": self.org.pk,
            "service_id": self.expiring_service.pk,
        }
        path = reverse('v2:organizations-reports-expiring-detail-table', kwargs=path_kwargs)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        mock_auth_with_user(self.org_admin)
        response = self.client.get(path + self.period_query_param)
        assert response.status_code == 200
        report_spy.assert_called_once_with(
            organization=self.org, service=self.expiring_service, period_start=self.requested_date)

        # not existing for period
        path += '?periodStartDate=2020-06-26'
        report_spy.reset_mock()
        response = self.client.get(path)
        assert response.status_code == 403

    def test_regular_service_report(self, mock_auth_with_user, mocker):
        report_value = [{f'{uuid4()}': f'{uuid4()}'} for _ in range(3)]
        report_spy = mocker.spy(
            OrganizationReportsService, "get_regular_service_report",
        )
        path_kwargs = {
            "parent_lookup_organization": self.org.pk,
            "service_id": self.service.pk,
        }
        path = reverse('v2:organizations-reports-regular-service-report', kwargs=path_kwargs)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        mock_auth_with_user(self.org_admin)
        response = self.client.get(path + self.period_query_param)
        assert response.status_code == 200
        assert response.data
        report_spy.assert_called_once_with(
            organization=self.org, service=self.service, period_start=self.requested_date)

        # not existing for period
        path += '?periodStartDate=2020-06-26'
        report_spy.reset_mock()
        response = self.client.get(path)
        assert response.status_code == 403

    def test_expiring_service_report(self, mock_auth_with_user, mocker):
        report_spy = mocker.spy(
            OrganizationReportsService, "get_expiring_service_report",
        )
        path_kwargs = {
            "parent_lookup_organization": self.org.pk,
            "service_id": self.expiring_service.pk,
        }

        path = reverse('v2:organizations-reports-expiring-service-report', kwargs=path_kwargs)

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        mock_auth_with_user(self.org_admin)
        response = self.client.get(path + self.period_query_param)

        assert response.status_code == 200
        report_spy.assert_called_once_with(
            organization=self.org,
            service=self.expiring_service,
            period_start=self.requested_date)

        # not existing for period
        path += '?periodStartDate=2020-06-26'
        report_spy.reset_mock()
        response = self.client.get(path)
        assert response.status_code == 403

    # def test_system_report(self, mock_auth_with_user, mocker):
    #     report_spy = mocker.spy(
    #         OrganizationReportsService, "get_regular_system_reports",
    #     )
    #     path_kwargs = {
    #         "parent_lookup_organization": self.org.pk,
    #         "service_id": self.service.pk,
    #     }
    #     path = reverse('v2:organizations-reports-system-reports', kwargs=path_kwargs)
    #     self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
    #     mock_auth_with_user(self.org_admin)
    #     response = self.client.get(path + self.period_query_param)
    #     assert response.status_code == 200
    #     assert response.data
    #     report_spy.assert_called_once_with(
    #         organization=self.org, service=self.service, period_start=self.requested_date)
    #
    #     # not existing for period
    #     path += '?periodStartDate=2020-06-26'
    #     report_spy.reset_mock()
    #     response = self.client.get(path)
    #     assert response.status_code == 403

    def test_system_regular_report(self, mock_auth_with_user, mocker):
        report_spy = mocker.spy(CloudSystemReportsService, "get_regular_report", )
        path_kwargs = {
            "parent_lookup_organization": self.org.pk,
            "service_id": self.service.pk,
            "cloud_system_id": self.system.system_id,
        }
        path = reverse('v2:organizations-reports-system-regular-detail-table', kwargs=path_kwargs)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        mock_auth_with_user(self.org_admin)
        response = self.client.get(path + self.period_query_param)
        assert response.data
        assert response.status_code == 200
        report_spy.assert_called_once_with(
            cloud_system=self.system,
            organization=self.org,
            service=self.service,
            period_start=self.requested_date)

        path += '?periodStartDate=2020-06-26'
        report_spy.reset_mock()
        response = self.client.get(path)
        assert response.status_code == 403
        report_spy.assert_called_once_with(
            cloud_system=self.system,
            organization=self.org,
            service=self.service,
            period_start=datetime.date(2020, 6, 26))

    def test_system_expiring_report(self, mock_auth_with_user, mocker):
        report_spy = mocker.spy(CloudSystemReportsService, "get_expiring_report", )
        path_kwargs = {
            "parent_lookup_organization": self.org.pk,
            "service_id": self.expiring_service.pk,
            "cloud_system_id": self.system.system_id,
        }
        path = reverse('v2:organizations-reports-system-expiring-detail-table', kwargs=path_kwargs)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        mock_auth_with_user(self.org_admin)
        response = self.client.get(path + self.period_query_param)
        assert response.data
        assert response.status_code == 200
        report_spy.assert_called_once_with(
            cloud_system=self.system,
            organization=self.org,
            service=self.expiring_service,
            period_start=self.requested_date)

        # not existing for period
        path += '?periodStartDate=2020-06-26'
        report_spy.reset_mock()
        response = self.client.get(path)
        assert response.status_code == 403

    def test_usage_report(self, mock_auth_with_user, mocker):
        report_spy = mocker.spy(OrganizationReportsService, "get_organization_report", )
        path_kwargs = {
            "parent_lookup_organization": self.org.pk,
        }
        path = reverse('v2:organizations-reports-usage-report', kwargs=path_kwargs)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        mock_auth_with_user(self.org_admin)
        response = self.client.get(path + self.period_query_param)
        assert response.status_code == 200
        report_spy.assert_called_once_with(
            organization=self.org, period_start=self.requested_date)

        path += '?periodStartDate=2020-06-26'
        report_spy.reset_mock()
        response = self.client.get(path)
        assert response.status_code == 403
        report_spy.assert_called_once_with(
            organization=self.org, period_start=datetime.date(2020, 6, 26))


class TestChannelPartnerServiceReportsViewSet:

    @pytest.fixture(autouse=True)
    def setup_method(self, channel_partner_factory, organization_factory,
                     org_user_factory, system_factory, cp_service_factory,
                     service_record_factory, cloud_test_host, cp_user_factory):
        # Define the date for the report and the corresponding query parameter
        self.report_date = get_today() - relativedelta(days=1)
        self.report_date.replace(day=10)
        self.report_date_query_param = f'?periodStartDate={self.report_date}'

        # Create channel partners and associated users
        self.parent_channel_partner = channel_partner_factory(name="Parent Channel Partner")
        self.channel_partner = channel_partner_factory(parent_channel_partner=self.parent_channel_partner, name="Channel Partner")
        self.channel_partner_admin = cp_user_factory(channel_partner=self.channel_partner, email="admin@channel_partner.com")

        # Create organizations and associated users
        self.organization = organization_factory(
            channel_partner=self.channel_partner,
            name="Organization")
        self.organization_viewer = org_user_factory(
            organization=self.organization,
            email="org-viewer@organization.com",
            role=OrganizationRoles.VIEWER)

        # Create a system for the organization
        self.system = system_factory(organization=self.organization)
        self.system.created_ts = timezone.now()
        self.system.save()

        # Create services for the channel partners
        self.parent_channel_service = cp_service_factory(
            channel_partner=self.parent_channel_partner)
        self.service = cp_service_factory(
            channel_partner=self.channel_partner,
            parent_service=self.parent_channel_service)
        self.expiring_service = cp_service_factory(
            channel_partner=self.channel_partner,
            parent_service=self.service,
            sub_type=ChannelPartnerService.DEMO,
            duration=1)

        # Create service records for the services
        self.service_record = service_record_factory(
            service=self.service,
            cloud_system=self.system,
            quantity=1,
            created_ts=self.report_date.replace(day=1),
            effective_ts=self.report_date.replace(day=1),
        )
        self.test_expiring_service_record = service_record_factory(
            service=self.expiring_service,
            cloud_system=self.system,
            quantity=1,
            created_ts=datetime.datetime.now(),
            effective_ts=self.report_date.replace(day=1),
        )

        # Initialize the API client
        self.client = APIClient(SERVER_NAME=cloud_test_host.hostname)

        # Generate all reports
        calculate_all_reports()

    def test_403_forbidden(self, mock_auth_with_user, mocker):
        report_value = [{f'{uuid4()}': f'{uuid4()}'} for _ in range(3)]
        path_kwargs = {
            "parent_lookup_channel_partner": self.channel_partner.pk,
        }
        path = reverse('v2:channelpartners-reports-usage-report', kwargs=path_kwargs)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        mock_auth_with_user(self.organization_viewer)
        response = self.client.get(path)
        assert response.status_code == 403

    def test_regular_detail_table(self, mock_auth_with_user, mocker):
        report_value = [{f'{uuid4()}': f'{uuid4()}'} for _ in range(3)]
        report_spy = mocker.spy(
            ChannelPartnerReportsService, "get_regular_detail_table",
        )
        path_kwargs = {
            "parent_lookup_channel_partner": self.channel_partner.pk,
            "service_id": self.parent_channel_service.pk,
        }
        path = reverse('v2:channelpartners-reports-regular-detail-table', kwargs=path_kwargs)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        mock_auth_with_user(self.channel_partner_admin)
        response = self.client.get(path + self.report_date_query_param)
        assert response.status_code == 200
        assert response.data
        report_spy.assert_called_once_with(
            channel_partner=self.channel_partner,
            service=self.parent_channel_service,
            period_start=self.report_date)

        # not existing for period
        path += '?periodStartDate=2020-06-26'
        report_spy.reset_mock()
        response = self.client.get(path)
        assert response.status_code == 403

    def test_expiring_detail_table(self, mock_auth_with_user, mocker):
        report_spy = mocker.spy(
            ChannelPartnerReportsService, "get_expiring_detail_table",
        )
        path_kwargs = {
            "parent_lookup_channel_partner": self.channel_partner.pk,
            "service_id": self.expiring_service.pk,
        }
        path = reverse('v2:channelpartners-reports-expiring-detail-table', kwargs=path_kwargs)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        mock_auth_with_user(self.channel_partner_admin)
        response = self.client.get(path + self.report_date_query_param)
        assert response.status_code == 200
        report_spy.assert_called_once_with(
            channel_partner=self.channel_partner,
            service=self.expiring_service,
            period_start=self.report_date)

        # not existing for period
        path += '?periodStartDate=2020-06-26'
        report_spy.reset_mock()
        response = self.client.get(path)
        assert response.status_code == 403

    def test_regular_service_report(self, mock_auth_with_user, mocker):
        report_spy = mocker.spy(
            ChannelPartnerReportsService, "get_regular_service_report",
        )
        path_kwargs = {
            "parent_lookup_channel_partner": self.channel_partner.pk,
            "service_id": self.service.pk,
        }
        path = reverse('v2:channelpartners-reports-regular-service-report', kwargs=path_kwargs)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        mock_auth_with_user(self.channel_partner_admin)
        response = self.client.get(path + self.report_date_query_param)
        assert response.status_code == 200
        assert response.data
        report_spy.assert_called_once_with(
            channel_partner=self.channel_partner, service=self.service, period_start=self.report_date)

        # not existing for period
        path += '?periodStartDate=2020-06-26'
        report_spy.reset_mock()
        response = self.client.get(path)
        assert response.status_code == 403

    def test_expiring_service_report(self, mock_auth_with_user, mocker):
        report_spy = mocker.spy(
            ChannelPartnerReportsService, "get_expiring_service_report",
        )
        path_kwargs = {
            "parent_lookup_channel_partner": self.channel_partner.pk,
            "service_id": self.expiring_service.pk,
        }
        path = reverse('v2:channelpartners-reports-expiring-service-report', kwargs=path_kwargs)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        mock_auth_with_user(self.channel_partner_admin)
        response = self.client.get(path + self.report_date_query_param)
        assert response.status_code == 200
        report_spy.assert_called_once_with(
            channel_partner=self.channel_partner, service=self.expiring_service, period_start=self.report_date)

        # not existing for period
        path += '?periodStartDate=2020-06-26'
        report_spy.reset_mock()
        response = self.client.get(path)
        assert response.status_code == 403

    def test_channel_partner_usages_no_subcp(self, mock_auth_with_user, mocker):
        report_spy = mocker.spy(
            ChannelPartnerReportsService, "get_regular_channel_partner_usages",
        )
        path_kwargs = {
            "parent_lookup_channel_partner": self.channel_partner.pk,
            "service_id": self.service.pk,
        }
        path = reverse('v2:channelpartners-reports-channel-partner-usages', kwargs=path_kwargs)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        mock_auth_with_user(self.channel_partner_admin)
        response = self.client.get(path + self.report_date_query_param)
        assert response.status_code == 200
        assert response.data == []
        report_spy.assert_called_once_with(
            channel_partner=self.channel_partner, service=self.service, period_start=self.report_date)

        # not existing for period
        path += '?periodStartDate=2020-06-26'
        report_spy.reset_mock()
        response = self.client.get(path)
        assert response.status_code == 403

    def test_channel_partner_usages(self, mock_auth_with_user, mocker, channel_partner_factory,
                                    django_capture_on_commit_callbacks):
        with django_capture_on_commit_callbacks(execute=True):
            sub_cp = channel_partner_factory(parent_channel_partner=self.channel_partner)
        ReportSnapshot.objects.all().delete()
        calculate_all_reports()
        report_spy = mocker.spy(
            ChannelPartnerReportsService, "get_regular_channel_partner_usages",
        )
        path_kwargs = {
            "parent_lookup_channel_partner": self.channel_partner.pk,
            "service_id": self.service.pk,
        }
        path = reverse('v2:channelpartners-reports-channel-partner-usages', kwargs=path_kwargs)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        mock_auth_with_user(self.channel_partner_admin)
        response = self.client.get(path + self.report_date_query_param)
        assert response.status_code == 200
        assert response.data
        report_spy.assert_called_once_with(
            channel_partner=self.channel_partner, service=self.service, period_start=self.report_date)

        # not existing for period
        path += '?periodStartDate=2020-06-26'
        report_spy.reset_mock()
        response = self.client.get(path)
        assert response.status_code == 403

    def test_organization_usages_no_orgs(self, mock_auth_with_user, mocker, channel_partner_factory, ):
        sub_cp = channel_partner_factory(parent_channel_partner=self.channel_partner)
        new_channel_partner_created(sub_cp.pk)
        sub_cp_service = sub_cp.services.filter(parent_service=self.service).first()
        calculate_all_reports()
        report_spy = mocker.spy(
            ChannelPartnerReportsService, "get_regular_organization_usages",
        )
        path_kwargs = {
            "parent_lookup_channel_partner": sub_cp.pk,
            "service_id": sub_cp_service.id,
        }
        path = reverse('v2:channelpartners-reports-organization-usages', kwargs=path_kwargs)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        mock_auth_with_user(self.channel_partner_admin)
        response = self.client.get(path + self.report_date_query_param)
        assert response.status_code == 200
        assert response.data == []
        report_spy.assert_called_once_with(
            channel_partner=sub_cp, service=sub_cp_service, period_start=self.report_date)

        # not existing for period
        path += '?periodStartDate=2020-06-26'
        report_spy.reset_mock()
        response = self.client.get(path)
        assert response.status_code == 403

    def test_organization_usages(self, mock_auth_with_user, mocker, channel_partner_factory):
        ReportSnapshot.objects.all().delete()
        calculate_all_reports()
        report_spy = mocker.spy(
            ChannelPartnerReportsService, "get_regular_organization_usages",
        )
        path_kwargs = {
            "parent_lookup_channel_partner": self.channel_partner.pk,
            "service_id": self.service.pk,
        }
        path = reverse('v2:channelpartners-reports-organization-usages', kwargs=path_kwargs)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        mock_auth_with_user(self.channel_partner_admin)
        response = self.client.get(path + self.report_date_query_param)
        assert response.status_code == 200
        assert response.data
        report_spy.assert_called_once_with(
            channel_partner=self.channel_partner, service=self.service, period_start=self.report_date)

        # not existing for period
        path += '?periodStartDate=2020-06-26'
        report_spy.reset_mock()
        response = self.client.get(path)
        assert response.status_code == 403

    def test_usage_report(self, mock_auth_with_user, mocker):
        report_spy = mocker.spy(ChannelPartnerReportsService, "get_channel_partner_report", )
        path_kwargs = {
            "parent_lookup_channel_partner": self.channel_partner.pk,
        }
        path = reverse('v2:channelpartners-reports-usage-report', kwargs=path_kwargs)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        mock_auth_with_user(self.channel_partner_admin)
        response = self.client.get(path + self.report_date_query_param)
        assert response.status_code == 200
        report_spy.assert_called_once_with(
            channel_partner=self.channel_partner, period_start=self.report_date)

        path += '?periodStartDate=2020-06-26'
        report_spy.reset_mock()
        response = self.client.get(path)
        assert response.status_code == 403
        report_spy.assert_called_once_with(
            channel_partner=self.channel_partner, period_start=datetime.date(2020, 6, 26))


class TestOrganizationGenerateReport:
    @pytest.fixture(autouse=True)
    def setup_method(self, organization_factory, org_user_factory, system_factory,
                     cp_service_factory, cloud_test_host, mock_auth_with_user, mocker,
                     service_record_factory):
        last_month = timezone.now() - relativedelta(months=1)
        self.period_start = last_month.replace(day=1).date()
        self.organization = organization_factory()
        self.organization_admin = org_user_factory(organization=self.organization)
        self.view_name = 'v2:organizations-reports-generate-report'
        self.kwargs = {'parent_lookup_organization': self.organization.pk}
        self.path = reverse(self.view_name, kwargs=self.kwargs)
        self.client = APIClient(SERVER_NAME=cloud_test_host.hostname)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        mock_auth_with_user(self.organization_admin)
        self.task_id = f'{uuid4()}'
        self.task_result = MagicMock()
        self.task_result.task_id = self.task_id
        self.export_path = f'{self.path}{self.task_id}/'
        self.mock_generate_report = mocker.patch('partners.tasks.service_reports_export.generate_report.apply_async',
                                                  return_value=self.task_result)
        self.mock_task = MagicMock()
        self.mock_task_result_get = mocker.patch('partners.tasks.service_reports_export.get_task',
                                                  return_value=self.mock_task)
        self.mock_storage_exists = mocker.patch('storages.backends.s3.S3Storage.exists', return_value=True)
        self.mock_generate_presigned_url = mocker.patch(
            'channel_partners.storages.ReportsStorage.generate_presigned_url',
            return_value=f'http://{self.task_id}.com'
        )

    def set_task_kwargs(self, task_kwargs: Any):
        self.mock_task.task_kwargs = json.dumps(task_kwargs)

    @pytest.mark.parametrize('view_name, report_type, report_format', [
        ('v2:organizations-reports-generate-report', ReportType.usage_report, ReportFormat.xlsx),
        ('v2:organizations-reports-generate-service-changes-report', ReportType.service_changes_report,
         ReportFormat.xlsx),
        ('v2:organizations-reports-generate-report', ReportType.usage_report, ReportFormat.csv),
        ('v2:organizations-reports-generate-service-changes-report', ReportType.service_changes_report,
         ReportFormat.csv),
    ])
    @mock_aws
    def test_success_generate_report(self, view_name, report_type, report_format, mocker):
        path = reverse(view_name, kwargs=self.kwargs)
        self.mock_task.status = 'PENDING'
        query_string = urlencode({'periodStartDate': self.period_start, 'reportFormat': report_format}, doseq=True)
        response = self.client.post(path, QUERY_STRING=query_string)
        assert response.status_code == 200
        assert response.data == {'id': self.task_id, 'status': ReportTaskState.pending.value}
        self.mock_generate_report.assert_called_once()
        assert self.mock_generate_report.call_args.kwargs['kwargs'] == dict(
            organization_id=str(self.organization.pk),
            period_start=self.period_start.isoformat(),
            user_id=self.organization_admin.user_id,
            report_format=report_format,
            hierarchy_level=0,
            report_type=report_type
        )
        # check cache
        cache_key = get_cached_requests_key(
            report_type=report_type,
            entity_id=self.organization.pk,
            period_start=self.period_start,
            user_id=self.organization_admin.user_id,
            report_format=report_format
        )
        assert 0 < caches['default'].get(cache_key)[-1] < datetime.datetime.now().timestamp()
        assert caches['default'].get(get_queued_report_key(self.task_id)) == '1'

        # check cached requests
        response = self.client.post(path, QUERY_STRING=query_string)
        assert response.status_code == 200
        assert response.data == {'id': self.task_id, 'status': ReportTaskState.pending.value}
        assert self.mock_generate_report.call_count == 2
        assert len(caches['default'].get(cache_key)) == 2
        self.mock_generate_report.reset_mock()

    def test_failed_export_report_task_not_found(self, mocker):
        self.mock_task.status = 'PENDING'
        self.mock_task_result_get.return_value = None
        response = self.client.get(self.export_path)
        assert response.status_code == 404
        self.mock_task_result_get.assert_called_once_with(task_id=self.task_id)

    def test_pending_export_report_task_not_found(self, mocker):
        self.mock_task.status = 'PENDING'
        self.mock_task_result_get.return_value = None
        caches['default'].set(get_queued_report_key(self.task_id), '1', timeout=60)
        response = self.client.get(self.export_path)
        assert response.status_code == 200
        self.mock_task_result_get.assert_called_once_with(task_id=self.task_id)
        assert response.data == {'id': self.task_id,
                                 'status': ReportTaskState.pending.value,
                                 'organizationId': str(self.organization.id)}

    def test_failed_export_report_empty_kwargs(self, mocker):
        self.mock_task.status = 'PENDING'
        self.set_task_kwargs({})
        self.mock_task_result_get.return_value = self.mock_task
        response = self.client.get(self.export_path)
        assert response.status_code == 200
        assert response.data == {'id': self.task_id,
                                 'status': ReportTaskState.failed.value,
                                 'organizationId': str(self.organization.id)}
        self.mock_task_result_get.assert_called_once_with(task_id=self.task_id)

    def test_failed_export_report_wrong_user(self, mocker):
        self.mock_task.status = 'PENDING'
        self.set_task_kwargs({'user_id': str(uuid4())})
        self.mock_task_result_get.return_value = self.mock_task
        response = self.client.get(self.export_path)
        assert response.status_code == 403
        self.mock_task_result_get.assert_called_once_with(task_id=self.task_id)

    def test_export_report_pending(self, mocker):
        self.mock_task.status = 'PENDING'
        self.set_task_kwargs({'user_id': self.organization_admin.user.id,
                              'organization_id': str(uuid4())})
        self.mock_task_result_get.return_value = self.mock_task
        response = self.client.get(self.export_path)
        assert response.status_code == 200
        assert response.data == {'id': self.task_id,
                                 'status': ReportTaskState.pending.value,
                                 'organizationId': str(self.organization.id)}

    def test_failed_export_report_wrong_org(self, mocker):
        self.mock_task.status = 'SUCCESS'
        self.set_task_kwargs({'user_id': self.organization_admin.user.id,
                              'organization_id': str(uuid4())})
        self.mock_task_result_get.return_value = self.mock_task
        response = self.client.get(self.export_path)
        assert response.status_code == 200
        assert response.data == {'id': self.task_id,
                                 'status': ReportTaskState.failed.value,
                                 'organizationId': str(self.organization.id)}
        self.mock_task_result_get.assert_called_once_with(task_id=self.task_id)

    def test_failed_export_report_task_empty_result(self, mocker):
        self.mock_task.status = 'SUCCESS'
        self.mock_task.result = None
        self.set_task_kwargs({'user_id': self.organization_admin.user.id,
                              'organization_id': str(self.organization.id)})
        response = self.client.get(self.export_path)
        assert response.status_code == 200
        assert response.data == {'id': self.task_id, 'status': ReportTaskState.failed.value,
                                 'organizationId': str(self.organization.pk)}


    def test_failed_export_report_task_null_result(self, mocker):
        self.mock_task.status = 'SUCCESS'
        self.mock_task.result = 'null'
        self.set_task_kwargs({'user_id': self.organization_admin.user.id,
                              'organization_id': str(self.organization.id)})
        response = self.client.get(self.export_path)
        assert response.status_code == 200
        assert response.data == {'id': self.task_id, 'status': ReportTaskState.failed.value,
                                 'organizationId': str(self.organization.pk)}

    def test_failed_export_report_task_file_not_found(self, mocker):
        self.mock_task.status = 'SUCCESS'
        self.set_task_kwargs({'user_id': self.organization_admin.user.id,
                              'organization_id': str(self.organization.id)})
        self.mock_task.result = f'"{self.organization.id}/{self.task_id}.xlsx"'
        self.mock_storage_exists.return_value = False
        response = self.client.get(self.export_path)
        assert response.status_code == 200
        assert response.data == {'id': self.task_id, 'status': ReportTaskState.failed.value,
                                 'organizationId': str(self.organization.pk)}

    @mock_aws
    def test_success_export_report_task(self, mocker):
        self.mock_task.status = 'SUCCESS'
        self.set_task_kwargs({'user_id': self.organization_admin.user.id,
                              'organization_id': str(self.organization.id),
                              'report_format': 'xlsx',
                              'period_start': self.period_start.isoformat()})
        self.mock_task.result = f'"{self.organization.id}/{self.task_id}.xlsx"'
        self.mock_storage_exists.return_value = True
        response = self.client.get(self.export_path)
        assert response.status_code == 200
        assert response.data['downloadUrl'] == f'http://{self.task_id}.com'
        assert response.data['id'] == self.task_id
        assert response.data['status'] == ReportTaskState.success.value
        assert response.data['organizationId'] == str(self.organization.pk)

        
class TestChannelPartnerGenerateReport:
    @pytest.fixture(autouse=True)
    def setup_method(self, organization_factory, cp_user_factory, system_factory,
                     cp_service_factory, cloud_test_host, mock_auth_with_user, mocker,
                     service_record_factory, channel_partner_factory):
        last_month = timezone.now() - relativedelta(months=1)
        self.period_start = last_month.replace(day=1).date()
        self.channel_partner = channel_partner_factory()

        self.admin = cp_user_factory(channel_partner=self.channel_partner.parent_channel_partner)
        self.view_name = 'v2:channelpartners-reports-generate-report'
        self.kwargs = {'parent_lookup_channel_partner': self.channel_partner.pk}
        self.path = reverse(self.view_name, kwargs=self.kwargs)
        self.client = APIClient(SERVER_NAME=cloud_test_host.hostname)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        mock_auth_with_user(self.admin)
        self.task_id = f'{uuid4()}'
        self.export_path = f'{self.path}{self.task_id}/'
        self.task_result = MagicMock()
        self.task_result.task_id = self.task_id
        self.mock_generate_report = mocker.patch('partners.tasks.service_reports_export.generate_report.apply_async',
                                                  return_value=self.task_result)
        self.mock_task = MagicMock()
        self.mock_task_result_get = mocker.patch('partners.tasks.service_reports_export.get_task',
                                                  return_value=self.mock_task)
        self.mock_storage_exists = mocker.patch('storages.backends.s3.S3Storage.exists', return_value=True)
        self.mock_generate_presigned_url = mocker.patch(
            'channel_partners.storages.ReportsStorage.generate_presigned_url',
            return_value=f'http://{self.task_id}.com'
        )

    def set_task_kwargs(self, task_kwargs: Any):
        self.mock_task.task_kwargs = json.dumps(task_kwargs)

    @pytest.mark.parametrize('view_name, report_type, report_format', [
        ('v2:channelpartners-reports-generate-report', ReportType.usage_report, ReportFormat.xlsx),
        ('v2:channelpartners-reports-generate-service-changes-report', ReportType.service_changes_report,
         ReportFormat.xlsx),
        ('v2:channelpartners-reports-generate-report', ReportType.usage_report, ReportFormat.csv),
        ('v2:channelpartners-reports-generate-service-changes-report', ReportType.service_changes_report,
         ReportFormat.csv),
    ])
    @mock_aws
    def test_success_generate_report(self, view_name, report_type, report_format, mocker):
        self.mock_task.status = 'PENDING'
        path = reverse(view_name, kwargs=self.kwargs)
        query_string = urlencode({'periodStartDate': self.period_start, 'reportFormat': report_format}, doseq=True)
        response = self.client.post(path, QUERY_STRING=query_string)
        assert response.status_code == 200
        assert response.data == {'id': self.task_id, 'status': ReportTaskState.pending.value}
        self.mock_generate_report.assert_called_once()
        assert self.mock_generate_report.call_args.kwargs['kwargs'] == dict(
            channel_partner_id=str(self.channel_partner.pk),
            period_start=self.period_start.isoformat(),
            user_id=self.admin.user_id,
            report_format=report_format,
            hierarchy_level=1,
            report_type=report_type
        )
        # check cache
        cache_key = get_cached_requests_key(
            report_type=report_type,
            entity_id=self.channel_partner.pk,
            period_start=self.period_start,
            user_id=self.admin.user_id,
            report_format=report_format
        )
        assert 0 < caches['default'].get(cache_key)[-1] < datetime.datetime.now().timestamp()
        assert caches['default'].get(get_queued_report_key(self.task_id)) == '1'

        # check cached requests
        response = self.client.post(path, QUERY_STRING=query_string)
        assert response.status_code == 200
        assert response.data == {'id': self.task_id, 'status': ReportTaskState.pending.value}
        assert self.mock_generate_report.call_count == 2
        assert len(caches['default'].get(cache_key)) == 2
        self.mock_generate_report.reset_mock()

    def test_failed_export_report_task_not_found(self, mocker):
        self.mock_task.status = 'PENDING'
        self.mock_task_result_get.return_value = None
        response = self.client.get(self.export_path)
        assert response.status_code == 404
        self.mock_task_result_get.assert_called_once_with(task_id=self.task_id)

    def test_failed_export_report_empty_kwargs(self, mocker):
        self.mock_task.status = 'PENDING'
        self.set_task_kwargs({})
        self.mock_task_result_get.return_value = self.mock_task
        response = self.client.get(self.export_path)
        assert response.status_code == 200
        assert response.data == {'id': self.task_id,
                                 'status': ReportTaskState.failed.value,
                                 'channelPartnerId': str(self.channel_partner.id)}
        self.mock_task_result_get.assert_called_once_with(task_id=self.task_id)

    def test_failed_export_report_wrong_user(self, mocker):
        self.mock_task.status = 'PENDING'
        self.set_task_kwargs({'user_id': str(uuid4())})
        self.mock_task_result_get.return_value = self.mock_task
        response = self.client.get(self.export_path)
        assert response.status_code == 403
        self.mock_task_result_get.assert_called_once_with(task_id=self.task_id)

    def test_pending_export_report_task_not_found(self, mocker):
        self.mock_task.status = 'PENDING'
        self.mock_task_result_get.return_value = None
        caches['default'].set(get_queued_report_key(self.task_id), '1', timeout=60)
        response = self.client.get(self.export_path)
        assert response.status_code == 200
        self.mock_task_result_get.assert_called_once_with(task_id=self.task_id)
        assert response.data == {'id': self.task_id,
                                 'status': ReportTaskState.pending.value,
                                 'channelPartnerId': str(self.channel_partner.id)}

    def test_export_report_pending(self, mocker):
        self.mock_task.status = 'PENDING'
        self.set_task_kwargs({'user_id': self.admin.user.id,
                              'channel_partner_id': str(uuid4())})
        self.mock_task_result_get.return_value = self.mock_task
        response = self.client.get(self.export_path)
        assert response.status_code == 200
        assert response.data == {'id': self.task_id,
                                 'status': ReportTaskState.pending.value,
                                 'channelPartnerId': str(self.channel_partner.id)}

    def test_failed_export_report_wrong_org(self, mocker):
        self.mock_task.status = 'SUCCESS'
        self.set_task_kwargs({'user_id': self.admin.user.id,
                              'channel_partner_id': str(uuid4())})
        self.mock_task_result_get.return_value = self.mock_task
        response = self.client.get(self.export_path)
        assert response.status_code == 200
        assert response.data == {'id': self.task_id,
                                 'status': ReportTaskState.failed.value,
                                 'channelPartnerId': str(self.channel_partner.id)}
        self.mock_task_result_get.assert_called_once_with(task_id=self.task_id)

    def test_failed_export_report_task_empty_result(self, mocker):
        self.mock_task.status = 'SUCCESS'
        self.mock_task.result = None
        self.set_task_kwargs({'user_id': self.admin.user.id,
                              'channel_partner_id': str(self.channel_partner.id)})
        response = self.client.get(self.export_path)
        assert response.status_code == 200
        assert response.data == {'id': self.task_id,
                                 'status': ReportTaskState.failed.value,
                                 'channelPartnerId': str(self.channel_partner.id)}

    def test_failed_export_report_task_null_result(self, mocker):
        self.mock_task.status = 'SUCCESS'
        self.mock_task.result = 'null'
        self.set_task_kwargs({'user_id': self.admin.user.id,
                              'channel_partner_id': str(self.channel_partner.id)})
        response = self.client.get(self.export_path)
        assert response.status_code == 200
        assert response.data == {'id': self.task_id, 'status': ReportTaskState.failed.value,
                                 'channelPartnerId': str(self.channel_partner.id)}

    def test_failed_export_report_task_file_not_found(self, mocker):
        self.mock_task.status = 'SUCCESS'
        self.set_task_kwargs({'user_id': self.admin.user.id,
                              'channel_partner_id': str(self.channel_partner.id)})
        self.mock_task.result = f'"{self.channel_partner.id}/{self.task_id}.xlsx"'
        self.mock_storage_exists.return_value = False
        response = self.client.get(self.export_path)
        assert response.status_code == 200
        assert response.data == {'id': self.task_id, 'status': ReportTaskState.failed.value,
                                 'channelPartnerId': str(self.channel_partner.id)}

    def test_success_export_report_task(self, mocker):
        self.mock_task.status = 'SUCCESS'
        self.set_task_kwargs({'user_id': self.admin.user.id,
                              'channel_partner_id': str(self.channel_partner.id),
                              'report_format': 'xlsx',
                              'period_start': self.period_start.isoformat()})
        self.mock_task.result = f'"{self.channel_partner.id}/{self.task_id}.xlsx"'
        self.mock_storage_exists.return_value = True
        response = self.client.get(self.export_path)
        assert response.status_code == 200
        assert response.data['downloadUrl'] == f'http://{self.task_id}.com'
        assert response.data['id'] == self.task_id
        assert response.data['status'] == ReportTaskState.success.value
        assert response.data['channelPartnerId'] == str(self.channel_partner.pk)


class TestGetHierarchyLevel:
    @pytest.fixture(autouse=True)
    def setup_method(self, organization_factory, channel_partner_factory, cloud_user_factory,
                     cp_user_factory, org_user_factory, root_nx_channel_partner):
        self.root = channel_partner_factory()
        self.child = channel_partner_factory(parent_channel_partner=self.root)
        self.grandchild = channel_partner_factory(parent_channel_partner=self.child)
        self.other_partner = channel_partner_factory()
        self.organization = organization_factory(channel_partner=self.grandchild)
        self.root_user = cp_user_factory(channel_partner=self.root)
        self.child_user = cp_user_factory(channel_partner=self.child)
        self.grandchild_user = cp_user_factory(channel_partner=self.grandchild)
        self.other_user = cp_user_factory(channel_partner=self.other_partner)
        self.organization_user = org_user_factory(organization=self.organization)
        self.cloud_user = cloud_user_factory()
        self.nx_user = cp_user_factory(channel_partner=root_nx_channel_partner)

    def test_organization_from_child_to_parent(self):
        level = get_hierarchy_level(self.grandchild, self.organization_user.user)
        assert level is None

    def test_organizations_owner(self):
        # User of organization is owner
        level = get_hierarchy_level(self.organization, self.organization_user.user)
        assert level == HierarchyLevels.own
        # User of direct parent is owner too
        level = get_hierarchy_level(self.organization, self.grandchild_user.user)
        assert level == HierarchyLevels.own

    def test_organizations_parent(self):
        level = get_hierarchy_level(self.organization, self.child_user.user)
        assert level == HierarchyLevels.direct_child

    def test_organization_grandparent(self):
        level = get_hierarchy_level(self.organization, self.root_user.user)
        assert level > HierarchyLevels.direct_child

    def test_organization_other_partner(self):
        level = get_hierarchy_level(self.organization, self.other_user.user)
        assert level is None

    def test_organization_cloud_user(self):
        level = get_hierarchy_level(self.organization, self.cloud_user)
        assert level is None

    def test_organization_nx_user(self):
        level = get_hierarchy_level(self.organization, self.nx_user.user)
        assert level > HierarchyLevels.direct_child

    def test_channel_partner_owner(self):
        level = get_hierarchy_level(self.grandchild, self.grandchild_user.user)
        assert level == HierarchyLevels.own

    def test_channel_partner_parent(self):
        level = get_hierarchy_level(self.grandchild, self.child_user.user)
        assert level == HierarchyLevels.direct_child

    def test_channel_partner_grandparent(self):
        level = get_hierarchy_level(self.grandchild, self.root_user.user)
        assert level > HierarchyLevels.direct_child

    def test_channel_partner_other_partner(self):
        level = get_hierarchy_level(self.grandchild, self.other_user.user)
        assert level is None

    def test_channel_partner_cloud_user(self):
        level = get_hierarchy_level(self.grandchild, self.cloud_user)
        assert level is None

    def test_channel_partner_nx_user(self):
        level = get_hierarchy_level(self.grandchild, self.nx_user.user)
        assert level > HierarchyLevels.direct_child
