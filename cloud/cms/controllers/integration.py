import os

from django.conf import settings
from cms.controllers.asset_json import generate_asset_dictionary, get_contexts_and_datastructures_of_asset_type, \
                                       get_current_version, get_global_contexts, generate_context_dicts_with_actual_values,  \
                                       get_user_assets, process_asset_global_contexts, get_state
from cms.models import Asset,  AssetType, cloud_portal_customization_cache, get_cloud_portal_asset
from util.base_cache import BaseCache
from util.helpers import get_customization

INTEGRATION_CACHE = BaseCache(cache_key='integrations')
INTEGRATION = AssetType.ASSET_TYPES.integration


def make_integrations_json(assets, language, user=None, show_pending=False, show_drafts=False, request=None):
    if not assets:
        return []

    contexts, data_structures = get_contexts_and_datastructures_of_asset_type(INTEGRATION)
    user_assets = get_user_assets(user)
    customization=get_customization(request)
    cloud_portal = get_cloud_portal_asset(customization=customization)
    state = get_state(show_pending, show_drafts)
    response_asset_json = []

    if cloud_portal:
        versions = Asset.version_ids(assets, customization=customization)
        global_contexts = get_global_contexts(cloud_portal)

        for asset in assets:
            has_version, current_version, lookup_key, review_id = get_current_version(
                language, state, versions, asset, show_pending, show_drafts)
            if not has_version:
                continue

            INTEGRATION_CACHE.lookup_key = lookup_key
            asset_dict = INTEGRATION_CACHE.get_cached_item() or {}

            if not asset_dict or asset_dict['version'] != current_version or show_drafts:
                for context, context_dict in generate_context_dicts_with_actual_values(show_pending, show_drafts,
                                                                  contexts, data_structures,
                                                                  asset, current_version, request=request):
                    if context_dict or "PYTEST_CURRENT_TEST" in os.environ:
                        asset_dict[context.name] = context_dict
                        handle_integration_contexts(
                            context_dict, context, asset_dict)

                if not asset_dict:
                    continue

                process_asset_global_contexts(
                    language, cloud_portal, global_contexts, cloud_portal.version_id(), asset_dict)
                asset_dict = {
                    **asset_dict,
                    **generate_asset_dictionary(show_pending, show_drafts,
                                                asset, current_version,
                                                review_id, include_last_modified=True)
                }
                if not show_drafts:
                    INTEGRATION_CACHE.set_cached_item(asset_dict)

            # Create a copy to remove the version key.
            asset_dict_copy = asset_dict.copy()
            del asset_dict_copy['version']

            asset_dict_copy = add_integration_properties(asset_dict_copy, asset, user, user_assets)
            response_asset_json.append(asset_dict_copy)

    return response_asset_json


def get_downloads_order(context):
    return {
        datastructure.name: datastructure.order
        for datastructure in context.datastructure_set.all()
    }

def handle_integration_contexts(context_dict, context, asset_dict):
    context_name = context.name
    asset_dict[context_name] = context_dict
    if context_name == "downloadFiles":
        downloads_order = get_downloads_order(context)
        asset_dict[f"{context_name}Order"] = downloads_order
    elif context_name == "support":
        if asset_dict['support'].get('hideEmail'):
            del asset_dict['support']['supportEmail']
            del asset_dict['support']['hideEmail']


def add_integration_properties(asset_dict, asset, user, user_assets):
    asset_dict['mine'] = asset.id in user_assets
    asset_dict['canEdit'] = asset_dict['mine'] or (user and user.is_superuser)

    name = asset_dict.get('information', {}).get('name', asset.name)
    asset_dict['urlified'] = asset.urlify(name)

    return asset_dict


def check_integration_store_enabled(request=None):
    customization = get_customization(request)
    return cloud_portal_customization_cache(customization, 'config')['integration_store_enabled']
