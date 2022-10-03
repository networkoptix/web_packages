import os

from cms.controllers.asset_json import generate_asset_dictionary, get_contexts_and_datastructures_of_asset_type, \
    get_current_version, get_global_contexts, get_latest_ds_values,  \
    process_asset_global_contexts, get_state
from cms.models import Asset,  AssetType, Context, get_cloud_portal_asset
from util.base_cache import BaseCache

RELEASE_NOTES_CACHE = BaseCache(cache_key='release_notes')
RELEASE_NOTES = AssetType.ASSET_TYPES.release_notes


def make_release_notes_json(assets, language, user=None,
                           show_pending=False, show_drafts=False):
    if not assets:
        return []
    contexts, data_structures = get_contexts_and_datastructures_of_asset_type(RELEASE_NOTES)
    cloud_portal = get_cloud_portal_asset()
    state = get_state(show_pending, show_drafts)
    response_asset_json = []

    if cloud_portal:
        versions = Asset.version_ids(assets)
        global_contexts = get_global_contexts(cloud_portal)

        for asset in assets:
            has_version, current_version, lookup_key, review_id = get_current_version(
                language, state, versions, asset, show_pending, show_drafts)
            if not has_version:
                continue

            RELEASE_NOTES_CACHE.lookup_key = lookup_key
            asset_dict = RELEASE_NOTES_CACHE.get_cached_item() or {}

            if not asset_dict or asset_dict['version'] != current_version or show_drafts:
                for context, context_dict in get_latest_ds_values(show_pending, show_drafts,
                                                                  contexts, data_structures,
                                                                  asset, current_version):
                    if context_dict or "PYTEST_CURRENT_TEST" in os.environ:
                        asset_dict[context.name] = context_dict

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
                    RELEASE_NOTES_CACHE.set_cached_item(asset_dict)

            # Create a copy to remove the version key.
            asset_dict_copy = asset_dict.copy()
            del asset_dict_copy['version']

            response_asset_json.append(asset_dict_copy)

    return response_asset_json
