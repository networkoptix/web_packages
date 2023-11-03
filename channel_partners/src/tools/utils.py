"""
Only common utils/helpers without imports apps and models
"""
from logging import getLogger

import httpx
from django.conf import settings
from django.http import HttpRequest
from nx_cloud_api_client.apis import BatchRequestItems, CdbSystemAPIBase
from nx_cloud_api_client.base_auth import BearerTokenAuth
from nx_cloud_api_client.client import NxCloudAPISyncClient
from rest_framework.response import Response

logger = getLogger(__name__)


def get_auth_header(request: HttpRequest) -> dict:
    auth_header = {'Authorization': request.headers['Authorization']}
    return auth_header


def bind_system_to_cdb_organization(cloud_host, access_token, organization_id, system_id, name, customization, opaque):
    with NxCloudAPISyncClient(host=cloud_host) as cdb_client:
        response = cdb_client.organizations.bind(organization_id=organization_id, id=system_id, name=name, customization=customization, opaque=opaque, auth=BearerTokenAuth(token=access_token))
        try:
            system_response = response.json()
        except httpx.DecodingError as exception:
            logger.error(f'Error binding system to CDB:\n'
                         f'Request Headers: {response.request.headers}\n'
                         f'Request Content: {response.request.content}\n'
                         f'Response Headers: {response.headers}\n'
                         f'Response Content: {response.content}')
            raise exception

        return system_response, response.status_code


def make_batch_request(request: HttpRequest, data: BatchRequestItems) -> dict:
    # TODO: Remove once we have cloud_db updates
    if not settings.TESTING:
        return
    cloud_host = request.cloud_host.hostname
    with CdbSystemAPIBase(host=f'https://{cloud_host}', client=httpx.Client()) as api:
        response = api.systems_users_batch_request(batch_items=data, headers=get_auth_header(request))
    response.raise_for_status()
    batch_data = response.json()
    logger.info(f"Batch request has been sent: {batch_data}")
    return batch_data


def paginated_response(viewset, queryset, serializer_class, serializer_context=None) -> Response:
    page = viewset.paginate_queryset(queryset)
    if page is not None:
        serializer = serializer_class(page, many=True, context=serializer_context)
        return viewset.get_paginated_response(serializer.data)

    serializer = serializer_class(queryset, many=True, context=serializer_context)
    return Response(serializer.data)
