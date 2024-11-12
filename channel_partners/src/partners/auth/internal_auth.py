from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import exceptions
from rest_framework.authentication import TokenAuthentication

from partners.auth.helpers import get_sa_token_payload
from partners.auth.indentity import NxInternalService
from partners.auth.token_auth import NxCloudOauthTokenAuthentication
from partners.models import AuthToken
from tools.exception import ErrorCodes


class NxS2SAuthentication(NxCloudOauthTokenAuthentication):
    keyword = 'Service'
    model = NxInternalService
    scope_service = 'channel_partners'

    def authenticate_credentials(self, key, request=None):
        model = self.get_model()
        token_payload = get_sa_token_payload(key)
        if not token_payload:
            raise exceptions.AuthenticationFailed('Invalid or expired token.',
                                                  code=ErrorCodes.invalid_token)
        if not token_payload.is_service_allowed(self.scope_service):
            raise exceptions.AuthenticationFailed('Invalid or expired token.',
                                                  code=ErrorCodes.invalid_token_scope)
        request.internal_service = model(token_payload)
        return get_user_model()(), key


class NxTokenAuthentication(TokenAuthentication):
    model = AuthToken
    keyword = 'Bearer'

    def authenticate(self, request):
        if request.META.get('HTTP_X_FORWARDED_PROTO', None) != 'https' and not (settings.DEBUG or settings.TESTING):
            raise exceptions.AuthenticationFailed('Must use https for the API')
        return super().authenticate(request)

    def authenticate_credentials(self, key):
        model = self.get_model()
        try:
            token = model.objects.get(key=key, enabled=True)
        except model.DoesNotExist:
            raise exceptions.AuthenticationFailed('Invalid token.')

        return get_user_model()(), token
