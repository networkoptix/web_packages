import random

import pytest
from dateutil.relativedelta import relativedelta
from django.utils import timezone
from model_bakery import baker

from partners.models import (
    ChannelPartner,
    ChannelPartnerService,
    CloudSystemId,
    Organization,
    ServiceToOrganizationProperties,
)
from partners.services.reports_export_service import (
    ChannelPartnerReportGenerator,
    OrganizationReportGenerator,
    ReportFormat,
)


class TestChannelPartnerReportGenerator:
    @pytest.fixture(autouse=True)
    def setup(self, mocker, channel_partner_factory, organization_factory, system_factory,
              cp_service_factory, service_record_factory, django_capture_on_commit_callbacks):
        self.top_cp = channel_partner_factory()
        service_types = [ChannelPartnerService.LOCAL_RECORDING,
                         ChannelPartnerService.CLOUD_STORAGE,
                         ChannelPartnerService.ANALYTICS]
        subtypes = [ChannelPartnerService.REGULAR,
                    ChannelPartnerService.CREDIT,
                    ChannelPartnerService.DEMO]
        for service_type in service_types:
            for sub_type in subtypes:
                cp_service_factory(
                    channel_partner=self.top_cp,
                    service_type=service_type,
                    sub_type=sub_type,
                    duration=0 if sub_type == ChannelPartnerService.REGULAR else 10
                )
        self.spy_cp_report_generator = mocker.spy(ChannelPartnerReportGenerator, 'stream_csv')

    def test_empty(self, mocker, channel_partner_factory, organization_factory, django_capture_on_commit_callbacks):
        with django_capture_on_commit_callbacks(execute=True):
            empty_cp = channel_partner_factory(parent_channel_partner=self.top_cp)
            cp_without_orgs = channel_partner_factory(parent_channel_partner=self.top_cp)
            cp_1 = channel_partner_factory(parent_channel_partner=cp_without_orgs)
            cp_without_subs = channel_partner_factory(parent_channel_partner=self.top_cp)
            organization_factory(channel_partner=cp_without_subs)
            cp = channel_partner_factory(parent_channel_partner=self.top_cp)
            channel_partner_factory(parent_channel_partner=cp)
            organization_factory(channel_partner=cp)
        past_month = timezone.now() - relativedelta(months=1)
        calls_count = 0
        for partner in ChannelPartner.objects.filter(path__contains=[self.top_cp.id]):
            calls_count += 1
            exporter = ChannelPartnerReportGenerator(
                channel_partner=partner,
                report_date=past_month,
                report_format=ReportFormat.csv,
            )
            buf = exporter.stream()
            assert buf.getbuffer().nbytes > 0
            assert self.spy_cp_report_generator.call_count == calls_count

    def test_full(self, channel_partner_factory, organization_factory, service_record_factory,
                  django_capture_on_commit_callbacks, system_factory):
        with django_capture_on_commit_callbacks(execute=True):
            organization_factory(channel_partner=self.top_cp)
            cp = channel_partner_factory(parent_channel_partner=self.top_cp)
            organization_factory(channel_partner=cp)
            organization_factory(channel_partner=cp)
            organization_factory(channel_partner=channel_partner_factory(parent_channel_partner=cp))
            organization_factory(channel_partner=channel_partner_factory(parent_channel_partner=cp))
            organization_factory(channel_partner=channel_partner_factory(parent_channel_partner=cp))
        past_month = timezone.now() - relativedelta(months=1)

        for organization in Organization.objects.filter(path__contains=[self.top_cp.id]):
            for _ in range(3):
                system_factory(organization=organization)
            for service in organization.channel_partner.services.all():
                baker.make(ServiceToOrganizationProperties, service=service, organization=organization, price=2)
        for system in CloudSystemId.objects.all():
            for service in system.organization.channel_partner.services.all():
                for _ in range(3):
                    service_record_factory(
                        service=service,
                        cloud_system=system,
                        organization=system.organization,
                        quantity=random.randint(1, 100),
                        created_ts=past_month.replace(day=random.randint(1, 28)),
                    )
        calls_count = 0
        for cp in list(ChannelPartner.objects.filter(path__contains=[self.top_cp.id])) + [self.top_cp]:
            calls_count += 1
            exporter = ChannelPartnerReportGenerator(
                channel_partner=cp,
                report_date=past_month,
                report_format=ReportFormat.csv,
            )
            buf = exporter.stream()
            assert buf.getbuffer().nbytes > 0
            assert self.spy_cp_report_generator.call_count == calls_count


class TestOrganizationReportGenerator:
    @pytest.fixture(autouse=True)
    def setup(self, mocker, channel_partner_factory, organization_factory, system_factory,
              cp_service_factory, service_record_factory):
        self.top_cp = channel_partner_factory()
        service_types = [ChannelPartnerService.LOCAL_RECORDING,
                         ChannelPartnerService.CLOUD_STORAGE,
                         ChannelPartnerService.ANALYTICS]
        subtypes = [ChannelPartnerService.REGULAR,
                    ChannelPartnerService.CREDIT,
                    ChannelPartnerService.DEMO]
        for service_type in service_types:
            for sub_type in subtypes:
                cp_service_factory(
                    channel_partner=self.top_cp,
                    service_type=service_type,
                    sub_type=sub_type,
                    duration=0 if sub_type == ChannelPartnerService.REGULAR else 10
                )
        self.organization = organization_factory(channel_partner=self.top_cp)
        self.past_month = timezone.now() - relativedelta(months=1)
        self.spy_org_report_generator = mocker.spy(OrganizationReportGenerator, 'stream_csv')

    def test_empty(self, channel_partner_factory, organization_factory):
        exporter = OrganizationReportGenerator(
            organization=self.organization,
            report_date=self.past_month,
            report_format=ReportFormat.csv,
        )
        buf = exporter.stream()
        assert buf.getbuffer().nbytes > 0
        self.spy_org_report_generator.assert_called_once()

    def test_without_services(self, system_factory):
        for _ in range(3):
            system_factory(organization=self.organization)
        exporter = OrganizationReportGenerator(
            organization=self.organization,
            report_date=self.past_month,
            report_format=ReportFormat.csv,
        )
        buf = exporter.stream()
        assert buf.getbuffer().nbytes > 0
        self.spy_org_report_generator.assert_called_once()

    def test_without_service_records(self, service_record_factory, system_factory):
        for _ in range(3):
            system_factory(organization=self.organization)
        for service in self.organization.channel_partner.services.all():
            baker.make(ServiceToOrganizationProperties, service=service, organization=self.organization, price=2)
        exporter = OrganizationReportGenerator(
            organization=self.organization,
            report_date=self.past_month,
            report_format=ReportFormat.csv,
        )
        buf = exporter.stream()
        assert buf.getbuffer().nbytes > 0
        self.spy_org_report_generator.assert_called_once()

    def test_full(self, channel_partner_factory, organization_factory, service_record_factory,
                  system_factory):
        for _ in range(3):
            system_factory(organization=self.organization)
        for service in self.organization.channel_partner.services.all():
            baker.make(ServiceToOrganizationProperties, service=service, organization=self.organization, price=2)
        for system in CloudSystemId.objects.all():
            for service in system.organization.channel_partner.services.all():
                for _ in range(3):
                    service_record_factory(
                        service=service,
                        cloud_system=system,
                        organization=system.organization,
                        quantity=random.randint(1, 100),
                        created_ts=self.past_month.replace(day=random.randint(1, 28)),
                    )

        exporter = OrganizationReportGenerator(
            organization=self.organization,
            report_date=self.past_month,
            report_format=ReportFormat.csv,
        )
        buf = exporter.stream()
        assert buf.getbuffer().nbytes > 0
        self.spy_org_report_generator.assert_called_once()