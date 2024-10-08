import re


def set_request_internal(request, **kwargs):
    """
    Set key-value pairs in request._nx_internal.

    :param request: The HTTP request object.
    :param kwargs: Key-value pairs to set in request._nx_internal.
    """
    if not hasattr(request, "_nx_internal"):
        request._nx_internal = {}
    request._nx_internal.update(kwargs)


def get_request_internal(request, key, default=None):
    """
    Get a value from request._nx_internal.

    :param request: The HTTP request object.
    :param key: The key to retrieve from request._nx_internal.
    :param default: The default value to return if the key is not found.
    :return: The value from request._nx_internal or the default value.
    """
    if not hasattr(request, "_nx_internal"):
        return default
    return request._nx_internal.get(key, default)


def standardize_path(path: str) -> str:
    # RegEx for UUID
    regex = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
    regex_mail = "[^\/]+@[^\/?]+"
    return re.sub(regex_mail, '{email}', re.sub(regex, '{uuid}', path))
