import structlog
from django.utils.translation import gettext_lazy as _
from drf_spectacular.extensions import OpenApiAuthenticationExtension
from rest_framework import exceptions
from rest_framework.authentication import (
    TokenAuthentication,
    get_authorization_header,
)

from partners.auth.helpers import get_cloud_user_from_token
from partners.models import CloudUser


logger = structlog.getLogger(__name__)


class NxCloudOauthTokenAuthentication(TokenAuthentication):
    keyword = 'Bearer'
    model = CloudUser

    def authenticate(self, request):
        auth = get_authorization_header(request).split()

        if not auth or auth[0].lower() != self.keyword.lower().encode():
            return None

        if len(auth) == 1:
            msg = _('Invalid token header. No credentials provided.')
            raise exceptions.AuthenticationFailed(msg)
        elif len(auth) > 2:
            msg = _('Invalid token header. Token string should not contain spaces.')
            raise exceptions.AuthenticationFailed(msg)

        try:
            token = auth[1].decode()
        except UnicodeError:
            msg = _('Invalid token header. Token string should not contain invalid characters.')
            raise exceptions.AuthenticationFailed(msg)

        if not request.cloud_host:
            raise exceptions.ParseError('Invalid cloud-host header or hostname.')

        ret = self.authenticate_credentials(token, request)
        return ret

    def get_user_from_token(self, token, request=None):
        return get_cloud_user_from_token(token, request.cloud_host.hostname)

    def authenticate_credentials(self, key, request=None):
        model = self.get_model()
        email = self.get_user_from_token(key, request)
        if email:
            return model.objects.get_or_create(email=email)[0], key
        else:
            raise exceptions.AuthenticationFailed('Invalid or expired token')


class NxCloudOauthTokenAuthenticationExtension(OpenApiAuthenticationExtension):
    target_class = 'partners.auth.token_auth.NxCloudOauthTokenAuthentication'
    name = 'Cloud Oauth Token'
    priority = 1

    def get_security_definition(self, auto_schema):
        return {
            'type': 'http',
            'scheme': 'bearer',
        }


