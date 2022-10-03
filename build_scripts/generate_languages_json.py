import os
import json
import errno
import codecs
import sys


def make_dir(filename):
    dirname = os.path.dirname(filename)
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


def generate_languages_files():
    languages_json = []
    current_generate_path = os.path.dirname(os.path.realpath(__file__))

    with codecs.open(os.path.join(current_generate_path, "..", "translations", "language_codes.json"), "r") as codes:
        codes_to_lang = json.load(codes)

    for code in codes_to_lang:
        languages_json.append({
            "language": code,
            "name": codes_to_lang[code]
        })

        save_content("static/languages.json",
                     json.dumps(languages_json, indent=4, ensure_ascii=False, sort_keys=True))


generate_languages_files()
