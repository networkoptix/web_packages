"""
Serializers for release note views.
"""

from django.db.models import Q
from django.conf import settings
from rest_framework import serializers

from cms.controllers.release_notes import make_release_notes_json
from cms.models import AssetCustomizationReview, UserGroupsToAssetPermissions
from util.helpers import get_language_object_from_request


class ReleaseNotesContentSerializer(serializers.Serializer):
    version = serializers.CharField(required=False)
    warnings = serializers.CharField(required=False)
    features = serializers.CharField(required=False)
    improvements = serializers.CharField(required=False)
    bugFixes = serializers.CharField(required=False)
    custom = serializers.CharField(required=False)


class ReleaseNotesSerializer(serializers.Serializer):
    # TODO: See if it's worth creating a ReleaseNoteContentSerializer
    # Would need to dynamically add fields from replacement variables for customization
    # Might be more work than it's worth
    releaseNotes = serializers.DictField(child=serializers.CharField())
    lastModified = serializers.CharField()
    review_id = serializers.IntegerField()
    id = serializers.IntegerField()
    draft = serializers.BooleanField(required=False)
    pending = serializers.BooleanField(required=False)

    @staticmethod
    def generate(release_notes, request):
        data = make_release_notes_json(release_notes, language=get_language_object_from_request(
            request), show_pending="pending" in request.GET, show_drafts="draft" in request.GET, user=request.user)
        return ReleaseNotesSerializer(data=data, many=True)


class ReleaseNotesListSerializer(serializers.Serializer):
    data = ReleaseNotesSerializer(many=True, required=False)

    @staticmethod
    def generate(release_notes, request):
        language = get_language_object_from_request(request)
        response_release_notes = []

        is_portal_manager = UserGroupsToAssetPermissions.\
            check_customization_permission(
                request.user, settings.CUSTOMIZATION, 'cms.publish_version')

        draft_release_notes = []
        if not request.user.is_anonymous:
            draft_release_notes = release_notes.filter(
                Q(id__in=request.user.assets) | Q(created_by=request.user)).distinct()
            if request.user.is_superuser:
                draft_release_notes = release_notes
                review_release_notes = release_notes
            elif is_portal_manager:
                review_release_notes = release_notes.filter(
                    contentversion__assetcustomizationreview__state=AssetCustomizationReview.REVIEW_STATES.pending,
                    contentversion__assetcustomizationreview__customization__name=settings.CUSTOMIZATION,
                ).distinct()
            else:
                review_release_notes = draft_release_notes

            if draft_release_notes:
                response_release_notes.extend(make_release_notes_json(
                    draft_release_notes, language, user=request.user, show_drafts=True))
            if review_release_notes:
                response_release_notes.extend(make_release_notes_json(
                    review_release_notes, language, user=request.user, show_pending=True))

        response_release_notes.extend(make_release_notes_json(
            release_notes, language, user=request.user,))

        return ReleaseNotesListSerializer(data=response_release_notes)

    def __init__(self, *args, **kwargs):
        data = kwargs.get('data', [])
        kwargs['data'] = {'data': data}
        super().__init__(*args, **kwargs)
