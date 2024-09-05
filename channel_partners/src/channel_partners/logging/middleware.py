import time
from typing import Callable

import structlog
import waffle
from django import http
from django.core.cache import caches
from django.db import connection

from channel_partners import settings
from channel_partners.settings import CACHE_STATUS_HEADER_KEY


logger = structlog.get_logger()

START_TIME_ATTRIBUTE = "start_time"


def is_debug_enabled() -> bool:
    local_cache = caches['waffle-local']
    is_debug_level = local_cache.get(settings.LOGGING_SWITCH_NAME, None)

    if is_debug_level is None:
        # If True, the debug level is enabled
        is_debug_level = waffle.switch_is_active(settings.LOGGING_SWITCH_NAME)
        local_cache.set(settings.LOGGING_SWITCH_NAME, is_debug_level)

    return is_debug_level

    # class DebugLevelFilter(logging.Filter):
    #     cache_timeout = REDIS_WAFFLE_TIMEOUT
    #     _last_update = None
    #
    #     def __init__(self, level: int):
    #         super().__init__()
    #         self.level: int = level
    #         self._last_update: float = -REDIS_WAFFLE_TIMEOUT - 1
    #
    #     def get_level(self) -> int:
    #         try:
    #             print("Checking levels")
    #             if time.monotonic() - self._last_update > self.cache_timeout:
    #                 self._last_update = time.monotonic()
    #                 self.level = logging.DEBUG if is_debug_enabled() else logging.INFO
    #                 print("Updated level")
    #         except Exception:
    #             # Avoid logging exceptions to prevent potential logging loops or performance issues
    #             pass
    #         return self.level

    # def filter(self, record):
    #     return record.levelno <= self.get_level()


class RequestTimerMiddleware:
    """
    Middleware to measure and log the duration of request processing.

    This middleware records the start time of a request, processes the request,
    then calculates and logs the total processing time before returning the response.
    """

    def __init__(self, get_response: Callable[[http.HttpRequest], http.response.HttpResponseBase]) -> None:
        """
        Initialize the middleware with the next middleware or view in the chain.

        :param get_response: A callable that takes an HttpRequest and returns an HttpResponse.
        """
        self.get_response = get_response

    def __call__(self, request: http.HttpRequest) -> http.response.HttpResponseBase:
        """
        Record the start time, process the request, and log the processing duration.

        :param request: The HttpRequest object.
        :return: The HttpResponse object from the next middleware or view.
        """
        # Start timing the request.
        start_time = time.time()

        # Process the request.
        response = self.get_response(request)

        # Calculate and log the duration.
        duration_ms = int((time.time() - start_time) * 1000)
        structlog.contextvars.bind_contextvars(request_duration_ms=duration_ms)

        # Attempt to get the cps_cache header from the response and set it in the logger
        cps_cache = response.get(CACHE_STATUS_HEADER_KEY, None)
        structlog.contextvars.bind_contextvars(cps_cache=cps_cache)

        return response


class DBQueryLoggerMiddleware:
    """
    Middleware to log the number of database queries made during the request processing.
    """

    def __init__(self, get_response: Callable[[http.HttpRequest], http.response.HttpResponseBase]) -> None:
        """
        Initialize the middleware with the next middleware or view in the chain.

        :param get_response: A callable that takes an HttpRequest and returns an HttpResponse.
        """
        self.get_response = get_response

    def __call__(self, request: http.HttpRequest) -> http.response.HttpResponseBase:
        """
        Count DB queries, process the request, and log the number of DB queries.

        :param request: The HttpRequest object.
        :return: The HttpResponse object from the next middleware or view.
        """
        # Count initial queries.
        initial_query_count = len(connection.queries)

        # Process the request.
        response = self.get_response(request)

        # Calculate and log the number of queries during the request.
        final_query_count = len(connection.queries)
        queries_during_request = final_query_count - initial_query_count

        structlog.contextvars.bind_contextvars(db_queries=queries_during_request)

        return response
