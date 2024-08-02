from rest_framework import status
from rest_framework.exceptions import (
    APIException,
    _get_error_details,
)


class Conflict(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Request cannot be done due to conflict"
    default_code = 'conflict'


class APIErrorWithoutRollback(APIException):
    """
    Base class for REST framework exceptions.
    Subclasses should provide `.status_code` and `.default_detail` properties.
    """
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = 'A server error occurred.'
    default_code = 'error'

    def __init__(self, detail=None, code=None, status_code=None):
        if detail is None:
            detail = self.default_detail
        if code is None:
            code = self.default_code
        if status_code is not None:
            self.status_code = status_code

        self.detail = _get_error_details(detail, code)