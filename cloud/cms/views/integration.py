from django.conf import settings
from django.core.cache import caches
from django.db.models import Q

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

from util.helpers import get_language_object_from_request
from api.helpers.exceptions import api_success, handle_exceptions
from cms.controllers.filldata import global_contexts_to_dict, process_global_contexts
from cms.models import Context, DataStructure, Asset, AssetCustomizationReview, AssetType,\
    UserGroupsToAssetPermissions, cloud_portal_customization_cache, get_cloud_portal_asset

CLOUD_PORTAL = AssetType.ASSET_TYPES.cloud_portal
INTEGRATION = AssetType.ASSET_TYPES.integration
ACCEPTED = AssetCustomizationReview.REVIEW_STATES.accepted
PENDING = AssetCustomizationReview.REVIEW_STATES.pending


class IntegrationsCache(object):
    def __init__(self):
        self.cache = caches['integrations']

    def __getitem__(self, key):
        return self.cache.get(key, None)

    def __setitem__(self, key, integration):
        self.cache.set(key, integration)

    def clear_cache(self):
        self.cache.clear()


INTEGRATION_CACHE = IntegrationsCache()


def make_integrations_json(integrations, language, contexts=None, show_pending=False, show_drafts=False, user=None):
    global INTEGRATION_CACHE
    user_assets = user.assets if user and user.is_authenticated else []
    integrations_json = []

    if not contexts:
        contexts = Context.objects.filter(asset_type__type=INTEGRATION)

    cloud_portal = get_cloud_portal_asset()

    if cloud_portal:
        state = 'release'
        if show_pending:
            state = 'review'
        elif show_drafts:
            state = 'draft'

        global_contexts = Context.objects.filter(asset_type=cloud_portal.asset_type, is_global=True, hidden=False)
        global_contexts_dict = global_contexts_to_dict(global_contexts, cloud_portal)

        for integration in integrations:
            current_version = integration.version_id()
            review_id = None
            customization_id_state_key = f"{settings.CUSTOMIZATION}-{language.code}-{integration.id}-{state}"

            if show_pending:
                pending_version = AssetCustomizationReview.objects.filter(version__id__gt=current_version,
                                                                          version__asset=integration,
                                                                          customization__name=settings.CUSTOMIZATION,
                                                                          state=PENDING).last()

                if not pending_version:
                    continue
                current_version = pending_version.version.id
                review_id = pending_version.id

            if show_drafts:
                if integration.preview_status != Asset.PREVIEW_STATUS.draft:
                    continue
                current_version = None

            if current_version == 0:
                continue

            integration_dict = INTEGRATION_CACHE[customization_id_state_key]
            # If the integration doesnt exist or the version is wrong recalculate it
            if not integration_dict or integration_dict['version'] != current_version or show_drafts:
                integration_dict = dict()
                for context in contexts:
                    # Make context json friendly
                    context_name = context.name

                    context_dict = {}
                    for datastructure in context.datastructure_set.all():
                        ds_name = datastructure.name
                        if not datastructure.public:
                            continue

                        record_value = datastructure.find_actual_value(asset=integration,
                                                                       version_id=current_version,
                                                                       draft=show_pending or show_drafts)

                        if not record_value and datastructure.type != DataStructure.DATA_TYPES.multiselect:
                            continue

                        context_dict[ds_name] = record_value

                    if context_dict:
                        integration_dict[context_name] = context_dict
                        if context.name == "downloadFiles":
                            downloads_order = {}
                            for datastructure in context.datastructure_set.all():
                                downloads_order[datastructure.name] = datastructure.order
                            integration_dict[f"{context_name}Order"] = downloads_order

                if not integration_dict:
                    continue

                process_global_contexts(cloud_portal, integration_dict, current_version, False,
                                        global_contexts, global_contexts_dict, language=language)

                if show_drafts or show_pending:
                    integration_dict['pending'] = show_pending
                    integration_dict['draft'] = show_drafts
                else:
                    integration_dict['lastModified'] = integration.last_modified
                integration_dict['version'] = current_version
                integration_dict['review_id'] = review_id
                integration_dict['id'] = integration.id
                if not show_drafts:
                    INTEGRATION_CACHE[customization_id_state_key] = integration_dict

            # Create a copy to remove the version key.
            # Version key is used to check if the internal version has been changed for a specific state of the asset.
            integration_dict_copy = integration_dict.copy()
            del integration_dict_copy['version']
            # Check if the integration belongs in the user's assets.
            integration_dict_copy['mine'] = integration.id in user_assets
            integrations_json.append(integration_dict_copy)

    return integrations_json


def check_integration_store_enabled():
    return cloud_portal_customization_cache(settings.CUSTOMIZATION, 'config')['integration_store_enabled']


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
        return api_success("Integration not found.", status_code=status.HTTP_404_NOT_FOUND)

    asset_id = int(asset_id)
    integration = Asset.objects.filter(asset_type__type=INTEGRATION,
                                       customizations__name__in=[settings.CUSTOMIZATION],
                                       id=asset_id).last()

    if not integration:
        return api_success("Integration not found.", status_code=status.HTTP_404_NOT_FOUND)

    if draft or review:
        if not request.user.is_authenticated:
            return api_success(f"You do not have permission to view this integration",
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
        return api_success(f"You do not have permission to view this integration.",
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
    own_integrations = []

    if not request.user.is_anonymous:
        own_integrations = integrations.filter(Q(id__in=request.user.assets) | Q(created_by=request.user)).distinct()
        # If portal manager/superuser
        if is_portal_manager:
            review_integrations = integrations.filter(
                contentversion__assetcustomizationreview__state=PENDING,
                contentversion__assetcustomizationreview__customization__name=settings.CUSTOMIZATION,
            ).distinct()
        else:
            review_integrations = own_integrations

        if own_integrations:
            integration_list.extend(make_integrations_json(own_integrations, language=language, user=request.user, show_drafts=True))
        if review_integrations:
            integration_list.extend(make_integrations_json(review_integrations, language=language, user=request.user, show_pending=True))

    if is_enabled or is_portal_manager or has_beta_access:
        integration_list.extend(make_integrations_json(integrations, language=language, user=request.user))
    else:
        integration_list.extend(make_integrations_json(own_integrations, language=language, user=request.user))

    return api_success({'data': integration_list})
