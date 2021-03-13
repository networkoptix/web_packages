import json

import pystache

from cms.forms import convert_meta_to_description
from cms.models import DataStructure

ATTRIBUTE_KEYS = ["optional", "advanced", "public"]


def get_data_type_nice_name(data_type):
    return DataStructure.DATA_TYPES[DataStructure.get_type_by_name(data_type)]


def set_data_structure_attributes(data_structure):
    attributes = []

    for key in ATTRIBUTE_KEYS:
        if key == "advanced" and data_structure.get(key):
            attributes.append(key.capitalize())
        if key == "optional" and not data_structure.get(key, False):
            attributes.append(f'<span style="color: red">{"required".capitalize()}</span>')
        if key == "public" and not data_structure.get(key, True):
            attributes.append("private".capitalize())

    return ", ".join([f"<b>{attribute}</b>" for attribute in attributes])


def process_data_structure(data_structure):
    br = "<br>"
    data_structure["nice_meta"] = set_data_structure_attributes(data_structure)

    if "meta" in data_structure:
        meta = convert_meta_to_description(data_structure["meta"])
        meta = ", ".join(meta.replace(br, "", 1).split(br))
        data_structure["nice_meta"] += f"{br}{meta}"

        if "options" in data_structure["meta"]:
            options = [option.get('label') or option for option in data_structure["meta"]["options"]]
            data_structure["nice_meta"] += f'Options:&nbsp;{", ".join(options)}&nbsp;&nbsp;&nbsp;'

        if data_structure["nice_meta"].find('<br>') == 0:
            data_structure["nice_meta"] = data_structure["nice_meta"].replace(br, "", 1)

    if "value" in data_structure and type(data_structure["value"]) in [list, dict]:
        data_structure["value"] = f'<pre>{json.dumps(data_structure["value"], indent=4, separators=(",", ": "))}</pre>'
    data_structure["type"] = get_data_type_nice_name(data_structure["type"])

    data_structure["description"] = data_structure.get("description", "").replace(f"{br * 3}", "")


def process_structure_json(structure, mustache_template=None):
    if mustache_template is None:
        with open("cms/downloadable_asset_structure_template.html.mustache", "r") as f:
            mustache_template = f.read()

    for context in structure["contexts"]:
        for idx, data_structure in enumerate(context["values"]):
            process_data_structure(data_structure)
            data_structure['index'] = idx + 1
    return pystache.render(mustache_template, structure)
