from rest_framework import serializers

from partners.models import (
    ChannelPartnerService,
    HierarchyLevels,
)
from partners.serializers.v2.serializers import CodeChoiceField
from partners.services.usage_reports_service import (
    BeginningOfPeriodDate,
    TotalUsageDate,
)
from partners.tasks.constants import ReportTaskState
from tools.helpers import get_today
from tools.serializers import FieldAccessSerializer


class ReportPeriodParamSerializer(serializers.Serializer):
    periodStartDate = serializers.DateField(required=False, default=get_today, format='%Y-%m-%d')


class ReportDateField(serializers.DateField):
    def to_representation(self, value):
        if value in [BeginningOfPeriodDate, TotalUsageDate]:
            return value
        return super(ReportDateField, self).to_representation(value)


class RegularUsageDetailRecordSerializer(serializers.Serializer):
    date = ReportDateField(format='%Y-%m-%d')
    channels = serializers.IntegerField()
    monthly_rate = serializers.IntegerField()
    daily_rate = serializers.IntegerField()
    transactions = serializers.IntegerField(required=False)


class ExpiringUsageDetailRecordSerializer(serializers.Serializer):
    channels = serializers.IntegerField()
    expiration_date = ReportDateField(format='%Y-%m-%d')


class SystemGroupDetailSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()


class SystemServiceSummarySerializer(serializers.Serializer):
    system_id = serializers.UUIDField()
    system_name = serializers.CharField()
    groups_path = SystemGroupDetailSerializer(many=True, allow_empty=True)
    channels = serializers.IntegerField()
    monthly_rate = serializers.IntegerField()
    daily_rate = serializers.IntegerField()
    changes_count = serializers.IntegerField()
    last_changed = serializers.DateField(format='%Y-%m-%d', required=False)


class OrganizationServiceSummarySerializer(serializers.Serializer):
    channels = serializers.IntegerField()
    monthly_rate = serializers.IntegerField()
    daily_rate = serializers.IntegerField()
    systems = serializers.IntegerField()


class OrganizationServiceReportSerializer(serializers.Serializer):
    systems = SystemServiceSummarySerializer(many=True)
    summary = OrganizationServiceSummarySerializer(many=False)


class SystemUsageSerializer(serializers.Serializer):
    system_id = serializers.UUIDField()
    system_name = serializers.CharField()
    groups_path = SystemGroupDetailSerializer(many=True, allow_empty=True)
    report = RegularUsageDetailRecordSerializer(many=True)


class SystemExpiringUsageSerializer(serializers.Serializer):
    system_id = serializers.UUIDField()
    system_name = serializers.CharField()
    groups_path = SystemGroupDetailSerializer(many=True, allow_empty=True)
    report = ExpiringUsageDetailRecordSerializer(many=True)


class OrganizationUsageReportRecordSerializer(FieldAccessSerializer):
    service_id = serializers.UUIDField()
    service_name = serializers.CharField()
    used_by = serializers.IntegerField()
    channels = serializers.IntegerField()
    # Will probably remove this
    # expirations = serializers.ListSerializer(child=serializers.UUIDField(), allow_empty=True)
    monthly_rate = serializers.IntegerField()
    daily_rate = serializers.IntegerField()
    sub_type = CodeChoiceField(
        choices=list(ChannelPartnerService.SUB_TYPES_CODES),
        required=False,
        source='service_sub_type')

    def can_read_service_name(self, instance):
        return self.context['hierarchy_level'] == HierarchyLevels.own


class ChannelPartnerSubEntityServicesSerializer(FieldAccessSerializer):
    id = serializers.UUIDField()
    type = serializers.ChoiceField(choices=('organization', 'channel_partner'))
    name = serializers.CharField()
    channels = serializers.IntegerField()
    monthly_rate = serializers.IntegerField()
    daily_rate = serializers.IntegerField()
    changes_count = serializers.IntegerField()
    last_changed = serializers.DateField(format='%Y-%m-%d', required=False)

    def can_read_name(self, instance):
        return self.context['hierarchy_level'] == HierarchyLevels.own



class ChannelPartnerReportsServiceSummarySerializer(serializers.Serializer):
    channels = serializers.IntegerField()
    monthly_rate = serializers.IntegerField()
    daily_rate = serializers.IntegerField()
    organizations = serializers.IntegerField()
    channel_partners = serializers.IntegerField()


class ChannelPartnerServiceReportSerializer(serializers.Serializer):
    sub_entities = ChannelPartnerSubEntityServicesSerializer(many=True)
    summary = ChannelPartnerReportsServiceSummarySerializer(many=False)


class OrganizationUsageSerializer(FieldAccessSerializer):
    organization_id = serializers.UUIDField()
    organization_name = serializers.CharField()
    report = RegularUsageDetailRecordSerializer(many=True)

    def can_read_organization_name(self, instance):
        return self.context['hierarchy_level'] == HierarchyLevels.own


class ChannelPartnerUsageSerializer(FieldAccessSerializer):
    channel_partner_id = serializers.UUIDField()
    channel_partner_name = serializers.CharField()
    report = RegularUsageDetailRecordSerializer(many=True)

    def can_read_channel_partner_name(self, instance):
        return self.context['hierarchy_level'] == HierarchyLevels.own


class ChannelPartnerExpiringUsageSerializer(FieldAccessSerializer):
    channel_partner_id = serializers.UUIDField()
    channel_partner_name = serializers.CharField()
    report = ExpiringUsageDetailRecordSerializer(many=True)

    def can_read_channel_partner_name(self, instance):
        return self.context['hierarchy_level'] == HierarchyLevels.own


class OrganizationExpiringUsageSerializer(FieldAccessSerializer):
    organization_id = serializers.UUIDField()
    organization_name = serializers.CharField()
    report = ExpiringUsageDetailRecordSerializer(many=True)

    def can_read_organization_name(self, instance):
        return self.context['hierarchy_level'] == HierarchyLevels.own


class ChannelPartnerUsageReportRecordSerializer(FieldAccessSerializer):
    service_id = serializers.UUIDField()
    service_name = serializers.CharField()
    parent_service_id = serializers.UUIDField()
    parent_service_name = serializers.CharField()
    used_by_organizations = serializers.IntegerField()
    used_by_channel_partners = serializers.IntegerField()
    channels = serializers.IntegerField()
    monthly_rate = serializers.IntegerField()
    daily_rate = serializers.IntegerField()
    sub_type = CodeChoiceField(choices=list(ChannelPartnerService.SUB_TYPES_CODES))

    def can_read_service_name(self, instance):
        return self.context['hierarchy_level'] == HierarchyLevels.own

    def can_read_parent_service_name(self, instance):
        return self.context['hierarchy_level'] == HierarchyLevels.own


# Expiring Serializers
class SystemExpiringServiceSummarySerializer(serializers.Serializer):
    system_id = serializers.UUIDField()
    system_name = serializers.CharField()
    groups_path = SystemGroupDetailSerializer(many=True, allow_empty=True)
    channels = serializers.IntegerField()
    expiration_date = serializers.DateField(format='%Y-%m-%d', required=False)


class OrganizationExpiringServiceSummarySerializer(serializers.Serializer):
    channels = serializers.IntegerField()
    systems = serializers.IntegerField()
    expirations = serializers.ListSerializer(child=serializers.DateField(format='%Y-%m-%d'), allow_empty=True)


class OrganizationExpiringServiceReportSerializer(serializers.Serializer):
    systems = SystemExpiringServiceSummarySerializer(many=True)
    summary = OrganizationExpiringServiceSummarySerializer(many=False)


class ChannelPartnerExpiringServiceSummarySerializer(serializers.Serializer):
    channels = serializers.IntegerField()
    organizations = serializers.IntegerField()
    channel_partners = serializers.IntegerField()

class ChannelPartnerRegularUsageSerializer(FieldAccessSerializer):
    channel_partner_id = serializers.UUIDField()
    channel_partner_name = serializers.CharField()
    report = RegularUsageDetailRecordSerializer(many=True)


class ChannelPartnerExpiringServiceEntitiesSerializer(FieldAccessSerializer):
    id = serializers.UUIDField()
    type = serializers.ChoiceField(choices=('organization', 'channel_partner'))
    name = serializers.CharField()
    channels = serializers.IntegerField()
    expirations = serializers.ListSerializer(child=serializers.DateField(format='%Y-%m-%d'), allow_empty=True)

    def can_read_name(self, instance):
        return self.context['hierarchy_level'] == HierarchyLevels.own


class ChannelPartnerExpiringServiceReportSerializer(serializers.Serializer):
    sub_entities = ChannelPartnerExpiringServiceEntitiesSerializer(many=True)
    summary = ChannelPartnerExpiringServiceSummarySerializer(many=False, required=True)


class ReportExportSerializer(serializers.Serializer):
    id = serializers.UUIDField(required=True)
    status = serializers.ChoiceField(choices=ReportTaskState.states(),
                                     required=False,
                                     default=ReportTaskState.pending)
    downloadUrl = serializers.URLField(required=False, source='download_url')
    
    
class ChannelPartnerReportExportSerializer(ReportExportSerializer):
    channelPartnerId = serializers.UUIDField(required=True, source='channel_partner_id')
    
    
class OrganizationReportExportSerializer(ReportExportSerializer):
    organizationId = serializers.UUIDField(required=True, source='organization_id')


class ReportExportParamSerializer(ReportPeriodParamSerializer):
    reportFormat = serializers.ChoiceField(choices=['csv', 'xlsx'], required=True)
    