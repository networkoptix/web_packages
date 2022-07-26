import os
import json
import codecs
import base64
import binascii
from dataclasses import dataclass
import zipfile
import distutils.dir_util
import errno
from typing import Dict, Callable
import traceback
from typing import Union, Tuple, Dict, List
from io import BytesIO
from concurrent.futures import ThreadPoolExecutor

from django.db.models import QuerySet

from cms.models import *
from cms.controllers.special_structures import SpecialStructures
from cloud.debug import timer
from api.helpers.exceptions import APIForbiddenException, APIInternalException, ErrorCodes

import logging
logger = logging.getLogger(__name__)


EMAIL_TEMPLATES = 'templates/lang'
SOURCE_DIR = 'static/_source/{{skin}}'
TARGET_DIR = 'static/{{customization}}'

SPECIAL_STRUCTURES = SpecialStructures()


def make_dir(filename):
    dirname = os.path.dirname(filename)
    if not os.path.exists(dirname):
        try:
            os.makedirs(dirname)
        except OSError as exc:  # Guard against race condition
            if exc.errno != errno.EEXIST:
                raise


def target_file(file_name, save_location, language_code, preview):
    if language_code:
        file_name = file_name.replace("{{language}}", language_code)
    # write content to target place
    if not preview:
        target_file_name = os.path.join('static', save_location, file_name)
    else:
        target_file_name = os.path.join(
            'static', save_location, 'preview', file_name)
    return target_file_name


def global_contexts_to_dict(contexts, asset):
    data_structures = {}
    customization = asset.customizations.first()
    customization_name = customization.name
    languages = customization.languages.all()
    version_id = asset.version_id()
    for context in contexts:
        if 'universal' not in data_structures:
            data_structures['universal'] = context.datastructure_set.all()
        else:
            data_structures['universal'] |= context.datastructure_set.all()

        if context.translatable:
            for lang in languages:
                if lang.code not in data_structures:
                    data_structures[lang.code] = context.datastructure_set.all()
                else:
                    data_structures[lang.code] |= context.datastructure_set.all()
    if 'universal' in data_structures:
        universal_vals = DataStructure.find_actual_values(
            data_structures['universal'], asset, version_id=version_id, customization_name=customization_name
        )
        del data_structures['universal']
        data_structure_dict = {ds.name: value for ds, value in universal_vals.items()}
    else:
        data_structure_dict = {}

    for language in languages:
        if language.code in data_structures:
            vals = DataStructure.find_actual_values(
                data_structures[language.code], asset, version_id=version_id, language=language,
                customization_name=customization_name
            )
            # For translatable global contexts add keys like 'dsname__langcode', example '%EULA_TEXT%__en_US'
            for ds, value in vals.items():
                data_structure_dict[f'{ds.name}__{language.code}'] = value

    for tag in SPECIAL_STRUCTURES.function_dict:
        data_structure_dict[tag] = SPECIAL_STRUCTURES.calc(tag, asset)

    return data_structure_dict


def replace_in(collection, key, value='', delete=False):
    # Here we process json files

    if type(collection) is dict:
        elements = list(collection.items())
    elif type(collection) is list:
        elements = reversed(list(enumerate(collection)))
    else:
        raise ValueError(f"Cannot iterate through {type(collection)}")

    for index, item in elements:
        item_type = type(item)
        if item_type in [dict, list]:
            replace_in(item, key, value, delete=delete)
        elif item_type is str:
            # special case if json value contains only the value - we don't treat it as a string,
            # we replace the whole thing
            if item == key:
                if delete:
                    del collection[index]
                else:
                    collection[index] = value
            elif key in item:
                collection[index] = item.replace(key, str(value))


def save_content(filename, content):
    make_dir(filename)
    with codecs.open(filename, "w", "utf-8") as file:
        file.write(content)


@dataclass
class ContextProcessor:
    asset: Asset
    preview: bool
    version_id: int
    global_contexts: QuerySet
    global_contexts_dict: Dict = None
    skin: str = None
    custom: bool = False
    custom_data: Dict = None

    def process_global_contexts(self, content, language):
        for global_context in self.global_contexts.all():
            content = self.process_context_structure(
                context=global_context, content=content, force_global_files=False, language=language
            )

        for tag in SPECIAL_STRUCTURES.function_dict:
            if self.global_contexts_dict and tag in self.global_contexts_dict:
                tag_value = self.global_contexts_dict[tag]
            else:
                tag_value = SPECIAL_STRUCTURES.calc(tag, self.asset)
            content = self.process_data_structure(content, tag, DataStructure.DATA_TYPES.text, tag_value)

        return content

    @staticmethod
    def process_data_structure(content, tag, data_structure_type, content_value):
        if type(content) in (dict, list):
            # Process json file
            replace_in(content, tag, content_value)
        else:
            if data_structure_type == DataStructure.DATA_TYPES.check_box:
                content_value = str(content_value)

            if tag in content:
                if type(content_value) != str:
                    content_value = str(content_value)
                content = content.replace(tag, content_value)
        return content

    def process_context_structure(self, context, content, force_global_files, language=None, context_dict=None):
        values = DataStructure.find_actual_values(
            context.datastructure_set.all(), asset=self.asset, language=language, version_id=self.version_id,
            draft=self.preview
        )
        values = {ds.id: val for ds, val in values.items()}
        field_overrides = context.asset_type.custom_field_overrides
        exclude = field_overrides.get('exclude', [])

        for datastructure in context.datastructure_set.all():
            # noinspection PyBroadException
            try:
                if self.custom and datastructure.name in exclude:
                    replace_in(content, datastructure.name, delete=True)
                    continue

                if self.custom_data and datastructure.name in self.custom_data:
                    content_value = self.custom_data[datastructure.name]
                elif context_dict and datastructure.name in context_dict:
                    if language:
                        content_value = context_dict.get(
                            f'{datastructure.name}__{language.code}', context_dict[datastructure.name]
                        )
                    else:
                        content_value = context_dict[datastructure.name]
                else:
                    content_value = values[datastructure.id]
                # replace marker with value
                if not DataStructure.is_file_or_image(datastructure.type):
                    content = self.process_data_structure(content, datastructure.name, datastructure.type, content_value)

                elif content_value or datastructure.optional:
                    if context.is_global and not force_global_files:
                        # do not update files from global contexts all the time
                        continue

                    if not datastructure.translatable and language and language != self.asset.default_language:
                        # if file itself is not translatable - update it only for default language
                        continue

                    image_storage = os.path.join('static', self.asset.asset_root)
                    if self.preview:
                        image_storage = os.path.join(image_storage, 'preview')

                    file_name = datastructure.name
                    if language:
                        file_name = file_name.replace("{{language}}", language.code)

                    # print "Save file from DB: " + file_name, context, language, context.is_global
                    save_b64_to_file(content_value, file_name, image_storage)
            except Exception:
                # if something happens here - instance will not start and it will close to impossible to fix so we ignore
                # broken records while logging them - it will raise cloud alarm and we will go and fix the problem
                logger.error(
                    f"ERROR: Cannot process data structure {datastructure.name} for asset {self.asset.name}")
                logger.error(traceback.format_exc())

        return content

    def process_context(self, context: Context, language):
        context_template_text = context.template_for_language(language, self.asset.default_language, self.skin)

        # check if the file is language JSON
        if context.file_path.endswith(".json") and isinstance(context_template_text, str):
            try:
                context_template_text = json.loads(context_template_text)
            except ValueError:
                print("Failed to decode file -> " + context.file_path)

        if not context_template_text:
            context_template_text = ''
        # if context is global - process it
        content = self.process_context_structure(context=context, content=context_template_text,
                                                 force_global_files=context.is_global)
        if not context.is_global:  # if current context is global - do not apply other contexts
            content = self.process_global_contexts(content, language=language)

        # If json -> dump it to string
        if type(content) == dict:
            content = json.dumps(content, indent=4, separators=(',', ': '))

        return content

    def save_context(self, context: Context, language: Language):
        content = self.process_context(context, language)

        if context.template_for_language(language, self.asset.default_language, self.skin):  # if we have template - save context to file
            target_file_name = target_file(context.file_path, self.asset.asset_root, language.code, self.preview)
            # print "save file: " + target_file_name
            save_content(target_file_name, content)

    def save_contexts(self, context, languages):
        # update affected languages
        if context.translatable:
            for language in languages:
                self.save_context(context=context, language=language)
        else:
            self.save_context(context=context, language=self.asset.default_language)


def read_customized_file(filename, asset, language_code=None,
                         version_id=None, preview=False):
    # 1. try to find context for this file
    skin = asset.read_global_value("%SKIN%")
    language = Language.by_code(language_code, asset.default_language)
    clean_name = filename.replace(language_code, "{{language}}") if language_code else filename
    context: Context = Context.objects.filter(file_path=clean_name, asset_type=asset.asset_type).first()
    if context:
        # success -> return process_context
        global_contexts = Context.objects.filter(is_global=True, hidden=False, asset_type=asset.asset_type)
        context_processor = ContextProcessor(
            asset=asset, skin=skin, preview=preview, version_id=version_id, global_contexts=global_contexts
        )
        return context_processor.process_context(context=context, language=language)

    # 2. try to find datastructure for this file
    # TODO: name is not unique
    data_structure: DataStructure = DataStructure.objects.filter(name=clean_name, context__asset_type=asset.asset_type).first()
    if data_structure:
        # success -> return actual value
        value = data_structure.find_actual_value(asset, language, version_id, draft=preview)
        if not value:
            value = data_structure.placeholder
        return base64.b64decode(value)

    # fail - try to read file from drive
    filename = filename.replace("{{language}}", language_code)
    file_path = os.path.join(settings.STATIC_LOCATION, asset.asset_root, filename)
    try:  # try to read file as text
        with codecs.open(filename, 'r', 'utf-8') as file:
            return file.read()
    except IOError:
        pass

    try:  # try to read binary file
        with open(file_path, "rb") as file:
            return file.read()
    except IOError:
        return None  # nothing helps


def generate_languages_json(save_location, language_codes, preview):
    languages = Language.objects.filter(code__in=language_codes)
    languages_json = [{"name": lang.name, "language": lang.code} for lang in languages]
    target_file_name = target_file('static/languages.json', save_location, None, preview)
    save_content(target_file_name, json.dumps(languages_json, ensure_ascii=False))


def can_update_static(asset: Asset):
    if not asset.is_cloud_portal:
        raise APIForbiddenException("Can not run update static files on non cloud_portal assets")

    if not asset.can_preview_on_portal:
        raise APIForbiddenException("Can not update static files for cloud portal on other customizations.")


def init_skin(asset, preview=False, workers=2):
    can_update_static(asset)
    # 1. read skin for this customization
    customization_name = asset.customizations.first().name
    skin = asset.read_global_value('%SKIN%')
    logger.info("Init " + skin + " skin for " + asset.__str__())

    # 2. copy directory
    from_dir = SOURCE_DIR.replace("{{skin}}", skin)
    target_dir = TARGET_DIR.replace("{{customization}}", customization_name)

    # 3. run fill_content
    if not preview:
        distutils.dir_util.copy_tree(from_dir, target_dir)
        logger.info("Fill content for " + asset.__str__())
        return fill_content(asset, preview=False, incremental=False, workers=workers)
    else:
        distutils.dir_util.copy_tree(from_dir, os.path.join(target_dir, 'preview'))
        logger.info("Fill preview for " + asset.__str__())
        return fill_content(asset, preview=True, incremental=False, workers=workers)


@timer
def fill_content(asset,
                 preview=True,
                 version_id=None,
                 incremental=False,
                 changed_context=None,
                 send_to_review=False,
                 workers=2):
    def calculate_preview_state():
        # if preview=False
        #   retrieve latest accepted version
        #   if version_id is not None and version_id!=latest_id - raise exception
        # else
        #   if version_id is None - preview latest available datarecords
        #   else - preview specific version
        nonlocal version_id, incremental, changed_context
        if preview:  # Here we decide, if we need to change preview state
            # if incremental was false initially - we keep it as false
            if version_id:
                if asset.preview_status != Asset.PREVIEW_STATUS.review:
                    # When previewing awaiting version and state is draft
                    # if we are just sending version to review - do incremental update
                    if not send_to_review:
                        incremental = False  # otherwise - do full update and change state to review
                    asset.change_preview_status(Asset.PREVIEW_STATUS.review)
                elif incremental:
                    return False  # When previewing awaiting version and state is review - do nothing
            # draft
            elif asset.preview_status == Asset.PREVIEW_STATUS.review:
                # When saving draft and state is review - do incremental update
                # applying all drafted changes and change state to draft
                # incremental = True
                asset.change_preview_status(Asset.PREVIEW_STATUS.draft)
                changed_context = None  # remove changed context so that we do full incremental update
            # else:
                # When saving draft for context and state is draft - do incremental update only for changed context
                # update only changed context
                # keep incremental value
        else:
            if version_id is not None:
                raise Exception(
                    'Only latest accepted version can be published\
                     without preview flag, version_id id forbidden')
            version = ContentVersion.objects.filter(
                asset_id=asset.id, accepted_date__isnull=False).order_by('accepted_date').last()
            if version:
                version_id = version.id
            else:
                version_id = 0
                incremental = False  # no version - do full update using default values
            cloud_portal_customization_cache(asset.asset_root, force=True)
        return True

    def get_changed_if_no_version():
        nonlocal changed_records
        if not version_id:  # if version_id is None - check if records are actually latest
            changed_records_ids = [DataRecord.objects.
                                       filter(language_id=record.language_id,
                                              data_structure_id=record.data_structure_id,
                                              asset=asset).
                                       latest('created_date').id for record in changed_records]
            changed_records = changed_records.filter(id__in=changed_records_ids)

    def set_changed():
        nonlocal incremental, changed_records, changed_contexts, changed_languages, default_language_code, \
            languages_list
        if incremental:
            if not changed_context:
                # filter records changed in this version
                # get their datastructures
                # detect their contexts

                changed_records = DataRecord.objects.filter(version_id=version_id, asset=asset)
                # in case version_id is none - we need to filter by asset as well
                get_changed_if_no_version()

                changed_context_ids = list(
                    changed_records.values_list('data_structure__context_id', flat=True).distinct())
                changed_contexts = Context.objects.filter(id__in=changed_context_ids)

                changed_global_contexts = changed_contexts.filter(is_global=True)
                if changed_global_contexts.exists():  # global context was changed - force full rebuild
                    incremental = False
                changed_contexts = changed_contexts.all()

            elif changed_context.is_global:
                incremental = False

            else:  # if we want to update only fixed context
                changed_contexts = [changed_context]
                changed_records = DataRecord.objects.filter(data_structure__context=changed_context,
                                                            version_id=version_id,
                                                            asset=asset)
                get_changed_if_no_version()

        if not incremental:  # If not incremental - iterate all contexts and all languages
            changed_contexts = Context.objects.filter(asset_type=asset.asset_type)
            changed_languages = asset.languages_list

        default_language_code = asset.default_language.code
        languages_list = asset.languages_list

        # Email templates are skipped here because when a email is sent, the celery worker retrieves
        # the template from the database and fills the template with the correct values before sending the email.
        # If we pass in a changed context its not a queryset object so we cannot use filter or exclude it.
        if type(changed_contexts) is not list:
            changed_contexts = changed_contexts.exclude(name__startswith=EMAIL_TEMPLATES)

    def run_workers():
        nonlocal changed_languages
        global_contexts = Context.objects.filter(is_global=True, hidden=False, asset_type=asset.asset_type)
        global_contexts_dict = global_contexts_to_dict(global_contexts, asset)
        error = False
        skin = asset.read_global_value('%SKIN%')
        context_processor = ContextProcessor(
            asset=asset, version_id=version_id, global_contexts=global_contexts,
            global_contexts_dict=global_contexts_dict, preview=preview, skin=skin
        )
        with ThreadPoolExecutor(max_workers=workers) as executor:
            # Stores the tasks that the thread pool runs. This is needed for checking for exceptions
            futures = []
            for context in changed_contexts:
                # logger.info("Process context: " + context.name + " file:" + context.file_path)
                if incremental:
                    changed_languages = list(changed_records.filter(data_structure__context_id=context.id).
                                             values_list('language__code', flat=True).distinct())

                    if default_language_code in changed_languages:
                        # If default language changes - it can affect all languages in the context
                        changed_languages = languages_list
                languages = Language.objects.filter(code__in=changed_languages)
                # Add the context to the list of tasks for the thread pool.
                futures.append(executor.submit(context_processor.save_contexts, context, languages))

            # Catch any errors raise by thread workers.
            for future in futures:
                try:
                    future.result()
                except Exception as e:
                    logger.warning(e)
                    error = True
        return error

    # Start fill_content
    # Check if asset should be filled
    can_update_static(asset)

    # Set preview state
    if not calculate_preview_state():
        return

    # Get changed
    changed_contexts = None
    changed_records = None
    changed_languages = None
    default_language_code = None
    languages_list = None
    set_changed()

    # Run workers
    thread_error = run_workers()

    generate_languages_json(asset.asset_root, languages_list,  preview)
    if thread_error:
        logger.warning("Filldata has ran into an exception. If run by the management command it will retry soon.")
    return not thread_error


@dataclass
class PackageExporter:
    asset: Asset
    preview: bool = False
    version_id: int = None
    add_root: bool = True
    update_progress_cb: Callable = None
    custom: bool = False
    custom_data: Dict = None

    def __post_init__(self):
        self.skin = self.asset.read_global_value('%SKIN%')
        self.global_contexts = Context.objects.filter(is_global=True, asset_type=self.asset.asset_type)

        self.context_processor = ContextProcessor(
            asset=self.asset, global_contexts=self.global_contexts,
            preview=self.preview, skin=self.skin, version_id=self.version_id, custom=self.custom,
            custom_data=self.custom_data
        )

    def _zip_context(self, zip_file, context, language):
        default_language = self.asset.default_language
        root_dir = self.asset.asset_root
        if context.template_for_language(language, default_language, self.skin):  # if we have template - save context to file
            data = self.context_processor.process_context(context, language)
            name = context.file_path.replace("{{language}}", language.code) if language else context.file_path
            if self.add_root:
                name = os.path.join(root_dir, name)
            zip_file.writestr(name, data)
        file_structures = context.datastructure_set.filter(type__in=(DataStructure.DATA_TYPES.image,
                                                                     DataStructure.DATA_TYPES.file))
        values = {ds.id: val for ds, val in
                  DataStructure.find_actual_values(file_structures, self.asset, language, self.version_id, draft=self.preview).items()}
        for file_structure in file_structures:
            name = file_structure.name.replace("{{language}}", language.code) if language else file_structure.name
            if self.add_root:
                name = os.path.join(root_dir, name)

            # Skip static files that exists in the zip package
            if name in zip_file.namelist():
                continue

            data = values[file_structure.id]
            # Check if there is a data_record otherwise its a placeholder value.
            if data:
                try:
                    data = base64.b64decode(data)
                    zip_file.writestr(name, data)
                except binascii.Error as e:
                    logger.error(f'{file_structure.name} had the following Exception {str(e)}')
                    return True

    def get_zip_package(self):
        zip_data = BytesIO()
        zip_file = zipfile.ZipFile(zip_data, "a", zipfile.ZIP_DEFLATED, False)

        languages = self.asset.languages
        contexts = list(self.asset.asset_type.context_set.all())

        for index, context in enumerate(contexts):
            if self.update_progress_cb:
                self.update_progress_cb(index, len(contexts))

            errors = False
            if context.translatable:
                for language in languages:
                    errors = self._zip_context(zip_file, context, language)
            else:
                errors = self._zip_context(zip_file, context, None)
            if errors:
                zip_file.close()
                raise APIInternalException(
                    f'Error generating package. Some files are missing. Stopped at {context.name}',
                    error_code=ErrorCodes.db_error)

        # Mark the files as having been created on Windows so that
        # Unix permissions are not inferred as 0000
        for file in zip_file.filelist:
            file.create_system = 0

        zip_file.close()
        zip_data.seek(0)
        return zip_data.read()


def save_b64_to_file(value, filename, storage_location):
    file_name = os.path.join(storage_location, filename)
    make_dir(file_name)

    image_png = base64.b64decode(value) if value else ''

    with open(file_name, 'wb') as f:
        f.write(image_png)


def host_to_vms_asset(host: str) -> Union[Asset, None]:
    if host:
        customization: Customization = Customization.objects.filter(host=host).first()
        if customization:
            return get_vms_asset(customization=customization.name)


def calculate_custom_client_data(custom_client: CustomClient) -> Tuple[Dict, List]:
    field_overrides = custom_client.base_vms.asset_type.custom_field_overrides
    fields = field_overrides.get('fields', {})
    cloud_host_fields = field_overrides.get('cloudHostFields', [])
    client_values = custom_client.values or {}
    custom_data = {}
    errors = []

    for name, field in fields.items():
        source = field.get('source', '')
        meta_only = field.get('metaOnly', False)
        if meta_only and custom_client.created_customization.name != settings.META_CUSTOMIZATION:
            continue

        if source in ['custom', 'field']:
            if source == 'field':
                source_field = field.get('sourceField')
                if source_field is None:
                    errors.append({'message': f'Field {name} with source="field" missing key "sourceField"'})
                    continue
            else:
                source_field = name

            value = client_values.get(source_field, None)
            if value not in [None, '']:
                custom_data[name] = value
            elif not field.get('optional', False):
                errors.append({'message': f'Missing required custom field {source_field}'})

        elif source == 'constant':
            custom_data[name] = field.get('value')

        elif source == 'auto':
            custom_data[name] = client_values.get(name, None)

    if custom_client.created_customization.name == settings.META_CUSTOMIZATION:
        portal_url = client_values.get('portalUrl', '')
        if portal_url:
            cloud_host_vms_asset = host_to_vms_asset(portal_url)
            if not cloud_host_vms_asset:
                errors.append({'message': f'Invalid portalUrl'})
            else:
                for host_field in cloud_host_fields:
                    if host_field not in custom_data:
                        ds: Union[DataStructure, None] = DataStructure.objects.filter(
                            context__asset_type=custom_client.base_vms.asset_type, name=host_field).first()
                        if ds:
                            custom_data[host_field] = ds.find_actual_value(
                                cloud_host_vms_asset)

    return custom_data, errors


