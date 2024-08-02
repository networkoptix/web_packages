import datetime
import typing
import uuid

import httpx
import structlog
from django.conf import settings
from django.utils import timezone
from drf_standardized_errors.handler import ExceptionHandler
from drf_standardized_errors.handler import \
    exception_handler as standardized_exception_handler
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import exception_handler

from tools.exception import APIErrorWithoutRollback


logger = structlog.get_logger(__name__)


def get_period_start():
    return timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def get_path_from_parent(parent) -> typing.List[uuid.UUID]:
    path = [parent.id] + (parent.path or [])
    return path


class CustomExceptionHandler(ExceptionHandler):

    def set_rollback(self) -> None:
        if isinstance(self.exc, APIErrorWithoutRollback):
            return
        super().set_rollback()


def custom_exception_handler_v2(exc, context):
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


def custom_exception_handler(exc, context):
    version = getattr(context.get('request'), 'version', 'v2')
    if (
            version == 'v2'
            or not isinstance(exc, APIException)
            or isinstance(exc, APIForwardException)
            or isinstance(exc, APIErrorWithoutRollback)
    ):
        # v2 exception handler must be used to pass some data to the client when
        #   - forward_cdb_resp is used
        #   - APIErrorWithoutRollback is raised within system authentication to pass resultCode
        #   - to render unexpected exceptions in a regular DRF way
        return custom_exception_handler_v2(exc, context)
    return standardized_exception_handler(exc, context)


class APIForwardException(APIException):
    pass


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
        status_code = response.status_code

        logger.error("Unable to decode response from CDB",
                     status_code=status_code,
                     content=content)

        if settings.DEBUG:
            detail = content
        else:
            detail = None
    if via_exception:
        exception = APIForwardException(detail=detail)
        exception.status_code = response.status_code
        raise exception
    return Response(
        data=detail,
        status=response.status_code,
        content_type=response.headers.get('content-type'))


def cast_uuid(uid: str | uuid.UUID | None) -> str | uuid.UUID | None:
    if uid is None:
        return None
    if isinstance(uid, uuid.UUID):
        return uid
    if isinstance(uid, str):
        try:
            return uuid.UUID(uid)
        except ValueError:
            return uid
    raise TypeError(f"Expected UUID or str, got {type(uid)}, value {uid}.")


def get_today() -> datetime.date:
    return datetime.datetime.utcnow().date()


def get_license_server_client() -> httpx.Client:
    client = httpx.Client(base_url=f'{settings.LICENSE_SERVER}')
    return client


class Singleton(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super(Singleton, cls).__call__(*args, **kwargs)
        return cls._instances[cls]
