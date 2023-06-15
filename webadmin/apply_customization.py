#!/usr/bin/env python

import argparse
import json
import os
import shutil
import sys
import tempfile
from distutils.dir_util import copy_tree
from pathlib import Path
from zipfile import ZipFile


def extract_file_to(zip_file, src_name, dst_name):
    dst_name = Path(dst_name)

    if dst_name.is_dir():
        dst_name = dst_name / Path(src_name).name

    with zip_file.open(src_name) as src, open(dst_name, "wb") as dst:
        shutil.copyfileobj(src, dst)


def traverse_and_replace(cur_dict, replacements=None):
    if type(cur_dict) is list:
        for node in cur_dict:
            traverse_and_replace(node, replacements=replacements)
    else:
        for key, value in cur_dict.items():
            if type(value) in [dict, list]:
                traverse_and_replace(value, replacements=replacements)
            else:
                for search, replacement in replacements.items():
                    missing = f"--{search} IS MISSING FROM CONFIG--"
                    if not replacement:
                        print(missing)
                    value = str(value).replace(
                        str(search), str(replacement) or missing)
                cur_dict[key] = value


def apply_customization(webadmin_package, customization_package, output_package):
    temp_dir = Path(tempfile.mkdtemp(dir=Path.cwd()))

    with ZipFile(customization_package) as customization_zip, ZipFile(webadmin_package) as webadmin_zip:

        process_files(
            customization_zip, webadmin_zip, temp_dir
        )

    clean_static_info(customization_package, temp_dir)

    output_package = Path(output_package)
    shutil.make_archive(output_package, "zip",
                        root_dir=temp_dir, base_dir="static")
    shutil.rmtree(temp_dir)
    Path(str(output_package) + ".zip").replace(output_package)


def clean_static_info(customization_package, output_dir):
    file_to_replace = "description.json"
    path_to_file = os.path.join("static", "customization", file_to_replace)

    with ZipFile(customization_package) as zip_file:
        with zip_file.open(file_to_replace) as f:
            description = json.load(f)

    preserve_keys = [
        'vmsName', 'cloudName', 'copyrightYear', 'companyName', 'contact', 'desktop.trialLicenseKey',
        'defaultLanguage']

    cleaned_description = {}
    for key in preserve_keys:
        if '.' in key:
            nested_keys = key.split('.')
            nested_object = {}
            temp_nested_object = nested_object
            last_nested_description = description

            last_key = nested_keys.pop(-1)
            for nested_key in nested_keys:
                temp_nested_object[nested_key] = {}
                temp_nested_object = temp_nested_object[nested_key]
                last_nested_description = description[nested_key]

            if last_key not in last_nested_description:
                continue
            temp_nested_object[last_key] = last_nested_description[last_key]
            cleaned_description.update(nested_object)

        elif key in description:
            cleaned_description[key] = description[key]

    data = json.dumps(cleaned_description, indent=4)
    with open(output_dir / path_to_file, "w", newline='\n') as file:
        file.write(data)


def process_files(customization_zip, webadmin_zip, temp_dir):
    static_dir = temp_dir / "static"
    customization_dir = static_dir / "customization"
    images_dir = static_dir / "images"

    with customization_zip.open("description.json", "r") as file:
        description = json.load(file)
        skin = description.get("skin", "blue").replace(
            r"dark_", "").replace("gray_", "")
        if skin not in ["blue", "green", "orange"]:
            skin = "blue"

    webadmin_zip.extractall(path=temp_dir)

    # Copy setup skin and setup wizard in package.
    shutil.copyfile(f"{static_dir}/styles/{skin}.css",
                    f"{static_dir}/styles/skin.css")

    for file in ["webadmin_config.json", "desktop/webadmin_config.js"]:
        extract_file_to(customization_zip, file, customization_dir)

    replace_static(static_dir, customization_dir, description)

    files_to_extract = (
        ("main_icon.ico", images_dir / "favicon.ico"),
        ("desktop/webadmin_logo.png", images_dir / "logo.png"),
        ("desktop/welcome_page_logo.png", images_dir),
        ("desktop/welcome_page_logo@2x.png", images_dir)
    )

    for filename, target in files_to_extract:
        extract_file_to(customization_zip, filename, target)


def replace_static(static_dir, customization_dir, description):
    webadmin_config = customization_dir / 'webadmin_config.json'
    language_compiled = 'language_compiled.json'
    main_replacements = get_replacements(description)

    with open(webadmin_config, 'r+') as file:
        config = json.load(file)
        apply_replacements(config, main_replacements, file)

    with open(static_dir / 'language_i18n_static.json', 'r') as file:
        titles = json.load(file).get('pageTitles', {})

    for _, folders, _ in os.walk(static_dir):
        for folder in folders:
            for _, _, files in os.walk(static_dir / folder):
                for file in files:
                    if file == language_compiled:
                        with open(static_dir / folder / file, 'r+', encoding="utf8") as file:
                            lang = json.load(file)
                            apply_replacements(
                                lang, main_replacements, file)


def replace_page_titles(content, replacements, titles):
    for title in titles.values():
        for key, value in replacements.items():
            if key in title and title in content:
                content[title] = content[title].replace(key, value)


def apply_replacements(content, main_replacements, file=None):
    traverse_and_replace(content, replacements=main_replacements)
    if file:
        file.seek(0)
        file.write(json.dumps(content))
        file.truncate()


def get_replacements(description):
    return {
        "%CLOUD_NAME%": description.get("cloudName"),
        "%VMS_NAME%": description.get("vmsName"),
        "%CLIENT_PROTOCOL%": description.get("uriProtocol"),
        "%SUPPORT_LINK%": description.get("contact", {}).get("supportAddress"),
        "%COMPANY_NAME%": description.get("companyName")
    }


def check_if_update_required(webadmin_package, customization_package, output_package):
    if not Path(output_package).exists():
        return True

    with ZipFile(customization_package) as customization_zip, \
            ZipFile(webadmin_package) as webadmin_zip, \
            ZipFile(output_package) as output_zip:

        try:
            if customization_zip.read("description.json") \
                    != output_zip.read("static/customization/description.json"):
                return True

            if webadmin_zip.read("static/version.txt") \
                    != output_zip.read("static/version.txt"):
                return True
        except KeyError:
            return True

    return False


def main():
    parser = argparse.ArgumentParser(
        description="Update or create a customized webadmin package")
    parser.add_argument("--webadmin-package",
                        help="Path to a non-customized webadmin package",
                        default=(Path(__file__).parent / "webadmin.zip"))
    parser.add_argument("--customization-package",
                        help="Path to a customization package (package.zip)",
                        default=(Path(__file__).parent / "package.zip"))
    parser.add_argument("-o", "--output-package",
                        help="Path to a resulting webadmin package (external.dat)",
                        default=(Path(__file__).parent / "external.dat"))
    parser.add_argument("-f", "--force", action="store_true",
                        help="Force output package generation even when it is considered up to date.")

    args = parser.parse_args()

    if not Path(args.webadmin_package).exists():
        print(f"File {args.webadmin_package} does not exists", file=sys.stderr)
    if not Path(args.customization_package).exists():
        print(f"File {args.customization_package} does not exists",
              file=sys.stderr)

    if args.force or check_if_update_required(
            args.webadmin_package, args.customization_package, args.output_package):
        print(f"Updating {args.output_package}...", file=sys.stderr)
        apply_customization(
            Path(args.webadmin_package).resolve(),
            Path(args.customization_package).resolve(),
            Path(args.output_package).resolve())
    else:
        print(f"{args.output_package} is up to date. Update skipped.",
              file=sys.stderr)


if __name__ == "__main__":
    main()
