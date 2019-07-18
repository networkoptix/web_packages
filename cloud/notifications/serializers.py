from api.controllers.cloud_api import System
from api.helpers.exceptions import APILogicException, APINotAuthorisedException
from rest_framework import serializers
from rest_framework.fields import empty

from .models import PushSubscription, PushDevice


class NotificationSerializer(serializers.Serializer):
    systemId = serializers.UUIDField(allow_null=False)
    targets = serializers.ListField(child=serializers.CharField(min_length=1))
    notification = serializers.DictField()

    def validate_notification(self, value):
        if 'title' not in value or 'body' not in value:
            raise serializers.ValidationError('Title and body are required')
        elif not isinstance(value['title'], str) or not isinstance(value['body'], str):
            raise serializers.ValidationError('Title and body must be strings')
        elif not value['title'] or not value['body']:
            raise serializers.ValidationError('Title and body cannot be blank')
        return value


class RegisterDeviceSerializer(serializers.Serializer):
    deviceToken = serializers.CharField()
    name = serializers.CharField()
    model = serializers.CharField()


class SubscriptionSerializer(serializers.Serializer):
    systemId = serializers.UUIDField()
    deviceToken = serializers.CharField(required=False, default='')
    isActive = serializers.BooleanField(required=False, default=True)

    def __init__(self, instance=None, data=empty, **kwargs):
        self.authenticated = kwargs.pop('authenticated', False)
        super().__init__(instance, data, **kwargs)

    def validate_deviceToken(self, value):
        if self.context['request'].method == 'GET' and not value:
            raise serializers.ValidationError('Device Token is required')
        return value

    def validate_systemId(self, value):
        request_data = self.context['request'].data
        if self.authenticated:
            return value

        try:
            System.get(email=request_data['username'], password=request_data['password'], system_id=value)
            return value
        except Exception as exception:
            if isinstance(exception, APINotAuthorisedException):
                raise serializers.ValidationError('Invalid credentials for the system')
            elif isinstance(exception, APILogicException):
                raise serializers.ValidationError('System not found or not authorized for the system')
            else:
                raise serializers.ValidationError('Cannot authenticate at this time')

    def validate(self, data):
        if data['deviceToken']:
            if not PushDevice.objects.filter(registration_id=data['deviceToken']).exists():
                raise serializers.ValidationError('Device not registered')

        elif data['isActive']:
            raise serializers.ValidationError('Device Token is required for subscribing')

        return data

    def create(self, validated_data):
        device = PushDevice.objects.get(registration_id=validated_data['deviceToken'])
        return PushSubscription.objects.create(
            system_id=validated_data['systemId'], account=self.context['request'].user,
            active=validated_data['isActive'], device=device
        )

    def update(self, instance, validate_data):
        if instance:
            instance.active = validate_data.get('isActive', True)
            instance.save()
        elif not validate_data['isActive']:
            subs = PushSubscription.objects.filter(
                account=self.context['request'].user, system_id=validate_data['systemId']
            )
            subs.update(active=False)
        return instance
