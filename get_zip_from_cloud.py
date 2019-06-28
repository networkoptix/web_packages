import argparse
import os
import re
import requests
import shutil
from concurrent.futures import ThreadPoolExecutor

COMMAND_ALL_PRODUCTS = 'all'
COMMAND_PRODUCT = 'product'
DEFAULT_INSTANCE = "https://cloud-test.hdw.mx"
FILE_NAME_PATTERN = re.compile("filename=(.+).zip")


def download_package(session, instance, product_type, product_id):
    with session.get(f"{instance}/admin/cms/package/{product_id}/", stream=True) as fs:
        fs.raise_for_status()
        package_name = re.findall(FILE_NAME_PATTERN, fs.headers.get("Content-Disposition", ""))
        package_name = f"{package_name[0] if len(package_name) else 'package'}"

        if product_type == 'vms':
            package_dir = f"customization_pack-{package_name}"
            if not os.path.exists(package_dir):
                os.makedirs(package_dir)
            package_name = f"{package_dir}/package"

        with open(f"{package_name}.zip", "wb") as f:
            shutil.copyfileobj(fs.raw, f)


def download_packages(session, instance, product_type, product_ids):
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = []
        for product_id in product_ids:
            futures.append(executor.submit(download_package, session, instance, product_type, product_id))

        # Catch any exceptions that happen in a thread worker
        for future in futures:
            future.result()


def get_cmd_args():
    description = "This script will download zip packages for products." \
                  "How to use this script:\n" \
                  "- python get_zip_from_cloud.py noptix@networkoptix.com password123 all" \
                  "\t\t\t(Downloads all packages for products related to the default vms ProductType)\n" \
                  "- python get_zip_from_cloud.py noptix@networkoptix.com password123 product 30 " \
                  "\t(Downloads a specific package base on the product_id)"
    parser = argparse.ArgumentParser("get_zip_from_cloud", description=description,
                                     formatter_class=argparse.RawTextHelpFormatter)
    parser.add_argument("login",  help="User's login")
    parser.add_argument("password", help="User's Password")
    parser.add_argument("-i", "--instance", nargs="?", default=DEFAULT_INSTANCE,
                        help=f"The url of the instance that you want to download packages from.\n"
                        f"Default is {DEFAULT_INSTANCE}")

    subparsers = parser.add_subparsers(dest="command", help='Decides how to fetch packages.',
                                       required=True)
    all_products = subparsers.add_parser(COMMAND_ALL_PRODUCTS)
    all_products.add_argument("-t", "--type", nargs="?", default="vms",
                              help="The type of the ProductType you are trying to get")
    all_products.add_argument("-n", "--name", nargs="?", default="",
                              help="The name of the ProductType you are trying to get")

    specific_product = subparsers.add_parser(COMMAND_PRODUCT)
    specific_product.add_argument("product_id", type=int,
                                  help="The product id for the package you want to download.")
    parser.set_defaults(type='other')

    args = parser.parse_args()

    product_types = ["cloud_portal", "vms", "integration", "other"]
    if args.command == COMMAND_ALL_PRODUCTS and args.type not in product_types:
        parser.error(f"You must either pass in a product id or use a type that is either {', '.join(product_types)}.")
    elif args.command == COMMAND_PRODUCT and args.product_id is None:
        parser.error("A product id is required.")
    return args


def main():
    args = get_cmd_args()
    with requests.Session() as session:
        # Login and start session
        session.post(f"{args.instance}/api/account/login", json={"email": args.login, "password": args.password})

        # Get all of the products of a specific product_type
        if args.command == COMMAND_ALL_PRODUCTS:
            url = f"{args.instance}/admin/cms/get_product_ids/?type={args.type}&name={args.name}"
            res = session.get(url)
            product_ids = res.json()
        else:
            product_ids = [args.product_id]
        download_packages(session, args.instance, args.type, product_ids)


if __name__ == "__main__":
    main()
