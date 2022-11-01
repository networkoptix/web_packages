from django.conf import settings

from cms.controllers.filldata import ContextProcessor
from cms.models import Asset, AssetCustomizationReview, AssetType, Context, DataStructure, get_cloud_portal_asset
from util.base_cache import BaseCache

S3_STRUCTURE_TYPES = [
            DataStructure.DATA_TYPES.external_image, DataStructure.DATA_TYPES.external_file]
S3_LINK = f"https://{settings.AWS_S3_CUSTOM_DOMAIN}"
REPLACEMENT_LINK = f"{settings.CLOUD_PORTAL_URL}/static/media"

PENDING = AssetCustomizationReview.REVIEW_STATES.pending

def get_contexts_and_datastructures_of_asset_type(asset_type):
    contexts = Context.objects.filter(asset_type__type=asset_type)
    contexts = contexts.prefetch_related('datastructure_set')

    data_structures = []
    for context in contexts:
        data_structures.extend(list(context.datastructure_set.all()))

    return contexts, data_structures


def get_user_assets(user):
    return user.assets if user and user.is_authenticated else []


def get_state(show_pending, show_drafts):
    state = 'release'
    if show_pending:
        state = 'review'
    elif show_drafts:
        state = 'draft'
    return state


def get_global_contexts(cloud_portal):
    return Context.objects.filter(
        asset_type=cloud_portal.asset_type, is_global=True, hidden=False)


def get_current_version(language, state, versions, asset, show_pending=False, show_drafts=False):
    review_id = None
    has_version = False
    version_not_found = has_version, None, None, None
    current_version = versions[asset.id]
    lookup_key = BaseCache.generate_lookup_key(language, state, asset.id, current_version)
    if show_pending:
        if not (review := get_review_matching_current_version(asset, current_version)):
            return version_not_found
        current_version = review.version.id
        review_id = review.id

    if show_drafts:
        if asset.preview_status != Asset.PREVIEW_STATUS.draft:
            return version_not_found
        current_version = None
    if current_version == 0:
        return version_not_found

    has_version = True
    return has_version, current_version, lookup_key, review_id


def generate_asset_dictionary(show_pending, show_drafts, asset, current_version, review_id, include_last_modified=False):
    asset_dict = {}
    if show_drafts or show_pending:
        asset_dict['pending'] = show_pending
        asset_dict['draft'] = show_drafts
    elif include_last_modified:
        asset_dict['lastModified'] = asset.last_modified

    asset_dict['version'] = current_version
    asset_dict['review_id'] = review_id
    asset_dict['id'] = asset.id

    return asset_dict


def find_actual_values(data_structures, asset, current_version, show_pending, show_drafts, customization_name=settings.CUSTOMIZATION, name_filter=[]):
    ds_list = data_structures
    if name_filter:
        ds_list = [ds for ds in ds_list if ds.name in name_filter]

    return DataStructure.find_actual_values(ds_list, asset=asset, version_id=current_version,
                                               draft=show_pending or show_drafts, customization_name=customization_name)


def map_ds_attribute_to_actual_value(datastructure_values, map_by='id'):
     return { getattr(ds, map_by): actual_value for ds, actual_value in datastructure_values.items() }


def generate_context_dicts_with_actual_values(show_pending, show_drafts, contexts, data_structures, asset, current_version, customization_name=settings.CUSTOMIZATION):
    actual_values = find_actual_values(
        data_structures, asset, current_version, show_pending, show_drafts, customization_name=customization_name)
    actual_values = map_ds_attribute_to_actual_value(actual_values)

    for context in contexts:
        context_dict = {}
        for datastructure in context.datastructure_set.all():
            ds_name = datastructure.name
            if not datastructure.public:
                continue

            actual_value = actual_values[datastructure.id]

            if datastructure.type in S3_STRUCTURE_TYPES:
                actual_value = actual_value.replace(S3_LINK, REPLACEMENT_LINK)

            if not actual_value and datastructure.type != DataStructure.DATA_TYPES.multiselect:
                continue

            context_dict[ds_name] = actual_value

        yield context, context_dict


def process_asset_global_contexts(language, cloud_portal, global_contexts, current_version, asset_dict, global_contexts_dict=None):
    context_processor = ContextProcessor(
        asset=cloud_portal, version_id=current_version,
        preview=False, global_contexts=global_contexts,
        global_contexts_dict=global_contexts_dict
    )
    context_processor.process_global_contexts(
        content=asset_dict, language=language)


def get_review_matching_current_version(asset, current_version, customization_name=settings.CUSTOMIZATION):
    return AssetCustomizationReview.objects.filter(version__id__gt=current_version,
                                                   version__asset=asset,
                                                   customization__name=customization_name,
                                                   state=PENDING).last()
