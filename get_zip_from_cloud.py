import argparse
import logging
import os
import re
import requests
import shutil
import threading
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

FETCH_BY_TYPE = 'type'
FETCH_BY_ID = 'id'
DEFAULT_INSTANCE = "https://cloud-test.hdw.mx"
FILE_NAME_PATTERN = re.compile("filename=(.+).zip")


def download_package(session, instance, asset_type, asset_id):
    thread = threading.current_thread().name
    logger.info(f"{thread}:\tDownloading package for {asset_id}")
    with session.get(f"{instance}/admin/cms/package/{asset_id}/", stream=True) as fs:
        fs.raise_for_status()
        package_name = re.findall(FILE_NAME_PATTERN, fs.headers.get("Content-Disposition", ""))
        package_name = f"{package_name[0] if len(package_name) else 'package'}"

        if asset_type == 'vms':
            package_dir = f"customization_pack-{package_name}"
            if not os.path.exists(package_dir):
                os.makedirs(package_dir)
            logger.info(f"{thread}:\tSaving package to {package_dir}")
            package_name = f"{package_dir}/package"
        logger.info(f"{thread}:\tSaving {package_name}")
        with open(f"{package_name}.zip", "wb") as f:
            shutil.copyfileobj(fs.raw, f)
        logger.info(f"{thread}:\t{package_name} complete")


def download_packages(session, instance, asset_type, asset_ids):
    if len(asset_ids) == 1:
        logger.info("Downloading one package")
        download_package(session, instance, asset_type, asset_ids[0])
    else:
        logger.info("Downloading many packages. Will use threading")
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = []
            for asset_id in asset_ids:
                futures.append(executor.submit(download_package, session, instance, asset_type, asset_id))

            # Catch any exceptions that happen in a thread worker
            for future in futures:
                try:
                    future.result()
                except requests.HTTPError as e:
                    logger.error(e)


def get_asset_ids(session, args):
    query = f"?type={args.type}&name={args.name}&customization={args.customization}"
    url = f"{args.instance}/admin/cms/get_asset_ids/{query}"
    res = session.get(url)
    res.raise_for_status()
    return res.json()


def get_cmd_args():
    description = f"This script will download zip packages for assets. " \
        f"How to use this script:\n" \
        f"- python get_zip_from_cloud.py noptix@networkoptix.com password123 {FETCH_BY_TYPE}" \
        f"\t\t\t\t(Downloads packages for all VMS Customizations)\n" \
        f"- python get_zip_from_cloud.py noptix@network.com password123 {FETCH_BY_TYPE} --customization=default" \
        f"\t(Downloads a package for selected VMS customization)\n" \
        f"- python get_zip_from_cloud.py noptix@networkoptix.com password123 {FETCH_BY_ID} 30 " \
        f"\t\t\t(Downloads a specific package base on the asset_id)"
    parser = argparse.ArgumentParser("get_zip_from_cloud", description=description,
                                     formatter_class=argparse.RawTextHelpFormatter)
    parser.add_argument("login",  help="User's login")
    parser.add_argument("password", help="User's Password")
    parser.add_argument("-i", "--instance", nargs="?", default=DEFAULT_INSTANCE,
                        help=f"The url of the instance that you want to download packages from.\n"
                        f"Default is {DEFAULT_INSTANCE}")
    parser.add_argument("-l", "--log", nargs="?", default='error',
                        help="Options: info, debug, warning, error, critical. Default is error")

    subparsers = parser.add_subparsers(dest="command", help='Decides how to fetch packages.',
                                       required=True)
    type_parser = subparsers.add_parser(FETCH_BY_TYPE)
    type_parser.add_argument("-t", "--type", nargs="?", default="vms",
                             help="The type of the assetType you are trying to get")
    type_parser.add_argument("-n", "--name", nargs="?", default="",
                             help="The name of the assetType you are trying to get")
    type_parser.add_argument("-c", "--customization", nargs="?", default="",
                             help="The name of the specific customization you want to fetch."
                                  "If this is passed in it will return one asset.")

    id_parser = subparsers.add_parser(FETCH_BY_ID)
    id_parser.add_argument("asset_id", type=int,
                           help="The asset id for the package you want to download.")
    parser.set_defaults(type="other")
    parser.set_defaults(customization="")

    args = parser.parse_args()

    if args.log.upper() in ["INFO", "DEBUG", "WARNING", "ERROR", "CRITICAL"]:
        logging.basicConfig(level=logging.getLevelName(args.log.upper()))

    asset_types = ["cloud_portal", "vms", "integration", "other"]
    if args.command == FETCH_BY_TYPE and args.type not in asset_types:
        parser.error(f"You must pass in a type that is either {', '.join(asset_types)}.")
    elif args.command == FETCH_BY_ID and args.asset_id is None:
        parser.error("A asset id is required.")
    return args


def main():
    args = get_cmd_args()
    with requests.Session() as session:
        # Login and start session
        logger.info(f"Logging in {args.login} to {args.instance}")
        login = session.post(f"{args.instance}/api/account/login", json={"email": args.login, "password": args.password})
        login.raise_for_status()
        # Get all of the assets of a specific asset_type
        if args.command == FETCH_BY_TYPE:
            logger.info(f"Fetching asset ids from cloud")
            asset_ids = get_asset_ids(session, args)
        else:
            logger.info(f"Asset id passed in from cmd")
            asset_ids = [args.asset_id]
        logger.info(f"Downloading package(s)")
        download_packages(session, args.instance, args.type, asset_ids)
        logger.info("Finished downloading package(s)")


if __name__ == "__main__":
    main()
