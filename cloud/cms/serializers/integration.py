"""
Serializers for integrations views.
"""

from django.conf import settings
from rest_framework import serializers

from cms.controllers.integration import make_integrations_json
from util.helpers import get_language_object_from_request


class IntegrationTypeSerializer(serializers.Serializer):
    id = serializers.CharField()
    label = serializers.CharField()


class InformationSerializer(serializers.Serializer):
    name = serializers.CharField(required=False)
    logo = serializers.CharField(required=False)
    shortDescription = serializers.CharField(required=False)
    type = IntegrationTypeSerializer(many=True, required=False)
    tags = serializers.CharField(required=False)
    companyName = serializers.CharField(required=False)
    companyWeb = serializers.CharField(required=False)
    companyPrivacyLink = serializers.CharField(required=False)
    termsOfUseLink = serializers.CharField(required=False)


class OverviewSerializer(serializers.Serializer):
    description = serializers.CharField(required=False)
    overviewScreenshot1 = serializers.CharField(required=False)
    overviewScreenshot1caption = serializers.CharField(required=False)
    overviewScreenshot2 = serializers.CharField(required=False)
    overviewScreenshot2caption = serializers.CharField(required=False)
    overviewScreenshot3 = serializers.CharField(required=False)
    overviewScreenshot3caption = serializers.CharField(required=False)


class InstructionsSerializer(serializers.Serializer):
    installationInstructions = serializers.CharField(required=False)


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
    information = InformationSerializer()
    overview = OverviewSerializer()
    instructions = InstructionsSerializer()
    support = SupportSerializer()
    downloadFiles = serializers.DictField()
    downloadFilesOrder = serializers.DictField(
        child=serializers.IntegerField())
    requirementsAndCompatability = RequirementsAndCompatibilitySerializer(
        required=False)
    versionDetails = serializers.DictField()
    lastModified = serializers.CharField()
    review_id = serializers.IntegerField()
    id = serializers.IntegerField()
    mine = serializers.BooleanField()
    canEdit = serializers.BooleanField()
    urlified = serializers.CharField()

    @staticmethod
    def generate(integrations, request):
        data = make_integrations_json(integrations, language=get_language_object_from_request(
            request), show_pending="pending" in request.GET, show_drafts="draft" in request.GET, user=request.user)
        return IntegrationSerializer(data=data, many=True)


class IntegrationsListSerializer(serializers.Serializer):
    data = IntegrationSerializer(many=True)
