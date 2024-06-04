import json

from django.conf import settings
from django.core.cache import caches
from rest_framework import serializers
from django.core.exceptions import ValidationError

from cloud.controllers.cloud_api import System, CloudDbConfig
from cloud.helpers.exceptions import APILogicException, APINotAuthorisedException
from cms.models import get_cloud_portal_asset
from notifications.models import PushSubscription, PushDevice, PushNotification, SystemEmail
from notifications.conf import get_sns_client

import botocore
import logging



PUSHDEVICE_TYPES = tuple(PushDevice.TYPES._identifier_map.keys())
PROVIDERS = tuple(PushDevice.PROVIDERS._identifier_map.keys())
PROVIDERS_REVERSE_MAP = {i: name for name,
                         i in PushDevice.PROVIDERS._identifier_map.items()}

FCM_ERRORS = {
    'MismatchSenderId': 'Device token does not match with the current configuration',
    'InvalidRegistration': 'Device token is invalid',
    'NotRegistered': 'Device token is no longer valid',
    'InvalidApnsCredential': 'APNs key is not valid for this device'
}

logger = logging.getLogger(__name__)


def get_aws_platform_arns(customization_name):
    arn_customizations = caches['push_config'].get('platform_arns', {})
    if customization_name not in arn_customizations:
        current_portal = get_cloud_portal_asset(customization=customization_name)
        arn_customizations[customization_name] = {}
        for provider in ('FIREBASE', 'BAIDU', 'APN', 'APN_SANDBOX'):
            arn_customizations[customization_name][provider.lower()] = current_portal.read_global_value(
                f'%PUSH_ARN_{provider}%')
        caches['push_config'].set('platform_arns', arn_customizations)
    return arn_customizations[customization_name]


class NotificationSerializer(serializers.Serializer):
    class NotificationDataSerializer(serializers.Serializer):
        title = serializers.CharField(
            required=False, allow_blank=True, max_length=255, default='')
        body = serializers.CharField(
            required=False, allow_blank=True, default='')
        payload = serializers.DictField(required=False, default={})
        options = serializers.DictField(required=False, default={})

        def validate(self, data):
            if len(data['title'] + data['body'] + json.dumps(data['payload'])) > PushNotification.SIZE_LIMIT:
                raise serializers.ValidationError(
                    f'Title, body, and payload cannot total more than {PushNotification.SIZE_LIMIT} characters')
            return data

    systemId = serializers.UUIDField(
        allow_null=False, label='ID of target system')
    targets = serializers.ListField(
        child=serializers.CharField(min_length=1), label='List of emails')
    notification = NotificationDataSerializer()


class RegisterDeviceSerializer(serializers.Serializer):
    deviceToken = serializers.CharField()
    name = serializers.CharField()
    model = serializers.CharField()


class UnregisterDeviceSerializer(serializers.Serializer):
    deviceToken = serializers.CharField()


class SubscriptionSerializer(serializers.Serializer):
    systems = serializers.ListField(required=False)
    deviceToken = serializers.CharField(required=True)
    isEnabled = serializers.BooleanField(required=False)
    deviceInfo = serializers.DictField(required=False)
    type = serializers.ChoiceField(choices=PUSHDEVICE_TYPES, required=False)
    provider = serializers.ChoiceField(
        choices=PROVIDERS, required=False, default='firebase_legacy')
    userId = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        device_token = data.get('deviceToken')
        provider = data.get('provider')
        user_id = data.get('userId')
        customization=self.context['request'].CUSTOMIZATION

        if not self.instance:
            if provider == 'firebase_legacy':
                device = PushDevice(
                    registration_id=device_token, cloud_message_type='FCM', user=self.context['request'].user,
                    application_id=customization
                )
                response = device.send_message(message='', dry_run=True)
                if response['success'] == 1:
                    return data
                else:
                    fcm_error = response['results'][0]['error']
                    raise serializers.ValidationError({
                        'message': 'Token could not be validated',
                        'code': fcm_error,
                        'error': FCM_ERRORS.get(fcm_error, fcm_error)
                    })
            elif provider == 'baidu' and not user_id:
                raise serializers.ValidationError({
                    'userId': 'This field is required when using provider "baidu"'
                })
        return data

    def validate_systems(self, value):
        if value is not None:
            request_data = self.context['request'].data

            if 'all' in value:
                return ['all']
            cloud_db_url = CloudDbConfig.url(self.context['request'].CUSTOMIZATION)
            try:
                systems = System.list(
                    self.context['request'], email=request_data.get('username'), password=request_data.get('password'), cloud_db_url=cloud_db_url, one_customization=False)
                systems = [system['id'] for system in systems['systems']]

                for system in value[:]:
                    if system not in systems:
                        value.remove(system)

                return value

            except Exception as exception:
                if isinstance(exception, APINotAuthorisedException):
                    raise serializers.ValidationError('Invalid credentials')
                elif isinstance(exception, APILogicException):
                    raise serializers.ValidationError(
                        f'APILogicException: {str(exception)}')
                else:
                    raise serializers.ValidationError(
                        'Cannot authenticate at this time')
        else:
            return value

    def assign_systems(self, instance, systems):
        if systems == ['all']:
            subscription = PushSubscription.objects.get_or_create(
                type=PushSubscription.SUB_TYPES.cloud, system_id='all'
            )[0]
            instance.subscriptions.set([subscription])
        elif systems:
            existing_subscriptions = PushSubscription.objects.filter(
                system_id__in=systems)
            systems = list(set(
                systems) - {str(system) for system in existing_subscriptions.values_list('system_id', flat=True)})
            instance.subscriptions.set(existing_subscriptions)
            for system in systems:
                system = PushSubscription.objects.create(
                    type=PushSubscription.SUB_TYPES.cloud, system_id=system)
                instance.subscriptions.add(system)
        elif type(systems) == list:
            instance.subscriptions.clear()

    def assign_device_info(self, instance, device_info):
        if device_info is not None:
            if 'name' in device_info:
                instance.name = device_info['name']
            if 'model' in device_info:
                instance.model = device_info['model']
            if 'os' in device_info:
                instance.os = getattr(
                    PushDevice.OS, device_info['os'], PushDevice.OS.web)
        return instance

    def create_platform_endpoint(self, instance):
        provider = self.validated_data.get('provider')
        user_id = self.validated_data.get('userId')
        platform_arns = get_aws_platform_arns(self.context['request'].CUSTOMIZATION)
        platform_arn = platform_arns[provider]
        if not platform_arn:
            raise serializers.ValidationError(
                f'ARN is not configured for provider {provider}')

        sns_client = get_sns_client()
        try:
            if provider == 'baidu':
                platform_endpoint = sns_client.create_platform_endpoint(
                    PlatformApplicationArn=platform_arn, Token=instance.registration_id,
                    Attributes={'UserId': user_id,
                                'ChannelId': instance.registration_id}
                )
                instance.baidu_user_id = user_id
            else:
                platform_endpoint = sns_client.create_platform_endpoint(
                    PlatformApplicationArn=platform_arn, Token=instance.registration_id)
        except botocore.exceptions.ClientError as client_error:
            logger.warning(f'Provider: {provider}, Device Id: {instance.registration_id}, UserId: {user_id}, PlatformARN: {platform_arn}\n'
                           f'Boto3 ClientError: {client_error}')
            raise serializers.ValidationError(
                {'message': 'Error registering the provided token'})

        endpoint_arn = platform_endpoint.get('EndpointArn')
        instance.arn = endpoint_arn
        return endpoint_arn

    def handle_duplicate_fcm(self, device):
        # Delete devices that have the same registration id from the opposite provider
        if device.provider == PushDevice.PROVIDERS.firebase:
            PushDevice.objects.filter(provider=PushDevice.PROVIDERS.firebase_legacy,
                                      registration_id=device.registration_id).delete()
        if device.provider == PushDevice.PROVIDERS.firebase_legacy:
            PushDevice.objects.filter(provider=PushDevice.PROVIDERS.firebase,
                                      registration_id=device.registration_id).delete()

    def create(self, validated_data, *, customization=None):
        customization = customization or self.context['request'].CUSTOMIZATION
        device = PushDevice(
            registration_id=validated_data['deviceToken'], cloud_message_type='FCM',
            user=self.context['request'].user, application_id=customization
        )
        systems = validated_data.get('systems', ['all'])
        is_enabled = validated_data.get('isEnabled', True)
        device_info = validated_data.get('deviceInfo', {})
        device_type = validated_data.get('type', None)
        device_provider = validated_data.get('provider')

        if device_type is not None:
            device.type = getattr(PushDevice.TYPES, device_type)
        device.provider = getattr(PushDevice.PROVIDERS, device_provider)

        if device.provider != PushDevice.PROVIDERS.firebase_legacy:
            self.create_platform_endpoint(device)

        device.active = is_enabled

        device = self.assign_device_info(device, device_info)
        device.save()
        self.handle_duplicate_fcm(device)

        self.assign_systems(device, systems)

        return device

    def update(self, instance, validated_data):
        systems = validated_data.get('systems', None)
        is_enabled = validated_data.get('isEnabled', None)
        device_info = validated_data.get('deviceInfo', None)
        device_type = validated_data.get('type', None)

        if is_enabled is not None:
            instance.active = is_enabled

        if device_type is not None:
            instance.type = getattr(PushDevice.TYPES, device_type)

        instance = self.assign_device_info(instance, device_info)
        instance.save()

        self.assign_systems(instance, systems)
        self.handle_duplicate_fcm(instance)
        return instance


class DeviceSubscriptionsSerializer(serializers.ModelSerializer):
    systems = serializers.SerializerMethodField()
    deviceInfo = serializers.SerializerMethodField()
    isEnabled = serializers.BooleanField(required=False, source='active')
    type = serializers.SerializerMethodField()
    provider = serializers.SerializerMethodField()

    class Meta:
        model = PushDevice
        fields = ['type', 'deviceInfo', 'systems', 'isEnabled', 'provider']

    def get_systems(self, obj):
        return [sub.system_id for sub in obj.subscriptions.all()]

    def get_deviceInfo(self, obj):
        return {'name': obj.name, 'model': obj.model, 'os': PushDevice.OS[obj.os]}

    def get_type(self, obj):
        return PushDevice.TYPES[obj.type]

    def get_provider(self, obj):
        return PROVIDERS_REVERSE_MAP[obj.provider]


def validate_attachment(attachment):
    required = ['filename', 'content']
    chars_in_mb = 1_048_576

    if missing := [field for field in required if not attachment[field]]:
        return f'{attachment.get("filename", "")} Attachment is missing the following fields: {missing}'.lstrip()

    if len(attachment['content'].encode('utf-8')) > chars_in_mb:
        return f'{attachment["filename"]} is too large. Must be < 400KB'


def validate_serialized_attachments(attachments):
    if errors := [error for attachment in attachments if (error := validate_attachment(attachment))]:
        raise ValidationError(errors)

def normalize_system_email_data(data):
    '''
    Handles normalization of data from mediaservers to match the SystemEmail model.

    Currently the mediaserver uses messageBody and messagePlainBody, but the SystemEmail model uses messageHtml and messageText.

    The mediaserver also uses camelCase for the attachment keys, but the SystemEmail model uses lowercase.

    We should have the mediaserver use the same keys as the SystemEmail model.

    This fix would handle previously built mediaserver versions in case emails through cloud are turned on.
    '''
    if message_body := data.pop('messageBody', ''):
        data['messageHtml'] = message_body

    if message_plain_body := data.pop('messagePlainBody', ''):
        data['messageText'] = message_plain_body

    if attachments := data.pop('attachments', []):
        data['attachments'] = [{ k.lower(): v for k, v in attachment.items() } for attachment in attachments]

    if 'cloudWrapper' not in data:
        data['cloudWrapper'] = False

    return data


class SystemEmailSerializer(serializers.ModelSerializer):
    systemId = serializers.CharField(
        source='system_id', required=False, allow_blank=True)
    subject = serializers.CharField()
    messageHtml = serializers.CharField(
        source='message_html', required=False, allow_blank=True)
    messageText = serializers.CharField(
        source='message_text', required=False, allow_blank=True)
    targets = serializers.ListField(
        required=True, child=serializers.EmailField(), allow_empty=False)
    attachments = serializers.ListField(
        validators=[validate_serialized_attachments], required=False)
    messageId = serializers.IntegerField(
        source='pk', required=False, read_only=True)
    cloudWrapper = serializers.BooleanField(source='cloud_wrapper', required=False)

    class Meta:
        model = SystemEmail
        fields = ('systemId', 'subject', 'messageHtml',
                  'messageText', 'targets', 'attachments', 'messageId', 'cloudWrapper')

    def __init__(self, *args, **kwargs):
        if data := kwargs.pop('data', False):
            kwargs['data'] = normalize_system_email_data(data)
        super().__init__(*args, **kwargs)

    def create(self, *, customization):
        self.is_valid(True)
        return SystemEmail(**self.validated_data, customization=customization)
