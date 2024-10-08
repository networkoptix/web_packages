import structlog
from django.core.cache import caches
from django.core.exceptions import ImproperlyConfigured
from rest_framework.throttling import SimpleRateThrottle
from typing import List

from cloud.helpers.exceptions import APITooManyRequestsException

logger = structlog.getLogger(__name__)


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
        user_email = request.data.get('user_email', 'not_presented')
        typ = request.data.get('type', 'not_presented')
        if not (system_id := request.data.get('system_id')):
            system_id = request.data.get('message', {}).get('system_id', 'not_presented')
        return f'{self.scope}-{typ}-{user_email}-{system_id}'.lower()

    def check_throttle(self, request):
        if not self.allow_request(request, view=None):
            logger.warning("request_throttled", cache_key=self.get_cache_key(request, view=None))
            raise APITooManyRequestsException('Too many request. Please try again later')

    @classmethod
    def is_allowed(cls, request):
        if not cls().allow_request(request, view=None):
            logger.warning("request_throttled", cache_key=cls().get_cache_key(request, view=None))
            raise APITooManyRequestsException('Too many request. Please try again later')


class NotificationRateThrottle(RequestDataThrottleBase):
    scope = 'notification_rate_limit'
    data_attrs = ["user_email", "type", "system_id"]
    required_attrs = ["user_email", "type"]
    rate = '1/minute'
