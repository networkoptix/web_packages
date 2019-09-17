from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

from cloud import settings
from api.helpers.exceptions import api_success, handle_exceptions

from cms.controllers.filldata import global_contexts_to_dict, process_global_contexts
from cms.models import Context, DataStructure, Asset, AssetCustomizationReview, AssetType,\
    UserGroupsToAssetPermissions, cloud_portal_customization_cache, get_cloud_portal_asset

CLOUD_PORTAL = AssetType.ASSET_TYPES.cloud_portal
INTEGRATION = AssetType.ASSET_TYPES.integration
ACCEPTED = AssetCustomizationReview.REVIEW_STATES.accepted
PENDING = AssetCustomizationReview.REVIEW_STATES.pending


def make_integrations_json(integrations, contexts=None, show_pending=False, show_drafts=False, user=None):
    user_assets = user.assets if user and user.is_authenticated else []
    integrations_json = []

    if not contexts:
        contexts = Context.objects.filter(asset_type__type=INTEGRATION)

    cloud_portal = get_cloud_portal_asset()

    if cloud_portal:
        global_contexts = Context.objects.filter(asset_type=cloud_portal.asset_type, is_global=True)
        global_contexts_dict = global_contexts_to_dict(global_contexts, cloud_portal)

        for integration in integrations:
            integration_dict = {}
            current_version = integration.version_id()
            integration_dict['mine'] = integration.id in user_assets

            if show_pending:
                pending_version = AssetCustomizationReview.objects.filter(version__id__gt=current_version,
                                                                          version__asset=integration,
                                                                          customization__name=settings.CUSTOMIZATION,
                                                                          state=PENDING).last()

                if not pending_version:
                    continue
                current_version = pending_version.version.id

            if show_drafts:
                if integration.preview_status != Asset.PREVIEW_STATUS.draft:
                    continue
                current_version = None

            if show_drafts or show_pending:
                integration_dict['pending'] = show_pending
                integration_dict['draft'] = show_drafts

            if current_version == 0:
                continue

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
                                    global_contexts, global_contexts_dict)
            integration_dict['id'] = integration.id
            integrations_json.append(integration_dict)

    return integrations_json


def check_integration_store_enabled():
    return cloud_portal_customization_cache(settings.CUSTOMIZATION, 'config')['integration_store_enabled']


@api_view(("GET", ))
@permission_classes((AllowAny, ))
@handle_exceptions
def get_integration(request, asset_id=None):
    draft = "draft" in request.GET
    review = "pending" in request.GET
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
        if integration.id not in request.user.assets:
            if draft:
                return api_success(f"You do not have permission to view this draft.",
                                   status_code=status.HTTP_403_FORBIDDEN)
            if not UserGroupsToAssetPermissions.\
                    check_customization_permission(request.user, settings.CUSTOMIZATION, 'cms.publish_version'):
                return api_success(f"You do not have permission to view this review.",
                                   status_code=status.HTTP_403_FORBIDDEN)

    return api_success(make_integrations_json([integration], show_pending=review, show_drafts=draft, user=request.user))


@api_view(("GET", ))
@permission_classes((AllowAny, ))
def get_integrations(request):
    is_enabled = check_integration_store_enabled()
    integrations = Asset.objects.filter(asset_type__type=INTEGRATION,
                                        customizations__name__in=[settings.CUSTOMIZATION])

    if not integrations.exists():
        return api_success([])
    integration_list = []

    # Only known users can see Drafts and reviews
    if not request.user.is_anonymous:
        drafts = Asset.objects. \
            filter(asset_type__type=INTEGRATION,
                   contentversion__assetcustomizationreview__customization__name=settings.CUSTOMIZATION).distinct()

        # Users without manager permissions will see only their integration (accepted, reviews, drafts).
        if not UserGroupsToAssetPermissions.\
                check_customization_permission(request.user, settings.CUSTOMIZATION, 'cms.publish_version'):
            drafts = drafts.filter(id__in=request.user.assets).distinct()
            integration_list = make_integrations_json(drafts.filter(preview_status=Asset.PREVIEW_STATUS.draft),
                                                      show_drafts=True, user=request.user)
            # If the integration store is disabled show developers their approved integrations
            if not is_enabled:
                integration_list.extend(make_integrations_json(drafts, user=request.user))

        # If the integration store is disabled Manager level users will see all accepted and pending integrations
        elif not is_enabled:
            integration_list.extend(make_integrations_json(integrations, user=request.user))

        # Shows pending reviews. If the users is not a manager they will only see their pending reviews
        # Otherwise they will see all of the pending reviews
        drafts = drafts.filter(contentversion__assetcustomizationreview__state=PENDING)
        integration_list.extend(make_integrations_json(drafts, show_pending=True, user=request.user))

    if is_enabled:
        integration_list.extend(make_integrations_json(integrations, user=request.user))
    return api_success({'data': integration_list})
