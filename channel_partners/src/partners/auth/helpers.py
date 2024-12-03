from typing import (
    Optional,
    Union,
)

import httpx
import structlog
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from httpx import Response
from jwt import (
    InvalidTokenError,
    PyJWTError,
)
from nx_cloud_api_client.base_auth import CdbAuthAPIClient
from nx_jwt.jwt_auth import (
    JWT_REGEX,
    FallbackToRegToken,
    JWKMissingKeyError,
    SAJWTPayload,
)

from partners.auth.cache import TokenCache
from partners.auth.indentity import NxInternalService
from partners.models import (
    AuthToken,
    CloudSystemId,
    CloudUser,
)
from tools.nx_cloud_api_client_factory import NxCloudApiClientFactory


logger = structlog.getLogger(__name__)


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





class AuthHelper:
    user_attr = 'user'
    cloud_system_attr = 'cloud_system'
    token_attr = 'auth'
    internal_service_attr = 'internal_service'

    cloud_user_cls = CloudUser
    cloud_system_cls = CloudSystemId
    internal_service_cls = NxInternalService
    token_cls = AuthToken
    anonymous_user_cls = AnonymousUser
    django_user_cls = get_user_model()

    id_types = Union[
        cloud_system_cls,
        cloud_system_cls,
        internal_service_cls,
        cloud_user_cls,
        django_user_cls,
        anonymous_user_cls
    ]

    auth_types = Union[
        cloud_system_cls,
        internal_service_cls,
        cloud_user_cls,
        token_cls
    ]

    @classmethod
    def get_cloud_user(cls, request) -> Optional[cloud_user_cls]:
        if cloud_user := getattr(request, cls.user_attr, None):
            if isinstance(cloud_user, cls.cloud_user_cls):
                return cloud_user

    @classmethod
    def get_cloud_system(cls, request) -> Optional[cloud_system_cls]:
        if cloud_system := getattr(request, cls.cloud_system_attr, None):
            if isinstance(cloud_system, cls.cloud_system_cls):
                return cloud_system

    @classmethod
    def get_internal_service(cls, request) -> Optional[internal_service_cls]:
        if internal_service := getattr(request, cls.internal_service_attr, None):
            if isinstance(internal_service, cls.internal_service_cls):
                return internal_service

    @classmethod
    def get_token(cls, request) -> Optional[token_cls]:
        if token := getattr(request, cls.token_attr, None):
            if isinstance(token, cls.token_cls):
                return token

    @classmethod
    def get_id_entity(cls, request) -> Optional[id_types]:
        """
        Gets any identification entity from the request.
        """
        if id_entity := getattr(request, cls.cloud_system_attr, None):
            return id_entity
        if id_entity := getattr(request, cls.internal_service_attr, None):
            return id_entity
        if id_entity := getattr(request, cls.token_attr, None):
            if isinstance(id_entity, cls.token_cls):
                return id_entity
        if id_entity := getattr(request, cls.user_attr, None):
            return id_entity

    @classmethod
    def get_auth_entity(cls, request) -> Optional[auth_types]:
        """
        Gets any authentication entity from the request.
        """
        return (
            cls.get_cloud_user(request) or
            cls.get_cloud_system(request) or
            cls.get_internal_service(request) or
            cls.get_token(request)
        )

    @classmethod
    def get_auth_with(
            cls,
            request,
            with_cloud_user: bool = False,
            with_cloud_system: bool = False,
            with_internal_service: bool = False,
            with_token: bool = False
    ) -> Optional[auth_types]:
        """
        Gets requested authenticated entity from the request.
        Returns only if entity has been authenticated.
        """
        if with_cloud_user and (cloud_user := cls.get_cloud_user(request)):
            return cloud_user
        if with_cloud_system and (cloud_system := cls.get_cloud_system(request)):
            if cloud_system.organization_id:
                return cloud_system
            return None
        if with_internal_service and (internal_service := cls.get_internal_service(request)):
            return internal_service
        if with_token and (token := cls.get_token(request)):
            if token.enabled and token.internal:
                return token
            return None
