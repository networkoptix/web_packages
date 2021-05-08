import os
import json
import codecs
import base64
import binascii
import zipfile
import distutils.dir_util
import errno
import traceback
from io import BytesIO
from concurrent.futures import ThreadPoolExecutor

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

    universal_vals = DataStructure.find_actual_values(
        data_structures['universal'], asset, version_id=version_id, customization_name=customization_name
    )
    del data_structures['universal']
    data_structure_dict = {ds.name: value for ds, value in universal_vals.items()}

    for language in languages:
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


def process_global_contexts(asset, content, version_id, preview, global_contexts, global_contexts_dict, language=None):
    for global_context in global_contexts.all():
        content = process_context_structure(asset, global_context, content, language,
                                            version_id, preview, False, global_contexts_dict)

    for tag in SPECIAL_STRUCTURES.function_dict:
        if global_contexts_dict and tag in global_contexts_dict:
            tag_value = global_contexts_dict[tag]
        else:
            tag_value = SPECIAL_STRUCTURES.calc(tag, asset)
        content = process_data_structure(content, tag, DataStructure.DATA_TYPES.text, tag_value)

    return content


def replace_in(collection, key, value):
    # Here we process json files

    if type(collection) is dict:
        elements = collection.items()
    elif type(collection) is list:
        elements = enumerate(collection)
    else:
        raise ValueError(f"Cannot iterate through {type(collection)}")

    for index, item in elements:
        item_type = type(item)
        if item_type in [dict, list]:
            replace_in(item, key, value)
        elif item_type is str:
            # special case if json value contains only the value - we don't treat it as a string,
            # we replace the whole thing
            if item == key:
                collection[index] = value
            elif key in item:
                collection[index] = item.replace(key, str(value))


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


def process_context_structure(asset, context, content, language,
                              version_id, preview, force_global_files, context_dict=None):
    values = DataStructure.find_actual_values(
        context.datastructure_set.all(), asset=asset, language=language, version_id=version_id, draft=preview
    )
    values = {ds.id: val for ds, val in values.items()}

    for datastructure in context.datastructure_set.all():
        # noinspection PyBroadException
        try:
            if context_dict and datastructure.name in context_dict:
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
                content = process_data_structure(content, datastructure.name, datastructure.type, content_value)

            elif content_value or datastructure.optional:
                if context.is_global and not force_global_files:
                    # do not update files from global contexts all the time
                    continue

                if not datastructure.translatable and language != asset.default_language:
                    # if file itself is not translatable - update it only for default language
                    continue

                image_storage = os.path.join('static', asset.asset_root)
                if preview:
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
                f"ERROR: Cannot process data structure {datastructure.name} for asset {asset.name}")
            logger.error(traceback.format_exc())

    return content


def save_content(filename, content):
    make_dir(filename)
    with codecs.open(filename, "w", "utf-8") as file:
        file.write(content)


def process_context(asset, context, language, skin,
                    preview, version_id, global_contexts, global_contexts_dict=None):
    context_template_text = context.template_for_language(language, asset.default_language, skin)

    # check if the file is language JSON
    if context.file_path.endswith(".json") and isinstance(context_template_text, str):
        try:
            context_template_text = json.loads(context_template_text)
        except ValueError:
            print("Failed to decode file -> " + context.file_path)

    if not context_template_text:
        context_template_text = ''
    # if context is global - process it
    content = process_context_structure(asset, context, context_template_text,
                                        language, version_id, preview, context.is_global)
    if not context.is_global:  # if current context is global - do not apply other contexts
        content = process_global_contexts(asset, content, version_id, preview,
                                          global_contexts, global_contexts_dict, language=language)

    # If json -> dump it to string
    if type(content) == dict:
        content = json.dumps(content, indent=4, separators=(',', ': '))

    return content


def read_customized_file(filename, asset, language_code=None,
                         version_id=None, preview=False):
    # 1. try to find context for this file
    skin = asset.read_global_value("%SKIN%")
    language = Language.by_code(language_code, asset.default_language)
    clean_name = filename.replace(language_code, "{{language}}") if language_code else filename
    context = Context.objects.filter(file_path=clean_name, asset_type=asset.asset_type).first()
    if context:
        # success -> return process_context
        global_contexts = Context.objects.filter(is_global=True, hidden=False, asset_type=asset.asset_type)
        return process_context(asset, context, language, skin, preview, version_id, global_contexts)

    # 2. try to find datastructure for this file
    # TODO: name is not unique
    data_structure = DataStructure.objects.filter(name=clean_name, context__asset_type=asset.asset_type).first()
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


def save_context(asset, context, context_path, language, skin,
                 preview, version_id, global_contexts, global_contexts_dict):
    content = process_context(asset, context, language, skin,
                              preview, version_id, global_contexts, global_contexts_dict)

    if context.template_for_language(language, asset.default_language, skin):  # if we have template - save context to file
        target_file_name = target_file(context_path, asset.asset_root, language.code, preview)
        # print "save file: " + target_file_name
        save_content(target_file_name, content)


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
                futures.append(executor.submit(thread_context, context, asset, languages, skin,
                                               preview, version_id, global_contexts, global_contexts_dict))

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


def thread_context(context, asset, changed_languages, skin, preview, version_id, global_contexts, global_contexts_dict):
    # update affected languages
    if context.translatable:
        for language in changed_languages:
            save_context(asset, context, context.file_path, language, skin, preview,
                         version_id, global_contexts, global_contexts_dict)
    else:
        save_context(asset, context, context.file_path, asset.default_language, skin, preview,
                     version_id, global_contexts, global_contexts_dict)


def zip_context(zip_file, asset, context, language_code,
                preview, version_id, global_contexts, add_root):
    default_language = asset.default_language
    language = Language.by_code(language_code, default_language)
    root_dir = asset.asset_root
    skin = asset.read_global_value('%SKIN%')
    if context.template_for_language(language, default_language, skin):  # if we have template - save context to file
        data = process_context(asset, context, language, skin, preview, version_id, global_contexts)
        name = context.file_path.replace("{{language}}", language_code) if language_code else context.file_path
        if add_root:
            name = os.path.join(root_dir, name)
        zip_file.writestr(name, data)
    file_structures = context.datastructure_set.filter(type__in=(DataStructure.DATA_TYPES.image,
                                                                 DataStructure.DATA_TYPES.file))
    values = {ds.id: val for ds, val in
              DataStructure.find_actual_values(file_structures, asset, language, version_id, draft=preview).items()}
    for file_structure in file_structures:
        name = file_structure.name.replace("{{language}}", language_code) if language_code else file_structure.name
        if add_root:
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


def get_zip_package(asset, preview=True, version_id=None, add_root=True, update_progress_cb=None):
    zip_data = BytesIO()
    zip_file = zipfile.ZipFile(zip_data, "a", zipfile.ZIP_DEFLATED, False)

    global_contexts = Context.objects.filter(is_global=True, asset_type=asset.asset_type)
    languages = asset.languages_list
    contexts = list(asset.asset_type.context_set.all())

    for index, context in enumerate(contexts):
        if update_progress_cb:
            update_progress_cb(index, len(contexts))
            
        errors = False
        if context.translatable:
            for language_code in languages:
                errors = zip_context(zip_file, asset, context, language_code,
                                     preview, version_id, global_contexts, add_root)
        else:
            errors = zip_context(zip_file, asset, context, None,
                                 preview, version_id, global_contexts, add_root)
        if errors:
            zip_file.close()
            raise APIInternalException(f'Error generating package. Some files are missing. Stopped at {context.name}',
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
