import re
from typing import (
    Optional,
    Tuple,
)

from django.http import HttpRequest


class AllowRequestMixin:
    """
    Mixin to conditionally bypass throttling in Django REST Framework throttle classes.

    This mixin provides a custom `allow_request` method that integrates with Django REST
    Framework's throttling mechanism. It checks a condition defined in `_should_skip_throttle`
    to decide whether to bypass throttling for certain requests, particularly those targeting
    internal API endpoints.

    Attributes:
        _INTERNAL_PATH_PATTERN (re.Pattern): A compiled regular expression pattern used to
            match internal API paths. This is a class-level constant shared across all
            instances for improved performance and memory efficiency.

    Usage:
        Inherit from this mixin before Django REST Framework throttle classes in the
        class hierarchy to ensure the mixin's logic is applied first.

    Example:
        class CustomThrottle(AllowRequestMixin, UserRateThrottle):
            pass

    Note:
        This mixin is designed to work with Django REST Framework's throttling classes.
        Ensure that the classes you're inheriting from after this mixin implement the
        `allow_request` method.
    """

    _INTERNAL_PATH_PATTERN = re.compile(r'^/partners/api/v(\d+)/internal/*?')

    def allow_request(self, request: HttpRequest, view) -> bool:
        """
        Determines whether the request should be allowed without throttling.

        This method first checks if the request should skip throttling by calling
        `_should_skip_throttle`. If throttling should be skipped, it returns `True`.
        Otherwise, it calls the superclass's `allow_request` method to apply standard
        throttling checks.

        Args:
            request (HttpRequest): The current HTTP request.
            view: The view being accessed.

        Returns:
            bool: `True` if the request should bypass throttling, `False` otherwise.

        Raises:
            NotImplementedError: If the superclass does not implement `allow_request`.
        """
        if self._should_skip_throttle(request):
            return True

        try:
            return super().allow_request(request, view)
        except AttributeError:
            raise NotImplementedError("The superclass must implement allow_request method.")

    def _should_skip_throttle(self, request: HttpRequest) -> bool:
        """
        Determines whether a request should be exempt from throttling based on its path.

        This method checks if the request's path matches the internal API pattern defined
        by `_INTERNAL_PATH_PATTERN`. If it matches, the request is considered internal and
        should bypass throttling.

        Args:
            request (HttpRequest): The current HTTP request.

        Returns:
            bool: `True` if the request should be exempt from throttling, `False` otherwise.

        Note:
            This method is implemented directly in the throttling check process, rather than
            as middleware, to ensure precise control over the throttling logic and to address
            limitations encountered with middleware-based approaches.
        """
        return bool(self._INTERNAL_PATH_PATTERN.match(request.path))


class ParseRateMixin:
    def parse_rate(self, rate: Optional[str]) -> Tuple[Optional[int], Optional[int]]:
        """
        Parses the rate limit string to determine the number of requests allowed
        and the duration over which they are allowed.

        The rate limit string is expected to follow the format 'number of requests/duration',
        where 'duration' can be specified in seconds ('s'), minutes ('m'), hours ('h'),
        or days ('d'). This method extends the base functionality to also allow durations
        to be specified with a numeric value preceding the unit (e.g., '5m' for five minutes).

        Parameters:
        - rate (str): The rate limit string specifying the allowed number of requests and the
          duration over which they are allowed. For example, '50/5s' allows 50 requests per 5 seconds.

        Returns:
        - tuple: A tuple containing two elements:
          1. num_requests (int): The allowed number of requests.
          2. duration (int): The duration over which the requests are allowed, in seconds.

        Raises:
        - ValueError: If the rate string is malformed or if the duration unit is unrecognized.

        Examples:
        - A rate of '100/10s' will be parsed into (100, 10), allowing 100 requests every 10 seconds.
        - A rate of '60/1m' will be parsed into (60, 60), allowing 60 requests every minute (60 seconds).

        Note:
        This method enhances the flexibility of rate limiting by supporting more granular
        control over the duration, facilitating a wide range of rate limiting strategies.
        """

        if not rate:
            return (None, None)

        num, period_spec = rate.split("/")
        num_requests = int(num)

        # To handle cases like "s", "m", "h", "d"
        if not period_spec[:-1].isdigit():
            duration_multiplier = 1
            time_unit = period_spec
        else:
            duration_multiplier_str, time_unit = period_spec[:-1], period_spec[-1]
            duration_multiplier = int(duration_multiplier_str)

        # Map unit to seconds
        unit_seconds = {'s': 1, 'm': 60, 'h': 3600, 'd': 86400}
        if time_unit not in unit_seconds:
            raise ValueError(f"Unrecognized duration unit in rate: '{rate}'.")

        duration_seconds = unit_seconds[time_unit] * duration_multiplier
        return (num_requests, duration_seconds)
