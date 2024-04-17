import json
import re
import urllib.request
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from ssl import SSLContext
from typing import (
    Any,
    Dict,
    List,
    Optional,
)
from urllib.error import URLError

import jwt
from jwt import (
    InvalidAlgorithmError,
    InvalidKeyError,
    PyJWK,
    PyJWKClient,
    PyJWKClientConnectionError,
    PyJWKClientError,
    PyJWKError,
    PyJWKSetError,
)
from jwt.types import JWKDict


JWT_REGEX = re.compile(r'^nxcdb-(?P<jwt>[A-Za-z0-9-_]*\.[A-Za-z0-9-_]*\.[A-Za-z0-9-_]*)$')


class FallbackToRegToken(Exception):
    def __init__(self, *args, reason=None, **kwargs):
        self.reason = reason
        super().__init__(*args, **kwargs)


class JWKMissingKeyError(Exception):
    pass


@dataclass
class JTWPayload:
    exp: int
    pwdTime: int
    sid: str
    typ: str
    aud: str
    iat: int
    sub: str
    client_id: str
    iss: str

    @property
    def is_expired(self) -> bool:
        return self.exp < datetime.now(tz=timezone.utc).timestamp()

    @property
    def expires_in(self) -> int:
        return int(self.exp - datetime.now(tz=timezone.utc).timestamp())


class JWKClient(PyJWKClient):
    """
    Client for fetching and storing JWKs.
    Changes from PyJWKClient:
     - Added ability to initialize keys list on object instantiation.
     - Changes parsing of jwks endpoint data to normalize it in format accepted by PyJWKClient
     - Removed keys refresh if there are cached keys exist
     - Added functionality to disable client if `max_fallbacks` limit reached on errors
     - Added functionality to check if errors gone when there were no errors
        during `retry_fallback_after` period
    """
    def __init__(
        self,
        uri: str,
        cache_keys: bool = False,
        max_cached_keys: int = 16,
        cache_jwk_set: bool = True,
        lifespan: int = 300,
        headers: Optional[Dict[str, Any]] = None,
        timeout: int = 30,
        ssl_context: Optional[SSLContext] = None,
        init_keys: bool = True,
    ):
        super().__init__(
            uri=uri,
            cache_keys=cache_keys,
            max_cached_keys=max_cached_keys,
            cache_jwk_set=cache_jwk_set,
            lifespan=lifespan,
            headers=headers,
            timeout=timeout,
            ssl_context=ssl_context,
        )
        self.keys_last_update = 0
        if init_keys:
            self.get_signing_keys(refresh=True)
        self.missed_keys = deque(maxlen=128)
        # maximum fallbacks on error limit
        self.max_fallbacks = 30
        # current count of fallback on error
        self.current_fallbacks = 0
        # last fallback on error timestamp
        self.last_fallback = datetime.utcnow().timestamp()
        # retry timeout
        self.retry_fallback_after = 600

    def fetch_data(self) -> Any:
        update_ts = datetime.utcnow().timestamp()
        jwk_set: Any = None
        try:
            r = urllib.request.Request(url=self.uri, headers=self.headers)
            with urllib.request.urlopen(
                r, timeout=self.timeout, context=self.ssl_context
            ) as response:
                try:
                    jwk_set: List[JWKDict] = json.load(response)
                except Exception as e:
                    raise PyJWKClientError(f'Cannot decode json body: {e}')
                # format data to acceptable by JWKSetCache
                jwk_set = {'keys': jwk_set}
        except (URLError, TimeoutError) as e:
            raise PyJWKClientConnectionError(
                f'Fail to fetch data from the url, err: "{e}"'
            )
        else:
            return jwk_set
        finally:
            if self.jwk_set_cache is not None:
                self.jwk_set_cache.put(jwk_set)
            self.keys_last_update = update_ts

    def get_signing_key(self, kid: str) -> PyJWK:
        if not kid:
            # must fall back to regular token if kid is missing in headers
            raise PyJWKClientError('Key id is missing.')
        if kid in self.missed_keys:
            # kid has been checked already and not found
            raise JWKMissingKeyError(
                f'Unable to find a signing key that matches: "{kid}"'
            )
        # keys are issued in advance, consider that fetched keys list
        # are complete during caching period (6 hrs).
        if not (signing_keys := self.get_signing_keys()):
            signing_keys = self.get_signing_keys(refresh=True)
        signing_key = self.match_kid(signing_keys, kid)

        if not signing_key:
            # No matching signing key for this id.
            self.missed_keys.append(kid)
            raise JWKMissingKeyError(
                f'Unable to find a signing key that matches: "{kid}"'
            )

        return signing_key

    def incr_fallbacks(self):
        self.current_fallbacks += 1
        self.last_fallback = datetime.utcnow().timestamp()

    def reset_fallbacks(self):
        self.current_fallbacks = 0

    @property
    def is_failure(self):
        if self.current_fallbacks < self.max_fallbacks:
            return False
        if self.last_fallback + self.retry_fallback_after < datetime.utcnow().timestamp():
            return False
        return True

    def decode_jwt_token(self, token: str, verify_exp=False) -> JTWPayload:
        if not (match := JWT_REGEX.match(token)):
            raise FallbackToRegToken("Not a valid JWT token string.",
                                     reason="invalid_format")
        if self.is_failure:
            raise FallbackToRegToken(f"Too many failures in last {self.retry_fallback_after} seconds.",
                                     reason="too_many_failures")
        jwt_token = match.group('jwt')
        try:
            key = self.get_signing_key_from_jwt(jwt_token)
        except (PyJWKClientError,
                PyJWKClientConnectionError,
                PyJWKSetError,
                PyJWKError,
                PyJWKSetError,
                InvalidKeyError,
                InvalidAlgorithmError) as ex:
            # record error
            self.incr_fallbacks()
            raise FallbackToRegToken(f"Message: {ex}. Class: {ex.__class__}.",
                                     reason="jwk_client_error")
        # reset errors on successful response
        self.reset_fallbacks()
        payload = jwt.decode(
            jwt=jwt_token, key=key.key, algorithms=["RS256"],
            options={"verify_aud": False, "verify_exp": verify_exp}
        )
        return JTWPayload(**payload)


def get_jwk_client(default_hostname: str, lifespan: int = 21600, init_keys: bool = False) -> JWKClient:
    uri = f"https://{default_hostname}/cdb/oauth2/jwks"
    client = JWKClient(
        uri=uri,
        lifespan=lifespan,
        cache_keys=True,
        init_keys=init_keys,
    )
    return client
