import argparse
import re
import requests
import shutil
from concurrent.futures import ThreadPoolExecutor

DEFAULT_INSTANCE = "https://cloud-test.hdw.mx"
FILE_NAME_PATTERN = re.compile("filename=(.+)")


def download_package(session, instance, product_id):
    with session.get(f"{instance}/admin/cms/package/{product_id}/", stream=True) as fs:
        fs.raise_for_status()
        file_names = re.findall(FILE_NAME_PATTERN, fs.headers.get("Content-Disposition", ""))
        file_name = file_names[0] if len(file_names) else "package.zip"

        with open(file_name, "wb") as f:
            shutil.copyfileobj(fs.raw, f)


def download_packages(session, instance, product_ids):
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = []
        for product_id in product_ids:
            futures.append(executor.submit(download_package, session, instance, product_id))

        # Catch any exceptions that happen in a thread worker
        for future in futures:
            future.result()


def get_cmd_args():
    description = "This script will download zip packages for products." \
                  "How to use this script:\n" \
                  "- python get_zip_from_cloud.py noptix@networkoptix.com password123 " \
                  "\t\t\t(Downloads all packages for products related to the default vms ProductType)\n" \
                  "- python get_zip_from_cloud.py noptix@networkoptix.com password123 --product_id=30 " \
                  "\t(Downloads a specific package base on the product_id)"
    parser = argparse.ArgumentParser("get_zip_from_cloud", description=description,
                                     formatter_class=argparse.RawTextHelpFormatter)
    parser.add_argument("login",  help="User's login")
    parser.add_argument("password", help="User's Password")

    parser.add_argument("-t", "--type", nargs="?", default="vms",
                        help="The type of the ProductType you are trying to get. Must use with name.")
    parser.add_argument("-n", "--name", nargs="?", default="",
                        help="The name of the ProductType you are trying to get. Must use with type")

    parser.add_argument("-i", "--instance", nargs="?", default=DEFAULT_INSTANCE,
                        help=f"The url of the instance that you want to download packages from. "
                        f"Default is {DEFAULT_INSTANCE}")

    parser.add_argument("-pi", "--product_id", nargs="?",
                        help="The product id for the package you want to download.This argument "
                             "overrides product_type type and name")

    args = parser.parse_args()
    product_types = ["cloud_portal", "vms", "integration", "other"]
    if args.product_id is None and args.type not in product_types:
        parser.error(f"You must either pass in a product id or use a type that is either {', '.join(product_types)}")
    return args


def main():
    args = get_cmd_args()
    with requests.Session() as session:
        # Login and start session
        session.post(f"{args.instance}/api/account/login", json={"email": args.login, "password": args.password})

        # Get all of the products of a specific product_type
        if not args.product_id:
            url = f"{args.instance}/admin/cms/get_product_ids/?type={args.product_type}&name={args.product_type_name}"
            res = session.get(url)
            product_ids = res.json()
        else:
            product_ids = [args.product_id]

        download_packages(session, args.instance, product_ids)


if __name__ == "__main__":
    main()
