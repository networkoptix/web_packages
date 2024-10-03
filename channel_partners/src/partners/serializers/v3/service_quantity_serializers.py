import datetime

from dateutil.relativedelta import relativedelta
from django.utils import timezone
from rest_framework import (
    exceptions,
    serializers,
)
from rest_framework.fields import empty

from partners.models import (
    ChannelPartnerService,
    ChannelPartnerServiceRecord,
    ServiceUsage,
)
from tools.exception import ErrorCodes


class ServiceQuantityListSerializerV3(serializers.ListSerializer):
    def validate(self, attrs: list):
        services = set()
        for record in attrs:
            if record['service'].id in services:
                raise exceptions.ValidationError(
                    detail=f'There are multiple records for same services.',
                    code=ErrorCodes.duplicated_service_quantity,
                )
            services.add(record['service'].id)
        return attrs

    def create(self, validated_data):
        instances = [
            ChannelPartnerServiceRecord(
                created_by=self.context['request'].user,
                effective_ts=timezone.now(),
                **record
            )
            for record in validated_data
        ]
        instances = ChannelPartnerServiceRecord.objects.bulk_create(instances)
        # getting cloud_system from child ServiceQuantityChangeSerializerV3
        cloud_system = self.child.cloud_system
        cloud_system.calculate_current_services()
        ServiceUsage.check_excess(cloud_system=cloud_system)
        return instances


class ServiceQuantityChangeSerializerV3(serializers.Serializer):
    serviceId = serializers.PrimaryKeyRelatedField(
        queryset=ChannelPartnerService.objects.all(),
        required=True,
    )
    quantity = serializers.IntegerField(required=True)
    used = serializers.IntegerField(
        required=False,
        default=0,
        read_only=True
    )

    class Meta:
        list_serializer_class = ServiceQuantityListSerializerV3

    cloud_system = None
    monthly_limits = None
    existing_quantities = None

    def __init__(self, instance=None, data=empty, cloud_system=None, **kwargs):
        self.cloud_system = cloud_system
        if cloud_system:
            self.monthly_limits = self.cloud_system.organization.channel_partner.remaining_monthly_limits()
            self.existing_quantities = self.get_existing_quantities()
        super().__init__(instance=None, data=data, **kwargs)

    def get_existing_quantities(self):
        ret = {}
        existing_services = self.cloud_system.calculate_current_services()
        for service_id, values in existing_services.get('services', {}).items():
            ret[service_id] = values.get('quantity', 0)
        return ret

    def validate_serviceId(self, value: ChannelPartnerService):
        if value.created_by_channel_partner != self.cloud_system.organization.channel_partner:
            raise exceptions.ValidationError(
                detail=f'There is no service {value.id} in organization {self.cloud_system.organization_id}.',
                code=ErrorCodes.wrong_service_id,
            )
        if not value.enabled:
            raise exceptions.ValidationError(
                detail=f'Service {value.id} is disabled.',
                code=ErrorCodes.service_disabled,
            )
        if value.is_expiring and value.duration > 0:
            # Validating that service is not expired yet.
            # Using created_ts <= DATE(now - duration)
            # which prevents from converting services before they may be added.
            today = datetime.datetime.now(datetime.timezone.utc).date()
            if ChannelPartnerServiceRecord.objects.filter(
                    service=value,
                    cloud_system=self.cloud_system,
                    created_ts__lte=today - relativedelta(months=value.duration)
            ).exists():
                raise exceptions.ValidationError(
                    detail=f'Service {value.id} is expired.',
                    code=ErrorCodes.service_expired,
                )
        return value

    def validate(self, attrs: dict):
        quantity = attrs['quantity']
        service = attrs['serviceId']
        if service.sub_type == ChannelPartnerService.CREDIT and quantity > 0:
            raise exceptions.ValidationError(
                detail={'quantity': f'Service {service.id} is credit service, quantity cannot be increased.'},
                code=ErrorCodes.credit_service_increased,
            )
        cleaned_record = {
            'service': service,
            'cloud_system': self.cloud_system,
            'organization': self.cloud_system.organization,
            'quantity': quantity - self.existing_quantities.get(str(service.id), 0),
        }
        self.validate_monthly_limit(service, cleaned_record['quantity'])
        return cleaned_record

    def validate_monthly_limit(self, service: ChannelPartnerService, change: int):
        if not self.monthly_limits:
            # If monthly limits are not set, then there is no limit for this channel partner
            return
        try:
            # Instantiation and usage of serializer is complicated.
            # When `many=True` is used, serializer class is swapped to ListSerializer(child=OriginalClass).
            # All serializer's attributes remain within this object. Validation/serialization/save are made
            # in iterations over passed data.
            # So, we can use `self.monthly_limits` as a class object attribute and just decrease it on every
            # iteration. When it becomes negative, that means that limit for type is exceeded.
            self.monthly_limits[service.type] -= change
        except KeyError:
            # If there is no limit for this service type then quantity change is unlimited
            # Probably, it's some legacy but leave it as it does not break anything
            return
        if self.monthly_limits[service.type] < 0:
            raise exceptions.ValidationError(
                detail={'quantity': f'Monthly limit for service {service.id} exceeded.'},
                code=ErrorCodes.service_quantity_exceeded,
            )

    def create(self, validated_data: dict):
        return ChannelPartnerServiceRecord.objects.create(
            created_by=self.context['request'].user,
            effective_ts=timezone.now(),
            **validated_data
        )


class ServiceQuantityReadSerializerV3(serializers.Serializer):
    serviceId = serializers.UUIDField(source='service_id', read_only=True)
    quantity = serializers.IntegerField(read_only=True)
    used = serializers.IntegerField(read_only=True)