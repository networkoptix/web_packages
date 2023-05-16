import collections.abc
import os
import json
import errno
import codecs
import sys
import re

US_LANGUAGE_NAME = "English (US)"
US_LANGUAGE_CODE = "en_US"


def deep_update(d, u):
    for k, v in u.items():
        if isinstance(v, collections.abc.Mapping):
            d[k] = deep_update(d.get(k, {}), v)
        else:
            d[k] = v
    return d


def merge_two_json(x, y):
    z = x.copy()  # start with x's keys and values
    z = deep_update(z, y)

    return z


def make_dir(filename):
    dirname = os.path.dirname(filename)
    print(f"make dir {dirname} for {filename}")
    if not os.path.exists(dirname):
        try:
            os.makedirs(dirname)
        except OSError as exc:  # Guard against race condition
            if exc.errno != errno.EEXIST:
                raise


def save_content(filename, content):
    if filename:
        # proceed with branding
        make_dir(filename)
        with codecs.open(filename, "w", "utf-8") as file:
            file.write(content)
            file.close()


def merge_files(base_lang, lang, file_name):
    merged_lang = base_lang.copy()
    current_generate_path = os.path.dirname(os.path.realpath(__file__))
    lang_json_file = os.path.join(current_generate_path, "..", "translations", lang, file_name)
    print(f"Load {lang_json_file}")

    if os.path.exists(lang_json_file):
        with codecs.open(lang_json_file, "r", "utf-8") as file:
            translated_json = json.load(file)
            translated_json["language"] = lang

            language_name = translated_json.get("language_name", "")
            if not language_name or language_name == "LANGUAGE_NAME":
                translated_json["language_name"] = lang

            if translated_json["language_name"] == "LANGUAGE_NAME":
                sys.stderr.write(f"ERROR: For BORIS to fix: language.json has wrong language_name. "
                                 f"File: {lang_json_file}\n")
                translated_json["language_name"] = lang
            merged_lang = deep_update(merged_lang, translated_json)
    elif lang != US_LANGUAGE_CODE:
        sys.stderr.write(f"WARNING: {lang_json_file} don't exist.\n")
    else:
        merged_lang["language"] = US_LANGUAGE_CODE
        merged_lang["language_name"] = US_LANGUAGE_NAME

    return merged_lang


def generate_languages_files(languages):
    current_generate_path = os.path.dirname(os.path.realpath(__file__))
    with codecs.open(os.path.join(current_generate_path, "..", "translations", "language_codes.json"), "r") as codes:
        codes_to_lang = json.load(codes)
    # Localize this language
    with codecs.open("static/language_compiled.json", "r", "utf-8") as file_descriptor:
        base_i18n = json.load(file_descriptor)

    for lang in languages:
        i18n = merge_files(base_i18n, lang, "language_compiled.json")

        i18n["language"] = lang
        i18n["language_name"] = codes_to_lang[lang]

        # replace {{XXX}} with {XXX} so pluralization plugin will not freak out
        prep_json_for_pluralization(i18n)

        save_content(f"static/lang_{lang}/language_compiled.json",
                     json.dumps(i18n, indent=4, ensure_ascii=False, sort_keys=True))


def prep_json_for_pluralization(adict):
    for key in adict.keys():
        if type(adict[key]) is dict:
            prep_json_for_pluralization(adict[key])
        else:
            is_list = type(adict[key]) is list
            if is_list:
                adict[key] = json.dumps(adict[key])
            for match in re.findall(r'{{[#\s\w]+}}', adict[key]):
                adict[key] = adict[key].replace(match, match[1:-1])
            if is_list:
                adict[key] = json.loads(adict[key])


def main():
    languages = sys.argv[1:]
    if not languages:
        languages = ["en_US"]
    generate_languages_files(languages)


if __name__ == "__main__":
    main()
