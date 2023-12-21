import typing
import uuid
from logging import getLogger

import httpx
from rest_framework.views import exception_handler
from django.conf import settings
from django.utils import timezone
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from tools.exception import APIErrorWithoutRollback

logger = getLogger(__name__)


def get_period_start():
    return timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def get_path_from_parent(parent) -> typing.List[uuid.UUID]:
    path = [parent.id] + (parent.path or [])
    return path


def custom_exception_handler(exc, context):
    if isinstance(exc, APIErrorWithoutRollback):
        headers = {}
        if getattr(exc, 'auth_header', None):
            headers['WWW-Authenticate'] = exc.auth_header
        if getattr(exc, 'wait', None):
            headers['Retry-After'] = '%d' % exc.wait

        if isinstance(exc.detail, (list, dict)):
            data = exc.detail
        else:
            data = {'detail': exc.detail}

        return Response(data, status=exc.status_code, headers=headers)
    return exception_handler(exc, context)


def forward_cdb_resp(response: httpx.Response, via_exception=False) -> Response:
    """
    Forwards response data from cdb to rest_framework view response.
    Params:
        response: original response from CDB
        via_exception: if set to true then raises APIException with data
         and status code from original response
    """
    if response.headers.get('content-type') == 'application/json' and response.content:
        detail = response.json()
    else:
        content = response.content.decode()
        logger.error(f'Cannot parse CDB response. Status: {response.status_code}')
        logger.error(f'Cannot parse CDB response. Content: {content}')
        if settings.DEBUG:
            detail = content
        else:
            detail = None
    if via_exception:
        exception = APIException(detail=detail)
        exception.status_code = response.status_code
        raise exception
    return Response(data=detail, status=response.status_code,
                    content_type=response.headers.get('content-type'))
