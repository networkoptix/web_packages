from hashlib import sha256

import httpx
from django.core.cache import caches
from django.http import HttpRequest

from drf_spectacular.openapi import OpenApiAuthenticationExtension
import requests
from nx_cloud_api_client.apis import CdbSystemAPIBase
from nx_cloud_api_client.base_auth import BearerTokenAuth
from requests.auth import HTTPBasicAuth
from rest_framework.authentication import TokenAuthentication, BasicAuthentication, get_authorization_header
from rest_framework import exceptions
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _

from partners.models import CloudSystemId, CloudHost, CloudUser, AuthToken


def get_host(request: HttpRequest) -> str:
    return request.get_host().split(':')[0]


def get_cloud_host(cloud_host_name: str) -> CloudHost:
    cache_key = f'cloud-host-{cloud_host_name}'
    if cloud_host := caches['local'].get(cache_key):
        if isinstance(cloud_host, CloudHost):
            return cloud_host
    if cloud_host := CloudHost.objects.filter(hostname=cloud_host_name).first():
        caches['local'].set(cache_key, cloud_host, timeout=7200)
    return cloud_host


def cloud_host_middleware(get_response):
    def middleware(request: HttpRequest):
        cloud_host_name = request.headers.get('cloud-host', get_host(request))
        request.cloud_host = get_cloud_host(cloud_host_name)
        response = get_response(request)
        return response

    return middleware

class TokenCache:
    timeout: int = 600

    @staticmethod
    def cache():
        return caches['default']

    @staticmethod
    def cache_key(token: str):
        mdsum = sha256((settings.CACHE_SALT + token).encode()).hexdigest()
        return f'user-oauth-token-{mdsum}'

    @classmethod
    def get_token(cls, token):
        if not token:
            return None
        return cls.cache().get(cls.cache_key(token))

    @classmethod
    def set_token(cls, token, email, expires_in=None):
        if expires_in:
            timeout = min(cls.timeout, int(expires_in))
        else:
            timeout = cls.timeout
        cls.cache().set(cls.cache_key(token), email, timeout=timeout)


class NxTokenAuthentication(TokenAuthentication):
    model = AuthToken
    keyword = 'Bearer'

    def authenticate(self, request):
        if request.META.get('HTTP_X_FORWARDED_PROTO', None) != 'https' and not settings.DEBUG:
            raise exceptions.AuthenticationFailed('Must use https for the API')
        return super().authenticate(request)

    def authenticate_credentials(self, key):
        model = self.get_model()
        try:
            token = model.objects.get(key=key, enabled=True)
        except model.DoesNotExist:
            raise exceptions.AuthenticationFailed('Invalid token.')

        return get_user_model()(), token


def check_system_credentials(system_id, system_auth_key, cloud_host):
    response = requests.get(
            f'https://{cloud_host}/cdb/systems/{system_id}',
            auth=HTTPBasicAuth(username=system_id, password=system_auth_key))
    if response.ok:
        resp = response.json()
        resp_system_id = resp.get('id')
        status = resp.get('status')
        if status != 'activated':
            return False
        if resp_system_id:
            return resp_system_id == system_id
        return False
    elif response.status_code == 401:
        return False
    else:
        response.raise_for_status()


def check_user_can_administer_system(system_id, access_token, cloud_host, raise_exception=True):

    with CdbSystemAPIBase(host=f'https://{cloud_host}', client=httpx.Client()) as api:
        response = api.get_system(system_id=system_id, auth=BearerTokenAuth(token=access_token))
    try:
        if response.is_success:
            resp = response.json()
            access_role = resp.get('accessRole', '')
            if access_role in ('owner', 'cloudAdmin'):
                return True
            else:
                raise exceptions.PermissionDenied('Cloud user does not have necessary access role for this system')
        elif response.status_code == 401:
            raise exceptions.AuthenticationFailed('Unable to authenticate with access token')
        elif response.status_code == 403:
            raise exceptions.NotFound('Invalid Cloud system id or user does not have access')
        else:
            response.raise_for_status()
    except Exception as exc:
        if raise_exception or response.status_code > 500:
            raise exc
        else:
            return False


class NxCloudSystemBasicAuthentication(BasicAuthentication):
    def authenticate_credentials(self, userid, password, request=None):
        cloud_system_id = userid
        if not request.cloud_host:
            raise exceptions.ParseError('Invalid cloud-host header or hostname.')

        if check_system_credentials(system_id=userid, system_auth_key=password,
                                    cloud_host=request.cloud_host.hostname):
            cloud_system = CloudSystemId.objects.get_or_create(
                system_id=cloud_system_id, cloud_host=request.cloud_host)[0]
            if not cloud_system.activated:
                cloud_system.activated = True
                cloud_system.save()
            request.cloud_system = cloud_system
            return get_user_model()(), None
        else:
            raise exceptions.AuthenticationFailed('Invalid system id or auth key')


class NxCloudSystemBasicAuthenticationExtension(OpenApiAuthenticationExtension):
    target_class = 'partners.authentication.NxCloudSystemBasicAuthentication'
    name = 'Cloud System Credentials Basic Auth'
    priority = 2

    def get_security_definition(self, auto_schema):
        return {
            'type': 'http',
            'scheme': 'basic',
        }


def get_cloud_user_from_token(token, cloud_host):
    if email := TokenCache.get_token(token):
        return email
    response = httpx.get(
        f'https://{cloud_host}/cdb/oauth2/token/{token}',
        headers={"Authorization": f"Bearer {token}"})
    if response.is_success:
        resp = response.json()
        email = resp.get('username')
        expires_in = resp.get('expires_in', 3600)
        TokenCache.set_token(token, email, expires_in=expires_in)
        return email
    elif response.status_code == 401:
        return None
    else:
        response.raise_for_status()


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

        ret = self.authenticate_credentials(token, request.cloud_host.hostname)
        return ret

    def authenticate_credentials(self, key, cloud_host_header):
        model = self.get_model()

        email = get_cloud_user_from_token(key, cloud_host_header)
        if email:
            return model.objects.get_or_create(email=email)[0], key
        else:
            raise exceptions.AuthenticationFailed('Invalid or expired token')


class NxCloudOauthTokenAuthenticationExtension(OpenApiAuthenticationExtension):
    target_class = 'partners.authentication.NxCloudOauthTokenAuthentication'
    name = 'Cloud Oauth Token'
    priority = 1

    def get_security_definition(self, auto_schema):
        return {
            'type': 'http',
            'scheme': 'bearer',
        }


def system_authentication_hook(result, generator, request, public):
    for path in result.get('paths', {}).values():
        for method in path.values():
            found = False
            if 'security' in method:
                for security_schemes in method['security']:
                    if found:
                        break
                    for scheme in security_schemes:
                        if scheme in [
                            NxCloudSystemBasicAuthenticationExtension.name, NxCloudOauthTokenAuthenticationExtension.name
                        ]:
                            if 'parameters' not in method:
                                method['parameters'] = []
                            method['parameters'].append({
                                'name': 'cloud-host',
                                'default': 'cloud-test.hdw.mx',
                                'in': 'header',
                                'schema': {'type': 'string'},
                                'required': True
                            })
                            found = True
                            break
    return result
