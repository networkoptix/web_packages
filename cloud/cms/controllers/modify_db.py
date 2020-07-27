from datetime import datetime
import base64
import json
import re
import uuid
import hashlib

from notifications.notifications_api import send
from django.contrib.auth.models import Permission
from django.urls import reverse
from django.db.models import Q
from django.utils.http import urlencode
from PIL import Image

from cms.controllers.filldata import fill_content
from api.models import Account
from cms.models import *

BYTES_TO_MEGABYTES = 1048576.0
PENDING = AssetCustomizationReview.REVIEW_STATES[
    AssetCustomizationReview.REVIEW_STATES.pending].lower()
GUID_REGEXP = r'\{[\da-fA-F]{8}-[\da-fA-F]{4}-[\da-fA-F]{4}-[\da-fA-F]{4}-[\da-fA-F]{12}\}$'


def update_draft_state(review_id, target_state, user):
    review = AssetCustomizationReview.objects.filter(id=review_id).last()
    if not review:
        return " is currently publishing or has already been published"

    if not review.version.accepted_by:
        review.version.accepted_by = user
        review.version.accepted_date = datetime.now()
        review.version.save()

    review.state = target_state
    review.reviewed_by = user
    review.reviewed_date = datetime.now()
    review.save()

    review.update_between_published_and_current(user, target_state)

    return None


def notify_version_ready(asset, version, exclude_user):
    perm = Permission.objects.filter(codename='publish_version')
    users = Account.objects.filter(groups__permissions__in=perm).exclude(pk=exclude_user.pk).distinct()

    asset_name = asset.name
    asset_type = AssetType.ASSET_TYPES[asset.asset_type.type]
    asset_customizations_set = set()
    for customization in asset.customizations.values_list('name', flat=True):
        cloud_capabilities = cloud_portal_customization_cache(customization, 'cloud_capabilities')
        # Ignore integrations if the integration store is disabled.
        if cloud_capabilities.get('reviews_enabled', False) and \
                (not asset.is_integration or cloud_capabilities.get('integration_store_enabled', False)):
            asset_customizations_set.add(customization)

    if len(asset_customizations_set) == 0:
        return

    for user in users:
        # If the user has a customization in common with asset send them a notification
        intersection_user_customizations_to_assets = set(user.customizations) & asset_customizations_set
        if intersection_user_customizations_to_assets:
            # There should never be two customizations with the same name but this is a safety check
            review_id = version.assetcustomizationreview_set.\
                filter(customization__name=intersection_user_customizations_to_assets.pop()).first().id
            send(user.email, "review_version",
                 {
                     'id': review_id,
                     'asset': asset_name,
                     'asset_type': asset_type
                 },
                 user.customization)


def are_asset_datarecords_unique(asset, customizations=None):
    for data_structure in DataStructure.objects.filter(context__asset_type__type=asset.asset_type.type, unique=True):
        value = data_structure.find_actual_value(asset=asset, language=None, version_id=None, draft=True)
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
    ).order_by('-pk').select_related('version__asset'):
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


def save_unrevisioned_records(asset, context, language, data_structures,
                              request_data, request_files, user, version_id=None):

    def process_file_or_image():
        nonlocal new_record_value, delete_file
        # If a file has been uploaded try to save it
        if data_structure_name in request_files:
            new_record_value, file_errors = upload_file(data_structure, request_files[data_structure_name])
            if file_errors:
                upload_errors.extend(file_errors)
                return False

        elif 'delete_' + data_structure_name in request_data:
            delete_file = request_data['delete_' + data_structure_name]

        elif data_structure.optional:
            return False
        return True

    def process_guid():
        nonlocal new_record_value
        # if the guid is valid it will go to the next set of checks
        new_record_value = request_data.get(data_structure_name, "")

        # if its option and not a valid guid set error message and go to next DataStructure
        if new_record_value and not re.match(GUID_REGEXP, new_record_value):
            guid_format = "{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}"
            upload_errors.append(
                (data_structure_name, f'Invalid GUID {new_record_value} it should formatted like {guid_format}'))
            return False

        # no guid submitted or default value and is not optional generate a guid
        elif not new_record_value and not data_structure.optional:
            new_record_value = '{' + str(uuid.uuid4()) + '}'
            upload_errors.append(
                (data_structure_name,
                 f'No submitted GUID or default value. GUID has been generated as {new_record_value}'))
        return True

    def process_select():
        nonlocal new_record_value
        getlist_default_value = [] if data_structure.type == DataStructure.DATA_TYPES.multiselect else ""
        if hasattr(request_data, 'getlist'):
            new_record_value = request_data.getlist(data_structure_name, getlist_default_value)
        else:
            new_record_value = request_data[data_structure_name] or getlist_default_value
        if new_record_value != "" and data_structure.type == DataStructure.DATA_TYPES.select:
            new_record_value = new_record_value[0]
        return True

    def process_external():
        nonlocal external_file, new_record_value, delete_file
        # If the user uploads a new file create a new ExternalFile record
        if data_structure_name in request_files:
            request_file = request_files[data_structure_name]

            file_errors = check_meta_settings(data_structure, request_file)
            if file_errors:
                upload_errors.extend(file_errors)
                return False

            md5 = hashlib.md5()
            for chunk in request_file.chunks():
                md5.update(chunk)

            external_file = ExternalFile(data_structure=data_structure, asset=asset)
            external_file.save()

            external_file.file = request_file
            external_file.md5 = md5.hexdigest()
            external_file.size = request_file.size
            external_file.save()

            new_record_value = external_file.file.url

        elif 'delete_' + data_structure_name in request_data:
            delete_file = request_data['delete_' + data_structure_name]

        elif request_data.get(data_structure_name):
            new_record_value = request_data.get(data_structure_name)

        elif data_structure.optional:
            return False
        return True

    def process_checkbox():
        nonlocal new_record_value
        new_record_value = data_structure_name in request_data
        if data_structure.advanced and not can_edit_advanced:
            return False
        return True

    def process_integer():
        nonlocal new_record_value, has_error
        try:
            new_record_value = int(request_data.get(data_structure_name, ""))
        except ValueError:
            upload_errors.append((data_structure_name, "This field has can only be integers."))
            return False

        if 'min' in data_structure.meta_settings and new_record_value < int(data_structure.meta_settings['min']):
            error_text = f"Value: {new_record_value} is less than the minimum: " \
                         f"{int(data_structure.meta_settings['min'])}"
            upload_errors.append((data_structure_name, error_text))
            has_error = True
        if 'max' in data_structure.meta_settings and new_record_value > int(data_structure.meta_settings['max']):
            error_text = f"Value: {new_record_value} is more than the maximum: " \
                         f"{int(data_structure.meta_settings['max'])}"
            upload_errors.append((data_structure_name, error_text))
            has_error = True
        return True

    def process_object_or_array():
        nonlocal new_record_value
        try:
            new_record_value = DataStructure.cast_value(data_structure, request_data.get(data_structure_name, ""))
            if data_structure.type == DataStructure.DATA_TYPES.array and type(new_record_value) != list:
                raise ValueError
            elif data_structure.type == DataStructure.DATA_TYPES.object and type(new_record_value) != dict:
                raise ValueError

        except ValueError:
            upload_errors.append((data_structure_name, "Json was incorrectly formatted."))
            return False
        return True

    def process_other():
        nonlocal new_record_value, has_error
        new_record_value = request_data.get(data_structure_name, "")
        if 'regex' in data_structure.meta_settings:
            pattern = data_structure.meta_settings['regex']
            if pattern == '':
                pattern = '.*$'
            if not pattern.endswith('$'):
                pattern = f'{pattern}$'
            if new_record_value and not re.match(pattern, new_record_value):
                upload_errors.append((data_structure_name, 'Invalid input'))
                has_error = True

        if 'char_limit' in data_structure.meta_settings:
            char_limit = int(data_structure.meta_settings['char_limit'])
            if len(new_record_value) > char_limit:
                upload_errors.append(
                    (data_structure_name,
                     f'Character limit exceeded. Text was {len(new_record_value)} characters but should not be more than {char_limit} characters'))
                has_error = True
        return True

    def check_optional():
        nonlocal new_record_value
        # If the data structure is not optional and has no value use the default.
        if new_record_value in ["", {}, []] and not data_structure.optional:
            if data_structure.advanced and not can_edit_advanced:
                return False
            # If there is a default value use it. Otherwise don't fill it prevent it.
            if data_structure.default != "" and not records_exist:
                # Gets the default value and will cast the default value
                new_record_value = data_structure.find_actual_value(asset=asset)
                upload_errors.append((data_structure_name, "This field cannot be blank. Using default value"))
            else:
                upload_errors.append((data_structure_name, "This field cannot be blank"))
                return False
        return True

    # Start save_unrevisioned_records
    can_edit_advanced = user.is_superuser or user.has_perm('cms.edit_advanced')
    upload_errors = []
    # Only process non-translatable data structures if language is default.
    process_nontranslatable = get_cloud_portal_asset(settings.CUSTOMIZATION).default_language == language
    for data_structure in data_structures:
        data_structure_name = data_structure.name
        ds_language = None
        if context.translatable:
            if data_structure.translatable:
                ds_language = language
            elif not process_nontranslatable:
                continue

        new_record_value = ""
        external_file = None
        delete_file = False
        has_error = False
        records_exist = data_structure.datarecord_set.filter(asset=asset).exists()
        is_file_or_image = DataStructure.is_file_or_image(data_structure.type)
        is_file = is_file_or_image or data_structure.type in [DataStructure.DATA_TYPES.external_file,
                                                              DataStructure.DATA_TYPES.external_image]
        latest_value = data_structure.find_actual_value(asset, ds_language, draft=True)
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
        if is_file_or_image:
            if not process_file_or_image():
                continue
        elif data_structure.type == DataStructure.DATA_TYPES.guid:
            if not process_guid():
                continue
        elif data_structure.type in [DataStructure.DATA_TYPES.select, DataStructure.DATA_TYPES.multiselect]:
            if not process_select():
                continue
        elif data_structure.type in [DataStructure.DATA_TYPES.external_file, DataStructure.DATA_TYPES.external_image]:
            if not process_external():
                continue
        elif data_structure.type == DataStructure.DATA_TYPES.check_box:
            if not process_checkbox():
                continue
        elif data_structure.type == DataStructure.DATA_TYPES.integer:
            if not process_integer():
                continue
        elif data_structure.type in [DataStructure.DATA_TYPES.object, DataStructure.DATA_TYPES.array]:
            if not process_object_or_array():
                continue
        elif not process_other():
            continue

        if has_error:
            continue

        if not check_optional():
            continue

        # Check if value has changed
        if new_record_value == latest_value and not delete_file:
            continue

        # Multiselect is a special case because it adds the label and other info.
        if data_structure.type == DataStructure.DATA_TYPES.multiselect and \
                latest_value == DataStructure.cast_value(data_structure, json.dumps(new_record_value)):
            continue

        # Check permisison if advanced
        if data_structure.advanced and not can_edit_advanced:
            upload_errors.append((data_structure_name, "You do not have permission to edit this field"))
            continue

        # Check uniqueness if unique
        if data_structure.unique and not is_datarecord_unique(asset, data_structure, new_record_value):
            upload_errors.append((data_structure_name, "This field must be unique"))
            continue

        # Remove value for delete_file
        if delete_file:
            new_record_value = ""

        record = DataRecord(asset=asset,
                            data_structure=data_structure,
                            language=ds_language,
                            value=new_record_value,
                            created_by=user)
        record.save()

        # If external, foreign key to file is used
        if external_file:
            record.external_file = external_file
            record.save()

    if asset.is_cloud_portal and asset.can_preview_on_portal:
        fill_content(asset,
                     preview=True,
                     incremental=True,
                     version_id=version_id,
                     changed_context=context)

    return upload_errors


def update_latest_record_version(records, new_version):
    record = records.latest('created_date')
    if not record.version:
        record.version = new_version
        record.save()


def update_records_to_version(asset, contexts, version):
    languages = Language.objects.all()
    for context in contexts:
        for data_structure in context.datastructure_set.all():
            all_records = data_structure.datarecord_set.filter(asset=asset)

            if data_structure.translatable:
                for language in languages:
                    records_for_language = all_records.filter(language=language)
                    # Now only the latest records that can be published will have its
                    # version altered
                    if records_for_language.exists():
                        update_latest_record_version(records_for_language, version)

            elif all_records.exists():
                update_latest_record_version(all_records, version)


def strip_version_from_records(version, asset):
    records_to_strip = DataRecord.objects.filter(version=version, asset=asset)
    for record in records_to_strip:
        record.version = None
        record.save()


# Currently unused
def remove_unused_records(asset):
    nullify_records = DataRecord.objects.filter(asset=asset, version_id=None)
    if nullify_records.exists():
        for record in nullify_records:
            record.delete()


def generate_preview_link(context=None, asset=None, state=""):
    if asset:
        if asset.is_integration:
            return f"{settings.INTEGRATION_STORE_PAGE}/{asset.id}?state={state}"
        elif asset.is_article:
            article_url = DataRecord.objects.filter(asset=asset, data_structure__name='url').last()
            article_url = article_url.value if article_url else "tmp_url"
            return f'/content/{article_url}?' + urlencode({'state': state, 'id': asset.id})
        elif asset.is_agreement:
            return '/agreement?' + urlencode({'state': state, 'id': asset.id})

    return f"{context.url}?preview=true" if context and context.url else None


def generate_preview(asset, context=None, version_id=None, send_to_review=False):
    if asset.is_cloud_portal and asset.can_preview_on_portal:
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
    if not publish_errors:
        fill_content(asset, preview=False, incremental=True)
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
            ds_name = datastructure.label if datastructure.label else datastructure.name
            change_url = reverse('admin:change_page', kwargs={'asset_id': asset.id, 'context_id': datastructure.context.id})
            errors.append((
                ds_name,
                'This field cannot be blank. '
                f'Go to the <a href="{change_url}">{datastructure.context.label}</a> page and fill in {ds_name}.',
                change_url
            ))
    return errors


def send_version_for_review(asset, user):
    old_version = ContentVersion.objects.filter(asset=asset, accepted_date=None).order_by('created_date').last()

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

    update_records_to_version(asset, Context.objects.filter(asset_type=asset.asset_type), version)

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
        order_by('data_structure__context__order', 'language__code', 'data_structure__order', '-id')
    contexts = {}
    context_preview_links = {'whole_preview': generate_preview_link(
        None, asset, 'review'
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
                    record.data_structure.context, asset, 'review'
                )
    return contexts, context_preview_links


# File upload helpers
def is_not_valid_file_type(file_type, meta_types):
    for meta_type in meta_types.split(','):
        if meta_type.strip() in file_type:
            return False
    return True


def is_not_valid_file_extension(file_name, meta_types):
    for meta_type in meta_types.split(','):
        if file_name.endswith(f'.{meta_type.strip()}'):
            return False
    return True


def get_image_dimensions(image_file):
    new_image = Image.open(image_file)
    width, height = new_image.size
    return {'width': width, 'height': height}


def check_image_dimensions(data_structure_name,
                           meta_dimensions, image_dimensions):
    size_error_msgs = []
    if not meta_dimensions:
        return size_error_msgs

    if 'height' in meta_dimensions and meta_dimensions['height'] != image_dimensions['height']:
        error_msg = f"Image height must be equal to {meta_dimensions['height']}. Uploaded image's height is {image_dimensions['height']}."
        size_error_msgs.append((data_structure_name, error_msg))

    if 'width' in meta_dimensions and meta_dimensions['width'] != image_dimensions['width']:
        error_msg = f"Image width must be equal to {meta_dimensions['width']}. Uploaded image's width is {image_dimensions['width']}."
        size_error_msgs.append((data_structure_name, error_msg))

    if 'height_le' in meta_dimensions and meta_dimensions['height_le'] < image_dimensions['height']:
        error_msg = f"Image height must be equal to or less than {meta_dimensions['height_le']}. Uploaded image's height is {image_dimensions['height']}."
        size_error_msgs.append((data_structure_name, error_msg))

    if 'width_le' in meta_dimensions and meta_dimensions['width_le'] < image_dimensions['width']:
        error_msg = f"Image width must be equal to or less than {meta_dimensions['width_le']}. Uploaded image's width is {image_dimensions['width']}."
        size_error_msgs.append((data_structure_name, error_msg))

    if 'height_ge' in meta_dimensions and meta_dimensions['height_ge'] > image_dimensions['height']:
        error_msg = f"Image height must be equal to or more than {meta_dimensions['height_ge']}. Uploaded image's height is {image_dimensions['height']}."
        size_error_msgs.append((data_structure_name, error_msg))

    if 'width_ge' in meta_dimensions and meta_dimensions['width_ge'] > image_dimensions['width']:
        error_msg = f"Image width must be equal to or more than {meta_dimensions['width_ge']}. Uploaded image's width is {image_dimensions['width']}." 
        size_error_msgs.append((data_structure_name, error_msg))

    return size_error_msgs


def has_wrong_image_sizes(multi_image_file_sizes, required_image_sizes):
    return not all(image_size in multi_image_file_sizes for image_size in required_image_sizes)


def check_meta_settings(data_structure, new_file):
    meta_settings = data_structure.meta_settings
    if 'format' in meta_settings and is_not_valid_file_extension(new_file.name, meta_settings['format']) and \
            is_not_valid_file_type(new_file.content_type, meta_settings['format']):
        error_msg = f"Invalid file type. Uploaded file is {new_file.content_type}. It should be {data_structure.meta_settings['format'].replace(',', ' or ')}."
        return [(data_structure.name, error_msg)]

    if 'size' in meta_settings and meta_settings['size'] < new_file.size:
        error_msg = f"The file's size it too large. Its size was {new_file.size/BYTES_TO_MEGABYTES:.2f}MB but must be less than {meta_settings['size']/BYTES_TO_MEGABYTES:.2f}MB"
        return [(data_structure.name, error_msg)]

    if "multi_image_sizes" in meta_settings:
        multi_image_file = Image.open(new_file)
        image_file_sizes = [list(image_size[:2]) for image_size in multi_image_file.info["sizes"]]
        if has_wrong_image_sizes(image_file_sizes, meta_settings["multi_image_sizes"]):
            error_msg = f"The file does not have the required sizes. Uploaded file has sizes {image_file_sizes}. It " \
                        f"should have {meta_settings['multi_image_sizes']}"
            return [(data_structure.name, error_msg)]

    if data_structure.is_image:
        try:
            image_dimensions = get_image_dimensions(new_file)
        except (IOError, TypeError):
            return [(data_structure.name, "Image is damaged please upload an valid version")]
        except ValueError as valError:
            return [(data_structure.name, str(valError))]

        return check_image_dimensions(data_structure.name, meta_settings, image_dimensions)

    return []


# End of file upload helpers
def upload_file(data_structure, new_file):
    if new_file.size >= settings.CMS_MAX_FILE_SIZE:
        return None, [(data_structure.name, f'Its size was {new_file.size/BYTES_TO_MEGABYTES:.2f}MB but must be less than {settings.CMS_MAX_FILE_SIZE/BYTES_TO_MEGABYTES:.2f} MB')]

    file_errors = check_meta_settings(data_structure, new_file)
    if file_errors:
        return None, file_errors
    # Must seek file before reading or else encoding will be messed ruined.
    new_file.seek(0)
    encoded_file = base64.b64encode(new_file.read()).decode('utf8')
    return encoded_file, []
