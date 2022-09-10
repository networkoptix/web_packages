# Make sure any changes here do not break build_scripts/generate_language_compiled_json.py
import json
import re


def filter_extracted_static(json_key):
    """
    Filter static translations unintentionally extracted into language_i18n.json.

    Will catch dot access (e.g 'errorCodes.webadmin2faRequired') and camelCase
    top-level keys without dot access (e.g. ipvdTopXByVolume).

    Will not catch top-level keys that are all lowercase or otherwise
    not camelCase (e.g. 'results'), since there is some overlap between
    the translation keys and there's no way to know definitively whether a
    translation in language_i18n.json came from templates or
    language_i18n_static.json without parsing all templates.
    """
    dot_access = re.match(r"^([a-zA-Z0-9]+)(\.[a-zA-Z0-9]+)+$", json_key)
    camelcase = re.match(r"^[a-z0-9]+([A-Z0-9][a-z0-9]*)+$", json_key)

    return dot_access or camelcase



def replace_empty(json_elem):
    if isinstance(json_elem, list):
        return [replace_empty(elem) for elem in json_elem]
    elif isinstance(json_elem, dict):
        return {key: replace_empty(value) for key, value in json_elem.items()}
    else:
        return json_elem


def parse_menus(nodes, parsed_menu=None):
    if not parsed_menu:
        parsed_menu = {}
    for node in nodes:
        string = node.get('display_name', node['name'])
        parsed_menu[string] = string
        if 'nodes' in node:
            parse_menus(node['nodes'], parsed_menu)
    return parsed_menu


def add_menu_to_i18n():
    dynamic_i18n_path = "./src/language_i18n.json"
    with open(dynamic_i18n_path, 'r') as language:
        json_data = json.load(language)

    with open('./src/customization/menus.json') as cms_static_menus:
        menus = json.load(cms_static_menus)
        json_data.update(parse_menus(menus))

    with open('../cloud/cms/menus.json') as cms_static_menus:
        menus = json.load(cms_static_menus)
        json_data.update(parse_menus(menus))

    copy = json_data.copy()

    for item in copy.keys():
        if filter_extracted_static(item):
            del json_data[item]
            continue

        json_data[item] = replace_empty(item)

    with open(dynamic_i18n_path, "w") as outfile:
        json.dump(json_data, outfile, indent=4,
                  sort_keys=True, separators=(',', ': '))


if __name__ == "__main__":
    add_menu_to_i18n()
