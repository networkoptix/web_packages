import uuid
from dataclasses import dataclass
from hashlib import sha256
from typing import (
    Dict,
    Iterable,
    Optional,
    Set,
    Tuple,
)

import httpx
import structlog
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import caches
from django.db import transaction
from django.utils.translation import gettext_lazy as _
from drf_spectacular.openapi import OpenApiAuthenticationExtension
from httpx import Response
from jwt import (
    InvalidTokenError,
    PyJWTError,
)
from nx_cloud_api_client.base_auth import CdbAuthAPIClient
from nx_cloud_api_client.client import NxCloudAPISyncClient
from nx_jwt.jwt_auth import (
    JWT_REGEX,
    FallbackToRegToken,
    JWKMissingKeyError,
    SAJWTPayload,
)
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
    NxInternalService,
    VmsRoles,
)
from tools.exception import (
    APIErrorWithoutRollback,
    ErrorCodes,
)
from tools.helpers import cast_uuid
from tools.nx_cloud_api_client_factory import NxCloudApiClientFactory


logger = structlog.getLogger(__name__)

CREDENTIALS_REMOVED_PERMANENTLY = 'credentialsRemovedPermanently'


@dataclass
class IntrospectionResult:
    email: Optional[str]
    introspected_systems_roles: Dict[uuid.UUID, Set[uuid.UUID]]

    def get_email(self) -> str:
        return self.email.lower() if self.email else ''

    def __post_init__(self):
        self.introspected_systems_roles = {
            cast_uuid(system_id): {cast_uuid(role) for role in roles}
            for system_id, roles in self.introspected_systems_roles.items()
        }

    def has_roles_in_system(
            self,
            email: str,
            system_id: uuid.UUID,
            expected_roles: Iterable[uuid] | VmsRoles.AnyRole | None = None
    ) -> bool:
        return bool(
                email
                and email.lower() == self.get_email().lower()
                and system_id in self.introspected_systems_roles
                and (
                    expected_roles == VmsRoles.ANY_ROLE or
                    set(expected_roles).intersection(self.introspected_systems_roles[system_id])
                )
        )

    @classmethod
    def none(cls) -> 'IntrospectionResult':
        return cls(email=None, introspected_systems_roles={})

    @classmethod
    def from_cdb_response(cls, cdb_response: dict) -> 'IntrospectionResult':
        return cls(email=cdb_response.get('username'),
                   introspected_systems_roles=cdb_response.get('system_role_ids', {}))


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
    def get_system_introspection(cls, token: str, system_id: str | uuid.UUID) -> IntrospectionResult:
        return cls.cache().get(cls.token_system_cache_key(token, system_id))

    @classmethod
    def set_system_introspection(cls, token: str, system_id: str | uuid.UUID,
                                 introspection: IntrospectionResult, expires_in: int = None):
        cls.cache().set(
            cls.token_system_cache_key(token, system_id=system_id), introspection,
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


def check_system_credentials(
        system_id: str,
        system_auth_key: str,
        cloud_host: str
) -> Tuple[bool, None | int, str | None]:
    system_api: NxCloudAPISyncClient = NxCloudApiClientFactory.get_sync_client(host=cloud_host)
    try:
        response: Response = system_api.system.get_system(
            system_id, auth=httpx.BasicAuth(
                username=system_id,
                password=system_auth_key))
    except httpx.HTTPError as ex:
        logger.error(
            "Request to cdb failed",
            exception_type=type(ex).__name__,
            exception_details=str(ex),
            exc_info=True)
        return False, None, None

    if response.is_success:
        response_body = response.json()
        response_system_id = response_body.get('id')
        response_status = response_body.get('status')
        system_name = response_body.get('name')

        state = CloudSystemStates.STATE_DICT.get(response_status)
        is_activated: bool = state == CloudSystemStates.ACTIVATED

        if response_system_id == system_id:
            if not is_activated:
                return False, state, system_name
            if is_activated:
                return True, state, system_name
        return False, None, None

    if response.headers.get('content-type') == 'application/json':
        error = response.json()
        if error.get('resultCode') == CREDENTIALS_REMOVED_PERMANENTLY:
            return False, CloudSystemStates.DELETED, None
    # CLOUD-12908. Let's count any error status code as unauthorized
    logger.info(
        'Authentication failed',
        system_id=system_id,
        response_status_code=response.status_code,
        response_content=response.content.decode())
    return False, None, None


class NxCloudSystemBasicAuthentication(BasicAuthentication):
    """
    Custom authentication class for NxCloud systems using basic authentication.
    """
    def get_cloud_hostname(self, request):
        """
        Retrieve the cloud_host from the request.
        """
        return getattr(request.cloud_host, 'hostname', None)

    def get_system(self, system_id, request):
        """
        Retrieve a CloudSystemId object based on the system_id and cloud_host.
        """
        return CloudSystemId.objects.filter(
            system_id=system_id,
            cloud_host=request.cloud_host
        ).first()

    def get_system_or_raise(self, system_id, request=None):
        """
        Retrieve a CloudSystemId object or raise appropriate exceptions.
        """
        if system := self.get_system(system_id, request):
            if system.system_state == CloudSystemStates.DELETED:
                raise exceptions.NotAuthenticated(detail={
                    'detail': 'System has been disconnected.',
                    'resultCode': CREDENTIALS_REMOVED_PERMANENTLY,
                })
            if not system.organization:
                raise exceptions.NotAuthenticated(detail={
                    'detail': 'Not an organization system.',
                })
            return system
        raise exceptions.NotFound(f'System {system_id} not found.')

    def validate_request(self, request):
        """
        Validate the incoming request.
        """
        if not self.get_cloud_hostname(request):
            raise exceptions.ParseError('Invalid hostname.')

    def check_cached_auth(self, auth_header, userid, request):
        """
        Check if the authentication is cached and valid.
        """
        if (cloud_system_id := TokenCache.get_system_auth(auth_header)) and userid == cloud_system_id:
            request.cloud_system = self.get_system_or_raise(system_id=userid, request=request)
            return get_user_model()(), None
        return None

    def authenticate_system(self, userid, password, request):
        """
        Authenticate the system using the provided credentials.
        """
        return check_system_credentials(
            system_id=userid,
            system_auth_key=password,
            cloud_host=self.get_cloud_hostname(request)
        )

    def update_system_info(self, cloud_system, system_name, system_status):
        """
        Update the cloud system information if needed.
        """
        needs_update = False
        if cloud_system.name != system_name:
            cloud_system.name = system_name
            needs_update = True
        if cloud_system.system_state not in (system_status, CloudSystemStates.DELETED):
            cloud_system.system_state = system_status
            needs_update = True
        if needs_update:
            cloud_system.save()

    def handle_auth_result(self, authenticated, system_status, cloud_system, request):
        """
        Handle the result of the authentication process.
        """
        if authenticated:
            request.cloud_system = cloud_system
            return get_user_model()(), None

        if system_status == CloudSystemStates.DELETED:
            raise APIErrorWithoutRollback(
                detail={
                    'detail': 'Invalid system id or auth key',
                    'resultCode': CREDENTIALS_REMOVED_PERMANENTLY,
                },
                status_code=status.HTTP_401_UNAUTHORIZED
            )

        raise APIErrorWithoutRollback(
            detail='Invalid system id or auth key',
            status_code=status.HTTP_401_UNAUTHORIZED
        )

    def authenticate_credentials(self, userid, password, request=None):
        """
        Authenticate the system credentials.

        This method orchestrates the entire authentication process.
        """
        auth_header = request.headers.get('authorization')
        self.validate_request(request)

        # Check if authentication is cached
        cached_auth = self.check_cached_auth(auth_header, userid, request)
        if cached_auth:
            return cached_auth

        # Authenticate the system
        authenticated, system_status, system_name = self.authenticate_system(userid, password, request)

        # Cache the authentication if successful
        if authenticated and system_status == CloudSystemStates.ACTIVATED:
            TokenCache.set_system_auth(auth_header, userid)

        with transaction.atomic():
            cloud_system = self.get_system_or_raise(system_id=userid, request=request) if authenticated or system_status else None

            # Update system information if needed
            if isinstance(cloud_system, CloudSystemId):
                self.update_system_info(cloud_system, system_name, system_status)

        return self.handle_auth_result(authenticated, system_status, cloud_system, request)

class NxCloudSystemBasicAuthenticationInternal(NxCloudSystemBasicAuthentication):
    """
    Internal version of NxCloudSystemBasicAuthentication with modified behavior.
    """
    def get_cloud_hostname(self, request):
        """
        Retrieve the cloud_host from the request.
        """
        return settings.DEFAULT_HOST_NAME

    def get_system(self, system_id, request):
        """
        Retrieve a CloudSystemId object based on the system_id.
        This version doesn't filter by cloud_host.
        """
        return CloudSystemId.objects.filter(system_id=system_id).first()


    def validate_request(self, request):
        """
        Validate the incoming request.
        This version skips the cloud_host validation.
        """
        pass  # No need to validate cloud_host for internal authentication


    def handle_auth_result(self, authenticated, system_status, cloud_system, request):
        """
        Handle the result of the authentication process.
        This version sets cloud_host on the request.
        The .super() method adds the cloud_system to the request.
        """

        result = super().handle_auth_result(authenticated, system_status, cloud_system, request)
        request.cloud_host = cloud_system.cloud_host
        return result


class NxCloudSystemBasicAuthenticationExtension(OpenApiAuthenticationExtension):
    target_class = 'partners.authentication.NxCloudSystemBasicAuthentication'
    name = 'Cloud System Credentials Basic Auth'
    priority = 2

    def get_security_definition(self, auto_schema):
        return {
            'type': 'http',
            'scheme': 'basic',
        }


def get_cloud_user_from_token(token: str, cloud_host: str) -> Optional[str]:
    if JWT_REGEX.match(token):
        try:
            return authenticate_jwt_token(token)
        except FallbackToRegToken as ex:
            logger.info(
                'Falling back to regular token.',
                exception_type=type(ex).__name__,
                exception_details=str(ex),
                reason=ex.reason)
    return authenticate_regular_token(token, cloud_host)


def get_sa_token_payload(token: str) -> Optional[SAJWTPayload]:
    try:
        return settings.SA_JWK_CLIENT.decode_jwt_without_fallback(token, verify_exp=True)
    except InvalidTokenError as ex:
        # Token is invalid, expired, whatsoever
        logger.debug('Unauthorized token.', exception=str(ex))
        return None
    except PyJWTError as ex:
        # Token decoding failed. This can happen because
        # of errors in JWKClient, unavailable JWKs or CDB, etc
        logger.error('Token decoding failed.', exception=str(ex))
        return None



def authenticate_jwt_token(token: str) -> Optional[str]:
    if email := TokenCache.get_token(token):
        return email
    try:
        verified_payload = settings.JWK_CLIENT.decode_jwt_token(token, verify_exp=True)
    except (InvalidTokenError, JWKMissingKeyError) as ex:
        logger.debug(
            'Unauthorized token.',
            exception_type=type(ex).__name__,
            exception_details=str(ex))
        return None
    logger.debug('Verified JWT')
    TokenCache.set_token(token, verified_payload.sub, expires_in=verified_payload.expires_in)
    return verified_payload.sub


def authenticate_regular_token(token: str, cloud_host: str) -> Optional[str]:
    if email := TokenCache.get_token(token):
        return email
    auth_client: CdbAuthAPIClient = NxCloudApiClientFactory.get_sync_client(
        host=cloud_host,
        access_token=token
    ).authentication

    headers = {"Authorization": f"Bearer {token}"}
    try:
        response: Response = auth_client.token_get(token, headers=headers)
    except httpx.HTTPError as ex:
        logger.error(
            'Token authentication request failed.',
            exception_type=type(ex).__name__,
            exception_details=str(ex),
            exc_info=True)
        # raise exception to avoid token refresh
        raise ex

    if response.is_success:
        resp = response.json()
        email = resp.get('username')
        expires_in = resp.get('expires_in', 3600)
        TokenCache.set_token(token, email, expires_in=expires_in)
        return email
    elif response.status_code == 401:
        return None
    # CLOUD-12908. Let's count any error status code as unauthorized
    logger.info(
        'Authentication failed',
        response_status_code=response.status_code,
        response_content=response.content.decode())
    return None


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
    target_class = 'partners.authentication.NxCloudOauthTokenAuthentication'
    name = 'Cloud Oauth Token'
    priority = 1

    def get_security_definition(self, auto_schema):
        return {
            'type': 'http',
            'scheme': 'bearer',
        }


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
    def get_bearer_token(request) -> Optional[str]:
        if not CdbInternalAuthentication.is_token_auth(request):
            return None
        return CdbInternalAuthentication.auth_header(request)[6:].strip()

    @staticmethod
    def introspect_with_system(token, cloud_host_name, system_id) -> IntrospectionResult:
        cached = TokenCache.get_system_introspection(token, system_id)
        if cached:
            return cached

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
                introspection_result = IntrospectionResult.from_cdb_response(introspection)

                TokenCache.set_system_introspection(token, system_id, introspection_result)
                TokenCache.set_token(token, email)

                return introspection_result

        return IntrospectionResult.none()

    @staticmethod
    def has_vms_roles(
            request,
            system_id: uuid.UUID,
            roles: Iterable[uuid.UUID] | VmsRoles.AnyRole | None
    ) -> Optional[bool]:
        if not (token := CdbInternalAuthentication.get_bearer_token(request)):
            return None
        system_introspection = CdbInternalAuthentication.introspect_with_system(
            token=token, cloud_host_name=request.cloud_host.hostname, system_id=system_id
        )
        is_allowed = system_introspection.has_roles_in_system(
            email=request.user.email,
            system_id=system_id,
            expected_roles=roles
        )
        request.system_introspection = system_introspection
        return is_allowed
