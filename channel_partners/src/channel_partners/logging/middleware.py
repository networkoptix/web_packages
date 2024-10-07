import logging
import time
from typing import Callable

import structlog
import waffle
from django import http
from django.conf import settings
from django.core.cache import caches
from django.db import connection

from channel_partners.utils import set_request_internal


logger = structlog.get_logger(__name__)

START_TIME_ATTRIBUTE = "start_time"


def is_debug_enabled() -> bool:
    local_cache = caches['waffle-local']
    is_debug_level = local_cache.get(settings.LOGGING_SWITCH_NAME, None)

    if is_debug_level is None:
        # If True, the debug level is enabled
        is_debug_level = waffle.switch_is_active(settings.LOGGING_SWITCH_NAME)
        local_cache.set(settings.LOGGING_SWITCH_NAME, is_debug_level)

    return is_debug_level


class DebugLevelFilter(logging.Filter):
    cache_timeout = settings.REDIS_WAFFLE_TIMEOUT

    def __init__(self, level: int):
        super().__init__()
        self.level: int = level
        self._last_update: float = -settings.REDIS_WAFFLE_TIMEOUT - 1

    def get_level(self) -> int:
        try:
            if time.monotonic() - self._last_update > self.cache_timeout:
                self._last_update = time.monotonic()
                self.level = logging.DEBUG if is_debug_enabled() else logging.INFO
        except Exception:
            # Avoid logging exceptions to prevent potential logging loops or performance issues
            pass
        return self.level

    def filter(self, record):
        return record.levelno <= self.get_level()


class RequestLoggerMiddleware:
    """
    Middleware to log various request and response details including duration, database queries, headers, and more.
    """

    def __init__(self, get_response: Callable[[http.HttpRequest], http.response.HttpResponseBase]) -> None:
        """
        Initialize the middleware with the next middleware or view in the chain.

        :param get_response: A callable that takes an HttpRequest and returns an HttpResponse.
        """
        self.get_response = get_response

    def __call__(self, request: http.HttpRequest) -> http.response.HttpResponseBase:
        """
        Log various request and response details.

        :param request: The HttpRequest object.
        :return: The HttpResponse object from the next middleware or view.
        """
        # Start timing the request.
        start_time = time.time()
        set_request_internal(request, start_time=start_time)

        # Count initial queries.
        initial_query_count = len(connection.queries)
        set_request_internal(request, initial_query_count=initial_query_count)

        # Add Amazon Trace ID to the context
        structlog.contextvars.bind_contextvars(
            x_amzn_trace_id=request.META.get('HTTP_X_AMZN_TRACE_ID'),
            x_forwarded_for=request.META.get('HTTP_X_FORWARDED_FOR'),
            host=request.META.get('HTTP_HOST'),
            origin=request.META.get('HTTP_ORIGIN')
        )

        # Process the request.
        response = self.get_response(request)

        # Preform post-request enrichment.
        duration_ms = int((time.time() - start_time) * 1000)
        final_query_count = len(connection.queries)
        queries_during_request = final_query_count - initial_query_count
        cps_cache = response.get(settings.CACHE_STATUS_HEADER_KEY, None)

        # Log the request and response details.
        if response.status_code >= 500:
            set_request_internal(request, queries_during_request=queries_during_request)
            set_request_internal(request, request_duration_ms=duration_ms)
            set_request_internal(request, cps_cache=cps_cache)
        else:
            structlog.contextvars.bind_contextvars(
                db_queries=queries_during_request,
                request_duration_ms=duration_ms,
                cps_cache=cps_cache
            )

        return response
