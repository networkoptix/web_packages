import datetime

import pytest
from dateutil.relativedelta import relativedelta
from django.utils import timezone

from partners.models import (
    ChannelPartner,
    CloudSystemId,
    Organization,
    ReportSnapshot,
)
from partners.services.usage_reports_service import (
    BeginningOfPeriodDate,
    CloudSystemReportsService,
    TotalUsageDate,
)
from partners.tasks.services import new_channel_partner_created
from partners.tasks.usage_reports import calculate_all_reports


class TestCalculateSystemReports:
    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory, system_factory,
              cp_service_factory, service_record_factory):
        self.cp = channel_partner_factory()
        self.org = organization_factory(channel_partner=self.cp)
        self.sys = system_factory(organization=self.org)
        self.cp_service = cp_service_factory(channel_partner=self.cp)
        self.other_service = cp_service_factory(channel_partner=self.cp)
        self.service_record = service_record_factory(
            organization=self.org,
            cloud_system=self.sys,
            service=self.cp_service,
            quantity=100,

        )

    def test_single_service_record(self):
        report = CloudSystemReportsService.get_regular_report(
            cloud_system=self.sys,
            organization=self.org,
            service=self.cp_service,
            period_start=datetime.date.today(),
            generate=True
        )
        assert report
        assert report[0]['date'] == BeginningOfPeriodDate
        assert report[0]['channels'] == 0
        assert report[1]['date'] == datetime.date.today()
        assert report[1]['channels'] == 100
        assert report[2]['date'] == TotalUsageDate
        assert report[2]['channels'] == 100

    def test_two_service_record(self, service_record_factory):
        # same date record
        service_record_factory(
            organization=self.org,
            cloud_system=self.sys,
            service=self.cp_service,
            quantity=100,

        )
        available_days = {2,3,4,5}
        available_day = available_days.difference({datetime.date.today().day}).pop()
        other_date = service_record_factory(
            organization=self.org,
            cloud_system=self.sys,
            service=self.cp_service,
            quantity=100,
            created_ts=timezone.now().replace(day=available_day)
        )
        report = CloudSystemReportsService.get_regular_report(
            cloud_system=self.sys,
            organization=self.org,
            service=self.cp_service,
            period_start=datetime.date.today(),
            generate=True
        )
        assert report
        assert report[0]['date'] == BeginningOfPeriodDate
        assert report[0]['channels'] == 0
        assert report[3]['date'] == TotalUsageDate
        assert report[3]['channels'] == 300

    def test_no_service_record(self):
        report = CloudSystemReportsService.get_regular_report(
            cloud_system=self.sys,
            organization=self.org,
            service=self.other_service,
            period_start=datetime.date.today(),
            generate=True
        )
        assert report
        assert report[0]['date'] == BeginningOfPeriodDate
        assert report[0]['channels'] == 0
        assert report[1]['date'] == TotalUsageDate
        assert report[1]['channels'] == 0


"""
Test structure
Nx
| 
TopCp - TopOrg - TopSystem
|
SubCp - SubOrg - SubSystem

Reports Quantity
Systems: 1 services related
Organizations: 3 services related, 1 service unrelated
Partners: 4 services related, 1 service unrelated

"""


class TestCalculateAllReport:
    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory, system_factory, root_nx_channel_partner,
              cp_service_factory, service_record_factory, django_capture_on_commit_callbacks,
              default_channel_partner, default_organization):
        self.service_1 = cp_service_factory(channel_partner=root_nx_channel_partner)
        self.service_2 = cp_service_factory(channel_partner=root_nx_channel_partner)
        self.top_cp = default_channel_partner
        self.sub_cp = channel_partner_factory(parent_channel_partner=self.top_cp)
        new_channel_partner_created(self.top_cp.id)
        new_channel_partner_created(self.sub_cp.id)
        self.top_org = default_organization
        self.sub_org = organization_factory(channel_partner=self.sub_cp)
        self.top_system = system_factory(organization=self.top_org)
        self.sub_system = system_factory(organization=self.sub_org)
        self.test_reports_count = 2 * 2 + 2 * (3 * 2 + 1) + 3 * (4 * 2 + 1)
        CloudSystemId.objects.all().update(created_ts=timezone.now() - relativedelta(months=1))
        for system in (self.top_system, self.sub_system):
            for service in system.organization.channel_partner.services.all():
                service_record_factory(
                    service=service,
                    cloud_system=system,
                    organization=system.organization,
                    quantity=1,
                    created_ts=timezone.now() - relativedelta(day=1)
                )


    def test_reports_count(self):
        assert ChannelPartner.objects.count() == 3
        assert Organization.objects.count() == 2
        assert CloudSystemId.objects.count() == 2
        calculate_all_reports()
        assert ReportSnapshot.objects.count() == self.test_reports_count

    def test_system_report_data(self):
        calculate_all_reports()
        system_reports = ReportSnapshot.objects.filter(report_type=ReportSnapshot.ReportType.system_regular_report)
        for report in system_reports:
            assert report.report_data[-1]['channels'] == 1
        assert system_reports.count() == 2 * 2

    def test_organization_report_data(self):
        calculate_all_reports()
        reports = ReportSnapshot.objects.filter(report_type=ReportSnapshot.ReportType.organization_usage_report)
        assert reports.count() == 2
        for report in reports:
            organization = Organization.objects.get(pk=report.entity_id)
            services = organization.channel_partner.services.all()
            assert len(report.report_data) == services.count()
            for service_report in report.report_data:
                assert service_report['service_id'] in [str(s.id) for s in services]
                assert service_report['channels'] == 1

    def test_channel_partner_report_data(self):
        calculate_all_reports()
        reports = ReportSnapshot.objects.filter(report_type=ReportSnapshot.ReportType.channel_partner_usage_report)
        assert reports.count() == 3
        for report in reports:
            channel_partner = ChannelPartner.objects.get(pk=report.entity_id)
            services = channel_partner.services.all()
            channels_count = 1 if channel_partner == self.sub_cp else 2
            assert len(report.report_data) == services.count()
            for service_report in report.report_data:
                assert service_report['service_id'] in [str(s.id) for s in services]
                assert service_report['channels'] == channels_count
