from dataclasses import dataclass
from datetime import datetime
from typing import (
    Dict,
    List,
    Union,
)

import httpx
import structlog
from django.core.cache import caches


logger = structlog.getLogger(__name__)

@dataclass
class JWTPubKey:
    kty: str
    use: str
    kid: str
    n: str
    e: str
    alg: str
    key_ops: List[str]


NOT_FOUND = 'not_found'


class CDBConnectionError(Exception):
    pass


class JWTPubKeysStorage:
    _jwks_uri: str = '/cdb/oauth2/jwks'
    _jwk_uri: str = '/cdb/oauth2/jwks/{kid}'
    _jwk_cache_key: str = 'jwt-pub-key-{kid}'
    _jwk_cache_last_updated: str = 'jwt-pub-key-last-updated'
    request_timeout: int = 1
    max_retries: int = 3
    cache_timeout: int = 86400

    def __init__(self, cloud_host_name: str):
        self.cloud_host_name = cloud_host_name
        self._keys = dict()

    def jwk_cache_key(self, kid: str) -> str:
        return self._jwk_cache_key.format(kid)

    def get_cached_jwk(self, kid: str) -> JWTPubKey:
        return caches['local'].get(self.jwk_cache_key(kid))

    def set_cached_jwk(self, jwk: JWTPubKey) -> None:
        caches['local'].set(self.jwk_cache_key(jwk.kid), jwk, timeout=self.cache_timeout)

    def set_last_updated(self):
        caches['local'].set(self._jwk_cache_last_updated, datetime.utcnow().timestamp(), timeout=self)

    def get_last_updated(self) -> float:
        return caches['local'].get(self._jwk_cache_last_updated) or 0

    @property
    def jwks_uri(self) -> str:
        return f'https://{self.cloud_host_name}' + self._jwks_uri

    def get_jwk_uri(self, kid: str) -> str:
        return f'https://{self.cloud_host_name}' + self._jwk_uri.format(kid)

    def get_pub_jwks(self, _retry=0) -> List[JWTPubKey]:
        try:
            response = httpx.get(self.jwks_uri)
        except httpx.HTTPError as ex:
            if _retry < self.max_retries:
                return self.get_pub_jwks(_retry=_retry+1)
            logger.error('Cannot request JWT public keys.',
                         url=self.jwks_uri,
                         cloud_host_name=self.cloud_host_name,
                         exception=str(ex))
            raise ex
        response.raise_for_status()
        keys = response.json()
        return [JWTPubKey(**key) for key in keys]

    def get_pub_jwk(self, kid, _retry=0) -> Union[JWTPubKey, str]:
        url = self.get_jwk_uri(kid)
        try:
            response = httpx.get(url)
        except httpx.HTTPError as ex:
            if _retry < self.max_retries:
                return self.get_pub_jwk(kid, _retry=_retry+1)
            logger.error('Cannot request JWT public key.',
                         kid=kid,
                         url=url,
                         cloud_host_name=self.cloud_host_name,
                         exception=str(ex))
            raise ex
        if response.status_code != 404:
            # if not found return
            return None
        response.raise_for_status()
        key = response.json()
        return JWTPubKey(**key)

    def renew_jwks(self) -> Dict[str, JWTPubKey]:
        keys = self.get_pub_jwks()
        ret = {}
        for key in keys:
            ret[key.kid] = key
            self.set_cached_jwk(key)
        return ret


