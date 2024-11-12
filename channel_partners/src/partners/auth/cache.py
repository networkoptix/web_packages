import uuid
from hashlib import sha256

from django.conf import settings
from django.core.cache import caches


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
    def get_system_introspection(cls, token: str, system_id: str | uuid.UUID) -> 'IntrospectionResult':
        return cls.cache().get(cls.token_system_cache_key(token, system_id))

    @classmethod
    def set_system_introspection(cls, token: str, system_id: str | uuid.UUID,
                                 introspection: 'IntrospectionResult', expires_in: int = None):
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
