from rest_framework import serializers


class NotificationSerializer(serializers.Serializer):
    systemId = serializers.UUIDField(allow_null=False)
    targets = serializers.ListField(child=serializers.CharField(min_length=1))
    notification = serializers.DictField()

    def validate_notification(self, value):
        if 'title' not in value or 'body' not in value:
            raise serializers.ValidationError('Title and body are required')
        elif not isinstance(value['title'], str) or not isinstance(value['body'], str):
            raise serializers.ValidationError('Title and body must be strings')
        return value
