"""
Serializers for integrations views.
"""

from django.conf import settings
from rest_framework import serializers

from cms.controllers.integration import make_integrations_json
from util.helpers import get_language_object_from_request


class IntegrationTypeSerializer(serializers.Serializer):
    id = serializers.CharField(required=False)
    label = serializers.CharField(required=False)


class InformationSerializer(serializers.Serializer):
    name = serializers.CharField(required=False)
    logo = serializers.CharField(required=False)
    shortDescription = serializers.CharField(required=False)
    type = IntegrationTypeSerializer(many=True, required=False)
    tags = serializers.CharField(required=False)
    companyName = serializers.CharField(required=False)
    companyWeb = serializers.CharField(required=False)
    companyPrivacyPolicyLink = serializers.CharField(required=False)
    termsOfUseLink = serializers.CharField(required=False)

class ScreenShotSerializer(serializers.Serializer):
    screenshot = serializers.CharField(required=False)
    caption = serializers.CharField(required=False)

class OverviewSerializer(serializers.Serializer):
    description = serializers.CharField(required=False)
    screenshots = ScreenShotSerializer(required=False, many=True)


class InstructionsSerializer(serializers.Serializer):
    installationInstructions = serializers.CharField(required=False)
    installationVideo = serializers.CharField(required=False)
    screenshots = ScreenShotSerializer(required=False, many=True)


class SupportSerializer(serializers.Serializer):
    supportEmail = serializers.CharField(required=False)
    supportPhone = serializers.CharField(required=False)
    supportWeb = serializers.CharField(required=False)


class VersionDetailsSerializer(serializers.Serializer):
    version = serializers.CharField(required=False)
    whatsNew = serializers.CharField(required=False)


class RequirementsAndCompatibilitySerializer(serializers.Serializer):
    testedVersions = serializers.ListSerializer(
        child=serializers.CharField(), required=False)
    testedBuild = serializers.CharField(required=False)
    platforms = serializers.ListSerializer(
        child=serializers.CharField(), required=False)
    additionalRequirements = serializers.CharField(required=False)
    versionDetails = VersionDetailsSerializer(required=False)


class IntegrationSerializer(serializers.Serializer):
    information = InformationSerializer(required=False)
    overview = OverviewSerializer(required=False)
    instructions = InstructionsSerializer(required=False)
    support = SupportSerializer(required=False)
    downloadFiles = serializers.DictField(required=False)
    downloadFilesOrder = serializers.DictField(
        child=serializers.IntegerField(), required=False)
    requirementsAndCompatibility = RequirementsAndCompatibilitySerializer(
        required=False)
    versionDetails = serializers.DictField(required=False)
    lastModified = serializers.CharField(required=False)
    review_id = serializers.IntegerField(required=False)
    id = serializers.IntegerField(required=False)
    mine = serializers.BooleanField(required=False)
    canEdit = serializers.BooleanField(required=False)
    urlified = serializers.CharField(required=False)
    draft = serializers.BooleanField(required=False)
    pending = serializers.BooleanField(required=False)

    @staticmethod
    def generate(integrations, request):
        data = make_integrations_json(integrations, language=get_language_object_from_request(
            request), show_pending="pending" in request.GET, show_drafts="draft" in request.GET, user=request.user, request=request)
        return IntegrationSerializer(data=data, many=True)


class IntegrationsListSerializer(serializers.Serializer):
    data = IntegrationSerializer(many=True)
