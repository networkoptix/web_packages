import base64
import json
import codecs
import os
import re

from zipfile import ZipFile

from ..controllers.generate_structure import templatify_json
from ..models import Context, ContextTemplate, DataStructure, DataRecord, Product, ProductType

import logging
logger = logging.getLogger(__name__)


def deprecate_contexts_and_data_structures_for_product_type(product_type):
    Context.objects.filter(product_type=product_type).update(deprecated=True)
    DataStructure.objects.filter(context__product_type=product_type).update(deprecated=True)


def find_or_add_product_type(product_type_type, name="", single_customization=True):
    product_type, created = ProductType.objects.get_or_create(name=name, type=product_type_type)
    if created:
        product_type.single_customization = single_customization
        product_type.save()
    return product_type


def find_or_add_product_with_single_customization(name, customization, product_type_type, product_type_name):
    product_type = find_or_add_product_type(ProductType.get_type_by_name(product_type_type), product_type_name)
    if not product_type.single_customization:
        raise ValueError("Product type must be single customization for this function.")

    product = Product.objects.filter(customizations__in=[customization], product_type=product_type).first()
    if not product:
        product = Product.objects.create(name=name, product_type=product_type)

    product.customizations.set([customization])
    return product


def find_or_add_context(context_name, old_name, product_type, has_language, is_global):
    if old_name:
        context = Context.objects.filter(name=old_name, product_type=product_type).first()
        if context:
            context.name = context_name
            context.save()
            return context

    context = Context.objects.filter(name=context_name, product_type=product_type).first()
    if not context:
        context = Context(name=context_name, file_path=context_name, product_type=product_type,
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


def update_from_object(product_type_structure, product_type=None, preserve_files=False):
    if type(product_type_structure) is list:
        product_type_structure = product_type_structure[0]
    update_product_type(product_type, product_type_structure)

    order = 0
    context_order = 0
    deprecate_contexts_and_data_structures_for_product_type(product_type)

    for context_data in product_type_structure['contexts']:
        context = update_context(context_data, product_type, context_order)
        context_order += 1
        has_language = context.translatable
        for record in context_data["values"]:
            update_data_structure(context.id, has_language, record, order, preserve_files)
            order += 1


def read_structure_json(filename):
    with codecs.open(filename, 'r', 'utf-8') as file_descriptor:
        cms_structure = json.load(file_descriptor)
        for product_type_structure in cms_structure:
            product_type_type = ProductType.get_type_by_name(product_type_structure["type"])
            product_type = find_or_add_product_type(product_type_type)
            update_from_object(product_type_structure, product_type)


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


def process_zip(file_descriptor, user, product, update_structure, update_content):
    log_messages = []
    zip_file = ZipFile(file_descriptor)
    # zipfile.namelist()
    root = zip_file.namelist()[0]
    structures_changed = 0
    records_created = 0
    product_type = product.product_type

    if update_structure:
        name = next((name for name in zip_file.namelist() if name.endswith('structure.json')), None)
        if name:
            data = zip_file.read(name)
            cms_structure = json.loads(data)
            if type(cms_structure) == list and len(cms_structure) > 1:
                log_messages.append(('warning', 'You can only update one product_type at a time. '
                                                'Only the first product type from structure.json was used.'))
            update_from_object(cms_structure, product.product_type)
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
        context = Context.objects.filter(file_path=name, product_type=product_type).first()
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
                    pass

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
                context_template_lines = context_template.template.split("\n")

                # normalise json file
                # here is the problem: we parse json as text file to extract values, which might be not the best
                # course of action, but it lets us parse any tags, not only json-name-based
                if name.endswith('json'):
                    file_content = json.dumps(json.loads(file_content), indent=4, separators=(',', ': '))

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

                    if structure.type != structure.DATA_TYPES.html:
                        template_line += "$"

                    # try to parse file_content with regex
                    result = re.search(template_line, file_content, re.MULTILINE)
                    if not result:
                        log_messages.append(('warning', f'No line in file {name} for data structure {structure.name}'))
                        continue

                    # if there is a value - compare it with latest draft
                    value = result.group(1)
                    current_value = structure.find_actual_value(product, draft=True)
                    if value == current_value:
                        continue

                    records_created += 1

                    # save if needed
                    record = DataRecord(product=product,
                                        data_structure=structure,
                                        value=value,
                                        created_by=user)
                    record.save()
            continue

        # try to find relevant data structure and update its default (maybe)
        structure = DataStructure.objects.filter(name=name, context__product_type=product_type).first()
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
                structure.default = data64
                structures_changed += 1
                structure.save()

        if update_content:
            # get latest value
            latest_value = structure.find_actual_value(product, draft=True)
            # check if file was changed
            if latest_value == data64:
                continue
            records_created += 1

            # add new dataRecrod
            record = DataRecord(
                product=product,
                data_structure=structure,
                value=data64,
                created_by=user
            )
            record.save()

    log_messages.append(('success', f'Data Structures updated: {structures_changed}\t '
                                    f'Records created: {records_created}'))
    log_messages.append(('success', 'Finished'))
    return log_messages


def update_context(context_data, product_type, order):
    has_language = context_data.get("translatable", False)
    is_global = context_data.get("is_global", False)
    old_name = context_data.get("old_name", None)
    context = find_or_add_context(
        context_data["name"], old_name, product_type, has_language, is_global)

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


def update_data_structure(context_id, has_lang, record, order, preserve_file=False):
    name = record['name']
    label = record.get("label", "")
    old_name = record.get("old_name", None)

    data_structure = find_or_add_data_structure(name, old_name, context_id, has_lang)
    data_structure.label = label
    data_structure.order = order
    data_structure.advanced = record.get("advanced", False)
    data_structure.optional = record.get("optional", False)
    data_structure.public = record.get("public", True)
    data_structure.protected = record.get("protected", False)
    data_structure.description = record.get("description", "")
    data_structure.placeholder = record.get("placeholder", "")
    data_structure.type = DataStructure.get_type_by_name(record.get("type", "text"))

    data_structure.meta_settings = record.get("meta", {})
    if not preserve_file or not DataStructure.is_file_or_image(data_structure.type):
        data_structure.default = process_data_structure_type(data_structure, name, record.get("value", ""))
    data_structure.deprecated = False
    data_structure.save()


def update_product_type(product_type, product_type_structure):
    product_type.can_preview = product_type_structure.get("can_preview", False)
    product_type.single_customization = product_type_structure.get('single_customization', False)
    product_type.save()
