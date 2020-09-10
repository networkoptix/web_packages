from rest_framework.views import exception_handler
from api.helpers.exceptions import clean_passwords, handler
import logging

logger = logging.getLogger(__name__)


def cloud_exception_handler(exc, context):
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)
    request = context['request']

    # If response is not None, it is handled by drf
    if response is not None:
        request_data = request.data.copy()
        clean_passwords(request_data)
        logger.info(f'Request: {request_data}\n'
                    f'Error: {exc}')
        return response
    else:
        return handler(request, exc)
