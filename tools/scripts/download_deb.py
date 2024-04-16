#!/usr/bin/python3
import argparse
import json
import logging
import requests
import shutil
import sys
import urllib3

from platform import processor, platform
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logging.basicConfig()
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# The file path is relative to where the script was run.
# Make this path absolute if you want it elsewhere.
FILE_DESTINATION_PATH = "tools"
DOWNLOADS_BASE = 'https://beta.networkoptix.com/beta-builds'


def download_deb(build_number, download_url):
    res = requests.get(download_url, stream=True)
    with open(f"tools/mediaserver_debs/{build_number}.deb", "wb") as f:
        shutil.copyfileobj(res.raw, f)


def get_downloads_json_data(build_number, customization):
    downloads_json_url = f'{DOWNLOADS_BASE}/{customization}/{build_number}/downloads.json'
    logger.info(f'Checking {downloads_json_url} for download info.')
    res = requests.get(downloads_json_url)
    res.raise_for_status()
    return res.json()


def find_deb(installers, build_number, customization):
    x86_64_linux = platform().startswith('Linux') and processor() == 'x86_64'
    intel_macos = processor() == 'i386'
    # Final option: ARM MacOS (Apple silicon)

    deb_platform = 'linux_x64' if x86_64_linux or intel_macos else 'linux_arm64'
    appType = 'server'
    for installer in installers:
        if installer['platform'] == deb_platform and installer['appType'] == appType:
            return f"{DOWNLOADS_BASE}/{customization}/{build_number}/{installer['path']}"
    return ''


def get_deb(build_number, *, customization='default'):
    installers = get_downloads_json_data(build_number, customization).get('installers', [])
    logger.debug(json.dumps(installers, indent=2))
    deb_url = find_deb(installers, build_number, customization)
    logger.info(deb_url)
    if deb_url:
        download_deb(build_number, deb_url)
        return False
    return True


def get_args(argv):
    description = """script for downloading linux server builds for docker.
    Usage:
    \t ./download_deb.py {build_number}                    - Downloads default build
    \t ./download_deb.py -c {customization} {build_number} - Downloads customized build
    """
    parser = argparse.ArgumentParser("download_deb", description=description,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("build_number", help="Build number. Ex: x.x.x.xxxxx.")
    parser.add_argument("-c", "--customization", nargs="?", default="default",
                        help="VMS customization")

    return parser.parse_args(argv)


def main():
    cmd_args = get_args(sys.argv[1:])
    downloaded = get_deb(cmd_args.build_number, customization=cmd_args.customization)
    logger.info(f"{cmd_args.build_number} was {'' if not downloaded else 'not '}downloaded")
    return sys.exit(downloaded)


if __name__ == "__main__":
    main()
