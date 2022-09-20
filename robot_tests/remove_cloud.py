import argparse
import logging

from cloud_manager import remove_cloud


def _parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('cloud_host', type=str)
    return parser.parse_args()


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    parsed_args = _parse_args()
    remove_cloud(parsed_args.cloud_host)
