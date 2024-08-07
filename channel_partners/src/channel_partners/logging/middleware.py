import time
from typing import Callable

import structlog
from django import http
from django.db import connection

from partners.services.caching.dependent_view_cache import (
    CACHE_STATUS_HEADER_KEY,
)


logger = structlog.get_logger(__name__)

START_TIME_ATTRIBUTE = "start_time"


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
