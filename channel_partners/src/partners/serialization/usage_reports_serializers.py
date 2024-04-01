from rest_framework import serializers

from partners.services.usage_reports_service import (
    BeginningOfPeriodDate,
    TotalUsageDate,
)
from tools.helpers import get_today


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


class SystemServiceSummarySerializer(serializers.Serializer):
    system_id = serializers.UUIDField()
    system_name = serializers.CharField()
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
    report = RegularUsageDetailRecordSerializer(many=True)


class OrganizationUsageReportRecordSerializer(serializers.Serializer):
    service_id = serializers.UUIDField()
    service_name = serializers.CharField()
    used_by = serializers.IntegerField()
    channels = serializers.IntegerField()
    expirations = serializers.ListSerializer(child=serializers.UUIDField(), allow_empty=True)
    monthly_rate = serializers.IntegerField()
    daily_rate = serializers.IntegerField()


class ChannelPartnerSubEntityServicesSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    type = serializers.ChoiceField(choices=('organization', 'channel_partner'))
    name = serializers.CharField()
    channels = serializers.IntegerField()
    monthly_rate = serializers.IntegerField()
    daily_rate = serializers.IntegerField()
    changes_count = serializers.IntegerField()
    last_changed = serializers.DateField(format='%Y-%m-%d', required=False)


class ChannelPartnerServiceSummarySerializer(serializers.Serializer):
    channels = serializers.IntegerField()
    monthly_rate = serializers.IntegerField()
    daily_rate = serializers.IntegerField()
    organizations = serializers.IntegerField()
    channel_partners = serializers.IntegerField()


class ChannelPartnerServiceReportSerializer(serializers.Serializer):
    sub_entities = ChannelPartnerSubEntityServicesSerializer(many=True)
    summary = ChannelPartnerServiceSummarySerializer(many=False)


class OrganizationUsageSerializer(serializers.Serializer):
    organization_id = serializers.UUIDField()
    organization_name = serializers.CharField()
    report = RegularUsageDetailRecordSerializer(many=True)


class ChannelPartnerUsageSerializer(serializers.Serializer):
    channel_partner_id = serializers.UUIDField()
    channel_partner_name = serializers.CharField()
    report = RegularUsageDetailRecordSerializer(many=True)


class ChannelPartnerUsageReportRecordSerializer(serializers.Serializer):
    service_id = serializers.UUIDField()
    service_name = serializers.CharField()
    used_by_organizations = serializers.IntegerField()
    used_by_channel_partners = serializers.IntegerField()
    channels = serializers.IntegerField()
    expirations = serializers.ListField(child=serializers.UUIDField(), allow_empty=True)
    monthly_rate = serializers.IntegerField()
    daily_rate = serializers.IntegerField()
