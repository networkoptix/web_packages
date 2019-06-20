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
    parser = argparse.ArgumentParser("get_zip_from_cloud")
    parser.add_argument("email",  help="User Email")
    parser.add_argument("password", help="User Password")
    parser.add_argument("-pi", "--product_id", nargs="?", help="The product id for the package you want to download. "
                                                               "Do not use with type and name")
    parser.add_argument("-t", "--product_type", nargs="?", help="The type of the ProductType you are trying to get. "
                                                                "Must use with name.")
    parser.add_argument("-n", "--name", nargs="?", help="The name of the ProductType you are trying to get. "
                                                        "Must use with type")

    parser.add_argument("-i", "--instance", nargs="?", default=DEFAULT_INSTANCE,
                        help=f"The url of the instance that you want to download packages from. "
                        f"Default is {DEFAULT_INSTANCE}")
    args = parser.parse_args()

    if not args.product_id and not(args.type and args.name):
        raise Exception("Must provide either a product_id or both name and type arguments")
    return args.email, args.password, args.product_id, args.product_type, args.name, args.instance


def main():
    email, password, product_id, product_type, product_type_name, instance = get_cmd_args()
    with requests.Session() as session:
        # Login and start session
        session.post(f"{instance}/api/account/login", json={"email": email, "password": password})

        # Get all of the products of a specific product_type
        if not product_id:
            res = session.get(f"{instance}/admin/cms/get_product_ids/?type={product_type}&name={product_type_name}")
            product_ids = res.json()
        else:
            product_ids = [product_id]

        download_packages(session, instance, product_ids)


if __name__ == "__main__":
    main()
