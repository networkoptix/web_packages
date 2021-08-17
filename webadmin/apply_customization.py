#!/usr/bin/env python

import argparse
import json
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


def apply_customization(webadmin_package, customization_package, output_package):
    temp_dir = Path(tempfile.mkdtemp(dir=Path.cwd()))

    with ZipFile(customization_package) as customization_zip, \
            ZipFile(webadmin_package) as webadmin_zip:

        with customization_zip.open("description.json", "r") as file:
            skin = json.load(file).get("skin", "blue").replace(r"dark_", "").replace("gray_", "")

        webadmin_zip.extractall(path=temp_dir)

        static_dir = temp_dir / "static"
        customization_dir = static_dir / "customization"
        images_dir = static_dir / "images"

        # Copy setup skin and setup wizard in package.
        shutil.copyfile(f"{static_dir}/styles/{skin}.css", f"{static_dir}/styles/skin.css")
        copy_tree(f"{static_dir}/setup_{skin}", f"{static_dir}/")

        # Remove files related to other skins.
        for skin_name in ["blue", "green", "orange"]:
            setup_path = f"{static_dir}/setup_{skin_name}"
            if Path(setup_path).exists():
                shutil.rmtree(setup_path)
            Path(f"{static_dir}/styles/{skin_name}.css").unlink(True)

        for file in \
                ["description.json", "webadmin_config.json", "desktop/webadmin_config.js"]:
            extract_file_to(customization_zip, file, customization_dir)

        extract_file_to(customization_zip, "main_icon.ico", images_dir / "favicon.ico")
        extract_file_to(customization_zip, "desktop/webadmin_logo.png", images_dir / "logo.png")
        extract_file_to(customization_zip, "desktop/welcome_page_logo.png", images_dir)
        extract_file_to(customization_zip, "desktop/welcome_page_logo@2x.png", images_dir)

    output_package = Path(output_package)
    shutil.make_archive(output_package, "zip", root_dir=temp_dir, base_dir="static")
    shutil.rmtree(temp_dir)
    Path(str(output_package) + ".zip").replace(output_package)


def check_if_update_required(webadmin_package, customization_package, output_package):
    if not Path(output_package).exists():
        return True

    with ZipFile(customization_package) as customization_zip, \
            ZipFile(webadmin_package) as webadmin_zip, \
            ZipFile(output_package) as output_zip:

        if customization_zip.read("description.json") \
                != output_zip.read("static/customization/description.json"):
            return True

        if webadmin_zip.read("static/version.txt") \
                != output_zip.read("static/version.txt"):
            return True

    return False


def main():
    parser = argparse.ArgumentParser(description="Update or create a customized webadmin package")
    parser.add_argument( "--webadmin-package",
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
        print(f"File {args.customization_package} does not exists", file=sys.stderr)

    if args.force or check_if_update_required(
            args.webadmin_package, args.customization_package, args.output_package):
        print(f"Updating {args.output_package}...", file=sys.stderr)
        apply_customization(
            Path(args.webadmin_package).resolve(),
            Path(args.customization_package).resolve(),
            Path(args.output_package).resolve())
    else:
        print(f"{args.output_package} is up to date. Update skipped.", file=sys.stderr)


if __name__ == "__main__":
    main()
