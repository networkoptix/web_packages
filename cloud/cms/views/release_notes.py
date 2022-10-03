from cms.controllers.asset_json import get_state
from cms.controllers.release_notes import make_release_notes_json
from util.base_cache import BaseCache
from django.conf import settings
from django.db.models import Q

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

from util.helpers import get_language_object_from_request
from api.helpers.exceptions import api_success
from cms.models import Asset, AssetCustomizationReview, AssetType,\
    UserGroupsToAssetPermissions


RELEASE_NOTES_CACHE = BaseCache(cache_key='release_notes')
RELEASE_NOTES_ASSET_TYPE = AssetType.ASSET_TYPES.release_notes
PENDING = AssetCustomizationReview.REVIEW_STATES.pending

asset_id__route_param = openapi.Parameter("asset_id", openapi.IN_PATH,
                                          description="The Release Note's Id",
                                          required=True,
                                          type=openapi.TYPE_STRING)
draft__query_param = openapi.Parameter("draft", openapi.IN_QUERY,
                                       description="Get the draft version.",
                                       type=openapi.TYPE_BOOLEAN)
pending__query_param = openapi.Parameter("pending", openapi.IN_QUERY,
                                         description="Get the pending version.",
                                         type=openapi.TYPE_BOOLEAN)

RELEASE_NOTES_NOT_FOUND = "Release notes not found."
RELEASE_NOTES_FORBIDDEN = "You do not have permission to view these release notes"
RELEASE_NOTES_DRAFT_FORBIDDEN = "You do not have permission to view this draft."
RELEASE_NOTES_REVIEW_FORBIDDEN = "You do not have permission to view this review."


@swagger_auto_schema(method='GET',
                     operation_description="Returns a release notes instance by id.",
                     manual_parameters=[asset_id__route_param, draft__query_param, pending__query_param])
@api_view(("GET", ))
@permission_classes((AllowAny, ))
def get_release_note(request, asset_id=None):
    draft = "draft" in request.GET
    review = "pending" in request.GET
    language = get_language_object_from_request(request)


    if not asset_id:
        return api_success(RELEASE_NOTES_NOT_FOUND, status_code=status.HTTP_404_NOT_FOUND)

    asset_id = int(asset_id)
    release_note = Asset.objects.filter(asset_type__type=RELEASE_NOTES_ASSET_TYPE,
                                       customizations__name__in=[settings.CUSTOMIZATION],
                                       id=asset_id).last()

    if not release_note:
        return api_success(RELEASE_NOTES_NOT_FOUND, status_code=status.HTTP_404_NOT_FOUND)

    if draft or review:
        if not request.user.is_authenticated:
            return api_success(RELEASE_NOTES_FORBIDDEN,
                               status_code=status.HTTP_403_FORBIDDEN)
        if release_note.id not in request.user.assets and not request.user.is_superuser:
            if draft:
                return api_success(RELEASE_NOTES_DRAFT_FORBIDDEN,
                                   status_code=status.HTTP_403_FORBIDDEN)
            # If not draft, it is a review
            if not UserGroupsToAssetPermissions.\
                    check_customization_permission(request.user, settings.CUSTOMIZATION, 'cms.publish_version'):
                return api_success(RELEASE_NOTES_REVIEW_FORBIDDEN,
                                   status_code=status.HTTP_403_FORBIDDEN)

    return api_success(make_release_notes_json([release_note], language, user=request.user,
                                                show_pending=review, show_drafts=draft))


@api_view(("GET", ))
@permission_classes((AllowAny, ))
def get_release_notes(request):
    """
    Returns a list of release_notes available to the current user
    """
    language = get_language_object_from_request(request)
    customization_release_notes = Asset.objects.filter(asset_type__type=RELEASE_NOTES_ASSET_TYPE,
                                        customizations__name__in=[settings.CUSTOMIZATION])

    if not customization_release_notes.exists():
        return api_success({})     
    response_release_notes = []        

    is_portal_manager = UserGroupsToAssetPermissions.\
        check_customization_permission(request.user, settings.CUSTOMIZATION, 'cms.publish_version')

    draft_release_notes = []
    if not request.user.is_anonymous:
        draft_release_notes = customization_release_notes.filter(Q(id__in=request.user.assets) | Q(created_by=request.user)).distinct()
        if request.user.is_superuser:
            draft_release_notes = customization_release_notes
            review_release_notes = customization_release_notes
        elif is_portal_manager:
            review_release_notes = customization_release_notes.filter(
                contentversion__assetcustomizationreview__state=PENDING,
                contentversion__assetcustomizationreview__customization__name=settings.CUSTOMIZATION,
            ).distinct()
        else:
            review_release_notes = draft_release_notes

        if draft_release_notes:
            response_release_notes.extend(make_release_notes_json(draft_release_notes, language, user=request.user, show_drafts=True))
        if review_release_notes:
           response_release_notes.extend(make_release_notes_json(
               review_release_notes, language, user=request.user, show_pending=True))

    response_release_notes.extend(make_release_notes_json(customization_release_notes, language, user=request.user,))

    return api_success({'data': response_release_notes})
