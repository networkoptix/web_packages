"""
Only common utils/helpers without imports apps and models
"""
from logging import getLogger

import httpx
from django.http import HttpRequest
from nx_cloud_api_client.apis import BatchRequestItems, CdbSystemAPIBase

logger = getLogger(__name__)

def get_auth_header(request: HttpRequest) -> dict:
    auth_header = {'Authorization': request.headers['Authorization']}
    return auth_header


def make_batch_request(request: HttpRequest, data: BatchRequestItems) -> dict:
    cloud_host = request.cloud_host.hostname
    with CdbSystemAPIBase(host=f'https://{cloud_host}', client=httpx.Client()) as api:
        response = api.systems_users_batch_request(batch_items=data, headers=get_auth_header(request))
    response.raise_for_status()
    batch_data = response.json()
    logger.info(f"Batch request has been sent: {batch_data}")
    return batch_data
