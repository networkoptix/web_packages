"""
Serializers for CMS views.
"""

from django.conf import settings
from rest_framework import serializers

from cms.models import ReadOnlyAPI, ReadOnlyAPIFile, PortalNotification

from .asset_cms import *
from .cms_structs import *
from .documentation import *
from .custom_client_cms import *
from .documentation import *
from .integration import *
from .release_note import *


class SanitizeHTMLSerializer(serializers.Serializer):
    html = serializers.CharField()


class ReadOnlyAPIFileSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source='get_type_display')
    class Meta:
        model = ReadOnlyAPIFile
        fields = ('filename', 'content', 'type')

class ReadOnlyAPIDetailSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source='get_type_display')
    files = ReadOnlyAPIFileSerializer(source='readonlyapifile_set', many=True, read_only=True)

    class Meta:
        model = ReadOnlyAPI
        fields = ('__all__')

class ReadOnlyAPIListSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source='get_type_display')
    class Meta:
        model = ReadOnlyAPI
        fields = ('__all__')


class PortalNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortalNotification
        fields = 'title', 'id', 'body', 'url', 'build'


class PortalNotificationIdSerializer(serializers.Serializer):
    notificationIds = serializers.ListField(
        child=serializers.IntegerField(), label="Notifications to mark as read")

    def validate_notificationIds(self, notifications):
        if not isinstance(notifications, list):
            raise serializers.ValidationError('Must be a list')

        if non_integer := [notification for notification in notifications if not isinstance(notification, int)]:
            raise serializers.ValidationError(
                f'All values must be integers, the following are invalid: {non_integer}')

        return notifications


class PortalNotificationListSerializer(serializers.Serializer):
    currentBuild = serializers.SerializerMethodField(
        'get_version', label="Current Cloud Portal build")
    notifications = PortalNotificationSerializer(
        many=True, label="Currently active notifications for user.")
    markedRead = PortalNotificationSerializer(
        many=True, default=[], label='Notifications marked as read')

    def get_version(self, obj):
        return settings.VERSION


class AgreementSerializer(serializers.Serializer):
    title = serializers.CharField()
    shortDescription = serializers.CharField()
    body = serializers.CharField()
    id = serializers.IntegerField()
    review_id = serializers.IntegerField()
    preview = serializers.BooleanField()
    accepted = serializers.BooleanField()
