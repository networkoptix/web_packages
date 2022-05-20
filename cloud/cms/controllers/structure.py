import base64
from io import BytesIO
import glob
import json
import logging
import os
import re
import requests
import uuid
from zipfile import ZipFile

from django.conf import settings
from django.core.files.base import ContentFile

from cms.controllers.documentation import DOC_CACHE
from cms.controllers.generate_structure import templatify_json
from cms.controllers.modify_db import save_unrevisioned_records, send_version_for_review, update_draft_state
from cms.models import Context, ContextTemplate, DataStructure, DataRecord, Asset, AssetType, MenuNode, Customization, \
    Menu, AssetCustomizationReview, Permission
from util.helpers import substitute_branding

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


def find_or_add_data_structure(name, old_name, context, has_language):
    if old_name:
        data_structure = DataStructure.objects.filter(name=old_name, context_id=context.id).first()
        if data_structure:
            data_structure.name = name
            data_structure.save()
            return data_structure

    data_structure = DataStructure.objects.filter(name=name, context_id=context.id).first()
    if not data_structure and context.is_global:
        data_structure = DataStructure.objects.filter(
            name=name, context__is_global=True, context__asset_type=context.asset_type
        ).first()
        if data_structure:
            data_structure.context = context
            data_structure.save()
    if not data_structure:
        data_structure = DataStructure(name=name, context=context, translatable=has_language, default=name)
        data_structure.save()
    return data_structure


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


def merge_structures(existing, new):
    if 'contexts' not in existing and 'contexts' in new:
        existing['contexts'] = []
    existing['contexts'] += new['contexts']

    # Handle remaining values
    for key, val in new.items():
        if key not in existing:
            existing[key] = val


def read_structure_files():
    cms_structure = []
    for filename in glob.glob('cms/structures/*_structure.json'):
        with open(filename, 'r', encoding='utf-8') as file_descriptor:
            new_struct = json.load(file_descriptor)
            existing_struct = next((struct for struct in cms_structure if struct['type'] == new_struct['type']), None)
            if existing_struct:
                merge_structures(existing_struct, new_struct)
            else:
                cms_structure.append(new_struct)

    return cms_structure


def read_structure_json():
    cms_structure = read_structure_files()
    for asset_type_structure in cms_structure:
        asset_type_type = AssetType.get_type_by_name(asset_type_structure["type"])
        asset_type = find_or_add_asset_type(asset_type_type)
        update_from_object(asset_type_structure, asset_type)


def process_node(node_obj, node_struct):
    if not node_obj.touched:
        node_obj.name = node_struct.get('name', '')
        node_obj.subtitle = node_struct.get('subtitle', '')
        node_obj.url = node_struct.get('url', '')
        node_obj.new_window = node_struct.get('new_window', False)
        node_obj.condition = node_struct.get('condition', '')
        node_obj.authentication = MenuNode.AUTH_CHOICES.__getattr__(node_struct.get('authentication', 'both'))
        node_obj.icon = node_struct.get('icon', '')
        if node_struct.get('asset', False) and not node_obj.asset:
            asset_type = AssetType.objects.filter(
                type=AssetType.ASSET_TYPES.__getattr__(node_struct.get('asset_type', 'documentation')), name=''
            ).order_by('pk').first()
            asset = Asset.objects.create(name=node_obj.name, asset_type=asset_type)
            asset.customizations.set(Customization.objects.all())
            node_obj.asset = asset
        node_obj.save(touched=False)
        node_obj.permissions.set(list(Permission.objects.filter(codename__in=node_struct.get('permissions', []))))

        enabled = node_struct.get('enabled', False)
        if node_obj.is_global:
            if type(enabled) is list:
                customizations = Customization.objects.filter(name__in=enabled)
            elif enabled is True:
                customizations = Customization.objects.all()
            else:
                customizations = []

            if node_obj.asset:
                node_obj.asset.customizations.set(customizations)
            else:
                node_obj.enabled.set(customizations)

    for inner_node_structure in node_struct.get('nodes', []):
        inner_node_obj = node_obj.nodes.filter(name=inner_node_structure['name']).first()
        if not inner_node_obj:
            last_node = node_obj.nodes.order_by('id').last()
            inner_node_obj = MenuNode(parent_node=node_obj, is_global=True, order=last_node.order + 1 if last_node else 0)
        process_node(inner_node_obj, inner_node_structure)


def read_menu_structure(filename):
    with open(filename, 'r', encoding='utf-8') as file_descriptor:
        menu_structure = json.load(file_descriptor)
        for menu in menu_structure:
            menu_obj = Menu.objects.filter(name=menu['name']).first()
            if not menu_obj:
                menu_obj = Menu(name=menu['name'], depth=menu['depth'])
            else:
                menu_obj.depth = max(menu_obj.depth, menu['depth'])
            menu_obj.save()

            for node_structure in menu.get('nodes', []):
                node_obj = menu_obj.nodes.filter(name=node_structure['name']).first()
                if not node_obj:
                    last_node = menu_obj.nodes.order_by('id').last()
                    node_obj = MenuNode(parent_menu=menu_obj, is_global=True, order=last_node.order + 1 if last_node else 0)
                process_node(node_obj, node_structure)
    Menu.clear_all_customizations_cache()


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
    root = None
    first_file = zip_file.namelist()[0]
    if zip_file.getinfo(first_file).is_dir():
        root = first_file
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
        context = Context.objects.filter(
            file_path=name, asset_type=asset_type
        ).prefetch_related('datastructure_set').first()
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

                current_values = DataStructure.find_actual_values(context.datastructure_set.all(), asset, draft=True)
                current_values = {ds.id: val for ds, val in current_values.items()}
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
                    current_value = current_values[structure.id]
                    if value == current_value:
                        continue

                    records_created += 1

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
            if structure.placeholder != data64:
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

            # add new dataRecord
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

    data_structure = find_or_add_data_structure(name, old_name, context, has_lang)
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
    data_structure.fieldset = record.get("fieldset", "")
    data_structure.type = DataStructure.get_type_by_name(record.get("type", "text"))

    data_structure.meta_settings = record.get("meta", {})
    if not preserve_file or not DataStructure.is_file_or_image(data_structure.type):
        value = process_data_structure_type(data_structure, name, record.get("value", ""))
        data_structure.default = value
    data_structure.deprecated = False
    data_structure.save()


def update_asset_type(asset_type, asset_type_structure):
    asset_type.can_preview = asset_type_structure.get("can_preview", False)
    asset_type.single_customization = asset_type_structure.get('single_customization', False)
    asset_type.save()


def external_file_to_content_file(url, branding={}):
    request_url = substitute_branding(branding, url) if branding else url

    if request_url.startswith('//'):
        request_url = f'https:{request_url}'

    file_request = requests.get(request_url.replace('\\', ''))
    file_content = file_request.content
    content_type = file_request.headers.get('Content-Type', 'image/png')
    filename = request_url.split('/')[-1]
    content_file = ContentFile(file_content, name=filename)
    content_file.content_type = content_type
    return content_file


def generate_kb_path_from_var(article_dict, asset):
    base_path = article_dict['base']
    kb_path = article_dict['kb']
    uuid = article_dict['asset_uuid']
    name = article_dict['asset_name']
    param_name = article_dict['param_name']
    if param_name and not param_name.startswith('-'):
        param_name = '-' + param_name
    existing = asset, False
    asset, created = existing if str(asset.uuid) == uuid else Asset.objects.get_or_create(uuid=uuid)
    doc_asset_type = AssetType.get_model_by_type(AssetType.ASSET_TYPES.documentation)

    if created:
        asset.name = name
        asset.asset_type = doc_asset_type
        asset.save()
    elif asset.asset_type != doc_asset_type:
        raise ValueError(f'Asset already exists with asset type {asset.asset_type} but is being used as a doc link which requires asset type {doc_asset_type}')

    return f'{base_path}/{kb_path}/{asset.id}{param_name}'


def sub_vars(asset):
    def sub_handler(match_obj):
        var_dict = json.loads(match_obj.group(1))
        if var_dict.get('type', '') == 'kb_article':
            return generate_kb_path_from_var(var_dict, asset)
    return sub_handler


def update_asset_by_json(asset, asset_json, user):
    errors = False
    def sub_image_sources(match_obj):
        file_id = str(uuid.uuid4())
        files[file_id] = external_file_to_content_file(match_obj[2])
        return f'{match_obj[0]}src="{{image_import:{file_id}}}"'

    asset_type = asset.asset_type
    for context in asset_json["contexts"]:
        try:
            context_model = Context.objects.get(asset_type=asset_type, name=context["name"])
        except Context.DoesNotExist:
            # Skips updating if invalid context for asset_type
            continue

        data_records = {}
        files = {}
        for ds in context["values"]:
            ds_obj = context_model.datastructure_set.filter(name=ds['name']).first()
            if ds_obj:
                ds_type = DataStructure.get_type_by_name(ds['type'])
                if ds_type not in [DataStructure.DATA_TYPES.file,
                                   DataStructure.DATA_TYPES.image]:
                    if ds_type in [DataStructure.DATA_TYPES.external_image, DataStructure.DATA_TYPES.external_file] and ds['value']:
                        files[ds['name']] = external_file_to_content_file(ds['value'])
                    elif ds_type == DataStructure.DATA_TYPES.html:
                        if ds_obj.meta_settings.get('upload_data_images', False):
                            ds["value"] = re.sub(r'(<img [^>]*?src=")([^%].*?)"', sub_image_sources, ds["value"])
                        ds["value"] = re.sub(r'{%(.*?)%}', sub_vars(asset), ds["value"])
                    data_records[ds["name"]] = ds["value"]
        if save_unrevisioned_records(asset, context_model, None, context_model.datastructure_set.all(), data_records, files, user):
            errors = True
    return errors


def import_assets_from_json(assets_list, user, publish=False, increment_progress=None):
    for asset_dict in assets_list:
        asset_type = AssetType.get_model_by_type(AssetType.get_type_by_name(asset_dict['type']))
        asset_obj = Asset.objects.filter(uuid=asset_dict['uuid']).first()
        if not asset_obj:
            asset_obj = Asset.objects.create(name=asset_dict['name'], uuid=asset_dict['uuid'], asset_type=asset_type)
        elif not asset_obj.last_modified:
            asset_obj.asset_type = asset_type
        elif increment_progress and str(asset_obj.asset_type) != str(asset_type):
            increment_progress(
                f'Failed to import <b>"{asset_dict["name"]}"</b>, asset already exist as type <b>"{asset_obj.asset_type}"</b> but is being imported as <b>"{asset_type}"</b>')
            continue
        asset_obj.customizations.set(list(Customization.objects.filter(name__in=asset_dict['customizations'])))
        asset_obj.name = asset_dict['name']
        try:
            asset_obj.save()
            errors = update_asset_by_json(asset_obj, asset_dict, user)
        except Exception as e:
            # Fallback in case some exception occurs and is not caught during save or update.
            # If an exception is ever caught here we should add better handling for it in update_asset_by_json or asset.save
            increment_progress(f'Failed to import <b>"{asset_obj.name}"</b>: {str(e)}')
            continue

        if publish and asset_obj.is_dirty and not errors:
            published = False
            # Send for review
            send_version_for_review(asset_obj, user, notify=False)
            asset_obj.change_preview_status(Asset.PREVIEW_STATUS.review)

            # Accept review
            for customization in asset_obj.customizations.all():
                review = AssetCustomizationReview.objects.filter(version__asset=asset_obj, customization=customization).last()
                if review:
                    published = True
                    update_draft_state(review.id, AssetCustomizationReview.REVIEW_STATES.accepted, user)
            if asset_obj.is_documentation and published:
                DOC_CACHE.clear_cache()
        if increment_progress:
            increment_progress()


def check_asset_conflicts(assets_list):
    assets_dict = {asset.get('uuid'): asset for asset in assets_list}
    asset_obj_list = Asset.objects.filter(uuid__in=dict.keys(assets_dict))
    return [f"Existing asset <b>\"{asset.name}\"</b> name conflicts with imported asset <b>\"{assets_dict[str(asset.uuid)]['name']}\"</b>. <b class=\"help\">(UUID: {asset.uuid})</b> " for asset in asset_obj_list if assets_dict[str(asset.uuid)]['name'] != asset.name]
