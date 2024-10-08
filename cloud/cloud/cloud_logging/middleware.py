from typing import Callable
from django import http
import structlog
import time
from django.db import connection

from cloud.cloud_logging.utils import set_request_internal


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

        # Log the request and response details.
        if response.status_code >= 500:
            set_request_internal(request, queries_during_request=queries_during_request)
            set_request_internal(request, request_duration_ms=duration_ms)

        else:
            structlog.contextvars.bind_contextvars(
                db_queries=queries_during_request,
                request_duration_ms=duration_ms
            )

        return response
