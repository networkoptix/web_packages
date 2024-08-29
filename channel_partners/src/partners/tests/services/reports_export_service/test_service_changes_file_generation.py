import datetime

import pytest
from dateutil.relativedelta import relativedelta

from partners.models import (
    ChannelPartner,
    ChannelPartnerService,
)
from partners.services.reports_export_service import (
    ChannelPartnerServiceChangesReportGenerator,
    OrganizationServiceChangesReportGenerator,
    ReportFormat,
)


class TestChannelPartnerServiceChangesReportGenerator:

    channel_partner: ChannelPartner

    @pytest.fixture(autouse=True)
    def setup(
            self,
            mocker,
            channel_partner_factory,
            organization_factory,
            system_factory,
            cp_user_factory,
            org_user_factory,
            cp_service_factory,
            service_record_factory,
            django_capture_on_commit_callbacks
    ):
        self.sys_creation_ts = datetime.datetime.now(tz=datetime.timezone.utc) - relativedelta(months=3)
        self.service_creation_ts = (datetime.datetime.now(tz=datetime.timezone.utc)
                                    .replace(day=1, hour=0, minute=0, second=0, microsecond=0))
        self.services_delta = (datetime.datetime.now(tz=datetime.timezone.utc) - self.service_creation_ts) / 3
        self.channel_partner = channel_partner_factory()
        self.local_recording = cp_service_factory(
            channel_partner=self.channel_partner,
        )
        self.analytics = cp_service_factory(
            channel_partner=self.channel_partner,
            service_type=ChannelPartnerService.ANALYTICS
        )
        with django_capture_on_commit_callbacks(execute=True):
            self.organization = organization_factory(channel_partner=self.channel_partner)
            self.system = system_factory(organization=self.organization, created_ts=self.sys_creation_ts)
            self.sub_channel_partner = channel_partner_factory(parent_channel_partner=self.channel_partner)
            self.sub_organization = organization_factory(channel_partner=self.sub_channel_partner)
            self.sub_system = system_factory(organization=self.sub_organization, created_ts=self.sys_creation_ts)

        service_record_factory(
            service=self.local_recording,
            cloud_system=self.system,
            created_ts=self.service_creation_ts + self.services_delta,
            quantity=10
        )
        service_record_factory(
            service=ChannelPartnerService.objects.get(parent_service=self.analytics),
            cloud_system=self.sub_system,
            created_ts=self.service_creation_ts + self.services_delta + relativedelta(minutes=1),
            quantity=20
        )

        service_record_factory(
            service=self.analytics,
            cloud_system=self.system,
            created_ts=self.service_creation_ts + 2 * self.services_delta,
            quantity=-5
        )
        service_record_factory(
            service=ChannelPartnerService.objects.get(parent_service=self.local_recording),
            cloud_system=self.sub_system,
            created_ts=self.service_creation_ts + 2 * self.services_delta + relativedelta(minutes=1),
            quantity=-7
        )

    def test_channel_partner_success_generation(self):
        generator = ChannelPartnerServiceChangesReportGenerator(
            channel_partner=self.channel_partner,
            period_start=self.service_creation_ts,
            report_format=ReportFormat.xlsx
        )
        bytes_stream = generator.stream().read()
        assert bytes_stream

    def test_channel_partner_sheet_rows(self):
        generator = ChannelPartnerServiceChangesReportGenerator(
            channel_partner=self.channel_partner,
            period_start=self.service_creation_ts,
            report_format=ReportFormat.xlsx
        )
        generator.generate_report()
        summary_sheet = generator.wb['Summary']
        assert summary_sheet['B2'].value == f'{self.channel_partner.name} Service Changes Report'
        assert summary_sheet['B6'].value == self.local_recording.name
        assert summary_sheet['B7'].value == self.analytics.name
        assert summary_sheet['B8'].value == self.analytics.name
        assert summary_sheet['B9'].value == self.local_recording.name
        assert summary_sheet['C6'].value == "(7)"
        assert summary_sheet['C7'].value == "(5)"
        assert summary_sheet['C8'].value == "20"
        assert summary_sheet['C9'].value == "10"
        assert summary_sheet['D6'].value == self.sub_channel_partner.name
        assert summary_sheet['D7'].value == self.organization.name
        assert summary_sheet['D8'].value == self.sub_channel_partner.name
        assert summary_sheet['D9'].value == self.organization.name
        assert summary_sheet['B10'].value is None
        assert summary_sheet['C10'].value is None
        assert summary_sheet['D10'].value is None
        assert summary_sheet['E10'].value is None

    def test_channel_partner_success_generation_csv(self):
        generator = ChannelPartnerServiceChangesReportGenerator(
            channel_partner=self.channel_partner,
            period_start=self.service_creation_ts,
            report_format=ReportFormat.csv
        )
        bytes_stream = generator.stream().read()
        assert bytes_stream

    def test_channel_partner_sheet_rows_csv(self):
        generator = ChannelPartnerServiceChangesReportGenerator(
            channel_partner=self.channel_partner,
            period_start=self.service_creation_ts,
            report_format=ReportFormat.csv
        )
        string_stream = generator.stream().read()
        lines = string_stream.splitlines()
        assert lines[0] == f'{self.channel_partner.name} Service Changes Report'
        assert f'{self.local_recording.name},-7,{self.sub_channel_partner.name}' in lines[4]
        assert f'{self.analytics.name},-5,{self.organization.name}' in lines[5]
        assert f'{self.analytics.name},20,{self.sub_channel_partner.name}' in lines[6]
        assert f'{self.local_recording.name},10,{self.organization.name}' in lines[7]

    def test_organization_success_generation(self):
        generator = OrganizationServiceChangesReportGenerator(
            organization=self.organization,
            period_start=self.service_creation_ts,
            report_format=ReportFormat.xlsx
        )
        bytes_stream = generator.stream().read()
        assert bytes_stream

    def test_organization_sheet_rows(self):
        generator = OrganizationServiceChangesReportGenerator(
            organization=self.organization,
            period_start=self.service_creation_ts,
            report_format=ReportFormat.xlsx
        )
        generator.generate_report()
        summary_sheet = generator.wb['Summary']
        assert summary_sheet['B2'].value == f'{self.organization.name} Service Changes Report'
        assert summary_sheet['B6'].value == self.analytics.name
        assert summary_sheet['B7'].value == self.local_recording.name
        assert summary_sheet['C6'].value == "(5)"
        assert summary_sheet['C7'].value == "10"
        assert summary_sheet['D6'].value == self.system.name
        assert summary_sheet['D7'].value == self.system.name
        assert summary_sheet['B8'].value is None
        assert summary_sheet['B9'].value is None
        assert summary_sheet['C8'].value is None
        assert summary_sheet['C9'].value is None
        assert summary_sheet['C10'].value is None
        assert summary_sheet['D10'].value is None
        assert summary_sheet['E10'].value is None

    def test_organization_sheet_rows_csv(self):
        generator = OrganizationServiceChangesReportGenerator(
            organization=self.sub_organization,
            period_start=self.service_creation_ts,
            report_format=ReportFormat.csv
        )
        string_stream = generator.stream().read()
        lines = string_stream.splitlines()
        assert lines[0] == f'{self.sub_organization.name} Service Changes Report'
        assert f'{self.local_recording.name},-7,{self.sub_system.name}' in lines[4]
        assert f'{self.analytics.name},20,{self.sub_system.name}' in lines[5]
