from util.base_cache import BaseCache
from cms.controllers.integration import check_integration_store_enabled, make_integrations_json
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

INTEGRATION = AssetType.ASSET_TYPES.integration
PENDING = AssetCustomizationReview.REVIEW_STATES.pending

asset_id__route_param = openapi.Parameter("asset_id", openapi.IN_PATH,
                                          description="The Integration's id.",
                                          required=True,
                                          type=openapi.TYPE_STRING)
draft__query_param = openapi.Parameter("draft", openapi.IN_QUERY,
                                       description="Get the draft version.",
                                       type=openapi.TYPE_BOOLEAN)
pending__query_param = openapi.Parameter("pending", openapi.IN_QUERY,
                                         description="Get the pending version.",
                                         type=openapi.TYPE_BOOLEAN)

# Status Messages
INTEGRATION_NOT_FOUND = "Integration not found."
INTEGRATION_FORBIDDEN = "You do not have permission to view this integration"

@swagger_auto_schema(method='GET',
                     operation_description="Returns an integration by id.",
                     manual_parameters=[asset_id__route_param, draft__query_param, pending__query_param])
@api_view(("GET", ))
@permission_classes((AllowAny, ))
def get_integration(request, asset_id=None):
    draft = "draft" in request.GET
    review = "pending" in request.GET
    is_enabled = check_integration_store_enabled()
    has_beta_access = UserGroupsToAssetPermissions.user_has_beta_access(request.user)

    if not asset_id:
        return api_success(INTEGRATION_NOT_FOUND, status_code=status.HTTP_404_NOT_FOUND)

    asset_id = int(asset_id)
    integration = Asset.objects.filter(asset_type__type=INTEGRATION,
                                       customizations__name__in=[settings.CUSTOMIZATION],
                                       id=asset_id).last()

    if not integration:
        return api_success(INTEGRATION_NOT_FOUND, status_code=status.HTTP_404_NOT_FOUND)

    if draft or review:
        if not request.user.is_authenticated:
            return api_success(INTEGRATION_FORBIDDEN,
                               status_code=status.HTTP_403_FORBIDDEN)
        if integration.id not in request.user.assets and not request.user.is_superuser:
            if draft:
                return api_success(f"You do not have permission to view this draft.",
                                   status_code=status.HTTP_403_FORBIDDEN)
            if not UserGroupsToAssetPermissions.\
                    check_customization_permission(request.user, settings.CUSTOMIZATION, 'cms.publish_version'):
                return api_success(f"You do not have permission to view this review.",
                                   status_code=status.HTTP_403_FORBIDDEN)
    elif not (is_enabled or has_beta_access):
        return api_success(INTEGRATION_FORBIDDEN,
                           status_code=status.HTTP_403_FORBIDDEN)

    return api_success(make_integrations_json(
        [integration], language=get_language_object_from_request(request), show_pending=review, show_drafts=draft,
        user=request.user
    ))


@api_view(("GET", ))
@permission_classes((AllowAny, ))
def get_integrations(request):
    """
    Returns a list of integrations available to the current user.
    """
    is_enabled = check_integration_store_enabled()
    language = get_language_object_from_request(request)
    integrations = Asset.objects.filter(asset_type__type=INTEGRATION,
                                        customizations__name__in=[settings.CUSTOMIZATION])

    if not integrations.exists():
        return api_success([])
    integration_list = []

    # Leaving here temporarily for reference
    # # Only known users can see Drafts and reviews
    # if not request.user.is_anonymous:
    #     drafts = Asset.objects. \
    #         filter(asset_type__type=INTEGRATION,
    #                contentversion__assetcustomizationreview__customization__name=settings.CUSTOMIZATION).distinct()
    #
    #     # Users without manager permissions will see only their integration (accepted, reviews, drafts).
    #     if not UserGroupsToAssetPermissions.\
    #             check_customization_permission(request.user, settings.CUSTOMIZATION, 'cms.publish_version'):
    #         drafts = drafts.filter(id__in=request.user.assets).distinct()
    #         integration_list = make_integrations_json(drafts.filter(preview_status=Asset.PREVIEW_STATUS.draft),
    #                                                   show_drafts=True, user=request.user)
    #         # If the integration store is disabled show developers their approved integrations
    #         if not is_enabled:
    #             integration_list.extend(make_integrations_json(drafts, user=request.user))
    #
    #     # If the integration store is disabled Manager level users will see all accepted and pending integrations
    #     elif not is_enabled:
    #         integration_list.extend(make_integrations_json(integrations, user=request.user))
    #
    #     # Shows pending reviews. If the users is not a manager they will only see their pending reviews
    #     # Otherwise they will see all of the pending reviews
    #     drafts = drafts.filter(contentversion__assetcustomizationreview__state=PENDING)
    #     integration_list.extend(make_integrations_json(drafts, show_pending=True, user=request.user))
    #
    # if is_enabled:
    #     integration_list.extend(make_integrations_json(integrations, user=request.user))

    is_portal_manager = UserGroupsToAssetPermissions.\
        check_customization_permission(request.user, settings.CUSTOMIZATION, 'cms.publish_version')

    has_beta_access = UserGroupsToAssetPermissions.user_has_beta_access(request.user)
    draft_integrations = []

    if not request.user.is_anonymous:
        draft_integrations = integrations.filter(Q(id__in=request.user.assets) | Q(created_by=request.user)).distinct()
        if request.user.is_superuser:
            draft_integrations = integrations
            review_integrations = integrations
        elif is_portal_manager:
            review_integrations = integrations.filter(
                contentversion__assetcustomizationreview__state=PENDING,
                contentversion__assetcustomizationreview__customization__name=settings.CUSTOMIZATION,
            ).distinct()
        else:
            review_integrations = draft_integrations

        if draft_integrations:
            integration_list.extend(make_integrations_json(
                draft_integrations, language=language, user=request.user, show_drafts=True))
        if review_integrations:
            integration_list.extend(make_integrations_json(
                review_integrations, language=language, user=request.user, show_pending=True))

    if is_enabled or is_portal_manager or has_beta_access:
        integration_list.extend(make_integrations_json(
            integrations, language=language, user=request.user))
    else:
        integration_list.extend(make_integrations_json(
            draft_integrations, language=language, user=request.user))

    # Sort integrations by name. Ignore case.
    # Name might not exist if integration was just created.
    # This breaks the integration store for the owner of the nameless integration.
    integration_list.sort(key=lambda x: x["information"].get("name", "~~~~").lower())

    return api_success({'data': integration_list})


@swagger_auto_schema(method='GET',
                     operation_description="Returns the number of integrations in the integration store",
                     responses={'200': openapi.Schema(type=openapi.TYPE_OBJECT, properties={'count': openapi.Schema(type=openapi.TYPE_INTEGER)})})
@api_view(("GET", ))
@permission_classes((AllowAny, ))
def get_integrations_count(request):
    is_enabled = check_integration_store_enabled()
    is_portal_manager = UserGroupsToAssetPermissions. \
        check_customization_permission(request.user, settings.CUSTOMIZATION, 'cms.publish_version')

    has_beta_access = UserGroupsToAssetPermissions.user_has_beta_access(request.user)
    response = {}
    if is_enabled or is_portal_manager or has_beta_access:
        integration_count = Asset.objects.filter(
            asset_type__type=AssetType.ASSET_TYPES.integration, customizations__name=settings.CUSTOMIZATION,
            contentversion__assetcustomizationreview__state=AssetCustomizationReview.REVIEW_STATES.accepted
        ).distinct().count()
        response['count'] = integration_count
    return api_success(response)
