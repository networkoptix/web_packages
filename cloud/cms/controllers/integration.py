from django.conf import settings

from util.base_cache import BaseCache
from cms.controllers.filldata import global_contexts_to_dict, ContextProcessor
from cms.models import AssetType, Context, DataStructure, Asset, AssetCustomizationReview,\
    cloud_portal_customization_cache, get_cloud_portal_asset

INTEGRATION_CACHE = BaseCache(cache_key='integrations')
INTEGRATION = AssetType.ASSET_TYPES.integration
PENDING = AssetCustomizationReview.REVIEW_STATES.pending


def make_integrations_json(integrations, language, contexts=None, show_pending=False, show_drafts=False, user=None):
    global INTEGRATION_CACHE
    user_assets = user.assets if user and user.is_authenticated else []
    integrations_json = []

    if not contexts:
        contexts = Context.objects.filter(asset_type__type=INTEGRATION)
    contexts = contexts.prefetch_related ('datastructure_set')
    data_structures = []
    for context in contexts:
        data_structures.extend(list(context.datastructure_set.all()))

    cloud_portal = get_cloud_portal_asset()

    if cloud_portal:
        S3_STRUCTURE_TYPES = [
            DataStructure.DATA_TYPES.external_image, DataStructure.DATA_TYPES.external_file]
        S3_LINK = f"https://{settings.AWS_S3_CUSTOM_DOMAIN}"
        REPLACEMENT_LINK = f"{settings.CLOUD_PORTAL_URL}/static/media"
        state = 'release'
        if show_pending:
            state = 'review'
        elif show_drafts:
            state = 'draft'

        versions = Asset.version_ids(integrations)

        global_contexts = Context.objects.filter(asset_type=cloud_portal.asset_type, is_global=True, hidden=False)
        global_contexts_dict = global_contexts_to_dict(global_contexts, cloud_portal)

        for integration in integrations:
            current_version = versions[integration.id]
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
            # If the integration doesn't exist or the version is wrong recalculate it
            if not integration_dict or integration_dict['version'] != current_version or show_drafts:
                records = DataStructure.find_actual_values(
                    data_structures, asset=integration, version_id=current_version, draft=show_pending or show_drafts,
                    customization_name=settings.CUSTOMIZATION
                )
                records = {ds.id: val for ds, val in records.items()}
                integration_dict = {}
                for context in contexts:
                    # Make context json friendly
                    context_name = context.name

                    context_dict = {}
                    for datastructure in context.datastructure_set.all():
                        ds_name = datastructure.name
                        if not datastructure.public:
                            continue

                        record_value = records[datastructure.id]
                        if datastructure.type in S3_STRUCTURE_TYPES:
                            record_value = record_value.replace(
                                S3_LINK, REPLACEMENT_LINK)

                        if not record_value and datastructure.type != DataStructure.DATA_TYPES.multiselect:
                            continue

                        context_dict[ds_name] = record_value

                    if context_dict:
                        integration_dict[context_name] = context_dict
                        if context_name == "downloadFiles":
                            downloads_order = {
                                datastructure.name: datastructure.order
                                for datastructure in context.datastructure_set.all()
                            }

                            integration_dict[f"{context_name}Order"] = downloads_order

                        elif context_name == "support":
                            if integration_dict['support'].get('hideEmail'):
                                del integration_dict['support']['supportEmail']
                                del integration_dict['support']['hideEmail']

                if not integration_dict:
                    continue

                context_processor = ContextProcessor(
                    asset=cloud_portal, version_id=current_version, preview=False, global_contexts=global_contexts
                )
                context_processor.process_global_contexts(content=integration_dict, language=language)

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
            integration_dict_copy['canEdit'] = integration_dict_copy['mine'] or (
                user and user.is_superuser)
            name = integration_dict_copy.get(
                'information', {}).get('name', integration.name)
            integration_dict_copy['urlified'] = integration.urlify(name)
            integrations_json.append(integration_dict_copy)

    return integrations_json


def check_integration_store_enabled():
    return cloud_portal_customization_cache(settings.CUSTOMIZATION, 'config')['integration_store_enabled']
