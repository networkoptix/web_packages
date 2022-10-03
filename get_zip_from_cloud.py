#!/usr/bin/python3
import argparse
import os
import sys
import re
import requests
import shutil
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

FETCH_BY_TYPE = 'type'
FETCH_BY_ID = 'id'
DEFAULT_INSTANCE = "https://nxvms.com"
FILE_NAME_PATTERN = re.compile("filename=(.+).zip")
DOWNLOAD_ATTEMPTS = 24  # With a timeout of 5s its 2 minutes.


def create_package(args, fs):
    try:
        fs.raise_for_status()
    except Exception as e:
        print(e)
        print(f"Reason: {fs.text}")
        return

    package_name = re.findall(FILE_NAME_PATTERN, fs.headers.get("Content-Disposition", ""))
    package_name = f"{package_name[0] if len(package_name) else 'package'}"

    if args.type == 'vms':
        package_suffix = f"_{args.package_name_suffix}" if args.package_name_suffix else ""
        package_dir = args.destination_path / f"customization_pack-{package_name}{package_suffix}"
        package_dir.mkdir(parents=True, exist_ok=True)
        package_name = f"{package_dir}/package"

    with open(f"{package_name}.zip", "wb") as f:
        shutil.copyfileobj(fs.raw, f)

def download_package_async(session, args, asset_id):
    draft = "?draft" if args.draft else ""
    async_package_url = f"{args.instance}/admin/cms/async_package/{asset_id}/{draft}"
    package_url = f"{args.instance}/admin/cms/package/{asset_id}/{draft}"

    # Initial async package
    res = session.get(package_url)
    try:
        res.raise_for_status()
    except Exception as e:
        print(e)
        print(f"Reason: {res.text}")
        return

    # Poll for package every 5 seconds
    for _ in range(DOWNLOAD_ATTEMPTS):
        res = session.get(package_url)
        try:
            res.raise_for_status()
        except Exception as e:
            print(e)
            print(f"Reason: {res.text}")
            return

        data = res.json()
        if data["is_ready"]:
            break

        time.sleep(5)
    else:
        task_id = data.get("task_id")
        if task_id:
            print(f"Something went wrong creating the package.\n"
                  f"Please contact the web team.\n"
                  f"Asset id: {asset_id}\nCelery task result id: {task_id}")
        else:
            print(f"Something went horribly wrong.\n"
                  f"Asset id is {asset_id}. Please contact the web team.")

    with session.get(async_package_url, stream=True) as fs:
        create_package(args, fs)


def download_packages(session, args, asset_ids):
    if len(asset_ids) == 1:
        download_package_async(session, args, asset_ids[0])
        return

    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = []
        for asset_id in asset_ids:
            futures.append(executor.submit(download_package_async, session, args, asset_id))

        for future in futures:
            future.result()


def get_cmd_args(argv):
    description = f"This script will download zip packages for assets. Remove the --draft flag to get the latest " \
        f"published version.\n" \
        f"How to use this script:\n" \
        f"- python get_zip_from_cloud.py noptix@networkoptix.com password123 --draft {FETCH_BY_TYPE}" \
        f"\t\t\t\t\t (Downloads packages for all VMS Customizations)\n" \
        f"- python get_zip_from_cloud.py noptix@network.com password123 --draft {FETCH_BY_TYPE} --customization=default" \
        f"\t\t\t(Downloads a package for selected VMS customization)\n" \
        f"- python get_zip_from_cloud.py noptix@networkoptix.com password123 --draft {FETCH_BY_ID} 30 " \
        f"\t\t\t\t\t(Downloads a specific package base on the asset_id)"
    parser = argparse.ArgumentParser("get_zip_from_cloud", description=description,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("login",  help="User's login")
    parser.add_argument("password", help="User's Password")
    parser.add_argument("-i", "--instance", nargs="?", default=DEFAULT_INSTANCE,
                        help=f"The url of the instance that you want to download packages from.\n"
                        f"Default is {DEFAULT_INSTANCE}")
    parser.add_argument("--draft", help="Get the latest version of the asset.", dest="draft", action='store_true')
    parser.add_argument("--destination-path", type=Path, default=Path.cwd(),
                        help="Path to store downloaded packages")
    parser.add_argument("--package-name-suffix",
                        help="Suffix for package name to make difference with release")


    subparsers = parser.add_subparsers(dest="command", help='Decides how to fetch packages.',
                                       required=True)
    type_parser = subparsers.add_parser(FETCH_BY_TYPE)
    type_parser.add_argument("-t", "--type", nargs="?", default="vms",
                             help="The type of the AssetType you are trying to get")
    type_parser.add_argument("-n", "--name", nargs="?", default="",
                             help="The name of the AssetType you are trying to get")
    type_parser.add_argument("-c", "--customization", nargs="?", default="",
                             help="The name of the specific customization you want to fetch."
                                  "If this is passed in it will return one asset.")

    id_parser = subparsers.add_parser(FETCH_BY_ID)
    id_parser.add_argument("asset_id", type=int,
                           help="The asset id for the package you want to download.")
    parser.set_defaults(type="other")
    parser.set_defaults(customization="")

    args = parser.parse_args(argv)

    asset_types = ["cloud_portal", "vms", "integration", "other"]
    if args.command == FETCH_BY_TYPE and args.type not in asset_types:
        parser.error(f"You must pass in a type that is either {', '.join(asset_types)}.")
    elif args.command == FETCH_BY_ID and args.asset_id is None:
        parser.error("A asset id is required.")
    return args


def main(argv):
    args = get_cmd_args(argv)
    with requests.Session() as session:
        # Login and start session
        try:
            res = session.post(f"{args.instance}/api/account/login", json={"email": args.login, "password": args.password})
            res.raise_for_status()
            # Get all of the assets of a specific asset_type
            if args.command == FETCH_BY_TYPE:
                query = f"?type={args.type}&name={args.name}&customization={args.customization}"
                url = f"{args.instance}/admin/cms/get_asset_ids/{query}"
                res = session.get(url)
                res.raise_for_status()
                asset_ids = res.json()
            else:
                asset_ids = [args.asset_id]

            download_packages(session, args, asset_ids)
        except requests.HTTPError as e:
            if __name__ != "__main__":
                raise e
            print(e)


if __name__ == "__main__":
    main(sys.argv[1:])
