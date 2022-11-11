import asyncio
from functools import wraps
import logging
import json
import time
import traceback
import functools
from enum import Enum
from typing import Union, List, Tuple, Dict, Callable

from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from requests.exceptions import HTTPError
from django.http import HttpResponse, QueryDict, HttpResponseRedirect
from rest_framework.exceptions import UnsupportedMediaType, ValidationError
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status

logger = logging.getLogger(__name__)

class ErrorCodes(Enum):
    ok = 'ok'

    # not authorizes

    # Cloud DB errors:
    cloud_invalid_response = 'cloudInvalidResponse'
    vms_request_failure = 'vmsRequestFailure'

    # Portal critical errors (unexpected)
    portal_critical_error = 'portalError'

    # Validation errors
    not_authorized = 'notAuthorized'
    wrong_parameters = 'wrongParameters'
    wrong_code = 'wrongCode'
    wrong_old_password = 'wrongOldPassword'
    wrong_password = 'wrongPassword'

    # CLOUD DB specific errors
    forbidden = 'forbidden'
    account_activated = 'accountActivated'
    account_not_activated = 'accountNotActivated'
    account_blocked = 'accountBlocked'
    not_found = 'notFound'  # Account not found, activation code not found and so on
    account_exists = 'alreadyExists'
    db_error = 'dbError'
    network_error = 'networkError'
    not_implemented = 'notImplemented'
    unknown_realm = 'unknownRealm'
    bad_username = 'badUsername'
    bad_request = 'badRequest'
    invalid_nonce = 'invalidNonce'
    service_unavailable = 'serviceUnavailable'
    unknown_error = 'unknownError'
    unsupported_media_type = 'unsupportedMediaType'
    credentials_removed_permanently = 'credentialsRemovedPermanently'
    user_password_required = 'userPasswordRequired'

    response_serialization_error = 'responseSerializationError'
    deserialization_error = 'deserializationError'
    not_acceptable = 'notAcceptable'

    def log_level(self):
        if self in info_level_errors:
            return logging.INFO

        if self in warning_level_errors:
            return logging.WARNING
        return logging.ERROR


info_level_errors = (
                ErrorCodes.account_activated,
                ErrorCodes.account_exists,
                ErrorCodes.account_not_activated,
                ErrorCodes.bad_username,
                ErrorCodes.ok,
                ErrorCodes.not_authorized,
                ErrorCodes.not_found,
                ErrorCodes.wrong_old_password,
                ErrorCodes.wrong_password)

warning_level_errors = (
                ErrorCodes.account_blocked,
                ErrorCodes.cloud_invalid_response,
                ErrorCodes.forbidden,
                ErrorCodes.invalid_nonce,
                ErrorCodes.wrong_code,
                ErrorCodes.wrong_parameters,
                ErrorCodes.unsupported_media_type,
                ErrorCodes.credentials_removed_permanently)


def create_response_with_cookies(data, status_code, cookies, additional_headers=None):
    from rest_framework.response import Response
    response = Response(data, status=status_code, headers=additional_headers)
    if cookies is not None:
        for name, value in cookies.items():
            if value == '':
                response.delete_cookie(name)
            elif isinstance(value, dict):
                response.set_cookie(name, **value)
            else:
                response.set_cookie(name, value, httponly=True, secure=True)
    return response


def api_success(data=None, status_code=status.HTTP_200_OK, cookies=None, additional_headers=None):
    if data is None:
        data = {
            'resultCode': ErrorCodes.ok.value
        }
    return create_response_with_cookies(data, status_code, cookies, additional_headers)


def require_params(request, param_list_or_dict: Union[List[str], Tuple[str], Dict[str, Callable]]):
    """[summary]

    Args:
        request (Request): Request to check
        param_list_or_dict (Union[List[str], Tuple[str], Dict[str, Callable]]): Either a list or tuple or required params or a dict with validator functions.

    Raises:
        APIRequestException: Raises when a ValidationError is raised by either a missing param or by a validator
    """
    error_data = {}
    try:
        for param in param_list_or_dict:
            if request.method == "POST" and (not (data := getattr(request, 'data', request.POST)) or not (post_data := data.get(param))):
                error_data[param] = ['This field is required.']
            elif request.method == "GET" and (param not in request.GET):
                error_data[param] = ['This field is required.']

            if isinstance(param_list_or_dict, dict) and (validator := param_list_or_dict.get(param)):
                data_to_validate = post_data if post_data is not None else request.GET.get(param)

                try:
                    error_message = validator(data_to_validate)

                    if error_message:
                        # Allows either a validator that raises a ValidatorError or returns an error message
                        raise ValidationError(error_message)

                except ValidationError as e:
                    error_data[param] = [e.detail]

    # Files with xml content type break when accessing data
    except UnsupportedMediaType as e:
        raise APIRequestException(e.detail, ErrorCodes.unsupported_media_type)

    if error_data:
        raise APIRequestException('Parameters are missing', ErrorCodes.wrong_parameters,
                                  error_data=error_data)


class APIException(Exception):
    error_text = 'Unexpected error'
    error_code = ErrorCodes.unknown_error
    error_data = None
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR

    def __init__(self, error_text, error_code, error_data=None,
                 status_code=status.HTTP_500_INTERNAL_SERVER_ERROR):
        if error_code is None:
            error_code = status_code

        if isinstance(error_code, str):
            try:
                error_code = ErrorCodes(error_code)
            except ValueError:
                logger.error(f'Unexpected error code {error_code}')

        self.error_data = error_data
        self.error_code = error_code
        self.error_text = error_text
        self.status_code = status_code
        super(Exception, self).__init__(error_text)

    def response(self):
        result_code = self.error_code
        if isinstance(self.error_code, ErrorCodes):
            result_code = self.error_code.value

        return Response({
                'resultCode': result_code,
                'errorText': self.error_text,
                'errorData': self.error_data
            }, status=self.status_code)

    def log_level(self):
        if isinstance(self.error_code, ErrorCodes):
            return self.error_code.log_level()
        return logging.ERROR


class APIInternalException(APIException):
    # 500 error - internal server error
    def __init__(self, error_text, error_code, error_data=None):
        super(APIInternalException, self).__init__(error_text, error_code, error_data=error_data,
                                                   status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


class APIServiceException(APIException):
    # 503 error - service unavailable
    def __init__(self, error_text, error_code, error_data=None):
        super(APIServiceException, self).__init__(error_text, error_code, error_data=error_data,
                                                  status_code=status.HTTP_503_SERVICE_UNAVAILABLE)


class APINotFoundException(APIException):
    # 404 error - not found
    def __init__(self, error_text, error_code=ErrorCodes.not_found, error_data=None):
        super(APINotFoundException, self).__init__(error_text, error_code, error_data=error_data,
                                                   status_code=status.HTTP_404_NOT_FOUND)


class APIForbiddenException(APIException):
    # 403 error - action is forbidden
    def __init__(self, error_text, error_code=ErrorCodes.not_authorized, error_data=None):
        super(APIForbiddenException, self).__init__(error_text, error_code,
                                                    error_data=error_data,
                                                    status_code=status.HTTP_403_FORBIDDEN)


class APINotAuthorisedException(APIException):
    # 401 error - user is not authorized
    def __init__(self, error_text, error_code=ErrorCodes.not_authorized, error_data=None):
        super(APINotAuthorisedException, self).__init__(error_text,
                                                        error_code,
                                                        error_data=error_data,
                                                        status_code=status.HTTP_401_UNAUTHORIZED)


class APIRequestException(APIException):
    # 400 error - bad request
    def __init__(self, error_text, error_code, error_data=None):
        super(APIRequestException, self).__init__(error_text, error_code, error_data=error_data,
                                                  status_code=status.HTTP_400_BAD_REQUEST)


class APILogicException(APIException):
    # 200. but some error occurred
    def __init__(self, error_text, error_code, error_data=None):
        super(APILogicException, self).__init__(error_text, error_code, error_data=error_data,
                                                status_code=status.HTTP_200_OK)

vms_errors = {
    status.HTTP_500_INTERNAL_SERVER_ERROR: APIInternalException,
    status.HTTP_503_SERVICE_UNAVAILABLE: APIServiceException,
    status.HTTP_404_NOT_FOUND: APINotFoundException,
    status.HTTP_403_FORBIDDEN: APIForbiddenException,
    status.HTTP_401_UNAUTHORIZED: APINotAuthorisedException,
    status.HTTP_400_BAD_REQUEST: APIRequestException,
}

def validate_mediaserver_response(func):
    def validate_error(response_data):
        if 'resultCode' not in response_data or 'errorText' not in response_data:
            raise APIInternalException('No valid error message from gateway', ErrorCodes.cloud_invalid_response)

    def validator(*args, **kwargs):
        response = func(*args, **kwargs)

        if response.status_code == status.HTTP_204_NO_CONTENT:  # No content
            return None

        # 1. Validate JSON response. If not a json - raise exception
        # Treat JSON response problems as Internal Server Errors
        try:
            response_data = response.json()
        except ValueError:
            response_data = None

        if vms_error := vms_errors.get(response.status_code, False):
            if not response_data:
                raise vms_error(response.text, error_code=ErrorCodes.unknown_error)

            validate_error(response_data)
            raise vms_error(response_data['errorText'], error_code=response_data['resultCode'],
                                               error_data=response_data)
        # everything is OK - return server's response
        return response_data

    return validator

response_errors = {
    status.HTTP_500_INTERNAL_SERVER_ERROR: APIInternalException,
    status.HTTP_503_SERVICE_UNAVAILABLE: APIServiceException,
    status.HTTP_404_NOT_FOUND: APINotFoundException,
    # HTTP_403_FORBIDDEN
    status.HTTP_401_UNAUTHORIZED: APINotAuthorisedException,
    status.HTTP_400_BAD_REQUEST: APIRequestException,
}

logic_errors = {
    "forbidden": APINotAuthorisedException,
    "not_authorized": APINotAuthorisedException,
    "notAuthorized": APINotAuthorisedException,
}


def validate_response(func):
    def validate_error(response_data):
        if 'resultCode' not in response_data or 'errorText' not in response_data:
            raise APIInternalException('No valid error message from cloud_db', ErrorCodes.cloud_invalid_response)

    @wraps(func)
    def validator(*args, **kwargs):
        response = func(*args, **kwargs)

        if response.status_code == status.HTTP_204_NO_CONTENT:  # No content
            return None

        # 1. Validate JSON response. If not a json - raise exception
        # Treat JSON response problems as Internal Server Errors
        try:
            response_data = response.json()
        except ValueError:
            raise APIInternalException(
                f'No JSON data from cloud_db (code:{response.status_code}) {response.text}', ErrorCodes.cloud_invalid_response)

        if response.status_code in response_errors:
            validate_error(response_data)
            raise response_errors[response.status_code](response_data['errorText'],
                                                        error_code=response_data['resultCode'],
                                                        error_data=response_data)

        # Check error_code status - raise APILogicException
        if (result_code := isinstance(response_data, dict) and response_data.get('resultCode', False)) and result_code != ErrorCodes.ok.value:
            validate_error(response_data)
            if result_code in logic_errors:
                raise logic_errors[result_code](response_data['errorText'],
                                                error_code=result_code,
                                                error_data=response_data)
            raise APILogicException(response_data['errorText'], result_code, error_data=response_data)

        # everything is OK - return server's response
        return response_data

    return validator


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    return x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get('REMOTE_ADDR')



def clean_passwords(dictionary):
    if isinstance(dictionary, dict):
        if 'password' in dictionary:
            dictionary['password'] = '*****'
        if 'new_password' in dictionary:
            dictionary['new_password'] = '****'
        if 'old_password' in dictionary:
            dictionary['old_password'] = '***'
        if 'system' in dictionary and 'authKey' in dictionary['system']:
            dictionary['system']['authKey'] = '**'


def log_error(request, error, log_level):
    page_url = 'unknown'
    user_name = 'not authorized'
    request_data = ''
    ip = 'unknown'
    login_type = 'temp key'
    session_time = 0

    if isinstance(request, Request) or getattr(request, 'is_mock_request', False):
        page_url = request.build_absolute_uri()
        try:
            request_data = request.data
        # Files with xml content type break when accessing data
        except UnsupportedMediaType:
            request_data = {}
        ip = get_client_ip(request)
        if not isinstance(request.user, AnonymousUser):
            user_name = request.user.email
        if request.session:
            if 'login' in request.session:
                login_type = 'email and password'
            if request_session_time := request.session.get('time', False):
                session_time = (time.time() - request_session_time)/1000.0

    if isinstance(request_data, QueryDict):
        request_data = request_data.dict()

    if isinstance(error, APIException):
        error_text = f"{error.error_text}({error.error_code})"
        if error.error_data:
            clean_passwords(error.error_data)
        error_formatted = f"Status: {error.status_code}, Message: {error.error_text}, Result code: {error.error_code}, Data: {json.dumps(error.error_data, indent=4, separators=(',', ': '))}"
    else:
        error_text = 'unknown'
        error_formatted = 'Unexpected error'

    clean_passwords(request_data)

    if log_level == logging.INFO:
        error_formatted = f'{error.__class__.__name__}:{error_text}\nUser: {user_name} Login: {login_type} Session Time: {session_time} IP: {ip}\n{page_url} Request: {request_data}'
    else:
        error_formatted = f'{error.__class__.__name__}:{error_text}\nUser: {user_name} Login: {login_type} Session Time: {session_time} IP: {ip}\n{page_url} Request: {request_data}\n{error_formatted}\nCall Stack: \n{traceback.format_exc().replace("Traceback", "")}'
    # Explicit check so that it will not affect superusers.
    if request.user.is_authenticated and request.user.pk and 'ignore_exceptions' in request.user.global_permissions:
        log_level = logging.INFO

    # Lower log level of merge errors
    elif hasattr(error, "error_text") and error.error_text in ["DUPLICATE_MEDIASERVER_FOUND", "FAIL", "INCOMPATIBLE"]:
        log_level = logging.WARNING

    logger.log(log_level, error_formatted)
    return error_formatted


def kill_session(request):
    from django.contrib.auth import logout
    request.session.pop('access_token', None)
    request.session.pop('refresh_token', None)
    request.session.pop('timezone', None)
    request.session.pop('time', None)
    logout(request)


def kill_tokens(request, delete_token=None):
    if not delete_token:
        raise APIInternalException('No delete function was specified', ErrorCodes.unknown_error)
    for key in ['refresh_token', 'access_token']:
        token = request.session.get(key)
        if token:
            try:
                delete_token(request, token)
            except (APINotAuthorisedException, APILogicException, HTTPError):
                pass
            request.session[key] = None


def handler(request, exception):
    if isinstance(exception, APINotAuthorisedException):
        log_error(request, exception, exception.log_level())
        # check if user session exist
        # and kill it if user is not authorized
        if 'login' in request.session:
            kill_session(request)

        return exception.response()

    elif isinstance(exception, APIException):
        # Do not log not_authorized errors
        log_error(request, exception, exception.log_level())

        return exception.response()
    else:
        detailed_error = log_error(request, exception, logging.ERROR)

        if not settings.DEBUG:
            detailed_error = 'Unexpected error somewhere inside'

        return Response({
            'resultCode': status.HTTP_500_INTERNAL_SERVER_ERROR,
            'errorText': detailed_error
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def handle_exceptions(func):
    """
    Decorator for api_methods to handle all unhandled exception and return some reasonable response for a client
    :param func:
    :return:
    """

    view_is_async = asyncio.iscoroutinefunction(func)

    if view_is_async:
        @functools.wraps(func)
        async def caller(*args, **kwargs):
            # noinspection PyBroadException
            try:
                data = await func(*args, **kwargs)
                if not isinstance(data, (Response, HttpResponseRedirect, HttpResponse)):
                    return Response(data, status=status.HTTP_200_OK)
                return data
            except Exception as exception:
                return handler(args[0], exception)
    else:
        @functools.wraps(func)
        def caller(*args, **kwargs):
            # noinspection PyBroadException
            try:
                data = func(*args, **kwargs)
                if not isinstance(data, (Response, HttpResponseRedirect, HttpResponse)):
                    return Response(data, status=status.HTTP_200_OK)
                return data
            except Exception as exception:
                return handler(args[0], exception)

    return caller
