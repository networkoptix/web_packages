import functools

from django.core.handlers.wsgi import WSGIRequest
from rest_framework.request import Request

ERROR_CHECKING_REQUEST = 'Some error occurred when checking request'
ERROR_ONLY_SUPERUSERS = 'This feature is only allowed for superusers'


def get_request_argument(*args, **kwargs):
    request_types = (WSGIRequest, Request)
    request_argument = req_from_kwargs if (req_from_kwargs := kwargs.get('request', False)) and isinstance(
        req_from_kwargs, request_types) else next((arg for arg in args if isinstance(arg, request_types)), None)
    if request_argument is None:
        raise PermissionError(ERROR_CHECKING_REQUEST)
    return request_argument


def validate_is_superuser(*args, **kwargs):
    """Validator for use with check_feature_flag. Returns error string if not superuser.

    Returns:
        [ERROR_ONLY_SUPERUSERS | False]: Returns error string if not superuser
    """
    request = get_request_argument(*args, **kwargs)
    if not request.user.is_superuser:
        return ERROR_ONLY_SUPERUSERS
    return False


def get_feature_flag_error(flag, user):
    return f'Feature {flag} is currently not enabled for user {user}'


def check_feature_flag(flags, custom_validator=None, error_class=PermissionError):
    """Decorator that wraps and adds some additional functionality to flag_is_active. Can be
    applied to either functions or methods, it will check for either a kwarg reqest, or the
    first arg that's a request.

    Args:
        flags (FLAGS): Feature flag to check against request. Could either accept a single
         flag or a list of flags
        custom_validator (function, optional): Optionally accepts function to run custom
         validation in addition to checking flags. Should error message if validation
          failed. Defaults to None.
        error_class ([Exception], optional): Exception to raise if either flag is
         not active or custom_validator returns False. Defaults to PermissionError.
    """

    def flag_checker(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            from waffle import flag_is_active

            request = get_request_argument(*args, **kwargs)
            flags_to_check = [flags] if isinstance(flags, str) else flags
            for flag in flags_to_check:
                if not flag_is_active(request, flag):
                    raise error_class(
                        get_feature_flag_error(flag, request.user))
            else:
                if custom_validator and (validator_message := custom_validator(*args, **kwargs)):
                    raise error_class(validator_message)

            return func(*args, **kwargs)

        return wrapper

    return flag_checker
