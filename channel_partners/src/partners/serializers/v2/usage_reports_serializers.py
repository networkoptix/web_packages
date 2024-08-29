from rest_framework import serializers

from partners.models import (
    ChannelPartner,
    ChannelPartnerService,
    ChannelPartnerServiceRecord,
    HierarchyLevels,
    Organization,
)
from partners.serializers.v2.serializers import (
    ChannelPartnerServiceRecordSerializer,
    CodeChoiceField,
)
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


class OrganizationUsageReportRecordSerializer(serializers.Serializer):
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


class ChannelPartnerUsageReportRecordSerializer(serializers.Serializer):
    service_id = serializers.UUIDField()
    service_name = serializers.CharField()
    parent_service_id = serializers.UUIDField(required=False)
    parent_service_name = serializers.CharField(required=False)
    used_by_organizations = serializers.IntegerField()
    used_by_channel_partners = serializers.IntegerField()
    channels = serializers.IntegerField()
    monthly_rate = serializers.IntegerField()
    daily_rate = serializers.IntegerField()
    sub_type = CodeChoiceField(choices=list(ChannelPartnerService.SUB_TYPES_CODES))


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

    def can_read_channel_partner_name(self, instance):
        return self.context['hierarchy_level'] == HierarchyLevels.own


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


class ChannelPartnerServiceChangeSerializer(ChannelPartnerServiceRecordSerializer):
    serviceName = serializers.SerializerMethodField()
    organizationName = serializers.SerializerMethodField()
    channelPartnerName = serializers.SerializerMethodField()

    class Meta:
        model = ChannelPartnerServiceRecord
        fields = [
            'serviceId',
            'serviceName',
            'organizationId',
            'organizationName',
            'channelPartnerId',
            'channelPartnerName',
            'changedBy',
            'changeQuantity',
            'date',
        ]

    def get_serviceName(self, obj: ChannelPartnerServiceRecord):
        self.calculate_service_and_direct_consumer(obj)
        return obj.report_service.name

    def get_organizationName(self, obj: ChannelPartnerServiceRecord):
        self.calculate_service_and_direct_consumer(obj)
        organization: Organization = getattr(obj, 'report_organization', None)
        if organization:
            return organization.name

    def get_channelPartnerName(self, obj: ChannelPartnerServiceRecord):
        self.calculate_service_and_direct_consumer(obj)
        channel_partner: ChannelPartner = getattr(obj, 'report_channel_partner', None)
        if channel_partner:
            return channel_partner.name


class OrganizationServiceChangesSerializer(serializers.ModelSerializer):
    systemName = serializers.CharField(source='cloud_system.name')
    systemId = serializers.UUIDField(source='cloud_system.system_id')
    serviceId = serializers.UUIDField(source='service_id')
    serviceName = serializers.CharField(source='service.name')
    changeQuantity = serializers.IntegerField(source='quantity')
    date = serializers.DateTimeField(source='created_ts')
    class Meta:
        model = ChannelPartnerServiceRecord
        fields = [
            'id',
            'serviceId',
            'serviceName',
            'changeQuantity',
            'systemId',
            'systemName',
            'date',
        ]