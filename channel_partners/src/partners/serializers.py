from collections import defaultdict
import datetime
import json

import httpx
import llutil
from django.conf import settings
from django.utils import timezone
from drf_spectacular.openapi import OpenApiTypes
from drf_spectacular.utils import extend_schema_serializer, extend_schema_field
from drf_spectacular.utils import OpenApiExample
from nx_cloud_api_client.apis import BatchRequestItems, BatchRequestItem, CdbSystemAPIBase
from rest_framework import serializers, exceptions
from rest_framework.reverse import reverse
from rest_framework.utils.encoders import JSONEncoder

from partners.models import ChannelPartner, Organization, CloudSystemId, CloudUser, ChannelPartnerStates, \
    LocalRecordingUsage, ChannelPartnerServiceRecord, ChannelPartnerService, \
    ChannelPartnerToUser, OrganizationToUser, ChannelPartnerRole, OrganizationRole, ServiceUsage, ChannelPartnerEvent, \
    CloudHost, ChannelPartnerExternalId, OrganizationExternalId, ChannelPartnerServiceExternalId, CloudSystemExternalId, \
    ServiceToSubChannelProperties, ServiceToOrganizationProperties, ChannelPartnerAccessLevel
from tools.utils import make_batch_request
from .authentication import check_user_can_administer_system

STATE_CHOICES_STRS = [choice[1] for choice in ChannelPartnerStates.STATE_CHOICES]
STATE_CHOICES_MAP = {choice[0]: choice[1] for choice in ChannelPartnerStates.STATE_CHOICES}
STATE_CHOICES_STR_MAP = {choice[1]: choice[0] for choice in ChannelPartnerStates.STATE_CHOICES}


class CodeChoiceField(serializers.ChoiceField):
    def __init__(self, *args, **kwargs):
        super().__init__(**kwargs)
        self.value_to_code_map = {val: code for code, val in self.choices.items()}

    def to_representation(self, value):
        if value in ('', None):
            return value

        return self.value_to_code_map[value]

    def to_internal_value(self, data):
        if data == '' and self.allow_blank:
            return ''

        try:
            return self.choices[str(data)]
        except KeyError:
            self.fail('invalid_choice', input=data)


class ChannelPartnerSerializer(serializers.ModelSerializer):
    class UsersField(serializers.HyperlinkedRelatedField):
        view_name = 'channelpartners-user-list'

        def get_url(self, obj, view_name, request, format):
            url_kwargs = {
                'parent_lookup_channel_partner': obj.pk
            }
            return reverse(view_name, kwargs=url_kwargs, request=request, format=format)

    class OrganizationsField(serializers.HyperlinkedRelatedField):
        view_name = 'channelpartners-organization-list'

        def get_url(self, obj, view_name, request, format):
            url_kwargs = {
                'parent_lookup_channel_partner': obj.pk
            }
            return reverse(view_name, kwargs=url_kwargs, request=request, format=format)

    users = UsersField(source='*', read_only=True)
    organizations = OrganizationsField(source='*', read_only=True)
    state = CodeChoiceField(choices=ChannelPartnerStates.STATE_CODES)
    effectiveState = CodeChoiceField(source='effective_state', choices=ChannelPartnerStates.STATE_CODES, read_only=True)
    parentChannelPartner = serializers.PrimaryKeyRelatedField(source='parent_channel_partner', read_only=True)
    monthlyAdditionalServiceLimit = serializers.IntegerField(source='monthly_additional_service_limit')
    attributes = serializers.DictField(allow_empty=True, allow_null=True, required=False, help_text='Set any custom properties. Pass value "*unset*" to remove a key.')
    canCreateSubChannels = serializers.BooleanField(source='can_create_sub_channels', default=True, required=False)

    class Meta:
        model = ChannelPartner
        exclude = ['instance', 'parent_channel_partner', 'can_create_sub_channels', 'monthly_additional_service_limit']
        read_only_fields = ['users', 'parentChannelPartner']

    def validate_parent_channel_partner(self, value: ChannelPartner):
        req = self.context.get('request')
        if not value.can_add_or_remove_sub_chanel_partners(req.user):
            raise exceptions.PermissionDenied(detail=f'User does not have {ChannelPartner.permissions.add_remove_sub_channel_partners} permission for {value.id}.')
        return value

    def update(self, instance: ChannelPartner, validated_data):
        instance.set_attributes(validated_data.get('attributes', {}), partial=self.partial)
        validated_data_filtered = validated_data.copy()
        validated_data_filtered.pop('attributes', None)
        return super().update(instance, validated_data_filtered)


class CreateChannelPartnerSerializer(serializers.ModelSerializer):
    parentChannelPartner = serializers.PrimaryKeyRelatedField(source='parent_channel_partner', required=True, queryset=ChannelPartner.objects.all())
    attributes = serializers.DictField(allow_empty=True, allow_null=True, required=False,
                                       help_text='Set any custom properties. Pass value "*unset*" to remove a key.')
    canCreateSubChannels = serializers.BooleanField(source='can_create_sub_channels', default=True, required=False)
    monthlyAdditionalServiceLimit = serializers.IntegerField(source='monthly_additional_service_limit', required=False)

    class Meta:
        model = ChannelPartner
        fields = ['name', 'parentChannelPartner', 'attributes', 'canCreateSubChannels', 'monthlyAdditionalServiceLimit']

    def validate_parent_channel_partner(self, value: ChannelPartner):
        req = self.context.get('request')
        if not value.can_add_or_remove_sub_chanel_partners(req.user):
            raise exceptions.PermissionDenied(f'User does not have {ChannelPartner.permissions.add_remove_sub_channel_partners} permission')
        return value

    def create(self, validated_data):
        validated_data_filtered = validated_data.copy()
        validated_data_filtered.pop('attributes', None)
        instance: ChannelPartner = super().create(validated_data_filtered)
        instance.set_attributes(validated_data.get('attributes', {}))
        return instance


class OrganizationSerializer(serializers.ModelSerializer):
    class UsersField(serializers.HyperlinkedRelatedField):
        view_name = 'organizations-user-list'

        def get_url(self, obj, view_name, request, format):
            url_kwargs = {
                'parent_lookup_organization': obj.pk
            }
            return reverse(view_name, kwargs=url_kwargs, request=request, format=format)

    class CloudSystemsField(serializers.HyperlinkedRelatedField):
        view_name = 'organizations-cloudsystem-list'

        def get_url(self, obj, view_name, request, format):
            url_kwargs = {
                'parent_lookup_organization': obj.pk
            }
            return reverse(view_name, kwargs=url_kwargs, request=request, format=format)

    users = UsersField(source='*', read_only=True)
    cloudSystems = CloudSystemsField(source='*', read_only=True)
    state = CodeChoiceField(choices=ChannelPartnerStates.STATE_CODES)
    effectiveState = CodeChoiceField(source='effective_state', choices=ChannelPartnerStates.STATE_CODES, read_only=True)
    channelPartner = serializers.PrimaryKeyRelatedField(source='channel_partner', queryset=ChannelPartner.objects.all())
    channelPartnerAccessLevel = CodeChoiceField(source='channel_partner_access_level',
                                                choices=ChannelPartnerAccessLevel.LEVEL_CODES)
    attributes = serializers.DictField(allow_empty=True, allow_null=True, required=False,
                                       help_text='Set any custom properties. Pass value "\*unset\*" to remove a key.')

    class Meta:
        model = Organization
        exclude = ['channel_partner_access_level', 'channel_partner']
        read_only_fields = ['channelPartner', 'users']

    def update(self, instance: Organization, validated_data):
        instance.set_attributes(validated_data.get('attributes', {}), partial=self.partial)
        validated_data_filtered = validated_data.copy()
        validated_data_filtered.pop('attributes', None)
        return super().update(instance, validated_data_filtered)


class CreateOrganizationSerializer(serializers.ModelSerializer):
    channelPartner = serializers.PrimaryKeyRelatedField(source='channel_partner', queryset=ChannelPartner.objects.all())
    attributes = serializers.DictField(allow_empty=True, allow_null=True, required=False, help_text='Set any custom properties. Pass value "*unset*" to remove a key.')

    class Meta:
        model = Organization
        fields = ['name', 'channelPartner', 'attributes']

    def validate_channelPartner(self, value: ChannelPartner):
        req = self.context.get('request')
        if not value.can_add_or_remove_organizations(req.user):
            raise exceptions.PermissionDenied(f'User does not have {ChannelPartner.permissions.add_remove_organizations} permission')
        return value

    def create(self, validated_data):
        validated_data_filtered = validated_data.copy()
        validated_data_filtered.pop('attributes', None)
        instance: Organization = super().create(validated_data_filtered)
        instance.set_attributes(validated_data.get('attributes', {}))
        return instance


class CloudSystemSerializer(serializers.ModelSerializer):
    state = CodeChoiceField(choices=ChannelPartnerStates.STATE_CODES)
    effectiveState = CodeChoiceField(choices=ChannelPartnerStates.STATE_CODES, read_only=True)
    systemId = serializers.UUIDField(source='system_id', read_only=True)
    services = serializers.DictField(read_only=True)

    class Meta:
        model = CloudSystemId
        fields = ['id', 'state', 'effectiveState', 'systemId', 'name', 'organization', 'services']
        read_only_fields = ['users', 'organization']

    def validate(self, data):
        if not self.instance and CloudSystemId.objects.filter(system_id=data['system_id'], cloud_host=data['cloud_host']):
            raise serializers.ValidationError('Cloud system with this id already exists')
        return data


class ChannelPartnerUserSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', required=True)
    roles = serializers.ListField(read_only=True, default=[], child=serializers.CharField())
    role = serializers.SlugRelatedField(slug_field='name', queryset=ChannelPartnerRole.objects.all(), write_only=True)
    created = serializers.DateTimeField(source='created_ts', read_only=True)
    title = serializers.CharField(required=False, default='', allow_blank=True)

    class Meta:
        model = ChannelPartnerToUser
        fields = ['email', 'roles', 'role', 'title', 'created']

    def validate_email(self, value: str):
        return CloudUser.objects.get_or_create(email=value)[0]

    def create(self, validated_data):
        user = validated_data.get('user').get('email')
        role = validated_data.get('role')
        title = validated_data.get('title')
        channel_partner = validated_data.get('channel_partner')

        # In case of some situation with multiple user records for same entity
        try:
            relation, _ = ChannelPartnerToUser.objects.get_or_create(user=user, channel_partner=channel_partner)
        except ChannelPartnerToUser.MultipleObjectsReturned:
            relations = ChannelPartnerToUser.objects.filter(user=user, channel_partner=channel_partner).order_by('created_ts')
            relation = relations.first()
            relations.exclude(id=relation.id).delete()

        relation.title = title
        relation.roles = [role.name]
        relation.save()
        return relation


class OrganizationUserSerializer(serializers.ModelSerializer):
    email = serializers.CharField(source='user.email', required=True)
    roles = serializers.ListField(read_only=True, default=[], child=serializers.CharField())
    role = serializers.SlugRelatedField(slug_field='name', queryset=OrganizationRole.objects.all(), write_only=True)
    created = serializers.DateTimeField(source='created_ts', read_only=True)
    title = serializers.CharField(required=False, default='', allow_blank=True)

    class Meta:
        model = OrganizationToUser
        fields = ['email', 'roles', 'role', 'title', 'created']

    def validate_email(self, value: str):
        return CloudUser.objects.get_or_create(email=value)[0]

    def create(self, validated_data):
        user = validated_data.get('user').get('email')
        role = validated_data.get('role')
        title = validated_data.get('title')
        organization = validated_data.get('organization')

        # In case of some situation with multiple user records for same entity
        created = False
        try:
            relation, created = OrganizationToUser.objects.get_or_create(user=user, organization=organization)
        except OrganizationToUser.MultipleObjectsReturned:
            relations = OrganizationToUser.objects.filter(user=user, organization=organization).order_by('created_ts')
            relation = relations.first()
            relations.exclude(id=relation.id).delete()
        if not created:
            return self.update(relation, validated_data=validated_data)

        relation.title = title
        relation.roles = [role.system_role] if role and role.system_role else []
        relation.save()
        if role and role.system_role:
            data = relation.update_user_systems_data(role)
            make_batch_request(self.context['request'], data)
        return relation

    def update(self, instance, validated_data):
        role_changed = False
        if "role" in validated_data:
            role = validated_data['role']
            roles = [role.name] if role else []
            if roles != instance.roles:
                role_changed = True
                instance.roles = roles
        if 'title' in validated_data:
            instance.title = validated_data['title']
        instance.save()
        if role_changed:
            data = instance.update_user_systems_data(role)
            make_batch_request(self.context['request'], data)
        return instance


class SignSerializerMixin:
    def to_representation(self, instance):
        ret = super().to_representation(instance)
        json_dump = json.dumps(ret, separators=(',', ':'), cls=JSONEncoder)
        ret['signature'] = llutil.sign(json_dump, settings.RSA_KEY3)
        return ret


class SaaSReportSerializer(SignSerializerMixin, serializers.Serializer):
    class SecuritySerializer(serializers.Serializer):
        lastCheck = serializers.DateTimeField(source='last_usage_report', format='%Y-%m-%d %H:%M:%S')
        tmpExpirationDate = serializers.SerializerMethodField()
        status = serializers.DictField(source='get_security_statuses')

        def get_tmpExpirationDate(self, obj: CloudSystemId):
            ret_ts = obj.last_usage_report + datetime.timedelta(seconds=LocalRecordingUsage.CHECK_PERIOD * 30)
            return ret_ts.strftime('%Y-%m-%d %H:%M:%S')

    class ChannelPartneNestedSerializer(serializers.ModelSerializer):
        webPage = serializers.CharField(default='https://www.google.com')

        class Meta:
            model = ChannelPartner
            fields = ['id', 'name', 'webPage']

    class OrganizationNestedSerializer(serializers.ModelSerializer):
        webPage = serializers.CharField(default='https://www.google.com')

        class Meta:
            model = Organization
            fields = ['id', 'name', 'webPage']

    cloudSystemId = serializers.UUIDField(source='system_id')
    channelPartner = ChannelPartneNestedSerializer(source='organization.channel_partner')
    organization = OrganizationNestedSerializer()
    state = CodeChoiceField(source='effective_state', choices=ChannelPartnerStates.STATE_CODES)
    services = serializers.DictField(default={})
    security = SecuritySerializer(source='*')
    signature = serializers.CharField(default='')


class SystemUsageReportSerializer(SignSerializerMixin, serializers.Serializer):
    class UsageSerializer(serializers.Serializer):
        class DeviceSerializer(serializers.Serializer):
            id = serializers.CharField()
            usage = serializers.IntegerField()

        class Meta:
            model = LocalRecordingUsage

        service = serializers.PrimaryKeyRelatedField(source='serviceId', queryset=ChannelPartnerService.objects.all())
        devices = DeviceSerializer(many=True)

    usages = UsageSerializer(required=False, many=True)
    locals()['from'] = serializers.DateTimeField(format='%Y-%m-%d %H:%M:%S')
    locals()['to'] = serializers.DateTimeField(format='%Y-%m-%d %H:%M:%S')
    signature = serializers.CharField(default='', read_only=True)

    def validate_timestamp(self, value):
        timestamp_seconds = int(value.timestamp())
        interval_seconds = LocalRecordingUsage.CHECK_PERIOD
        if timestamp_seconds % interval_seconds != 0:
            raise serializers.ValidationError(f'Timestamp must be divisible by {interval_seconds} seconds')
        return value

    def validate_from(self, value):
        return self.validate_timestamp(value)

    def validate_to(self, value):
        return self.validate_timestamp(value)

    def validate(self, data):
        from_ts = data.get('from')
        to_ts = data.get('to')
        if to_ts - from_ts != datetime.timedelta(seconds=LocalRecordingUsage.CHECK_PERIOD):
            raise serializers.ValidationError(f'Time range must cover exactly {LocalRecordingUsage.CHECK_PERIOD} seconds')
        return data

    def save_security_metrics(self, cloud_system: CloudSystemId):
        usages = self.validated_data.get('usages')
        from_ts = self.validated_data.get('from')
        to_ts = self.validated_data.get('to')

        service_usage_dict = defaultdict(int)
        for usage in usages:
            device_list = usage.get('devices')
            service_id = usage.get('serviceId').id
            for device in device_list:
                service_usage_dict[service_id] += device.get('usage', 0)

        for service_id, usage in service_usage_dict.items():
            ServiceUsage.objects.create(
                usage=usage, cloud_system=cloud_system, service_id=service_id, from_ts=from_ts, to_ts=to_ts)

        ServiceUsage.check_excess(cloud_system)
        cloud_system.last_usage_report = timezone.now()
        cloud_system.save()


@extend_schema_serializer(
    examples=[
         OpenApiExample(
            'Services Example',
            value={
                'services': {'3fa85f64-5717-4562-b3fc-2c963f66afa6': {
                    'quantity': 10
                }},
            },
        ),
    ]
)
class SystemServiceQuantitySerializer(serializers.ModelSerializer):
    services = serializers.DictField()

    class Meta:
        model = CloudSystemId
        fields = ['services']

    def update(self, instance: CloudSystemId, validated_data):
        services = validated_data.get('services')
        user = validated_data.get('user')
        existing_services = instance.calculate_current_services()

        for service_id, service_dict in services.items():
            qty = service_dict.get('quantity')
            current_qty = existing_services.get('services').get(service_id, {}).get('quantity')
            if current_qty is not None:
                qty_delta = qty - current_qty
            else:
                qty_delta = qty
            if qty_delta != 0:
                ChannelPartnerServiceRecord.objects.create(
                    quantity=qty_delta,
                    service_id=service_id,
                    effective_ts=timezone.now(),
                    in_effect=True,
                    cloud_system=instance,
                    created_by=CloudUser.objects.get_or_create(email=user.email)[0]
                )

        instance.calculate_current_services()
        ServiceUsage.check_excess(cloud_system=instance)
        return instance


class ServiceSerializer(serializers.ModelSerializer):
    createdByChannelPartner = serializers.PrimaryKeyRelatedField(source='created_by_channel_partner', read_only=True)
    type = CodeChoiceField(choices=list(ChannelPartnerService.SERVICE_TYPE_CODES))
    state = CodeChoiceField(choices=list(ChannelPartnerService.STATES_CODES))
    displayName = serializers.CharField(source='name')

    class Meta:
        model = ChannelPartnerService
        fields = ['id', 'type', 'state', 'displayName', 'description', 'createdByChannelPartner', 'parameters']


class AvailableChannelPartnerServiceSerializer(serializers.ModelSerializer):
    service = ServiceSerializer(read_only=True)
    price = serializers.DecimalField(decimal_places=3, max_digits=10)

    class Meta:
        fields = ['service', 'price']
        model = ServiceToSubChannelProperties


class AvailableOrganizationServiceSerializer(serializers.ModelSerializer):
    service = ServiceSerializer(read_only=True)
    price = serializers.DecimalField(decimal_places=3, max_digits=10)

    class Meta:
        fields = ['service', 'price']
        model = ServiceToOrganizationProperties


class CreateSystemSerializer(serializers.ModelSerializer):
    cloudSystemId = serializers.UUIDField(source='system_id')

    class Meta:
        model = CloudSystemId
        fields = ['cloudSystemId', 'organization']

    def validate_cloudSystemId(self, value):
        req = self.context.get('request')
        check_user_can_administer_system(value, req.auth, req.cloud_host.hostname)
        return value

    def validate_organization(self, value: Organization):
        req = self.context.get('request')
        if value.can_manage_systems(req.user):
            return value
        else:
            raise exceptions.PermissionDenied(detail=f'User does not have {Organization.permissions.manage_systems} permission for this organization')

    def create(self, validated_data):
        cloud_host = validated_data.get('cloud_host')
        system_id = validated_data.get('system_id')
        organization = validated_data.get('organization')
        system = CloudSystemId.objects.get_or_create(system_id=system_id, cloud_host=cloud_host)[0]
        system.organization = organization
        system.save()
        data = system.add_system_users_data()
        make_batch_request(self.context['request'], data)
        return system


class ChannelPartnerRoleSerializer(serializers.ModelSerializer):
    permissions = serializers.SlugRelatedField(slug_field='codename', many=True, read_only=True)

    class Meta:
        model = ChannelPartnerRole
        fields = '__all__'


class OrganizationRoleSerializer(serializers.ModelSerializer):
    permissions = serializers.SlugRelatedField(slug_field='codename', many=True, read_only=True)
    systemRole = serializers.CharField(source='system_role')

    class Meta:
        model = OrganizationRole
        exclude = ['system_role']


class ChannelPartnerEventParamSerializer(serializers.Serializer):
    startId = serializers.IntegerField(min_value=1, default=1)
    limit = serializers.IntegerField(max_value=2000, default=100, help_text='Max 2000')
    cloudHost = serializers.SlugRelatedField(slug_field='hostname', queryset=CloudHost.objects.all())


class ChannelPartnerEventSerializer(serializers.ModelSerializer):
    class CloudSystemEventSerializer(serializers.ModelSerializer):
        effective_state = CodeChoiceField(choices=CloudSystemId.STATE_CODES)

        class Meta:
            model = CloudSystemId
            fields = ['system_id', 'services', 'effective_state']

    cloud_system = CloudSystemEventSerializer(allow_null=True)
    service = ServiceSerializer(allow_null=True)
    event_type = CodeChoiceField(choices=ChannelPartnerEvent.EVENT_TYPE_CODES)

    class Meta:
        model = ChannelPartnerEvent
        fields = ['id', 'cloud_system', 'event_type', 'service']


class ChannelPartnerAllServicesParamSerializer(serializers.Serializer):
    cloudHost = serializers.SlugRelatedField(slug_field='hostname', queryset=CloudHost.objects.all())


class ExternalIdParamSerializer(serializers.Serializer):
    external_id = serializers.RegexField(regex=r'--')


class ExternalIdSerializerBase:
    def create(self, validated_data):
        custom_id = validated_data.get('custom_id')
        created_by = validated_data.get('created_by')
        if self.Meta.model.objects.filter(custom_id=custom_id, created_by=created_by):
            raise serializers.ValidationError({'customId': 'An ExternalId with this customId already exists.'})
        return super().create(validated_data)


class ChannelPartnerExternalIdSerializer(ExternalIdSerializerBase, serializers.ModelSerializer):
    channelPartner = serializers.PrimaryKeyRelatedField(source='channel_partner', queryset=ChannelPartner.objects.all())
    customId = serializers.CharField(source='custom_id')
    fullId = serializers.CharField(source='full_id',
                                   help_text='The id to use in API requests. It is "{channel_partner_id}--{custom_id}"', read_only=True)

    class Meta:
        model = ChannelPartnerExternalId
        fields = ['customId', 'channelPartner', 'fullId']

    def validate_channelPartner(self, value: ChannelPartner):
        req = self.context.get('request')
        if not value.can_access(req.user):
            raise exceptions.PermissionDenied(
                detail=f'User does not have access permission for {value.id}.')
        return value


class OrganizationExternalIdSerializer(ExternalIdSerializerBase, serializers.ModelSerializer):
    customId = serializers.CharField(source='custom_id')
    fullId = serializers.CharField(source='full_id',
                                   help_text='The id to use in API requests. It is "{channel_partner_id}--{custom_id}"', read_only=True)

    class Meta:
        model = OrganizationExternalId
        fields = ['customId', 'organization', 'fullId']

    def validate_organization(self, value: Organization):
        req = self.context.get('request')
        if not value.can_access(req.user):
            raise exceptions.PermissionDenied(
                detail=f'User does not have access permission for {value.id}.')
        return value


class CloudSystemIdExternalIdSerializer(ExternalIdSerializerBase, serializers.ModelSerializer):
    cloudSystemId = serializers.SlugRelatedField(slug_field='system_id', source='cloud_system', queryset=CloudSystemId.objects.exclude(organization=None))
    customId = serializers.CharField(source='custom_id')
    fullId = serializers.CharField(source='full_id',
                                   help_text='The id to use in API requests. It is "{channel_partner_id}--{custom_id}"', read_only=True)

    class Meta:
        model = CloudSystemExternalId
        fields = ['customId', 'cloudSystemId', 'fullId']

    def validate_cloudSystemId(self, value: CloudSystemId):
        req = self.context.get('request')
        if not value.organization.can_access(req.user):
            raise exceptions.PermissionDenied(
                detail=f'User does not have access permission for {value.organization_id}.')
        return value


class ChannelPartnerServiceExternalIdSerializer(ExternalIdSerializerBase, serializers.ModelSerializer):
    channelPartnerService = serializers.PrimaryKeyRelatedField(source='channel_partner_service', queryset=ChannelPartnerService.objects.all())
    customId = serializers.CharField(source='custom_id')
    fullId = serializers.CharField(source='full_id',
                                   help_text='The id to use in API requests. It is "{channel_partner_id}--{custom_id}"', read_only=True)

    class Meta:
        model = ChannelPartnerServiceExternalId
        fields = ['customId', 'channelPartnerService', 'fullId']

    def validate_channel_partner_service(self, value: ChannelPartnerService):
        req = self.context.get('request')
        if not value.created_by_channel_partner.can_access(req.user):
            raise exceptions.PermissionDenied(
                detail=f'User does not have access permission for {value.organization_id}.')
        return value


class ChannelPartnerRecordsParamSerializer(serializers.Serializer):
    startTs = serializers.DateField(required=False)


class OrganizationServiceRecordSerializer(serializers.ModelSerializer):
    class ServiceSerializer(serializers.ModelSerializer):
        type = CodeChoiceField(choices=list(ChannelPartnerService.SERVICE_TYPE_CODES))

        class Meta:
            model = ChannelPartnerService
            fields = ['id', 'name', 'type']

    service = ServiceSerializer()
    system = serializers.SlugRelatedField(source='cloud_system', slug_field='system_id', read_only=True)
    date = serializers.DateTimeField(source='created_ts')
    changedBy = serializers.SlugRelatedField(source='created_by', slug_field='email', read_only=True)
    changeQuantity = serializers.IntegerField(source='quantity')

    class Meta:
        model = ChannelPartnerServiceRecord
        fields = ['id', 'service', 'changeQuantity', 'system', 'date', 'changedBy']


class ChannelPartnerServiceRecordSerializer(serializers.ModelSerializer):
    serviceId = serializers.SerializerMethodField(required=False)
    organizationId = serializers.SerializerMethodField(read_only=True, required=False, default=None)
    channelPartnerId = serializers.SerializerMethodField(read_only=True, required=False, default=None)
    date = serializers.DateTimeField(source='created_ts')
    changedBy = serializers.SlugRelatedField(source='created_by', slug_field='email', read_only=True)
    changeQuantity = serializers.IntegerField(source='quantity')

    def __init__(self, *args, **kwargs):
        self.channel_partner = kwargs.pop('channel_partner', None)
        super().__init__(*args, **kwargs)

    def calculate_service_and_direct_consumer(self, obj: ChannelPartnerServiceRecord) -> None:
        def find_direct_sub_service(service: ChannelPartnerService):
            if service.parent_service.created_by_channel_partner == self.channel_partner:
                return service
            else:
                return find_direct_sub_service(service.parent_service)

        if hasattr(obj, 'service_calculated'):
            return
        else:
            if obj.service.created_by_channel_partner == self.channel_partner:
                obj.report_organization = obj.cloud_system.organization
                obj.report_service = obj.service
            else:
                service = find_direct_sub_service(obj.service)
                obj.direct_child_service = service
                obj.report_service = service.parent_service
                obj.report_channel_partner = service.created_by_channel_partner
            obj.service_calculated = True

    @extend_schema_field(OpenApiTypes.UUID)
    def get_serviceId(self, obj: ChannelPartnerServiceRecord):
        self.calculate_service_and_direct_consumer(obj)
        return obj.report_service.id

    @extend_schema_field(OpenApiTypes.UUID)
    def get_organizationId(self, obj: ChannelPartnerServiceRecord):
        self.calculate_service_and_direct_consumer(obj)
        organization: Organization = getattr(obj, 'report_organization', None)
        if organization:
            return organization.id

    @extend_schema_field(OpenApiTypes.UUID)
    def get_channelPartnerId(self, obj: ChannelPartnerServiceRecord):
        self.calculate_service_and_direct_consumer(obj)
        channel_partner: ChannelPartner = getattr(obj, 'report_channel_partner', None)
        if channel_partner:
            return channel_partner.id

    class Meta:
        model = ChannelPartnerServiceRecord
        fields = ['serviceId', 'organizationId', 'channelPartnerId', 'changedBy', 'changeQuantity', 'date']


class ChannelPartnerServiceSummarySerializer(serializers.Serializer):
    start = serializers.IntegerField()
    end = serializers.IntegerField()
    service = ServiceSerializer()
