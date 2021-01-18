from rest_framework import serializers


class AuthKeySerializer(serializers.Serializer):
    authGet = serializers.CharField()
    authPost = serializers.CharField()
    authPlay = serializers.CharField()
