from typing import (
    Optional,
    Tuple,
)

from django.http import HttpRequest


class AllowRequestMixin:
    """
    Mixin to conditionally bypass throttling in Django REST Framework throttle classes.

    Integrates with Django REST Framework's throttling mechanism by providing a custom
    `allow_request` method. This method checks a condition defined in `_should_skip_throttle`
    to decide whether to bypass throttling. If the condition is met, throttling is skipped;
    otherwise, standard throttling checks are applied by calling `super().allow_request`.

    Usage:
        Inherit from this mixin before Django REST Framework throttle classes to ensure the
        mixin's logic is applied first.

    Example:
        class CustomThrottle(AllowRequestMixin, UserRateThrottle):
            pass
    """

    def allow_request(self, request, view):
        if self._should_skip_throttle(request):
            return True

        # This will scream at you in your IDE. Let it.
        try:
            return super().allow_request(request, view)
        except AttributeError:
            raise NotImplementedError("The superclass must implement allow_request method.")

    def _should_skip_throttle(self, request: HttpRequest) -> bool:
        """
         Determines whether a request should be exempt from throttling based on its path.

         This function is used to bypass the standard throttling process for specific
         requests, particularly those targeting internal or non-public-facing endpoints.
         It's implemented directly in the throttling check process, rather than as middleware,
         to ensure precise control over the throttling logic and to address limitations
         encountered with middleware-based approaches.

         Note:
         The initial approach attempted to use middleware for throttling decisions, but
         this method was not effective. Middleware execution occurs either before the
         request is fully processed (in the case of process_request middleware) or after
         the response has been generated (in the case of process_response middleware),
         which does not offer the granularity needed for making throttling decisions based
         on view-specific logic or request details. Direct implementation within the
         throttling check allows for more nuanced and immediate control over which
         requests are throttled, based on the specific needs of the application and
         its endpoints.

         Parameters:
         - request: HttpRequest object representing the current request.

         Returns:
         - bool: True if the request should be exempt from throttling, False otherwise.
         """
        if request.path.startswith('/partners/internal'):
            return True
        return False


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
