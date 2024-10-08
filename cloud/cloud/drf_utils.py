import structlog
from rest_framework.exceptions import UnsupportedMediaType
from rest_framework.views import exception_handler

from cloud.customization_context import ContextExecutor
from cloud.helpers.exceptions import clean_passwords, handler
from cloud.utils import is_async

logger = structlog.getLogger(__name__)


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
        logger.warning("request_error", request_data=request_data, error=str(exc))
        return response
    else:
        # If in async context, run in separatee thread due to some db operations inside
        if is_async():
            with ContextExecutor(max_workers=1) as executor:
                return executor.submit(handler, request, exc).result()
        return handler(request, exc)
