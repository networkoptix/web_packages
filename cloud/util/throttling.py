from logging import getLogger
from typing import List

from django.core.cache import caches
from django.core.exceptions import ImproperlyConfigured
from rest_framework.throttling import SimpleRateThrottle

from cloud.helpers.exceptions import APIRequestException, APITooManyRequestsException

logger = getLogger(__name__)


class RequestDataThrottleBase(SimpleRateThrottle):
    """
    Base throttle class to limit request based on request data.
    Ca
    """
    scope = 'data_requests_limit'
    cache = caches['rate_limits']
    cache_format = '%(scope)s-ident-%(ident)s'

    ident_cache_format = '{scope}-ident-{ident}'
    data_attrs: List[str] = []
    required_attrs: List[str] = []

    def __init__(self, scope: str = None, data_attrs: List[str] = None, rate: str = None):
        if not self.data_attrs and not data_attrs:
            raise ImproperlyConfigured("Data attributes must be specified.")
        if scope:
            self.scope = scope
        if data_attrs:
            self.data_attrs = data_attrs
        if rate:
            self.rate = rate
        super().__init__()

    def get_cache_key(self, request, view):
        data = [
            str(request.data.get(attr))
            for attr in self.data_attrs
            if request.data.get(attr) or attr in self.required_attrs
        ]
        return f'{self.scope}-{"-".join([d.lower() for d in data])}'

    def check_throttle(self, request):
        if not self.allow_request(request, view=None):
            logger.warning(f"Request throttled for key {self.get_cache_key(request, view=None)}")
            raise APITooManyRequestsException('Too many request. Please try again later')

    @classmethod
    def is_allowed(cls, request):
        if not cls().allow_request(request, view=None):
            logger.warning(f"Request throttled for key {cls().get_cache_key(request, view=None)}")
            raise APITooManyRequestsException('Too many request. Please try again later')


class NotificationRateThrottle(RequestDataThrottleBase):
    scope = 'notification_rate_limit'
    data_attrs = ["user_email", "type", "system_id"]
    required_attrs = ["user_email", "type"]
    rate = '1/minute'
