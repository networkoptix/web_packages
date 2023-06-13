import argparse
import logging
import os

import requests

_GITLAB_URL = 'https://gitlab.nxvms.dev'
_PROJECT_REPO_NAME = 'dev%2Fcloud_portal'
_PRIVATE_TOKEN = os.environ.get('GITLAB_API_TOKEN')


def _parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('commit_id', type=str)
    parser.add_argument('return_code', type=int)
    parser.add_argument('report_url', type=str)
    return parser.parse_args()


def _post_run_status(commit_id, return_code, report_url):
    # TODO: Need to update how job status is reported so that it doesn't pass/fail the entire pipeline
    # response = requests.post(
    #     f'{_GITLAB_URL}/api/v4/projects/{_PROJECT_REPO_NAME}/statuses/{commit_id}',
    #     json={
    #         'name': 'Smoke tests',
    #         'state': 'success' if return_code == 0 else 'failed',
    #         'target_url': report_url,
    #     },
    #     headers={'PRIVATE-TOKEN': _PRIVATE_TOKEN}
    # )
    # response.raise_for_status()

    pass


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    parsed_args = _parse_args()
    _post_run_status(
        parsed_args.commit_id, parsed_args.return_code, parsed_args.report_url)
