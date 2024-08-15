import base64

import httpx
import structlog
from django.conf import settings
from django.core.cache import caches


logger = structlog.getLogger(__name__)

SERVICE_SCOPE = base64.urlsafe_b64encode(b'[{"service":"cloud_db"}]').decode()
AUTH_URI = settings.AUTH_SRV_PROVIDERS + "/oauth2/token"
SECRET_CACHE_KEY = "cdb_service_auth"


def request_auth_token():
    """
    Request an authentication token from the authentication service.

    This function constructs a request for an authentication token based on client credentials
    and sends it to the authentication service. It handles any request errors and response
    decoding errors by logging them and re-raising the exceptions. If the response indicates
    an error (response.is_error), it logs the error and raises an HTTP exception.

    :raises ValueError: If any of the required authentication settings (AUTH_SRV_PROVIDERS,
                        AUTH_SRV_ID, or AUTH_SRV_SECRET) are missing.
    :raises httpx.RequestError: If the request to the authentication service fails.
    :raises httpx.HTTPStatusError: If the authentication service responds with an error status code.
    :raises httpx.DecodingError: If decoding the response JSON fails.
    :return: A dictionary containing the authentication token and its expiry information.
    """
    if not all([settings.AUTH_SRV_PROVIDERS, settings.AUTH_SRV_ID, settings.AUTH_SRV_SECRET]):
        raise ValueError("Missing required auth settings.")
    data = {
        "grant_type": "client_credentials",
        "scope": SERVICE_SCOPE,
        "client_id": settings.AUTH_SRV_ID,
        "client_secret": settings.AUTH_SRV_SECRET,
    }
    try:
        response = httpx.post(AUTH_URI, data=data, headers={"Content-Type": "application/x-www-form-urlencoded"})
    except httpx.RequestError as exc:
        logger.critical("Request to auth provider failed",
                        url=AUTH_URI, exception=exc)
        raise
    if response.is_error:
        logger.critical("Failed to get auth token", response=response.text)
        response.raise_for_status()
    try:
        return response.json()
    except httpx.DecodingError as exc:
        logger.critical("Failed to decode auth token", exception=exc)
        raise


def get_auth_token() -> str:
    """
    Retrieve or request a new authentication token.

    This function first attempts to retrieve the authentication token from the local cache.
    If the token is not found in the cache, it requests a new token using request_auth_token(),
    stores the new token in the cache with an expiry time slightly shorter than the token's
    actual expiry time (to account for any potential time drift), and then returns the token.

    :return: The authentication token as a string.
    """
    cache = caches['local']
    if token := cache.get(SECRET_CACHE_KEY):
        return token
    token_data = request_auth_token()
    cache.set(SECRET_CACHE_KEY, token_data["access_token"],
              token_data["expires_in"] - 20 if token_data["expires_in"] > 20 else 0)
    return token_data["access_token"]


def get_auth_string() -> str:
    """
    Generate the authorization header string.

    This function retrieves the current authentication token and formats it as a Bearer token
    for use in HTTP Authorization headers.

    :return: The formatted authorization header string.
    """
    return f"Bearer {get_auth_token()}"