# Make sure any changes here do not break build_scripts/generate_language_compiled_json.py
import argparse
import json
import sys

DEFAULT_PATH = 'common/language'


def merge_json(*args):
    merged = {}
    for dict_to_merge in args:
        for key in dict_to_merge:
            if '{{' in key or '{{' in dict_to_merge[key]:
                err = '***************************************************************\n'
                err += 'Found double braces in "{key}"\n'
                err += '**************************************************************\n\n'
                sys.exit(err.format(key=key))

        merged.update(dict_to_merge)
    return merged


def extract_static_values(data, static_english):
    extracted_values = {}
    for ((key, value), (eng_key, eng_value)) in zip(data.items(), static_english.items()):
        if type(value) is dict:
            extracted_values.update(extract_static_values(value, eng_value))
        elif type(value) is list:
            for (element, eng_element) in zip(value, eng_value):
                extracted_values.update(extract_static_values(element, eng_element))
        else:
            extracted_values[eng_value] = value
    return extracted_values


def merge_i18ns(path_to_translations):
    with open(f'{path_to_translations}/language_i18n.json', 'r') as auto_language:
        base_file = json.load(auto_language)

    static_file_keys = None
    if path_to_translations != DEFAULT_PATH:
        with open(f'common/language/language_i18n_static.json', 'r') as static_language_keys:
            static_file_keys = json.load(static_language_keys)

    with open(f'{path_to_translations}/language_i18n_static.json', 'r') as static_language:
        static_language = json.load(static_language)
        if not static_file_keys:
            static_file_keys = static_language
        static_file = extract_static_values(static_language, static_file_keys)

    i18n_section = merge_json(base_file, static_file)

    with open(f"{path_to_translations}/language_compiled.json", "w") as outfile:
        json.dump(i18n_section, outfile, indent=4,
                  sort_keys=True, separators=(',', ': '))


if __name__ == "__main__":
    parser = argparse.ArgumentParser("cloud_api_tool", description="use to merge languages",
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("path_to_translations", nargs="?", default=DEFAULT_PATH, help="Email for the cloud account.")
    data = parser.parse_args(sys.argv[1:])
    merge_i18ns(data.path_to_translations)
