import argparse
import logging

from cloud_manager import request_deployment


def _parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('backend_revision', type=str)
    parser.add_argument('frontend_revision', type=str)
    return parser.parse_args()


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    parsed_args = _parse_args()
    job_url = request_deployment(
        parsed_args.backend_revision, parsed_args.frontend_revision)
    print(job_url)
