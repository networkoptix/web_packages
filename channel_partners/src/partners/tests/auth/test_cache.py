from time import sleep
from uuid import uuid4

from partners.auth.cache import TokenCache


def test_token_cache(mocker):
    token = f'{uuid4()}'
    value = f'{uuid4()}'
    TokenCache.set_token(token, value, expires_in='3600')
    assert TokenCache.get_token(token) == value

    TokenCache.set_token(token, value, expires_in='1')
    assert TokenCache.get_token(token) == value
    sleep(2)
    assert TokenCache.get_token(token) is None

    cache_get_mock = mocker.patch("nx_django_redis.redis_cache.RedisSyncBackend.get", return_value=None)
    assert TokenCache.get_token(None) is None
    cache_get_mock.assert_not_called()
