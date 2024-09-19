import pytest
from dateutil.relativedelta import relativedelta
from django.utils import timezone

from partners.models import ChannelPartnerService
from partners.services.usage_reports_service import (
    ChannelPartnerReportsService,
    OrganizationReportsService,
)


class TestOrganizationReportUsedByCount:

    @pytest.fixture(autouse=True)
    def setup(self,
              channel_partner_factory,
              organization_factory,
              system_factory,
              cp_service_factory,
              service_record_factory):

        self.now = timezone.now()
        self.cp = channel_partner_factory()
        self.org = organization_factory(channel_partner=self.cp)
        self.system = system_factory(organization=self.org, created_ts=self.now - relativedelta(months=3))
        self.local_recording = cp_service_factory(channel_partner=self.cp)
        self.demo_storage = cp_service_factory(channel_partner=self.cp,
                                               service_type=ChannelPartnerService.CLOUD_STORAGE,
                                               sub_type=ChannelPartnerService.DEMO)
        self.analytics = cp_service_factory(channel_partner=self.cp,
                                            service_type=ChannelPartnerService.ANALYTICS)
        self.local_recording_record_add = service_record_factory(
            service=self.local_recording,
            cloud_system=self.system,
            created_ts=self.now.replace(day=1, hour=10) - relativedelta(months=1),
            quantity=10)
        self.local_recording_record_remove = service_record_factory(
            service=self.local_recording,
            cloud_system=self.system,
            created_ts=self.now.replace(day=1, hour=11) - relativedelta(months=1),
            quantity=-10)
        self.demo_storage_record_add = service_record_factory(
            service=self.demo_storage,
            cloud_system=self.system,
            created_ts=self.now.replace(day=1, hour=10) - relativedelta(months=1),
            quantity=10)
        self.demo_storage_record_remove = service_record_factory(
            service=self.demo_storage,
            cloud_system=self.system,
            created_ts=self.now.replace(day=1, hour=11) - relativedelta(months=1),
            quantity=-10)

        self.analytics_record = service_record_factory(
            service=self.analytics,
            cloud_system=self.system,
            created_ts=self.now.replace(day=1) - relativedelta(months=1),
            quantity=5)

    def test_single_month_counts(self):
        report = OrganizationReportsService.get_organization_report(
            organization=self.org,
            period_start=self.now.replace(day=1) - relativedelta(months=1),
            generate=True
        )
        assert report
        analytics_report = next(filter(lambda x: x['service_id'] == self.analytics.id, report))
        assert analytics_report['used_by'] == 1
        local_recording_report = next(filter(lambda x: x['service_id'] == self.local_recording.id, report))
        assert local_recording_report['used_by'] == 0
        demo_storage_report = next(filter(lambda x: x['service_id'] == self.demo_storage.id, report))
        assert demo_storage_report['used_by'] == 0


    def test_has_channels_from_prev_period(self, service_record_factory):
        service_record_factory(
            service=self.local_recording,
            cloud_system=self.system,
            created_ts=self.now.replace(day=1, hour=10) - relativedelta(months=2),
            quantity=10)
        report = OrganizationReportsService.get_organization_report(
            organization=self.org,
            period_start=self.now.replace(day=1) - relativedelta(months=1),
            generate=True
        )
        analytics_report = next(filter(lambda x: x['service_id'] == self.analytics.id, report))
        assert analytics_report['used_by'] == 1
        local_recording_report = next(filter(lambda x: x['service_id'] == self.local_recording.id, report))
        assert local_recording_report['used_by'] == 1
        demo_storage_report = next(filter(lambda x: x['service_id'] == self.demo_storage.id, report))
        assert demo_storage_report['used_by'] == 0


class TestChannelPartnerReportUsedByCount:

    @pytest.fixture(autouse=True)
    def setup(self,
              channel_partner_factory,
              organization_factory,
              system_factory,
              cp_service_factory,
              service_record_factory,
              django_capture_on_commit_callbacks):

        self.now = timezone.now()
        self.cp = channel_partner_factory()
        self.local_recording = cp_service_factory(channel_partner=self.cp)
        self.demo_storage = cp_service_factory(channel_partner=self.cp,
                                               service_type=ChannelPartnerService.CLOUD_STORAGE,
                                               sub_type=ChannelPartnerService.DEMO)
        self.analytics = cp_service_factory(channel_partner=self.cp,
                                            service_type=ChannelPartnerService.ANALYTICS)
        self.org = organization_factory(channel_partner=self.cp)
        with django_capture_on_commit_callbacks(execute=True):
            self.sub_cp = channel_partner_factory(parent_channel_partner=self.cp)
        self.sub_org = organization_factory(channel_partner=self.sub_cp)
        self.system = system_factory(organization=self.org, created_ts=self.now - relativedelta(months=3))
        self.sub_system = system_factory(organization=self.sub_org, created_ts=self.now - relativedelta(months=3))
        self.sub_local_recording = self.sub_cp.services.get(type=ChannelPartnerService.LOCAL_RECORDING)
        self.sub_demo_storage = self.sub_cp.services.get(type=ChannelPartnerService.CLOUD_STORAGE)
        self.sub_analytics = self.sub_cp.services.get(type=ChannelPartnerService.ANALYTICS)
        self.local_recording_record_add = service_record_factory(
            service=self.local_recording,
            cloud_system=self.system,
            created_ts=self.now.replace(day=1, hour=10) - relativedelta(months=1),
            quantity=10)
        self.local_recording_record_remove = service_record_factory(
            service=self.local_recording,
            cloud_system=self.system,
            created_ts=self.now.replace(day=1, hour=11) - relativedelta(months=1),
            quantity=-10)

        self.demo_storage_record_add = service_record_factory(
            service=self.demo_storage,
            cloud_system=self.system,
            created_ts=self.now.replace(day=1, hour=10) - relativedelta(months=1),
            quantity=10)
        self.demo_storage_record_remove = service_record_factory(
            service=self.demo_storage,
            cloud_system=self.system,
            created_ts=self.now.replace(day=1, hour=11) - relativedelta(months=1),
            quantity=-10)

        self.analytics_record = service_record_factory(
            service=self.analytics,
            cloud_system=self.system,
            created_ts=self.now.replace(day=1) - relativedelta(months=1),
            quantity=5)

        self.sub_local_recording_record_add = service_record_factory(
            service=self.sub_local_recording,
            cloud_system=self.sub_system,
            created_ts=self.now.replace(day=1, hour=10) - relativedelta(months=1),
            quantity=10)
        self.sub_local_recording_record_remove = service_record_factory(
            service=self.sub_local_recording,
            cloud_system=self.sub_system,
            created_ts=self.now.replace(day=1, hour=11) - relativedelta(months=1),
            quantity=-10)
        self.sub_demo_storage_record_add = service_record_factory(
            service=self.sub_demo_storage,
            cloud_system=self.sub_system,
            created_ts=self.now.replace(day=1, hour=10) - relativedelta(months=1),
            quantity=10)
        self.sub_demo_storage_record_remove = service_record_factory(
            service=self.sub_demo_storage,
            cloud_system=self.sub_system,
            created_ts=self.now.replace(day=1, hour=11) - relativedelta(months=1),
            quantity=-10)
        self.sub_analytics_record = service_record_factory(
            service=self.sub_analytics,
            cloud_system=self.sub_system,
            created_ts=self.now.replace(day=1) - relativedelta(months=1),
            quantity=5)

    def test_single_month_counts(self):
        report = ChannelPartnerReportsService.get_channel_partner_report(
            channel_partner=self.cp,
            period_start=self.now.replace(day=1) - relativedelta(months=1),
            generate=True
        )
        assert report
        analytics_report = next(filter(lambda x: x['service_id'] == self.analytics.id, report))
        assert analytics_report['used_by_organizations'] == 1
        assert analytics_report['used_by_channel_partners'] == 1
        local_recording_report = next(filter(lambda x: x['service_id'] == self.local_recording.id, report))
        assert local_recording_report['used_by_organizations'] == 0
        assert local_recording_report['used_by_channel_partners'] == 0
        demo_storage_report = next(filter(lambda x: x['service_id'] == self.demo_storage.id, report))
        assert demo_storage_report['used_by_organizations'] == 0
        assert demo_storage_report['used_by_channel_partners'] == 0

    def test_has_channels_from_prev_period(self, service_record_factory):
        service_record_factory(
            service=self.local_recording,
            cloud_system=self.system,
            created_ts=self.now.replace(day=1, hour=10) - relativedelta(months=2),
            quantity=10)
        service_record_factory(
            service=self.sub_local_recording,
            cloud_system=self.sub_system,
            created_ts=self.now.replace(day=1, hour=10) - relativedelta(months=2),
            quantity=10
        )
        report = ChannelPartnerReportsService.get_channel_partner_report(
            channel_partner=self.cp,
            period_start=self.now.replace(day=1) - relativedelta(months=1),
            generate=True
        )
        analytics_report = next(filter(lambda x: x['service_id'] == self.analytics.id, report))
        assert analytics_report['used_by_organizations'] == 1
        assert analytics_report['used_by_channel_partners'] == 1
        local_recording_report = next(filter(lambda x: x['service_id'] == self.local_recording.id, report))
        assert local_recording_report['used_by_organizations'] == 1
        assert local_recording_report['used_by_channel_partners'] == 1
        demo_storage_report = next(filter(lambda x: x['service_id'] == self.demo_storage.id, report))
        assert demo_storage_report['used_by_organizations'] == 0
        assert demo_storage_report['used_by_channel_partners'] == 0
