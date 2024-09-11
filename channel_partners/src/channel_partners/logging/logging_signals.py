import time

import structlog
from django.db import connection
from django.dispatch import receiver
from django.http import HttpRequest
from django_structlog import signals

from channel_partners.utils import (
    get_request_internal,
    standardize_path,
)


"""
Initially attempted to place into logging_config.py, but it was causing multiple tests to fail. 

The resolution was to move this receiver to a separate file and now all works as expected.
"""


# TODO: Add response time to these
# @receiver(signals.bind_extra_request_failed_metadata)
# @receiver(signals.bind_extra_request_finished_metadata)
# ------------------------------------------------------ #


@receiver(signals.bind_extra_request_metadata)
def bind_additional_request_metadata(request: HttpRequest, logger, **kwargs):
    """
    Binds additional request metadata to the structlog context for logging purposes.
    Adds 'cloud_host' and 'clean_path' variables to the structlog context.

    :param request: The HTTP request object.
    :type request: HttpRequest
    :param logger: The logger object (unused).
    :param kwargs: Additional keyword arguments (unused).
    """
    normalized_path: str = standardize_path(request.path)

    structlog.contextvars.bind_contextvars(
        path=request.path,
        normalized_path=normalized_path,
        method=request.method
    )


@receiver(signals.bind_extra_request_failed_metadata)
def bind_failed_request_metadata(request: HttpRequest, logger, **kwargs):
    """
    Binds additional metadata for failed requests to the structlog context.

    :param request: The HTTP request object.
    :type request: HttpRequest
    :param logger: The logger object (unused).
    :param kwargs: Additional keyword arguments (unused).
    """
    start_time = get_request_internal(request, 'start_time')
    end_time = time.time()
    request_duration_ms = int((end_time - start_time) * 1000) if start_time else None

    initial_query_count: int = get_request_internal(request, 'initial_query_count')
    final_query_count: int = len(connection.queries)
    queries_during_request: int = final_query_count - initial_query_count if initial_query_count is not None else None

    cps_cache = get_request_internal(request, 'cps_cache')

    structlog.contextvars.bind_contextvars(
        request_duration_ms=request_duration_ms,
        db_queries=queries_during_request,
        cps_cache=cps_cache
    )
