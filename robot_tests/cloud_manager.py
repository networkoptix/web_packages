import json
import logging
import os
import time
from base64 import b64encode
from urllib.error import HTTPError
from urllib.request import Request, urlopen

_logger = logging.getLogger(__name__)

_JENKINS_URL = os.environ.get('JENKINS_URL', 'https://jenkins.ru.nxteam.dev')
_USER = os.environ.get('JENKINS_USERNAME', 'functests')
_API_TOKEN = os.environ['API_TOKEN']
_ENCODED_CREDENTIALS = b64encode(f'{_USER}:{_API_TOKEN}'.encode()).decode()
_AUTH_HEADER = {'Authorization': f'Basic {_ENCODED_CREDENTIALS}'}


def request_deployment(backend_revision: str, frontend_revision: str) -> str:
    request = Request(
        f'{_JENKINS_URL}/job/ft.cloud.runner/buildWithParameters?'
        f'BACKEND_REVISION={backend_revision}&'
        f'FRONTEND_REVISION={frontend_revision}',
        method='POST',
        headers=_AUTH_HEADER)
    response = urlopen(request)
    if response.status != 201:
        raise RuntimeError(
            f"Failed to run build job. Status code: {response.status}")
    job_queue_url = response.headers['location']
    return _wait_for_job(job_queue_url)


def wait_for_cloud(job_url: str) -> str:
    job_status = _wait_for_finish(job_url)
    if job_status != 'SUCCESS':
        raise RuntimeError(f"Cloud deployment failed: {job_url}")
    return get_cloud_host(job_url)


def remove_cloud(cloud_host: str):
    job_url = _request_removal(cloud_host)
    job_status = _wait_for_finish(job_url)
    if job_status != 'SUCCESS':
        raise RuntimeError(
            f"Failed to remove cloud {cloud_host}. Status: {job_status}")


def get_cloud_host(job_url: str) -> str:
    request = Request(
        f'{job_url}/artifact/CLOUD_HOST.envvar',
        method='GET',
        headers=_AUTH_HEADER)
    try:
        response = urlopen(request)
    except HTTPError as e:
        if e.code == 404:
            raise RuntimeError(f"Cloud host artifact not found: {job_url}") from None
        raise e
    raw_response = response.read().decode('utf-8')
    _logger.info(raw_response)
    _, host = raw_response.strip().split('=')
    return host


def _request_removal(cloud_host: str) -> str:
    request = Request(
        f'{_JENKINS_URL}/job/ft.cloud.remove-deployment/buildWithParameters'
        f'?CLOUD_HOST={cloud_host}',
        method='POST',
        headers=_AUTH_HEADER)
    response = urlopen(request)
    if response.status != 201:
        raise RuntimeError(
            f"Failed to run removal job. Status code: {response.status}")
    job_queue_url = response.headers['location']
    return _wait_for_job(job_queue_url)


def _wait_for_job(job_queue_url: str) -> str:
    timeout_sec = 90
    request = Request(
        f'{job_queue_url}/api/json', method='GET', headers=_AUTH_HEADER)
    _logger.info("Waiting for job to start")
    started_at = time.monotonic()
    while True:
        response = urlopen(request)
        json_response = json.loads(response.read())
        try:
            return json_response['executable']['url']
        except (KeyError, TypeError):
            pass
        if time.monotonic() - started_at >= timeout_sec:
            raise RuntimeError(f"Job didn't start after {timeout_sec} seconds")
        time.sleep(1)


def _wait_for_finish(job_url: str) -> str:
    timeout_sec = 40 * 60
    request = Request(f'{job_url}/api/json', method='GET', headers=_AUTH_HEADER)
    _logger.info("Waiting for job %s to finish", job_url)
    started_at = time.monotonic()
    while True:
        response = urlopen(request)
        json_response = json.loads(response.read())
        if result := json_response['result']:
            return result
        elapsed_time = time.monotonic() - started_at
        if elapsed_time >= timeout_sec:
            raise RuntimeError(f"Job didn't finish after {timeout_sec} seconds")
        _logger.info(
            "Job %s has not yet finished after %.2f seconds. "
            "Keep waiting", job_url, elapsed_time)
        time.sleep(10)
