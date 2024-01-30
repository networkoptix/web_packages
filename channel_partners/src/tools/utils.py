"""
Only common utils/helpers without imports apps and models
"""
import json
import typing

import httpx
import structlog
from httpx import Response
from nx_cloud_api_client.base_auth import BearerTokenAuth
from nx_cloud_api_client.client import NxCloudAPISyncClient

from tools.nx_cloud_api_client_factory import NxCloudApiClientFactory


logger = structlog.get_logger(__name__)


def bind_system_to_cdb_organization(
        cloud_host: str,
        access_token: str,
        organization_id: str,
        system_id: str,
        name: str,
        customization: str,
        opaque: str | None
) -> typing.Tuple[typing.Any, int]:
    client: NxCloudAPISyncClient = NxCloudApiClientFactory.get_sync_client(host=cloud_host)

    response: Response = client.system.bind(
        id=system_id,
        name=name,
        customization=customization,
        opaque=opaque or '',
        organization_id=organization_id,
        auth=BearerTokenAuth(token=access_token))

    try:
        body = response.json()
        return body, response.status_code
    except (httpx.DecodingError, json.JSONDecodeError) as exception:
        logger.error("Unable to bind system to CDB",
                     request_headers=response.request.headers,
                     request_content=response.request.content,
                     response_status_code=response.status_code,
                     response_headers=response.headers,
                     response_content=response.content,
                     exception=exception)
        raise exception


def paginated_response(viewset, queryset, serializer_class, serializer_context=None) -> Response:
    page = viewset.paginate_queryset(queryset)
    if page is not None:
        serializer = serializer_class(page, many=True, context=serializer_context)
        return viewset.get_paginated_response(serializer.data)

    serializer = serializer_class(queryset, many=True, context=serializer_context)
    return Response(serializer.data)
