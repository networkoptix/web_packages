import argparse
import logging

from cloud_manager import get_cloud_host


def _parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('job_url', type=str)
    return parser.parse_args()


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    parsed_args = _parse_args()
    cloud_host = get_cloud_host(parsed_args.job_url)
    print(cloud_host)
