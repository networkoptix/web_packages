from api.controllers.cloud_api import System
from api.helpers.exceptions import APILogicException, APINotAuthorisedException
from django.conf import settings
from rest_framework import serializers

from .models import PushSubscription, PushDevice

PUSHDEVICE_TYPES = tuple(PushDevice.TYPES._identifier_map.keys())

FCM_ERRORS = {
    'MismatchSenderId': 'Device token does not match with the current configuration',
    'InvalidRegistration': 'Device token is invalid',
    'NotRegistered': 'Device token is no longer valid',
    'InvalidApnsCredential': 'APNs key is not valid for this device'
}


class NotificationSerializer(serializers.Serializer):
    systemId = serializers.UUIDField(allow_null=False)
    targets = serializers.ListField(child=serializers.CharField(min_length=1))
    notification = serializers.DictField()

    def validate_notification(self, value):
        value['title'] = value.get('title', '')
        value['body'] = value.get('body', '')

        if not isinstance(value['title'], str) or not isinstance(value['body'], str):
            raise serializers.ValidationError('Title and body must be strings')
        return value


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

    def validate_deviceToken(self, value):
        if self.instance:
            return value
        else:
            device = PushDevice(
                registration_id=value, cloud_message_type='FCM', user=self.context['request'].user,
                application_id=settings.CUSTOMIZATION
            )
            response = device.send_message(message='', dry_run=True)
            if response['success'] == 1:
                return value
            else:
                fcm_error = response['results'][0]['error']
                raise serializers.ValidationError({
                    'message': 'Token could not be validated',
                    'code': fcm_error,
                    'error': FCM_ERRORS.get(fcm_error, fcm_error)
                })

    def validate_systems(self, value):
        if value is not None:
            request_data = self.context['request'].data

            if 'all' in value:
                return ['all']

            try:
                systems = System.list(email=request_data['username'], password=request_data['password'])
                systems = [system['id'] for system in systems['systems']]

                for system in value[:]:
                    if system not in systems:
                        value.remove(system)

                return value

            except Exception as exception:
                if isinstance(exception, APINotAuthorisedException):
                    raise serializers.ValidationError('Invalid credentials')
                elif isinstance(exception, APILogicException):
                    raise serializers.ValidationError(f'APILogicException: {str(exception)}')
                else:
                    raise serializers.ValidationError('Cannot authenticate at this time')
        else:
            return value

    def assign_systems(self, instance, systems):
        if systems == ['all']:
            subscription = PushSubscription.objects.get_or_create(
                type=PushSubscription.SUB_TYPES.cloud, system_id='all'
            )[0]
            instance.subscriptions.set([subscription])
        elif systems:
            existing_subscriptions = PushSubscription.objects.filter(system_id__in=systems)
            systems = list(set(systems) - {str(system) for system in existing_subscriptions.values_list('system_id', flat=True)})
            instance.subscriptions.set(existing_subscriptions)
            for system in systems:
                system = PushSubscription.objects.create(type=PushSubscription.SUB_TYPES.cloud, system_id=system)
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
                instance.os = getattr(PushDevice.OS, device_info['os'], PushDevice.OS.web)
        return instance

    def create(self, validated_data):
        device = PushDevice(
            registration_id=validated_data['deviceToken'], cloud_message_type='FCM',
            user=self.context['request'].user, application_id=settings.CUSTOMIZATION
        )
        systems = validated_data.get('systems', ['all'])
        is_enabled = validated_data.get('isEnabled', True)
        device_info = validated_data.get('deviceInfo', {})
        device_type = validated_data.get('type', None)

        if device_type is not None:
            device.type = getattr(PushDevice.TYPES, device_type)

        device.active = is_enabled

        device = self.assign_device_info(device, device_info)
        device.save()

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

        return instance


class DeviceSubscriptionsSerializer(serializers.ModelSerializer):
    systems = serializers.SerializerMethodField()
    deviceInfo = serializers.SerializerMethodField()
    isEnabled = serializers.BooleanField(required=False, source='active')
    type = serializers.SerializerMethodField()

    class Meta:
        model = PushDevice
        fields = ['type', 'deviceInfo','systems', 'isEnabled']

    def get_systems(self, obj):
        return [sub.system_id for sub in obj.subscriptions.all()]

    def get_deviceInfo(self, obj):
        return {'name': obj.name, 'model': obj.model, 'os': PushDevice.OS[obj.os]}

    def get_type(self, obj):
        return PushDevice.TYPES[obj.type]
