from enum import StrEnum

from rest_framework import status
from rest_framework.exceptions import (
    APIException,
    _get_error_details,
)


class ErrorCodes(StrEnum):
    # TODO ensure that all error codes are in camelCase
    # CLOUD-13665 Add unique error codes for all API errors
    permission_denied = 'permission_denied'
    legacy_license_no_service = 'legacyLicenseNoService'
    system_not_activated = 'systemNotActivated'
    system_is_shutdown = 'systemIsShutdown'
    service_quantity_exceeded = 'serviceQuantityExceeded'
    service_disabled = 'serviceDisabled'
    service_expired = 'serviceExpired'
    duplicated_service_quantity = 'duplicatedServiceQuantity'
    role_deletion_conflict = 'roleDeletionConflict'
    role_creation_conflict = 'roleCreationConflict'
    role_change_conflict = 'roleChangeConflict'
    wrong_service_id = 'wrongServiceId'
    credit_service_increased = 'creditServiceIncreased'
    invalid_token_scope = 'invalidTokenScope'
    invalid_token = 'invalidToken'


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