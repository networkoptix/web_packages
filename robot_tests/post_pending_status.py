import argparse
import logging
import os

import requests

_GITLAB_URL = 'https://gitlab.nxvms.dev'
_PROJECT_REPO_NAME = 'dev%2Fcloud_portal'
_PRIVATE_TOKEN = os.environ.get('GITLAB_API_TOKEN')
_REPORT_URL = os.environ.get('BUILD_URL')


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument('commit_id', type=str)
    return parser.parse_args()


def _post_pending_status(commit_id: str):
    response = requests.post(
        f'{_GITLAB_URL}/api/v4/projects/{_PROJECT_REPO_NAME}/statuses/{commit_id}',
        json={
            'name': 'smoke-tests',
            'state': 'pending',
            'target_url': _REPORT_URL,
        },
        headers={'PRIVATE-TOKEN': _PRIVATE_TOKEN}
    )
    response.raise_for_status()


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    parsed_args = _parse_args()
    _post_pending_status(parsed_args.commit_id)
