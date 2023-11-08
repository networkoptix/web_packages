"""
Serializers for CMS views.
"""

from django.conf import settings
from rest_framework import serializers

from cms.models import ReadOnlyAPI, ReadOnlyAPIFile, PortalNotification, AgreementTypes

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
    type = serializers.CharField(default=AgreementTypes.contributor)
    grace_period = serializers.IntegerField()
    shortDescription = serializers.CharField()
    body = serializers.CharField()
    id = serializers.IntegerField()
    review_id = serializers.IntegerField()
    reviewed_date = serializers.DateTimeField()
    preview = serializers.BooleanField()
    accepted = serializers.BooleanField()


class RequiredTosSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetCustomizationReview
        fields = ['id', 'asset_id', 'version_id', 'reviewed_date',
                  'grace_period', 'customization_name', 'customization_id']

    customization_name = serializers.SerializerMethodField('get_customization_name')
    grace_period = serializers.SerializerMethodField('get_grace_period')
    asset_id = serializers.SerializerMethodField('get_asset_id')

    def get_customization_name(self, obj):
        return obj.customization.name

    def get_asset_id(self, obj):
        return obj.version.asset_id

    def get_actual_value(self, obj, ds_name):
        data_structure = DataStructure.objects.filter(
            context__asset_type__type=AssetType.ASSET_TYPES.agreement,
            name=ds_name
        ).last()
        return data_structure.find_actual_value(
            asset=self.instance.version.asset, version_id=obj.version_id,
            draft=False, customization_name=self.get_customization_name(obj))

    def get_grace_period(self, obj):
        return self.get_actual_value(obj, 'grace_period')

    def get_title(self, obj):
        return self.get_actual_value(obj, 'title')
