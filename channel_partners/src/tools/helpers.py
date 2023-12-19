import typing
import uuid

from rest_framework.response import Response
from rest_framework.views import exception_handler, set_rollback
from rest_framework import exceptions
from django.utils import timezone

from tools.exception import APIErrorWithoutRollback


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