import datetime

import pytest
from dateutil.relativedelta import relativedelta
from django.utils import timezone

from partners.models import (
    ChannelPartner,
    ChannelPartnerService,
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
from partners.tasks.usage_reports import (
    calculate_all_reports,
    regenerate_outdated_schema_reports,
)


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
        self.top_system.created_ts = timezone.now() - relativedelta(months=1)
        self.top_system.save()
        self.sub_system = system_factory(organization=self.sub_org)
        self.sub_system.created_ts = timezone.now() - relativedelta(months=1)
        self.sub_system.save()
        self.test_reports_count = (2 * 2) + (2 * ((3 * 2) + 1)) + ((3 * (4 * 2)) + 1)  # System reports + organization reports + channel partner reports
        CloudSystemId.objects.all().update(created_ts=timezone.now() - relativedelta(months=1))
        for system in (self.top_system, self.sub_system):
            for service in system.organization.channel_partner.services.all():
                service_record_factory(
                    service=service,
                    cloud_system=system,
                    organization=system.organization,
                    quantity=1,
                    created_ts=timezone.now() - relativedelta(months=1)
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



class TestRegenerateOutdatedSchemaReports:
    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory, system_factory,
              cp_service_factory, service_record_factory, django_capture_on_commit_callbacks):
        self.cp = channel_partner_factory()
        self.org = organization_factory(channel_partner=self.cp)
        self.sys = system_factory(organization=self.org)
        self.regular_service = cp_service_factory(channel_partner=self.cp)
        self.expiring_service = cp_service_factory(channel_partner=self.cp,
                                                   duration=1,
                                                   sub_type=ChannelPartnerService.DEMO)
        self.service_record = service_record_factory(
            service=self.regular_service,
            organization=self.org,
            cloud_system=self.sys,
            quantity=100,
        )
        self.expiring_service_record = service_record_factory(
            organization=self.org,
            cloud_system=self.sys,
            service=self.expiring_service,
            quantity=100,
        )
        with django_capture_on_commit_callbacks(execute=True):
            self.sub_cp = channel_partner_factory(parent_channel_partner=self.cp)
        self.sub_org = organization_factory(channel_partner=self.sub_cp)
        self.sub_sys = system_factory(organization=self.sub_org)
        yesterday = timezone.now() - datetime.timedelta(days=1)
        for cp in (self.cp, self.sub_cp):
            for service in cp.services.all():
                service_record_factory(
                    organization=self.sub_org,
                    cloud_system=self.sub_sys,
                    service=service,
                    created_ts=yesterday,
                    quantity=100,
                )

    @pytest.mark.parametrize('report_type', ReportSnapshot.ReportType.values)
    def test_regeneration(self, report_type):
        calculate_all_reports()
        reports_query = ReportSnapshot.objects.filter(report_type=report_type)
        outdated_reports_query = ReportSnapshot.get_outdated_schema_reports().filter(report_type=report_type)
        reports_query.update(schema_version=ReportSnapshot.CURRENT_SCHEMA_VERSION - 1)
        # Test initial conditions
        assert reports_query.count() > 0
        assert outdated_reports_query.count() == reports_query.count()

        regenerate_outdated_schema_reports(ReportSnapshot.get_outdated_schema_reports())
        assert reports_query.count() > 0
        assert outdated_reports_query.count() == 0

    def test_skipped_generation(self, mocker):
        spy_report_snapshot_service = mocker.spy(ReportSnapshot, '__init__')
        calculate_all_reports()
        spy_report_snapshot_service.assert_called()
        spy_report_snapshot_service.reset_mock()
        regenerate_outdated_schema_reports(ReportSnapshot.get_outdated_schema_reports())
        spy_report_snapshot_service.assert_not_called()

    def test_removing_reports_with_missed_organization(self):
        system_reports = ReportSnapshot.ReportType.system_regular_report, ReportSnapshot.ReportType.system_expiring_report
        calculate_all_reports()
        reports_query = ReportSnapshot.objects.filter(report_type__in=system_reports)
        reports_query.update(schema_version=ReportSnapshot.CURRENT_SCHEMA_VERSION - 1, organization=None)
        assert reports_query.count() > 0
        regenerate_outdated_schema_reports(ReportSnapshot.get_outdated_schema_reports())
        assert reports_query.count() == 0

    def test_recreation_of_system_reports(self):
        system_reports = ReportSnapshot.ReportType.system_regular_report, ReportSnapshot.ReportType.system_expiring_report
        calculate_all_reports()
        reports_query = ReportSnapshot.objects.filter(report_type__in=system_reports)
        reports_query.delete()
        ReportSnapshot.objects.all().update(schema_version=ReportSnapshot.CURRENT_SCHEMA_VERSION - 1)
        assert reports_query.count() == 0
        regenerate_outdated_schema_reports(ReportSnapshot.get_outdated_schema_reports())
        assert reports_query.count() > 0
