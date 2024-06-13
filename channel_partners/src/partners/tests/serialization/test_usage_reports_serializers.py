import datetime

import pytest
from dateutil.relativedelta import relativedelta

from partners.models import (
    ChannelPartnerService,
    HierarchyLevels,
)
from partners.serialization.usage_reports_serializers import (
    ChannelPartnerExpiringServiceReportSerializer,
    ChannelPartnerServiceReportSerializer,
    ChannelPartnerUsageReportRecordSerializer,
    ChannelPartnerUsageSerializer,
    OrganizationExpiringServiceReportSerializer,
    OrganizationServiceReportSerializer,
    OrganizationUsageReportRecordSerializer,
    OrganizationUsageSerializer,
)
from partners.services.usage_reports_service import (
    ChannelPartnerReportsService,
    OrganizationReportsService,
)
from tools.serializers import VALUE_REPLACEMENT


class TestNamesObfuscation:
    @pytest.fixture(autouse=True)
    def setup(self, organization_factory, channel_partner_factory, cloud_user_factory,
              cp_user_factory, org_user_factory, root_nx_channel_partner, cp_service_factory,
              django_capture_on_commit_callbacks, service_record_factory, system_factory, system_group_factory):
        self.root = channel_partner_factory()
        self.local_recording = cp_service_factory(
            channel_partner=self.root,
            service_type=ChannelPartnerService.LOCAL_RECORDING,
            sub_type=ChannelPartnerService.REGULAR
        )
        self.demo_analytics = cp_service_factory(
            channel_partner=self.root,
            service_type=ChannelPartnerService.ANALYTICS,
            sub_type=ChannelPartnerService.DEMO,
            duration=10
        )
        with django_capture_on_commit_callbacks(execute=True):
            self.channel_partner = channel_partner_factory(parent_channel_partner=self.root)

        self.organization = organization_factory(channel_partner=self.channel_partner)
        self.group = system_group_factory(
            organization=self.organization,
            parent=system_group_factory(organization=self.organization)
        )

        first_of_past_month = datetime.datetime.now(tz=datetime.timezone.utc).replace(day=1) - relativedelta(months=1)
        services_date = first_of_past_month + relativedelta(days=2)
        self.period_start = first_of_past_month.date()

        for _ in range(3):
            system = system_factory(organization=self.organization, system_group=self.group)
            system.created_ts = first_of_past_month
            system.save()
            for service in self.channel_partner.services.all():
                service_record_factory(
                    service=service,
                    cloud_system=system,
                    quantity=10,
                    created_ts=services_date,
                    effective_ts=services_date,
                )
        self.context_own = {'hierarchy_level': HierarchyLevels.own}
        self.context_child = {'hierarchy_level': HierarchyLevels.direct_child}

    def test_get_regular_service_report_own_organization(self):
        report = OrganizationReportsService.get_regular_service_report(
            organization=self.organization,
            service=self.channel_partner.services.get(type=ChannelPartnerService.LOCAL_RECORDING),
            period_start=self.period_start,
            generate=True,
        )
        serializer = OrganizationServiceReportSerializer(instance=report, context=self.context_own)
        assert serializer.data
        for system_report in serializer.data['systems']:
            assert system_report['system_name']
            assert system_report['system_name'] != VALUE_REPLACEMENT
            for group in system_report['groups_path']:
                assert group['name'] != VALUE_REPLACEMENT

    def test_get_regular_service_report_indirect_child_organization(self):
        report = OrganizationReportsService.get_regular_service_report(
            organization=self.organization,
            service=self.channel_partner.services.get(type=ChannelPartnerService.LOCAL_RECORDING),
            period_start=self.period_start,
            generate=True,
        )
        serializer = OrganizationServiceReportSerializer(instance=report, context=self.context_child)
        assert serializer.data
        for system_report in serializer.data['systems']:
            assert system_report['system_name']
            assert system_report['system_name'] != VALUE_REPLACEMENT
            for group in system_report['groups_path']:
                assert group['name'] != VALUE_REPLACEMENT

    def test_get_expiring_service_report_own_organization(self):
        report = OrganizationReportsService.get_expiring_service_report(
            organization=self.organization,
            service=self.channel_partner.services.get(type=ChannelPartnerService.ANALYTICS),
            period_start=self.period_start,
            generate=True,
        )
        serializer = OrganizationExpiringServiceReportSerializer(instance=report, context=self.context_own)
        assert serializer.data
        for system_report in serializer.data['systems']:
            assert system_report['system_name']
            assert system_report['system_name'] != VALUE_REPLACEMENT
            for group in system_report['groups_path']:
                assert group['name'] != VALUE_REPLACEMENT

    def test_get_expiring_service_report_indirect_child_organization(self):
        report = OrganizationReportsService.get_expiring_service_report(
            organization=self.organization,
            service=self.channel_partner.services.get(type=ChannelPartnerService.ANALYTICS),
            period_start=self.period_start,
            generate=True,
        )
        serializer = OrganizationExpiringServiceReportSerializer(instance=report, context=self.context_child)
        assert serializer.data
        for system_report in serializer.data['systems']:
            assert system_report['system_name']
            assert system_report['system_name'] != VALUE_REPLACEMENT
            for group in system_report['groups_path']:
                assert group['name'] != VALUE_REPLACEMENT

    def test_get_organization_report_own_organization(self):
        report = OrganizationReportsService.get_organization_report(
            organization=self.organization,
            period_start=self.period_start,
            generate=True,
        )
        serializer = OrganizationUsageReportRecordSerializer(instance=report, context=self.context_own, many=True)
        assert serializer.data
        for record in serializer.data:
            assert record['service_name']
            assert record['service_name'] != VALUE_REPLACEMENT

    def test_get_organization_report_indirect_child_organization(self):
        report = OrganizationReportsService.get_organization_report(
            organization=self.organization,
            period_start=self.period_start,
            generate=True,
        )
        serializer = OrganizationUsageReportRecordSerializer(instance=report, context=self.context_child, many=True)
        assert serializer.data
        for record in serializer.data:
            assert record['service_name']
            assert record['service_name'] == VALUE_REPLACEMENT

    def test_get_regular_service_report_own_channel_partner(self):
        report = ChannelPartnerReportsService.get_regular_service_report(
            channel_partner=self.channel_partner,
            service=self.channel_partner.services.get(type=ChannelPartnerService.LOCAL_RECORDING),
            period_start=self.period_start,
            generate=True,
        )
        serializer = ChannelPartnerServiceReportSerializer(instance=report, context=self.context_own)
        assert serializer.data
        for entity in serializer.data['sub_entities']:
            assert entity['name']
            assert entity['name'] != VALUE_REPLACEMENT

    def test_get_regular_service_report_direct_child_channel_partner(self):
        report = ChannelPartnerReportsService.get_regular_service_report(
            channel_partner=self.channel_partner,
            service=self.channel_partner.services.get(type=ChannelPartnerService.LOCAL_RECORDING),
            period_start=self.period_start,
            generate=True,
        )
        serializer = ChannelPartnerServiceReportSerializer(instance=report, context=self.context_child)
        assert serializer.data
        for entity in serializer.data['sub_entities']:
            assert entity['name']
            assert entity['name'] == VALUE_REPLACEMENT

    def test_get_expiring_service_report_own_channel_partner(self):
        report = ChannelPartnerReportsService.get_expiring_service_report(
            channel_partner=self.channel_partner,
            service=self.channel_partner.services.get(type=ChannelPartnerService.ANALYTICS),
            period_start=self.period_start,
            generate=True,
        )
        serializer = ChannelPartnerExpiringServiceReportSerializer(instance=report, context=self.context_own)
        assert serializer.data
        for entity in serializer.data['sub_entities']:
            assert entity['name']
            assert entity['name'] != VALUE_REPLACEMENT

    def test_get_expiring_service_report_direct_child_channel_partner(self):
        report = ChannelPartnerReportsService.get_expiring_service_report(
            channel_partner=self.channel_partner,
            service=self.channel_partner.services.get(type=ChannelPartnerService.ANALYTICS),
            period_start=self.period_start,
            generate=True,
        )
        serializer = ChannelPartnerExpiringServiceReportSerializer(instance=report, context=self.context_child)
        assert serializer.data
        for entity in serializer.data['sub_entities']:
            assert entity['name']
            assert entity['name'] == VALUE_REPLACEMENT

    def test_get_regular_organization_usages_own_channel_partner(self):
        report = ChannelPartnerReportsService.get_regular_organization_usages(
            channel_partner=self.channel_partner,
            service=self.channel_partner.services.get(type=ChannelPartnerService.LOCAL_RECORDING),
            period_start=self.period_start,
            generate=True,
        )
        serializer = OrganizationUsageSerializer(instance=report, context=self.context_own, many=True)
        assert serializer.data
        for record in serializer.data:
            assert record['organization_name']
            assert record['organization_name'] != VALUE_REPLACEMENT

    def test_get_regular_organization_usages_direct_child_channel_partner(self):
        report = ChannelPartnerReportsService.get_regular_organization_usages(
            channel_partner=self.channel_partner,
            service=self.channel_partner.services.get(type=ChannelPartnerService.LOCAL_RECORDING),
            period_start=self.period_start,
            generate=True,
        )
        serializer = OrganizationUsageSerializer(instance=report, context=self.context_child, many=True)
        assert serializer.data
        for record in serializer.data:
            assert record['organization_name']
            assert record['organization_name'] == VALUE_REPLACEMENT

    def test_get_regular_channel_partner_usages_own_channel_partner(self):
        report = ChannelPartnerReportsService.get_regular_channel_partner_usages(
            channel_partner=self.root,
            service=self.root.services.get(type=ChannelPartnerService.LOCAL_RECORDING),
            period_start=self.period_start,
            generate=True,
        )
        serializer = ChannelPartnerUsageSerializer(instance=report, context=self.context_own, many=True)
        assert serializer.data
        for record in serializer.data:
            assert record['channel_partner_name']
            assert record['channel_partner_name'] != VALUE_REPLACEMENT

    def test_get_regular_channel_partner_usages_direct_child_channel_partner(self):
        report = ChannelPartnerReportsService.get_regular_channel_partner_usages(
            channel_partner=self.root,
            service=self.root.services.get(type=ChannelPartnerService.LOCAL_RECORDING),
            period_start=self.period_start,
            generate=True,
        )
        serializer = ChannelPartnerUsageSerializer(instance=report, context=self.context_child, many=True)
        assert serializer.data
        for record in serializer.data:
            assert record['channel_partner_name']
            assert record['channel_partner_name'] == VALUE_REPLACEMENT

    def test_get_channel_partner_report_own_channel_partner(self):
        report = ChannelPartnerReportsService.get_channel_partner_report(
            channel_partner=self.channel_partner,
            period_start=self.period_start,
            generate=True,
        )
        serializer = ChannelPartnerUsageReportRecordSerializer(instance=report, context=self.context_own, many=True)
        assert serializer.data
        for record in serializer.data:
            assert record['service_name']
            assert record['service_name'] != VALUE_REPLACEMENT
            assert record['parent_service_name']
            assert record['parent_service_name'] != VALUE_REPLACEMENT

    def test_get_channel_partner_report_direct_child_channel_partner(self):
        report = ChannelPartnerReportsService.get_channel_partner_report(
            channel_partner=self.channel_partner,
            period_start=self.period_start,
            generate=True,
        )
        serializer = ChannelPartnerUsageReportRecordSerializer(instance=report, context=self.context_child, many=True)
        assert serializer.data
        for record in serializer.data:
            assert record['service_name']
            assert record['service_name'] == VALUE_REPLACEMENT
            assert record['parent_service_name']
            assert record['parent_service_name'] == VALUE_REPLACEMENT
