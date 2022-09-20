import argparse
import logging

from cloud_manager import wait_for_cloud


def _parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('job_url', type=str)
    return parser.parse_args()


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    parsed_args = _parse_args()
    cloud_host = wait_for_cloud(parsed_args.job_url)
    print(cloud_host)
