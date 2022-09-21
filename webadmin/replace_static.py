from sys import argv
import json

target_json_paths = argv[1:]
description_path = "common/customization/description.json"
config_path = "common/customization/webadmin_config.json"

with open(description_path) as description_file:
    description = json.load(description_file)

with open(config_path) as config_file:
    config = json.load(config_file)

main_replacements = {
    "%CLOUD_NAME%": description.get("cloudName"),
    "%VMS_NAME%": description.get("vmsName"),
    "%CLIENT_PROTOCOL%": description.get("uriProtocol"),
    "%SUPPORT_LINK%": description.get("contact", {}).get("supportAddress"),
    "%COMPANY_NAME%": description.get("companyName")
}

page_title_replacements = {
    "%CLOUD_NAME%": "webadmin",
}


def traverse_and_replace(cur_dict, replacements=None):
    if type(cur_dict) is list:
        for node in cur_dict:
            traverse_and_replace(node, replacements=replacements)
    else:
        for key, value in cur_dict.items():
            if type(value) is dict:
                traverse_and_replace(value, replacements=replacements)
            else:
                for search, replacement in replacements.items():
                    missing = f"--{search} IS MISSING FROM CONFIG--"
                    if not replacement:
                        print(missing)
                    value = str(value).replace(
                        str(search), str(replacement) or missing)
                cur_dict[key] = value


for lang_path in target_json_paths:
    with open(lang_path) as lang_file:
        language_compiled = json.load(lang_file)

    traverse_and_replace(
        language_compiled['pageTitles'], replacements=page_title_replacements)
    traverse_and_replace(language_compiled, replacements=main_replacements)
    traverse_and_replace(config, replacements=main_replacements)

    with open(lang_path, 'w') as updated_lang_file:
        json.dump(language_compiled, updated_lang_file, indent=4,
                  sort_keys=True, separators=(',', ': '))
