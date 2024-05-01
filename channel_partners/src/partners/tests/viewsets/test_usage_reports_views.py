import datetime
from uuid import uuid4

import pytest
from dateutil.relativedelta import relativedelta
from django.utils import timezone
from rest_framework.reverse import reverse
from rest_framework.test import APIClient

from partners.models import (
    ChannelPartnerService,
    OrganizationRoles,
    ReportSnapshot,
)
from partners.services.usage_reports_service import (
    ChannelPartnerReportsService,
    CloudSystemReportsService,
    OrganizationReportsService,
)
from partners.tasks.services import new_channel_partner_created
from partners.tasks.usage_reports import calculate_all_reports
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
        path = reverse('organizations-reports-regular-detail-table', kwargs=path_kwargs)
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
        path = reverse('organizations-reports-regular-detail-table', kwargs=path_kwargs)
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
        path = reverse('organizations-reports-expiring-detail-table', kwargs=path_kwargs)
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
        path = reverse('organizations-reports-regular-service-report', kwargs=path_kwargs)
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

        path = reverse('organizations-reports-expiring-service-report', kwargs=path_kwargs)

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

    def test_system_report(self, mock_auth_with_user, mocker):
        report_spy = mocker.spy(
            OrganizationReportsService, "get_regular_system_reports",
        )
        path_kwargs = {
            "parent_lookup_organization": self.org.pk,
            "service_id": self.service.pk,
        }
        path = reverse('organizations-reports-system-reports', kwargs=path_kwargs)
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

    def test_system_regular_report(self, mock_auth_with_user, mocker):
        report_spy = mocker.spy(CloudSystemReportsService, "get_regular_report", )
        path_kwargs = {
            "parent_lookup_organization": self.org.pk,
            "service_id": self.service.pk,
            "cloud_system_id": self.system.system_id,
        }
        path = reverse('organizations-reports-system-regular-detail-table', kwargs=path_kwargs)
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
        path = reverse('organizations-reports-system-expiring-detail-table', kwargs=path_kwargs)
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
        path = reverse('organizations-reports-usage-report', kwargs=path_kwargs)
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
        path = reverse('channelpartners-reports-usage-report', kwargs=path_kwargs)
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
        path = reverse('channelpartners-reports-regular-detail-table', kwargs=path_kwargs)
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
        path = reverse('channelpartners-reports-expiring-detail-table', kwargs=path_kwargs)
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
        path = reverse('channelpartners-reports-regular-service-report', kwargs=path_kwargs)
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
        path = reverse('channelpartners-reports-expiring-service-report', kwargs=path_kwargs)
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
        path = reverse('channelpartners-reports-channel-partner-usages', kwargs=path_kwargs)
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
        path = reverse('channelpartners-reports-channel-partner-usages', kwargs=path_kwargs)
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
        path = reverse('channelpartners-reports-organization-usages', kwargs=path_kwargs)
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
        path = reverse('channelpartners-reports-organization-usages', kwargs=path_kwargs)
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
        path = reverse('channelpartners-reports-usage-report', kwargs=path_kwargs)
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
