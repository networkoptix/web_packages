"""
Only common utils/helpers without imports apps and models
"""
import json
import typing
from logging import getLogger

import httpx
from rest_framework.response import Response

from nx_cloud_api_client.base_auth import BearerTokenAuth
from nx_cloud_api_client.client import NxCloudAPISyncClient
from tools.nx_cloud_api_client_factory import NxCloudApiClientFactory

logger = getLogger(__name__)


def bind_system_to_cdb_organization(
        cloud_host: str,
        access_token: str,
        organization_id: str,
        system_id: str,
        name: str,
        customization: str,
        opaque: str
) -> typing.Tuple[typing.Any, int]:
    client: NxCloudAPISyncClient = NxCloudApiClientFactory.get_sync_client(host=cloud_host)

    response: Response = client.system.bind(
        id=system_id,
        name=name,
        customization=customization,
        opaque=opaque,
        organization_id=organization_id,
        auth=BearerTokenAuth(token=access_token))

    try:
        body = response.json()
        return body, response.status_code
    except (httpx.DecodingError, json.JSONDecodeError) as exception:
        logger.error(f'Error binding system to CDB:\n'
                     f'Request Headers: {response.request.headers}\n'
                     f'Request Content: {response.request.content}\n'
                     f'Response Status: {response.status_code}\n'
                     f'Response Headers: {response.headers}\n'
                     f'Response Content: {response.content}')
        raise exception


def paginated_response(viewset, queryset, serializer_class, serializer_context=None) -> Response:
    page = viewset.paginate_queryset(queryset)
    if page is not None:
        serializer = serializer_class(page, many=True, context=serializer_context)
        return viewset.get_paginated_response(serializer.data)

    serializer = serializer_class(queryset, many=True, context=serializer_context)
    return Response(serializer.data)
