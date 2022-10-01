from datetime import datetime, timedelta
import base64
from io import BytesIO
import json
import re
import typing
from util.base_cache import BaseCache
import uuid
from dataclasses import dataclass

from django.contrib.auth.models import Permission
from django import urls
from django.db.models import Q
from django.utils.http import urlencode
from PIL import Image

from api.models import Account
from cms.models import *
from util.helpers import get_customization

BYTES_TO_MEGABYTES = 1048576.0
PENDING = AssetCustomizationReview.REVIEW_STATES[
    AssetCustomizationReview.REVIEW_STATES.pending].lower()
GUID_REGEXP = r'\{[\da-fA-F]{8}-[\da-fA-F]{4}-[\da-fA-F]{4}-[\da-fA-F]{4}-[\da-fA-F]{12}\}$'
DATA_IMG_SRC_REGEX = re.compile(r'src="data:image/.*?;base64,(.*?)"')
IMPORT_IMG_SRC_REGEX = re.compile(r'src="{image_import:(.*?)}"')


def update_draft_state(review_id, target_state, user):
    review = AssetCustomizationReview.objects.filter(id=review_id).last()
    if not review:
        return " is currently publishing or has already been published"

    if not review.version.accepted_by:
        review.version.accepted_by = user
        review.version.accepted_date = datetime.now()
        review.version.save()

    elif target_state == AssetCustomizationReview.REVIEW_STATES.rejected:
        review.state = target_state
        review.reviewed_by = user
        review.reviewed_date = datetime.now()
        review.save()

    review.update_current_and_older(user, target_state)

    return None


def notify_version_ready(asset, version, exclude_user):
    from cms.models import cloud_portal_customization_cache
    from notifications.notifications_api import send
    perm = Permission.objects.filter(
        codename__in=['publish_version', 'get_all_review_emails'])
    users = Account.objects.filter(groups__permissions__in=perm).exclude(
        pk=exclude_user.pk).distinct()

    asset_name = asset.name
    asset_type = AssetType.ASSET_TYPES[asset.asset_type.type]
    asset_customizations_set = set()
    customization_not_enabled = set()
    for customization in asset.customizations.values_list('name', flat=True):
        cloud_capabilities = cloud_portal_customization_cache(
            customization, 'cloud_capabilities')
        # Ignore integrations if the integration store is disabled.
        if (reviews_enabled := cloud_capabilities.get('reviews_enabled', False)) and \
                (not asset.is_integration or cloud_capabilities.get('integration_store_enabled', False)):
            asset_customizations_set.add(customization)

        if not reviews_enabled:
            customization_not_enabled.add(customization)

    if not asset_customizations_set and not users.filter(groups__permissions__in=perm.filter(codename='get_all_review_emails')):
        return

    for user in users:
        # If the user has a customization in common with asset send them a notification
        user_customizations = set(user.customizations)
        intersection_user_customizations_to_assets = user_customizations & asset_customizations_set
        intersection_user_customizations_to_customization_not_enabled = user_customizations & customization_not_enabled if 'get_all_review_emails' in user.global_permissions else set()

        if customizations := intersection_user_customizations_to_assets or intersection_user_customizations_to_customization_not_enabled:
            # There should never be two customizations with the same name but this is a safety check
            review_id = version.assetcustomizationreview_set.\
                filter(customization__name=customizations.pop()).first().id
            send(user.email, "review_version",
                 {
                     'id': review_id,
                     'asset': asset_name,
                     'asset_type': asset_type
                 },
                 customization=user.customization)


def are_asset_datarecords_unique(asset, customizations=None):
    for data_structure in DataStructure.objects.filter(context__asset_type__type=asset.asset_type.type, unique=True):
        value = data_structure.find_actual_value(
            asset=asset, language=None, version_id=None, draft=True)
        if not is_datarecord_unique(asset, data_structure, value, customizations):
            return False, data_structure
    return True, None


def is_datarecord_unique(asset, data_structure, value, customizations=None):
    # Find all assets that may cause conflict
    if not customizations:
        customizations = asset.customizations.all()

    asset_ids = list(Asset.objects.filter(
        ~Q(id=asset.id), asset_type__type=asset.asset_type.type, customizations__in=customizations
    ).values_list('id', flat=True))

    asset_ids_found = []
    not_accepted_asset_ids_found = []

    version_ids = []
    # Find all versions of assets that may cause conflict
    for review in AssetCustomizationReview.objects.filter(
            version__asset__id__in=asset_ids, version__datarecord__data_structure=data_structure
    ).order_by('-version_id').select_related('version__asset'):
        asset_id = review.version.asset.id
        if asset_id not in asset_ids_found:
            if review.state == AssetCustomizationReview.REVIEW_STATES.accepted:
                asset_ids_found.append(asset_id)
                version_ids.append(review.version.id)
            elif asset_id not in not_accepted_asset_ids_found:
                not_accepted_asset_ids_found.append(asset_id)
                version_ids.append(review.version.id)

    asset_ids_found.clear()

    for datarecord in DataRecord.objects.filter(
            asset_id__in=asset_ids, data_structure=data_structure
    ).order_by('-pk').select_related('asset'):
        if datarecord.version:
            if datarecord.version.id in version_ids and datarecord.value == value:
                return False
            asset_ids_found.append(datarecord.asset.id)
        # If datarecord is unversioned, check that we haven't seen one for this asset yet
        elif datarecord.asset.id not in asset_ids_found:
            if datarecord.value == value:
                return False
            else:
                asset_ids_found.append(datarecord.asset.id)
    return True


@dataclass
class RecordSaveState:
    new_record_value: typing.Any
    delete_file: typing.Any
    request_files: typing.Any
    request_data: typing.Any
    data_structure: typing.Any
    data_structure_name: typing.Any
    upload_errors: typing.Any
    asset: typing.Any
    can_edit_advanced: typing.Any
    has_error: typing.Any
    records_exist: typing.Any

    staticmethod

    def new(**kwargs):
        default = {
            'new_record_value': '',
            'delete_file': False,
            'request_data': {},
            'request_files': [],
            'data_structure': '',
            'data_structure_name': '',
            'upload_errors': [],
            'asset': None,
            'can_edit_advanced': False,
            'has_error': False,
            'records_exist': False
        }
        state_dict = {**default, **kwargs}
        return RecordSaveState(**state_dict)


def process_file_or_image(state: RecordSaveState):
    # If a file has been uploaded try to save it
    if request_file := state.request_files.get(state.data_structure_name, False):
        new_record_value, file_errors = upload_file(
            state.data_structure, request_file)
        state.new_record_value, state.file_errors = new_record_value, file_errors
        if file_errors:
            state.upload_errors.extend(file_errors)
            return False

    elif delete_file := state.request_data.get('delete_' + state.data_structure_name, False):
        state.delete_file = delete_file

    elif state.data_structure.optional:
        return False
    return True


GUID_FORMAT = "{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}"


def process_guid(state: RecordSaveState):
    # if the guid is valid it will go to the next set of checks
    state.new_record_value = state.request_data.get(
        state.data_structure_name, "")

    # if its option and not a valid guid set error message and go to next DataStructure
    if state.new_record_value and not re.match(GUID_REGEXP, state.new_record_value):
        state.upload_errors.append(
            (state.data_structure_name, f'Invalid GUID {state.new_record_value} it should formatted like {GUID_FORMAT}'))
        return False

    # no guid submitted or default value and is not optional generate a guid
    elif not state.new_record_value and not state.data_structure.optional:
        state.new_record_value = '{' + str(uuid.uuid4()) + '}'
        state.upload_errors.append(
            (state.data_structure_name,
                f'No submitted GUID or default value. GUID has been generated as {state.new_record_value}'))
    return True


def process_select(state: RecordSaveState):
    getlist_default_value = [
    ] if state.data_structure.type == DataStructure.DATA_TYPES.multiselect else ""
    if hasattr(state.request_data, 'getlist'):
        state.new_record_value = state.request_data.getlist(
            state.data_structure_name, getlist_default_value)
    else:
        state.new_record_value = state.request_data.get(
            state.data_structure_name, getlist_default_value)
    if state.new_record_value != "" and state.data_structure.type == DataStructure.DATA_TYPES.select:
        state.new_record_value = state.new_record_value[0]
    return True


def process_external(state: RecordSaveState):
    # If the user uploads a new file create a new ExternalFile record
    if request_file := state.request_files.get(state.data_structure_name, False):
        file_errors = check_meta_settings(state.data_structure, request_file)
        if file_errors:
            state.upload_errors.extend(file_errors)
            return False

        external_file = ExternalFile.objects.create(
            asset=state.asset, data_structure=state.data_structure, file=request_file)

        state.new_record_value = external_file.file.url

    elif delete_file := state.request_data.get('delete_' + state.data_structure_name, False):
        state.delete_file = delete_file

    elif new_value := state.request_data.get(state.data_structure_name, False):
        state.new_record_value = new_value

    elif state.data_structure.optional:
        return False
    return True


def process_checkbox(state: RecordSaveState):
    state.new_record_value = state.data_structure_name in state.request_data
    return bool(not state.data_structure.advanced or state.can_edit_advanced)


def process_integer(state: RecordSaveState):
    try:
        state.new_record_value = int(
            state.request_data.get(state.data_structure_name, ""))
    except ValueError:
        state.upload_errors.append(
            (state.data_structure_name, "This field has can only be integers."))
        return False

    if (min_int := state.data_structure.meta_settings.get('min', False)) and state.new_record_value < int(min_int):
        error_text = f"Value: {state.new_record_value} is less than the minimum: {int(state.data_structure.meta_settings['min'])}"
        state.upload_errors.append((state.data_structure_name, error_text))
        state.has_error = True
    if (max_int := state.data_structure.meta_settings.get('max', False)) and state.new_record_value > int(max_int):
        error_text = f"Value: {state.new_record_value} is more than the maximum: {int(state.data_structure.meta_settings['max'])}"
        state.upload_errors.append((state.data_structure_name, error_text))
        state.has_error = True
    return True


def process_object_or_array(state: RecordSaveState):
    try:
        state.new_record_value = DataStructure.cast_value(
            state.data_structure, state.request_data.get(state.data_structure_name, ""))
        if state.data_structure.type == DataStructure.DATA_TYPES.array and type(state.new_record_value) != list:
            raise ValueError
        elif state.data_structure.type == DataStructure.DATA_TYPES.object and type(state.new_record_value) != dict:
            raise ValueError

    except ValueError:
        state.upload_errors.append(
            (state.data_structure_name, "Json was incorrectly formatted."))
        return False
    return True


def process_other(state: RecordSaveState):
    state.new_record_value = state.request_data.get(
        state.data_structure_name, "")
    if pattern := state.data_structure.meta_settings.get('regex', False):
        if pattern == '':
            pattern = '.*$'
        if not pattern.endswith('$'):
            pattern = f'{pattern}$'
        if state.new_record_value and not re.match(pattern, state.new_record_value):
            state.upload_errors.append(
                (state.data_structure_name, 'Invalid input'))
            state.has_error = True

    if char_limit := int(state.data_structure.meta_settings.get('char_limit', 0)):
        if len(state.new_record_value) > char_limit:
            state.upload_errors.append(
                (state.data_structure_name,
                    f'Character limit exceeded. Text was {len(state.new_record_value)} characters but should not be more than {char_limit} characters'))
            state.has_error = True
    return True


def upload_image(content_file, state):
    ext_file = ExternalFile.objects.create(
        asset=state.asset, data_structure=state.data_structure, file=content_file)

    return f'src="{ext_file.file.url}"'


def upload_data_image_match(state):
    def handler(match_obj):
        from django.core.files.base import ContentFile
        byte_image = base64.b64decode(match_obj[1] + '===')
        pil_image = Image.open(BytesIO(byte_image))
        content_file = ContentFile(
            byte_image, name=f'{state.data_structure.name}-{str(uuid.uuid4())}.' +
            pil_image.format.lower()
        )
        return upload_image(content_file, state)
    return handler


def upload_imported_image(state):
    def handler(match_obj):
        content_file = state.request_files[match_obj[1]]
        return upload_image(content_file, state)
    return handler


# Not sure if we want to make this cms configurable by customization
STALE_FILE_DAYS = 30


def delete_abandoned_files(state):
    asset_ds_pair = AssetDsPair.objects.filter(
        asset=state.asset, data_structure=state.data_structure).first()

    if not asset_ds_pair:
        # If no asset_ds_pair that means a file was hasn't been uploaded in the past so we can shortcircuit here
        return

    cutoff_stale_files = datetime.now() - timedelta(days=STALE_FILE_DAYS)
    files_not_recently_updated = asset_ds_pair.externalfile_set.filter(
        assest_ds_pair_last_added__lt=cutoff_stale_files)

    previous_records = state.data_structure.datarecord_set.filter(
        asset=state.asset)  # add .order_by('-created_date')[:RECORDS_TO_KEEP_FILES] if we want to keep only latest versions

    for file in files_not_recently_updated:
        not_in_new_record = file.file.url not in state.new_record_value
        if not_in_new_record:
            for record in previous_records:
                if file.file.url in record.value:
                    break
            else:
                file.delete()


def process_html(state: RecordSaveState):
    if state.data_structure.meta_settings.get('upload_data_images', False):
        state.new_record_value = DATA_IMG_SRC_REGEX.sub(
            upload_data_image_match(state), state.new_record_value)
        state.new_record_value = IMPORT_IMG_SRC_REGEX.sub(
            upload_imported_image(state), state.new_record_value)
        delete_abandoned_files(state)
    return True


def check_optional(state: RecordSaveState):
    # If the data structure is not optional and has no value use the default.
    if state.new_record_value in ["", {}, []] and not state.data_structure.optional:
        if state.data_structure.advanced and not state.can_edit_advanced:
            return False
        # If there is a default value use it. Otherwise don't fill it prevent it.
        if state.data_structure.default != "" and not state.records_exist:
            # Gets the default value and will cast the default value
            state.new_record_value = state.data_structure.find_actual_value(
                asset=state.asset)
            state.upload_errors.append(
                (state.data_structure_name, "This field cannot be blank. Using default value"))
        else:
            state.upload_errors.append(
                (state.data_structure_name, "This field cannot be blank"))
            return False
    return True


def save_unrevisioned_records(asset, context, language, data_structures,
                              request_data, request_files, user, version_id=None, *, customization=None, request=None):
    # Start save_unrevisioned_records
    can_edit_advanced = UserGroupsToAssetPermissions.check_edit_advanced(
        user, asset)
    customization = customization or get_customization(request)
    upload_errors = []
    # Only process non-translatable data structures if language is default.
    default_language = get_cloud_portal_asset(customization=customization).default_language
    process_nontranslatable = language in (default_language, None)
    state = RecordSaveState.new()
    for data_structure in data_structures:
        data_structure_name = data_structure.name
        ds_language = None
        if context and context.translatable:
            if data_structure.translatable:
                ds_language = language or default_language
            elif not process_nontranslatable:
                continue

        new_record_value = ""
        external_file = None
        delete_file = False
        has_error = False
        records_exist = data_structure.datarecord_set.filter(
            asset=asset).exists()
        is_file_or_image = DataStructure.is_file_or_image(data_structure.type)
        is_file = is_file_or_image or data_structure.type in [DataStructure.DATA_TYPES.external_file,
                                                              DataStructure.DATA_TYPES.external_image]
        latest_value = data_structure.find_actual_value(
            asset, ds_language, draft=True)
        # If the DataStructure is supposed to be an image convert to base64 and
        # error check
        # TODO: Refactor image/file logic - CLOUD-1524
        """
            Currently if the data structure is optional you can remove the value.

            Planned change is to make it to where you can "delete" the value and if its not optional then fallback
            to the default value.

            This will create a new record making images/files behave like the other data structure types
            Places to touch are here and cms/forms.py
        """
        # If the file was uploaded the value will change
        if is_file:
            new_record_value = latest_value
        state = RecordSaveState(
            new_record_value,
            delete_file,
            request_files,
            request_data,
            data_structure,
            data_structure_name,
            upload_errors,
            asset,
            can_edit_advanced,
            has_error,
            records_exist
        )

        if is_file_or_image:
            if not process_file_or_image(state):
                continue
        elif data_structure.type == DataStructure.DATA_TYPES.guid:
            if not process_guid(state):
                continue
        elif data_structure.type in [DataStructure.DATA_TYPES.select, DataStructure.DATA_TYPES.multiselect]:
            if not process_select(state):
                continue
        elif data_structure.type in [DataStructure.DATA_TYPES.external_file, DataStructure.DATA_TYPES.external_image]:
            if not process_external(state):
                continue
        elif data_structure.type == DataStructure.DATA_TYPES.check_box:
            if not process_checkbox(state):
                continue
        elif data_structure.type == DataStructure.DATA_TYPES.integer:
            if not process_integer(state):
                continue
        elif data_structure.type in [DataStructure.DATA_TYPES.object, DataStructure.DATA_TYPES.array]:
            if not process_object_or_array(state):
                continue
        elif data_structure.type == DataStructure.DATA_TYPES.html:
            if not process_other(state) or not process_html(state):
                continue
        elif not process_other(state):
            continue

        if state.has_error:
            continue

        if not check_optional(state):
            continue

        # Check if value has changed
        if state.new_record_value == latest_value and not state.delete_file:
            continue

        # Multiselect is a special case because it adds the label and other info.
        if state.data_structure.type == DataStructure.DATA_TYPES.multiselect and \
                latest_value == DataStructure.cast_value(state.data_structure, json.dumps(state.new_record_value)):
            continue

        # Check permisison if advanced
        if state.data_structure.advanced and not state.can_edit_advanced:
            state.upload_errors.append(
                (data_structure_name, "You do not have permission to edit this field"))
            continue

        # Check uniqueness if unique
        if state.data_structure.unique and not is_datarecord_unique(asset, data_structure, new_record_value):
            state.upload_errors.append(
                (data_structure_name, "This field must be unique"))
            continue

        # Remove value for delete_file
        if state.delete_file:
            state.new_record_value = ""

        record = DataRecord(asset=state.asset,
                            data_structure=state.data_structure,
                            language=ds_language,
                            value=state.new_record_value,
                            created_by=user)
        record.save()

        # If external, foreign key to file is used
        if external_file:
            record.external_file = external_file
            record.save()

    if asset.is_cloud_portal and asset.can_preview_on_portal:
        from cms.controllers.filldata import fill_content
        fill_content(asset,
                     preview=True,
                     incremental=True,
                     version_id=version_id,
                     changed_context=context)

    return state.upload_errors


def update_latest_record_version(records, new_version):
    record = records.latest('created_date')
    if not record.version:
        record.version = new_version
        record.save()


def update_records_to_version(asset, contexts, version):
    from cms.models import Language
    languages = Language.objects.all()
    for context in contexts:
        for data_structure in context.datastructure_set.all():
            all_records = data_structure.datarecord_set.filter(asset=asset)

            if data_structure.translatable:
                for language in languages:
                    records_for_language = all_records.filter(
                        language=language)
                    # Now only the latest records that can be published will have its
                    # version altered
                    if records_for_language:
                        update_latest_record_version(
                            records_for_language, version)

            elif all_records:
                update_latest_record_version(all_records, version)


def strip_version_from_records(version, asset):
    records_to_strip = DataRecord.objects.filter(version=version, asset=asset)
    for record in records_to_strip:
        record.version = None
        record.save()


# Currently unused
def remove_unused_records(asset):
    nullify_records = DataRecord.objects.filter(asset=asset, version_id=None)
    for record in nullify_records:
        record.delete()


def generate_preview_links(context=None, asset=None, state=""):
    params = urlencode({'state': state, 'id': asset.id if asset else ''})
    if asset:
        if asset.is_integration:
            yield ('Integrations Preview', f"{settings.INTEGRATION_STORE_PAGE}/{asset.id}?state={state}")
        elif asset.is_article:
            article_url = DataRecord.objects.filter(
                asset=asset, data_structure__name='url').last()
            article_url = article_url.value if article_url else "tmp_url"
            yield ('Article Preview', f'/content/{article_url}?{params}')
        elif asset.is_agreement:
            yield ('Agreement Preview', f'/agreement?{params}')
        elif asset.is_documentation:
            menus = {node.get_parent() for node in asset.nodes.all()}
            for menu in sorted(menus, key=lambda menu: menu.type, reverse=True):
                if menu.type in [Menu.MENU_TYPES.docs_struct, Menu.MENU_TYPES.docs_knowledgebase]:
                    url = f'/docs/{menu.base_url}'
                    if menu.url:
                        url += f'/{menu.url}'
                    if menu.type == Menu.MENU_TYPES.docs_struct:
                        yield (f'{menu.name} - Landing Menu Preview', f'{url}?{params}')
                    else:
                        url += f'/{asset.id}?{params}'
                        yield (f'{menu.name} - KB Menu Preview', url)
            yield ('Document Fallback Preview', f'/docs/content/{asset.id}?{params}')

    yield ('Other Preview', f"{context.url}?preview=true") if context and context.url else (None, None)


def generate_preview_link(context=None, asset=None, state=""):
    (_, default_preview) = next(generate_preview_links(
        context=context, asset=asset, state=state))
    return default_preview


def generate_preview(asset, context=None, version_id=None, send_to_review=False):
    if asset.is_cloud_portal and asset.can_preview_on_portal:
        from cms.controllers.filldata import fill_content
        fill_content(asset,
                     preview=True,
                     incremental=True,
                     changed_context=context,
                     version_id=version_id,
                     send_to_review=send_to_review)
    return generate_preview_link(context, asset=asset, state=PENDING)


def publish_latest_version(asset, review_id, user, state=None):
    if not state:
        state = AssetCustomizationReview.REVIEW_STATES.accepted
    publish_errors = update_draft_state(review_id, state, user)
    if asset.is_cloud_portal:
        update_global_cache(asset.customizations.first(), asset.version_id())

    if not publish_errors and asset.can_preview_on_portal:
        from cms.controllers.filldata import fill_content
        fill_content(asset, preview=False, incremental=True)

    if asset.is_cloud_portal:
        BaseCache.clear_global_cache()
        Flag.flush_global_vals()
    return publish_errors


def asset_has_required_data(asset, version_id=None):
    errors = []
    for datastructure in DataStructure.objects.filter(context__asset_type=asset.asset_type):
        records = datastructure.datarecord_set.filter(asset=asset)
        if version_id:
            records = records.filter(version__id__lte=version_id)
        last_record_value = records.last().value if records.last() else ""
        has_default_value = datastructure.default != ""
        if datastructure.type in [DataStructure.DATA_TYPES.array,
                                  DataStructure.DATA_TYPES.object,
                                  DataStructure.DATA_TYPES.multiselect]:
            if last_record_value:
                last_record_value = json.loads(last_record_value)
            default_value = json.loads(datastructure.default)
            if datastructure.type == DataStructure.DATA_TYPES.object:
                has_default_value = len(default_value.keys()) > 0
            else:
                has_default_value = len(default_value) > 0
        if not datastructure.optional and not has_default_value and (not records.exists() or last_record_value == ""):
            ds_name = datastructure.label or datastructure.name
            change_url = urls.reverse('admin:change_page', kwargs={
                                      'asset_id': asset.id, 'context_id': datastructure.context.id})
            errors.append((
                ds_name,
                'This field cannot be blank. '
                f'Go to the <a href="{change_url}">{datastructure.context.label}</a> page and fill in {ds_name}.',
                change_url
            ))
    return errors


def send_version_for_review(asset, user, notify=True):
    from cms.models import ContentVersion, Context
    old_version = ContentVersion.objects.filter(
        asset=asset, accepted_date=None).order_by('created_date').last()

    if old_version:
        strip_version_from_records(old_version, asset)
        old_version.delete()

    # We only check for integrations because its the only asset type that non staff have access to.
    if asset.is_integration or asset.is_vms:
        errors = asset_has_required_data(asset)
        if len(errors) > 0:
            return errors

    version = ContentVersion(asset=asset, created_by=user)
    version.save()

    version.create_reviews()

    update_records_to_version(asset, Context.objects.filter(
        asset_type=asset.asset_type), version)

    if notify:
        notify_version_ready(asset, version, user)

    return []


def get_records_for_version(asset, version, customization):
    published_version = asset.version_id(customization)
    if version.id > published_version:

        data_records = asset.datarecord_set.filter(version__id__gt=published_version,
                                                   version__id__lte=version.id)
    else:
        data_records = asset.datarecord_set.filter(version__id=version.id)
    data_records = data_records.\
        order_by('data_structure__context__order',
                 'language__code', 'data_structure__order', '-id')
    contexts = {}
    context_preview_links = {'whole_preview': generate_preview_link(
        None, asset, 'pending'
    )}
    used_data_structures = set()

    for record in data_records:
        ds_with_lang = record.get_data_structure_with_name
        if ds_with_lang in used_data_structures:
            continue

        used_data_structures.add(ds_with_lang)
        context_name = record.data_structure.context.get_nice_name()
        if context_name in contexts:
            contexts[context_name].append(record)
        else:
            contexts[context_name] = [record]
            if asset.asset_type.type != AssetType.ASSET_TYPES.integration:
                context_preview_links[context_name] = generate_preview_link(
                    record.data_structure.context, asset, 'pending'
                )
    return contexts, context_preview_links


# File upload helpers
def is_not_valid_file_type(file_type, meta_types):
    return all(
        meta_type.strip() not in file_type
        for meta_type in meta_types.split(',')
    )


def is_not_valid_file_extension(file_name, meta_types):
    return not any(
        file_name.endswith(f'.{meta_type.strip()}')
        for meta_type in meta_types.split(',')
    )


def get_image_dimensions(image_file):
    new_image = Image.open(image_file)
    width, height = new_image.size
    return {'width': width, 'height': height}


def check_image_dimensions(data_structure_name,
                           meta_dimensions, image_dimensions):
    size_error_msgs = []
    image_height, image_width = image_dimensions['height'], image_dimensions['width']

    if not meta_dimensions:
        return size_error_msgs

    if (meta_height := meta_dimensions.get('height', False)) and meta_height != image_height:
        error_msg = f"Image height must be equal to {meta_height}. Uploaded image's height is {image_height}."
        size_error_msgs.append((data_structure_name, error_msg))

    if (meta_width := meta_dimensions.get('width', False)) and meta_width != image_width:
        error_msg = f"Image width must be equal to {meta_width}. Uploaded image's width is {image_width}."
        size_error_msgs.append((data_structure_name, error_msg))

    if (height_le := meta_dimensions.get('height_le', False)) and height_le < image_height:
        error_msg = f"Image height must be equal to or less than {height_le}. Uploaded image's height is {image_height}."
        size_error_msgs.append((data_structure_name, error_msg))

    if (width_le := meta_dimensions.get('width_le', False)) and width_le < image_width:
        error_msg = f"Image width must be equal to or less than {width_le}. Uploaded image's width is {image_width}."
        size_error_msgs.append((data_structure_name, error_msg))

    if (height_ge := meta_dimensions.get('height_ge', False)) and height_ge > image_height:
        error_msg = f"Image height must be equal to or more than {height_ge}. Uploaded image's height is {image_height}."
        size_error_msgs.append((data_structure_name, error_msg))

    if (width_ge := meta_dimensions.get('width_ge', False)) and width_ge > image_width:
        error_msg = f"Image width must be equal to or more than {width_ge}. Uploaded image's width is {image_width}."
        size_error_msgs.append((data_structure_name, error_msg))

    return size_error_msgs


def has_wrong_image_sizes(multi_image_file_sizes, required_image_sizes):
    return any(
        image_size not in multi_image_file_sizes
        for image_size in required_image_sizes
    )


def check_multi_size(meta_settings, data_structure, new_file):
    if multi_image_sizes := meta_settings.get('multi_image_sizes', False):
        multi_image_file = Image.open(new_file)
        image_file_sizes = [list(image_size[:2])
                            for image_size in multi_image_file.info["sizes"]]
        if has_wrong_image_sizes(image_file_sizes, multi_image_sizes):
            error_msg = f"The file does not have the required sizes. Uploaded file has sizes {image_file_sizes}. It should have {multi_image_sizes}"
            return [(data_structure.name, error_msg)]

    return False


def check_meta_settings(data_structure, new_file):
    meta_settings = data_structure.meta_settings
    if (file_format := meta_settings.get('format', False)) and is_not_valid_file_extension(new_file.name, file_format) and \
            is_not_valid_file_type(new_file.content_type, file_format):
        error_msg = f"Invalid file type. Uploaded file is {new_file.content_type}. It should be {file_format.replace(',', ' or ')}."
        return [(data_structure.name, error_msg)]

    if (size := meta_settings.get('size', False)) and size < new_file.size:
        error_msg = f"The file's size it too large. Its size was {new_file.size/BYTES_TO_MEGABYTES:.2f}MB but must be less than {size/BYTES_TO_MEGABYTES:.2f}MB"
        return [(data_structure.name, error_msg)]

    if size_errors := check_multi_size(meta_settings, data_structure, new_file):
        return size_errors

    if data_structure.is_image:
        try:
            image_dimensions = get_image_dimensions(new_file)
        except (IOError, TypeError):
            return [(data_structure.name, "Image is damaged please upload an valid version")]
        except ValueError as valError:
            return [(data_structure.name, str(valError))]

        return check_image_dimensions(data_structure.name, meta_settings, image_dimensions)

    return []


def encode_file(file):
    # Must seek file before reading or else encoding will be messed ruined.
    file.seek(0)
    return base64.b64encode(file.read()).decode('utf8')

# End of file upload helpers


def upload_file(data_structure, new_file):
    if new_file.size >= settings.CMS_MAX_FILE_SIZE:
        return None, [(data_structure.name, f'Its size was {new_file.size/BYTES_TO_MEGABYTES:.2f}MB but must be less than {settings.CMS_MAX_FILE_SIZE/BYTES_TO_MEGABYTES:.2f} MB')]

    file_errors = check_meta_settings(data_structure, new_file)

    if file_errors:
        return None, file_errors

    return encode_file(new_file), []
