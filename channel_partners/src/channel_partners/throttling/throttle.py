from django.core.cache import caches
from rest_framework.throttling import (
    AnonRateThrottle,
    UserRateThrottle,
)

from channel_partners.throttling.mixin import (
    AllowRequestMixin,
    ParseRateMixin,
)


class SystemRateThrottle(AllowRequestMixin, ParseRateMixin, UserRateThrottle):
    cache = caches['throttling']
    scope = 'system'

    def is_system_user(self, request):
        from partners.auth.system_auth import NxCloudSystemBasicAuthentication
        return isinstance(request.successful_authenticator, NxCloudSystemBasicAuthentication)

    def get_cache_key(self, request, view) -> None:
        if self.is_system_user(request):
            ident = request.cloud_system.system_id
            return self.cache_format % {
                'scope': self.scope,
                'ident': ident
            }
        return None


class AuthenticatedUserRateThrottle(AllowRequestMixin, ParseRateMixin, AnonRateThrottle):
    cache = caches['throttling']
    scope = 'user'

    def get_cache_key(self, request, view) -> None:
        if request.user.is_authenticated:
            ident = request.user.pk
            return self.cache_format % {
                'scope': self.scope,
                'ident': ident
            }
        return None


class AnonymousRateThrottle(AllowRequestMixin, ParseRateMixin, AnonRateThrottle):
    cache = caches['throttling']
    scope = 'anon'
