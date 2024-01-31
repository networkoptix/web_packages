import uuid
from hashlib import sha256
from typing import (
    List,
    Tuple,
)

import httpx
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import caches
from django.db import transaction
from django.utils.translation import gettext_lazy as _
from drf_spectacular.openapi import OpenApiAuthenticationExtension
from httpx import Response
from nx_cloud_api_client.base_auth import CdbAuthAPIClient
from nx_cloud_api_client.client import NxCloudAPISyncClient
from rest_framework import (
    exceptions,
    status,
)
from rest_framework.authentication import (
    BasicAuthentication,
    TokenAuthentication,
    get_authorization_header,
)

from partners.models import (
    AuthToken,
    CloudSystemId,
    CloudSystemStates,
    CloudUser,
)
from tools.exception import APIErrorWithoutRollback
from tools.helpers import cast_uuid
from tools.nx_cloud_api_client_factory import NxCloudApiClientFactory


class TokenCache:
    timeout: int = 600

    @staticmethod
    def cache():
        return caches['default']

    @staticmethod
    def token_cache_key(token: str) -> str:
        mdsum = sha256((settings.CACHE_SALT + token).encode()).hexdigest()
        return f'user-oauth-token-{mdsum}'

    @staticmethod
    def token_system_cache_key(token: str, system_id: str | uuid.UUID) -> str:
        return f'{TokenCache.token_cache_key(token)}-sys-{system_id}'

    @staticmethod
    def system_auth_cache_key(auth_header: str) -> str:
        mdsum = sha256((settings.CACHE_SALT + auth_header).encode()).hexdigest()
        return f'system-authenticated-{mdsum}'


    @classmethod
    def get_token(cls, token):
        if not token:
            return None
        return cls.cache().get(cls.token_cache_key(token))

    @classmethod
    def get_timeout(cls, expires_in: int = None) -> int:
        if expires_in:
            return min(cls.timeout, int(expires_in))
        return cls.timeout

    @classmethod
    def set_token(cls, token, email, expires_in=None):
        cls.cache().set(
            cls.token_cache_key(token), email,
            timeout=cls.get_timeout(expires_in)
        )

    @classmethod
    def get_token_system(cls, token: str, system_id: str | uuid.UUID) -> Tuple[str, List[str] | None] | None:
        return cls.cache().get(cls.token_system_cache_key(token, system_id))

    @classmethod
    def set_token_system(cls, token: str, system_id: str | uuid.UUID,
                         email: str, roles_ids: List[str| uuid.UUID], expires_in: int = None):
        cls.cache().set(
            cls.token_system_cache_key(token, system_id=system_id), (email, roles_ids),
            timeout=cls.get_timeout(expires_in)
        )

    @classmethod
    def get_system_auth(cls, auth_header: str) -> str | None:
        return cls.cache().get(cls.system_auth_cache_key(auth_header))
    @classmethod
    def set_system_auth(cls, auth_header: str, system_id: str | uuid.UUID):
        cls.cache().set(
            cls.system_auth_cache_key(auth_header), system_id, timeout=cls.get_timeout()
        )


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


def check_system_credentials(system_id: str, system_auth_key: str, cloud_host: str) -> Tuple[bool, None | int]:
    system_api: NxCloudAPISyncClient = NxCloudApiClientFactory.get_sync_client(host=cloud_host)
    response: Response = system_api.system.get_system(system_id, auth=httpx.BasicAuth(username=system_id,
                                                                                      password=system_auth_key))

    if response.is_success:
        response_body = response.json()
        response_system_id = response_body.get('id')
        response_status = response_body.get('status')

        state = CloudSystemStates.STATE_DICT.get(response_status)
        is_activated: bool = state == CloudSystemStates.ACTIVATED

        if response_system_id == system_id:
            if not is_activated:
                return False, state
            if is_activated:
                return True, state
        return False, None

    if response.headers.get('content-type') == 'application/json':
        error = response.json()
        if error.get('resultCode') == 'credentialsRemovedPermanently':
            return False, CloudSystemStates.DELETED

    if response.status_code == 401:
        return False, None
    response.raise_for_status()


class NxCloudSystemBasicAuthentication(BasicAuthentication):

    @staticmethod
    def get_system(system_id, request=None):
        return CloudSystemId.objects.filter(
            system_id=system_id, cloud_host=request.cloud_host).first()

    @staticmethod
    def get_or_create_system(system_id, request=None):
        return CloudSystemId.objects.get_or_create(
            system_id=system_id, cloud_host=request.cloud_host)[0]

    def authenticate_credentials(self, userid, password, request=None):
        auth_header = request.headers.get('authorization')
        if not request.cloud_host:
            raise exceptions.ParseError('Invalid hostname.')
        if (
                (cloud_system_id := TokenCache.get_system_auth(auth_header))
                and userid == cloud_system_id
        ):
            request.cloud_system = self.get_system(system_id=userid, request=request)
            return get_user_model()(), None
        authenticated, system_status = check_system_credentials(
            system_id=userid, system_auth_key=password,
            cloud_host=request.cloud_host.hostname
        )
        cloud_system_id = userid
        if authenticated and system_status == CloudSystemStates.ACTIVATED:
            TokenCache.set_system_auth(auth_header, userid)
        with transaction.atomic():
            if authenticated:
                cloud_system = self.get_or_create_system(system_id=cloud_system_id, request=request)
            elif system_status:
                cloud_system = self.get_system(system_id=cloud_system_id, request=request)
            else:
                cloud_system = None
            if isinstance(cloud_system, CloudSystemId):
                # can fail if system is not added to CPS
                if cloud_system.system_state != system_status:
                    with transaction.atomic():
                        cloud_system.system_state = system_status
                        cloud_system.save()
        if authenticated:
            request.cloud_system = cloud_system
            return get_user_model()(), None

        raise APIErrorWithoutRollback(detail='Invalid system id or auth key',
                                      status_code=status.HTTP_401_UNAUTHORIZED)


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

    auth_client: CdbAuthAPIClient = NxCloudApiClientFactory.get_sync_client(
        host=cloud_host,
        access_token=token
    ).authentication

    headers = {"Authorization": f"Bearer {token}"}
    response: Response = auth_client.token_get(token, headers=headers)

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


class NxCloudOauthIntrospectAuthentication(NxCloudOauthTokenAuthentication):

    def get_user_from_token(self, token, request=None):
        kwargs = request.parser_context.get('kwargs', {})
        system_id = (kwargs.get('system_id') or kwargs.get('id'))
        email, system_id, system_roles_ids = CdbInternalAuthentication.introspect_with_system(
            token, request.cloud_host.hostname, system_id
        )
        if email:
            request.introspected_system_id = system_id
            request.introspected_system_roles_ids = system_roles_ids
        return email


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
                            NxCloudSystemBasicAuthenticationExtension.name,
                            NxCloudOauthTokenAuthenticationExtension.name
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


class CdbInternalAuthentication:

    @staticmethod
    def auth_header(request) -> str:
        return request.headers.get('Authorization') or ''

    @staticmethod
    def is_system_auth(request) -> bool:
        return CdbInternalAuthentication.auth_header(request).lower().startswith('basic')

    @staticmethod
    def is_token_auth(request) -> bool:
        return CdbInternalAuthentication.auth_header(request).lower().startswith('bearer')

    @staticmethod
    def introspect_with_system(
            token, cloud_host_name, system_id
    ) -> Tuple[None, None, None] | Tuple[str, uuid.UUID, List[uuid.UUID]]:
        cached = TokenCache.get_token_system(token, system_id)
        if cached:
            return cached[0], system_id, cached[1]
        cdb_client = NxCloudApiClientFactory.get_sync_client(
            host=cloud_host_name,
            access_token=token,
            auto_refresh=False
        )
        system_id = cast_uuid(system_id)
        system_ids = [str(system_id)] if system_id else []
        response = cdb_client.authentication.introspect(system_ids)
        if response.status_code == 200:
            introspection = response.json()
            if introspection.get('active') is True and (email := introspection.get('username')):
                system_role_ids = introspection.get('system_role_ids', {}).get(str(system_id), [])
                system_role_ids = [cast_uuid(system_role_id) for system_role_id in system_role_ids]
                TokenCache.set_token_system(token, system_id, email, system_role_ids)
                TokenCache.set_token(token, email)
                return email, system_id, system_role_ids
        return None, None, None
