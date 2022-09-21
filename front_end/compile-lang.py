# Make sure any changes here do not break build_scripts/generate_language_compiled_json.py
import json
import sys


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


def merge_i18ns():
    with open('common/language/language_i18n.json', 'r') as auto_language:
        base_file = json.load(auto_language)

    with open('common/language/language_i18n_static.json', 'r') as static_language:
        static_file = json.load(static_language)

    i18n_section = merge_json(base_file, static_file)

    with open("./common/language/language_compiled.json", "w") as outfile:
        json.dump(i18n_section, outfile, indent=4,
                  sort_keys=True, separators=(',', ': '))


if __name__ == "__main__":
    merge_i18ns()
