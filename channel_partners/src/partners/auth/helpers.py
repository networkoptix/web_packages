from typing import Optional

import httpx
import structlog
from django.conf import settings
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


