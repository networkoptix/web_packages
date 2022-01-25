# Make sure any changes here do not break build_scripts/generate_language_compiled_json.py
import json


def filter_extracted_static(json_elem):
    keys = [
        "dialogs.",
        "license.messages.",
        "WHEN_MERGE_FINISHES",
        "FAILED_SYSTEM_DESCR",
        "NO_SYSTEMS_",
        "errorCodes.",
        "integration.",
        "registration.agreement",
        "merge.warning",
        "common.account",
        "system.MERGE_FINISHES",
        "ipvdDisclaimer",
        "ipvdTopXByVolume",
        "servers.autoRefresh",
        "additionalSystems",
        "security.",
        "maintenance.",
        "search.",
        "redirects.",
        "tile.",
        "authorize.",
        "devConsole."
    ]
    return any((key in json_elem for key in keys))


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
    dynamic_i18n_path = "./app/language_i18n.json"
    with open(dynamic_i18n_path, 'r') as language:
        json_data = json.load(language)

    with open('./app/customization/menus.json') as cms_static_menus:
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
