from rest_framework.exceptions import UnsupportedMediaType
from rest_framework.views import exception_handler
from cloud.helpers.exceptions import clean_passwords, handler
import logging

logger = logging.getLogger(__name__)


def cloud_exception_handler(exc, context):
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)
    request = context['request']

    # If response is not None, it is handled by drf
    if response is not None:
        try:
            request_data = request.data.copy()
        # Files with xml content type break when accessing data
        except UnsupportedMediaType:
            request_data = {}

        clean_passwords(request_data)
        # TODO: Revisit once notification throttling is decided
        # if response.status_code == 401 and request.path.startswith('/api/notifications'):
        #     logger.warning(f'Request: {request_data}\n'
        #                    f'Error: {exc}')
        # else:
        logger.info(f'Request: {request_data}\n'
                    f'Error: {exc}')
        return response
    else:
        return handler(request, exc)
