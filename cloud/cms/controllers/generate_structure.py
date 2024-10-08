# python script generates structure.json based on directory or archive
from collections import OrderedDict
from zipfile import ZipFile

import io
import json
import os
import re
import structlog
from PIL import Image  # get Pillow

from cms.controllers.modify_db import GUID_REGEXP
from cms.models import Context, DataStructure, AssetType
from cms.serializers import AssetTypeSerializer

logger = structlog.getLogger(__name__)

IGNORE_DIRECTORIES = ('help',)
IMAGES_EXTENSIONS = ('ico', 'png', 'bmp', 'jpg', 'jpeg')


class RecordState(object):
    deprecated = "deprecated"
    new = "new"
    same = "same"
    updated = "updated"


REC_STATE = RecordState()


def image_meta(data, extension):
    # noinspection PyBroadException
    try:
        with Image.open(io.BytesIO(data)) as img:
            width, height = img.size
        return OrderedDict([('width', width), ('height', height), ('format', extension)])
    except:
        return None


def find_context(name, file_path, structure, asset_type):
    context = next((context for context in structure["contexts"]
                   if context["name"] == name or file_path and context["file_path"] == file_path), None)
    if not context:
        db_context = Context.objects.filter(file_path=file_path, asset_type=asset_type).first()
        translatable = False
        hidden = True
        label = ""
        description = ""
        if db_context:
            name = db_context.name
            label = db_context.label
            description = db_context.description
            translatable = db_context.translatable
            hidden = db_context.hidden

        context = OrderedDict([
            ("name", name),
            ("label", label),
            ("description", description),
            ("file_path", file_path),
            ("translatable", translatable),
            ("hidden", hidden),
            ("values", [])
        ])
        structure["contexts"].append(context)
    return context


def find_structure(name, context, structure_type, asset_type, meta=None,
                   description="", value="", advanced=False, optional=False):
    data_structure = next((structure for structure in context["values"] if structure["name"] == name), None)
    if not data_structure:
        # try to populate structure from database
        # Important: here we just find any datastructure with the same name.
        # The goal is to try to get label and description from another asset
        db_structure = DataStructure.objects.filter(name=name, context__asset_type=asset_type).first()
        if not db_structure:
            db_structure = DataStructure.objects.filter(name=name).first()
        label = ""
        placeholder = ""
        protected = False
        fieldset = ""
        if db_structure:
            label = db_structure.label if db_structure.label != name else ''
            value = db_structure.default if not DataStructure.is_file_or_image(db_structure.type) else ""
            value = DataStructure.cast_value(db_structure, value)

            if db_structure.description:
                description = db_structure.description
            if db_structure.type:
                structure_type = DataStructure.DATA_TYPES[db_structure.type]
            advanced = db_structure.advanced
            optional = db_structure.optional
            protected = db_structure.protected
            placeholder = db_structure.placeholder
            fieldset = db_structure.fieldset

        data_structure = OrderedDict([
            ("label", label),
            ("name", name),
            ("value", value),
            ("description", description),
            ("placeholder", placeholder),
            ("type", structure_type),
            ("advanced", advanced),
            ("optional", optional),
            ("public", True),
            ("protected", protected),
            ("fieldset", fieldset)
        ])

        if DataStructure.get_type_by_name(structure_type) == DataStructure.DATA_TYPES.image or\
                db_structure and db_structure.is_image:
            if not meta:
                meta = {'background': 'transparent'}
            elif 'background' not in meta:
                meta['background'] = 'transparent'

        if meta:
            data_structure.update({"meta": meta})

        context["values"].append(data_structure)

    return data_structure


def read_cms_strings(data):
    pattern = re.compile(r'^(.*(%\S+?%).*)$', re.MULTILINE)
    # with open(filename, 'r') as file:
    try:
        data = data.decode('utf-8')
        return re.findall(pattern, data)
    except UnicodeDecodeError:
        return None


def templatify_json(json_data, prefix=''):
    '''
    Ok, this is weird.
    The goal of this function is to turn json object into a template:
    This function takes nested json object and flattens it: turns it into plain list, keeping values for later use
    At the same time it modifies original object to have tags inside - turns it into CMS-ready template
    Arrays are JSON-strigified in the process

    Later the parent function will parse values to determine data type for each of objects
    '''

    if type(json_data) != dict:
        raise ValueError('Arrays or plain values are not supported')

    values = {}
    tag_regex = re.compile('^%[^%]+%$')
    for key, value in json_data.items():
        if type(value) == dict:
            new_values, new_template = templatify_json(value, f"{prefix}{key}.")
            values.update(new_values)
            json_data[key] = new_template
        else:
            if type(value) == str and tag_regex.match(value):
                # it is already a tag
                new_key = value
                value = ''
            else:
                new_key = f"%{prefix}{key}%"
            values[new_key] = value
            json_data[key] = new_key
    return values, json_data


def check_if_json(data, short_name, structure, asset_type):
    if not short_name.lower().endswith('.json'):
        return False

    # here we parse json file and turn it into datastructures
    try:
        json_data = json.loads(data)
    except json.JSONDecodeError as error:
        raise json.JSONDecodeError(f'In file {short_name}: {error.msg}', error.doc, error.pos)

    if type(json_data) != dict:
        return False  # JSON files with arrays or plain values are not supported

    values, template = templatify_json(json_data)

    # Now we create context with that template
    context = find_context(short_name, short_name, structure, asset_type)

    for key, value in values.items():
        record_type = 'Text'
        advanced = False
        default_value = ''
        description = "Example: " + json.dumps(value, indent=4, separators=(',', ': '))

        # trying to parse type
        if type(value) == bool:
            record_type = 'check_box'
            default_value = value
            description = ''
        elif type(value) == int:
            record_type = 'integer'
        elif type(value) == list:
            record_type = 'array'
            advanced = True
        elif type(value) == dict:
            record_type = 'object'
            advanced = True
        elif re.match(GUID_REGEXP, value):
            record_type = 'guid'
            advanced = True

        find_structure(key, context, record_type, asset_type,
                       value=default_value, advanced=advanced, description=description)
    return True


def check_if_customizable(data, short_name, structure, asset_type):
    strings = read_cms_strings(data)
    if not strings:
        return False

    # customizable file creates new structure
    context = find_context(short_name, short_name, structure, asset_type)
    for match in strings:
        find_structure(match[1], context, 'Text', asset_type, meta={"regex": ""}, description=match[0])
    return True


def read_data(data, short_name, context, cms_structure, asset_type):
    extension = os.path.splitext(short_name)[1][1:]
    if short_name.endswith('DS_Store'):
        return
    meta = OrderedDict(format=extension)
    structure_type = 'file'
    if extension in IMAGES_EXTENSIONS:
        meta = image_meta(data, extension)
        if not meta:
            return {'file': short_name, 'extension': extension}
        structure_type = 'image'
    elif check_if_json(data, short_name, cms_structure, asset_type):
        return
    elif check_if_customizable(data, short_name, cms_structure, asset_type):
        return
    find_structure(short_name, context, structure_type, asset_type, meta=meta)


def iterate_zip(file_descriptor):
    zip_file = ZipFile(file_descriptor)
    root = ''
    for name in zip_file.namelist():
        if name.count('/') == 0:  # ignore files from the root of the archive
            logger.info("ignored_file", file_name=name)
            continue
        if name.endswith('/'):
            if not root:  # find root directory to ignore
                root = name
                continue
            yield name.replace(root, ''), None
        else:
            yield name.replace(root, ''), zip_file.read(name)


def iterate_directory(directory):
    for root, dirs, files in os.walk(directory):
        logger.info("directory_processed", directory=root.replace(directory, ''))
        yield root.replace(directory, '') + '/', None
        for filename in files:
            filename = os.path.join(root, filename)
            with open(filename, "rb") as file_descriptor:
                data = file_descriptor.read()
                logger.info("file_processed", file_name=filename.replace(directory, ''))
                yield filename.replace(directory, ''), data


def iterate_contexts(file_iterator):
    context_name = 'root'
    for name, data in file_iterator:
        if name.startswith('__'):  # Ignore trash in archive from MACs
            continue

        if name.endswith('structure.json'):  # Ignore **structure.json files
            continue

        root_dir = name.split('/')[0]
        if root_dir in IGNORE_DIRECTORIES:
            continue

        if name.endswith('/'):  # this is directory
            if name.count('/') == 1:  # top level directory - update active_context
                context_name = root_dir
            continue  # ignore directories

        if name.count('/') == 0:  # file from top level directory - update active_context
            context_name = 'root'

        yield name, context_name, data


def get_object_by_name(name, objects):
    return next((obj for obj in objects if name == obj["name"]), None)


def list_to_dict(obj, key):
    return {o[key]: o for o in obj}


def merge_object(obj1, obj2, obj_join, state=REC_STATE.same, parent_key=""):
    for key in obj1:
        if key == "status":
            continue

        if key not in obj2:
            state = REC_STATE.updated
            del obj_join[key]
            continue

        if type(obj1[key]) is dict:
            state = merge_object(obj1[key], obj2[key], obj_join[key], state, key)

        elif obj1[key] != obj2[key]:
            if key == "value" and DataStructure.is_file_or_image(obj1["type"]):
                continue
            obj_join[key] = obj2[key]
            state = REC_STATE.updated

    for key in obj2:
        if key == "status":
            continue

        if key not in obj1:
            if key == "value" and DataStructure.is_file_or_image(obj2["type"]):
                continue
            obj_join[key] = obj2[key]
            state = REC_STATE.updated

    if parent_key != "meta":
        obj_join["status"] = state

    return state


def merge_context(base_context, new_context):
    merged_data_structures = base_context["values"]
    base_data_structures = list_to_dict(base_context["values"], "name")
    new_data_structures = list_to_dict(new_context["values"], "name")

    for key, base_ds in base_data_structures.items():
        # check and update matching data structures
        if key in new_data_structures:
            merge_ds = get_object_by_name(key, merged_data_structures)
            merge_object(base_ds, new_data_structures[key], merge_ds)

        else:
            ds = get_object_by_name(key, merged_data_structures)
            ds["status"] = REC_STATE.deprecated

    for key, new_ds in new_data_structures.items():
        if key not in base_data_structures:
            new_ds["status"] = REC_STATE.new
            merged_data_structures.append(new_ds)

    return merged_data_structures


def merge_structure(base_structure, new_structure):
    merged_structure = base_structure
    base_contexts = list_to_dict(base_structure["contexts"], "name")
    new_contexts = list_to_dict(new_structure["contexts"], "name")

    for key, base_context in base_contexts.items():
        # Update base
        context = get_object_by_name(key, merged_structure["contexts"])
        if key in new_contexts:
            context["values"] = merge_context(base_context, new_contexts[key])

            status = {ds["status"] for ds in context["values"]}
            context["status"] = next(iter(status)) if len(status) < 2 else REC_STATE.updated
        else:
            set_data_structure_state(context["values"], REC_STATE.deprecated)
            context["status"] = REC_STATE.deprecated

    for key, new_context in new_contexts.items():
        if key not in base_contexts:
            set_data_structure_state(new_context["values"], REC_STATE.new)
            new_context["status"] = REC_STATE.new
            merged_structure["contexts"].append(new_context)

    return merged_structure


def process_files(file_iterator, asset):
    log_errors = []
    structure = OrderedDict([('asset', asset.name),
                             ('type', AssetType.ASSET_TYPES[asset.asset_type.type]),
                             ('single_customization', asset.asset_type.single_customization),
                             ('can_preview', asset.asset_type.can_preview),
                             ('contexts', [])])
    find_context('root', '.', structure, asset.asset_type)
    for short_name, context_name, data in iterate_contexts(file_iterator):
        if "._" in short_name:
            continue
        context = find_context(context_name, context_name, structure, asset.asset_type)
        error = read_data(data, short_name, context, structure, asset.asset_type)
        if error:
            log_errors.append(error)
    return [structure], log_errors


def from_database(asset, use_actual_values=False, draft=False):
    return [AssetTypeSerializer(asset.asset_type, use_actual_values=use_actual_values,
                                asset=asset, lang=asset.default_language, draft=draft).data]


def from_directory(directory, asset):
    return process_files(iterate_directory(directory), asset)


def from_zip(file_descriptor, asset):
    return process_files(iterate_zip(file_descriptor), asset)


def merge_db_with_archive(file_descriptor, asset):
    db_structure = from_database(asset, use_actual_values=False)[0]
    archive_structure = from_zip(file_descriptor, asset)[0][0]
    return merge_structure(db_structure, archive_structure)


def set_data_structure_state(data_structures, state):
    for ds in data_structures:
        ds["state"] = state
