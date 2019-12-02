import base64
import json
import codecs
import os
import re

from zipfile import ZipFile

from ..controllers.generate_structure import templatify_json
from ..models import Context, ContextTemplate, DataStructure, DataRecord, Asset, AssetType

import logging
logger = logging.getLogger(__name__)


def deprecate_contexts_and_data_structures_for_asset_type(asset_type):
    Context.objects.filter(asset_type=asset_type).update(deprecated=True)
    DataStructure.objects.filter(context__asset_type=asset_type).update(deprecated=True)


def find_or_add_asset_type(asset_type_type, name="", single_customization=True):
    asset_type, created = AssetType.objects.get_or_create(name=name, type=asset_type_type)
    if created:
        asset_type.single_customization = single_customization
        asset_type.save()
    return asset_type


def find_or_add_asset_with_single_customization(name, customization, asset_type_type, asset_type_name):
    asset_type = find_or_add_asset_type(AssetType.get_type_by_name(asset_type_type), asset_type_name)
    if not asset_type.single_customization:
        raise ValueError("Asset type must be single customization for this function.")

    asset = Asset.objects.filter(customizations__in=[customization], asset_type=asset_type).first()
    if not asset:
        asset = Asset.objects.create(name=name, asset_type=asset_type)

    asset.customizations.set([customization])
    return asset


def find_or_add_context(context_name, old_name, asset_type, has_language, is_global):
    if old_name:
        context = Context.objects.filter(name=old_name, asset_type=asset_type).first()
        if context:
            context.name = context_name
            context.save()
            return context

    context = Context.objects.filter(name=context_name, asset_type=asset_type).first()
    if not context:
        context = Context(name=context_name, file_path=context_name, asset_type=asset_type,
                          translatable=has_language, is_global=is_global)
        context.save()
    return context


def find_or_add_data_structure(name, old_name, context_id, has_language):
    if old_name:
        record = DataStructure.objects.filter(name=old_name, context_id=context_id).first()
        if record:
            record.name = name
            record.save()
            return record

    data = DataStructure.objects.filter(name=name, context_id=context_id).first()
    if not data:
        data = DataStructure(name=name, context_id=context_id,
                             translatable=has_language, default=name)
        data.save()
    return data


def update_from_object(asset_type_structure, asset_type=None, preserve_files=False):
    if type(asset_type_structure) is list:
        asset_type_structure = asset_type_structure[0]
    update_asset_type(asset_type, asset_type_structure)

    order = 0
    context_order = 0
    deprecate_contexts_and_data_structures_for_asset_type(asset_type)

    for context_data in asset_type_structure['contexts']:
        context = update_context(context_data, asset_type, context_order)
        context_order += 1
        has_language = context.translatable
        for record in context_data["values"]:
            update_data_structure(context, has_language, record, order, preserve_files)
            order += 1


def read_structure_json(filename):
    with codecs.open(filename, 'r', 'utf-8') as file_descriptor:
        cms_structure = json.load(file_descriptor)
        for asset_type_structure in cms_structure:
            asset_type_type = AssetType.get_type_by_name(asset_type_structure["type"])
            asset_type = find_or_add_asset_type(asset_type_type)
            update_from_object(asset_type_structure, asset_type)


def process_data_structure_type(data_structure, name, value):
    if data_structure.type == DataStructure.DATA_TYPES.image:
        data_structure.translatable = "{{language}}" in name

        # this is used to convert source images into b64 strings
        file_path = os.path.join('static', '_source', 'blue', name)
        file_path = file_path.replace("{{language}}", 'en_US')
        try:
            with open(file_path, 'rb') as file:
                value = base64.b64encode(file.read()).decode('utf-8')
        except IOError:
            pass

    # Checkboxes should always be optional otherwise they can initially be false but will always be true
    # if modified.
    elif data_structure.type == DataStructure.DATA_TYPES.check_box:
        data_structure.optional = True

    elif data_structure.type in [DataStructure.DATA_TYPES.object, DataStructure.DATA_TYPES.array,
                                 DataStructure.DATA_TYPES.multiselect]:
        value = json.dumps(value, indent=4, separators=(',', ': '))

    return value


def process_zip(file_descriptor, user, asset, update_structure, update_content):
    log_messages = []
    zip_file = ZipFile(file_descriptor)
    # zipfile.namelist()
    root = zip_file.namelist()[0]
    structures_changed = 0
    records_created = 0
    asset_type = asset.asset_type

    if update_structure:
        name = next((name for name in zip_file.namelist() if name.endswith('structure.json')), None)
        if name:
            data = zip_file.read(name)
            cms_structure = json.loads(data)
            if type(cms_structure) == list and len(cms_structure) > 1:
                log_messages.append(('warning', 'You can only update one asset_type at a time. '
                                                'Only the first asset type from structure.json was used.'))
            update_from_object(cms_structure, asset.asset_type)
            log_messages.append(('success', f'Updated from json using {name}'))
        else:
            log_messages.append(('warning', 'Not found structure.json file'))

    for name in zip_file.namelist():
        # Skip of directories
        if zip_file.getinfo(name).is_dir():
            continue

        if name.startswith('__') or name.endswith('structure.json') or '._' in name:
            # Ignore trash in archive from MACs or **structure.json files
            if not name.startswith('__MAC'):
                log_messages.append(('info', 'Ignored: %s' % name))
            continue

        if name.startswith('help/'):  # Ignore help
            if name == 'help/':
                log_messages.append(('info', f'Ignored: {name} (help directory is ignored)'))
            continue

        zip_name = name
        if root:
            name = name.replace(root, "")

        # try to find relevant context
        context = Context.objects.filter(file_path=name, asset_type=asset_type).first()
        if context:
            try:
                file_content = zip_file.read(zip_name).decode("utf-8")
            except UnicodeDecodeError:
                log_messages.append(('error', f'Ignored:  {name} (file is not UTF-encoded)'))
                continue

            if update_structure:
                # Here we assume that there is only one template here
                if name.endswith('json'):
                    # JSON file
                    values, template = templatify_json(json.loads(file_content))
                    file_content = json.dumps(template, indent=4, separators=(',', ': '))

                context_template = context.contexttemplate_set.first()
                if not context_template:
                    context_template = ContextTemplate(context=context)

                if context_template.template != file_content:
                    context_template.template = file_content
                    context_template.save()
                    log_messages.append(('success', 'Updated template for context %s using %s' % (context.name, name)))

            if update_content:
                # try to parse datastructures from the file using template
                if not context.contexttemplate_set.exists():  # no template - nothing we can do
                    log_messages.append(('error', f'Ignored: {name} (context has no template)'))
                    continue
                # here we have template for context and file_content - which are relatively close.
                # Ideally, the only difference is specific data values

                context_template = context.contexttemplate_set.first()
                if context_template:
                    context_template = context_template.template
                else:
                    log_messages.append(('error', f'Template does not exist for context {context.name}'))
                    continue

                """
                    1. Load file content as json so we can use it for finding the correct value for duplicate nested
                       keys.
                    2. Using the normalized template and content files we can verify that structure exist in both files.
                """
                file_json = None
                if name.endswith('json'):
                    file_json = json.loads(file_content)
                    file_content = json.dumps(file_json, indent=4, separators=(',', ': '))
                    context_template = json.dumps(json.loads(context_template), indent=4, separators=(',', ': '))

                context_template_lines = context_template.split("\n")

                for structure in context.datastructure_set.all():
                    if DataStructure.is_file_or_image(structure.type):
                        continue

                    # find a line in template which has structure.name in it
                    template_line = next((line for line in context_template_lines if structure.name in line), None)

                    if not template_line:
                        log_messages.append(('warning', f'No line in template {name}'
                                            f' for data structure {structure.name}'))
                        continue

                    replace_str = '(.*?)' if structure.type != structure.DATA_TYPES.html else '([.\s\S]*)'
                    # create regex using this line
                    template_line = re.escape(template_line)
                    escape_name = re.escape(structure.name)
                    template_line = template_line.replace(escape_name, replace_str)
                    structure_is_str = DataStructure.is_string(structure.type)

                    # Non string structures do not have the " so we need to remove them to get the value.
                    if not structure_is_str:
                        template_line = template_line.replace('"(', '(').replace(')"', ')')

                    # Multiselect needs special treatment because regex cannot catch multiple lines.
                    if structure.type == structure.DATA_TYPES.multiselect:
                        template_line += "?"
                    if structure.type != structure.DATA_TYPES.html:
                        template_line += "$"

                    # 3. Get all matches for a key. We dont care about how far its nested.
                    results = re.findall(template_line, file_content, re.MULTILINE)
                    if not len(results):
                        log_messages.append(('warning', f'No line in file {name} for data structure {structure.name}, '
                                                        f'template: {template_line}'))
                        continue

                    value = results[0]
                    # If our context is a json and we got multiple results we need to find its true value.
                    # If its a multiselect we try to find the value anyways.
                    if file_json and len(results) > 1 or structure.type == structure.DATA_TYPES.multiselect:
                        # We need a temporary copy so that we can keep moving through a nested dictionary which has an
                        # unknown depth.
                        tmp_dict = file_json
                        """
                            Split up the structure name and use it as keys.
                            1. Remove the % from the start and end.
                            2. Split the string by . to get all of the keys.
                            
                            Ex: %mobile.ios.bundleIdentifier% -> ['mobile', 'ios', 'bundleIdentifier']
                            1. %mobile.ios.bundleIdentifier% -> mobile.ios.bundleIdentifier
                            2. mobile.ios.bundleIdentifier -> ['mobile', 'ios', 'bundleIdentifier']
                        """
                        keys = escape_name.strip('%').split('\\.')
                        for key in keys:
                            if key not in tmp_dict:
                                break
                            tmp_dict = tmp_dict[key]
                        else:
                            # If all of the keys are found then tmp_dict has our value
                            value = tmp_dict
                    # Value is a str and needs to be cast the correct type.
                    elif not structure_is_str:
                        value = json.loads(value)

                    # if there is a value - compare it with latest draft
                    current_value = structure.find_actual_value(asset, draft=True)
                    if value == current_value:
                        continue

                    records_created += 1

                    if structure.type == structure.DATA_TYPES.multiselect:
                        value = json.dumps(value)

                    # save if needed
                    record = DataRecord(asset=asset,
                                        data_structure=structure,
                                        value=value,
                                        created_by=user)
                    record.save()
            continue

        # try to find relevant data structure and update its default (maybe)
        structure = DataStructure.objects.filter(name=name, context__asset_type=asset_type).first()
        if not structure:
            log_messages.append(('warning', f'Ignored: {name} (data structure {name} does not exist)'))
            continue

        # if data structure is not FILE or IMAGE - print to log and ignore
        if not DataStructure.is_file_or_image(structure.type):
            log_messages.append(('warning', f'Ignored: {name} (data structure type is {structure.type}'
                                f', not a {DataStructure.DATA_TYPES.image} or {DataStructure.DATA_TYPES.file})'))
            continue

        data = zip_file.read(zip_name)
        data64 = base64.b64encode(data).decode('utf-8')
        # logger.info(f"Name: {name}\tContext: {structure.context.name}\n\n")
        if update_structure:
            # if set_defaults or data structure has no default value - save it
            if structure.default != data64:
                structure.placeholder = data64
                structures_changed += 1
                structure.save()

        if update_content:
            # get latest value
            latest_value = structure.find_actual_value(asset, draft=True)
            # check if file was changed
            if latest_value == data64:
                continue
            records_created += 1

            # add new dataRecrod
            record = DataRecord(
                asset=asset,
                data_structure=structure,
                value=data64,
                created_by=user
            )
            record.save()

    log_messages.append(('success', f'Data Structures updated: {structures_changed}\t '
                                    f'Records created: {records_created}'))
    log_messages.append(('success', 'Finished'))
    return log_messages


def update_context(context_data, asset_type, order):
    has_language = context_data.get("translatable", False)
    is_global = context_data.get("is_global", False)
    old_name = context_data.get("old_name", None)
    context = find_or_add_context(
        context_data["name"], old_name, asset_type, has_language, is_global)

    context.is_global = is_global
    context.translatable = has_language
    context.description = context_data.get("description", "")
    context.file_path = context_data.get("file_path", "")
    context.url = context_data.get("url", "")
    context.label = context_data.get("label", "")
    context.hidden = context_data.get("hidden", False)
    context.order = order
    context.deprecated = False
    context.save()
    return context


def update_data_structure(context, has_lang, record, order, preserve_file=False):
    name = record['name']
    label = record.get("label", "")
    old_name = record.get("old_name", None)

    data_structure = find_or_add_data_structure(name, old_name, context.id, has_lang)
    data_structure.label = label
    data_structure.order = order
    data_structure.advanced = record.get("advanced", False)
    data_structure.optional = record.get("optional", False)
    data_structure.public = record.get("public", True)
    data_structure.protected = record.get("protected", False)
    data_structure.translatable = record.get("translatable", context.translatable)
    data_structure.unique = record.get("unique", False)
    data_structure.description = record.get("description", "")
    data_structure.placeholder = record.get("placeholder", "")
    data_structure.type = DataStructure.get_type_by_name(record.get("type", "text"))

    data_structure.meta_settings = record.get("meta", {})
    if not preserve_file or not DataStructure.is_file_or_image(data_structure.type):
        data_structure.default = process_data_structure_type(data_structure, name, record.get("value", ""))
    data_structure.deprecated = False
    data_structure.save()


def update_asset_type(asset_type, asset_type_structure):
    asset_type.can_preview = asset_type_structure.get("can_preview", False)
    asset_type.single_customization = asset_type_structure.get('single_customization', False)
    asset_type.save()
