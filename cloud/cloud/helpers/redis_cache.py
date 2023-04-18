import re

from asgiref.sync import sync_to_async
from django.core.cache.backends.redis import RedisCacheClient, RedisCache
from django.core.cache.backends.base import DEFAULT_TIMEOUT


class CustomRedisClient(RedisCacheClient):

    def hdel(self, key, *fields):
        """
        Removes the specified fields from the hash stored at key. Specified fields
        that do not exist within this hash are ignored. If key does not exist, it
        is treated as an empty hash and this command returns 0.
        Args:
            key: hash key
            *fields: fields names
        Returns: bool

        """
        client = self.get_client(key, write=True)
        return bool(client.hdel(key, *fields))

    def hexists(self, key, field):
        """
        Returns if field is an existing field in the hash stored at key.
        Args:
            key: hash key
            field: field name

        Returns: bool

        """
        client = self.get_client(key)
        return bool(client.hexists(key, field))

    def hget(self, key, field, default):
        """
        Returns the value associated with field in the hash stored at key.
        Args:
            key: hash key
            field: field name
            default: default value is field does not exist

        Returns:

        """
        client = self.get_client(key)
        value = client.hget(key, field)
        return default if value is None else self._serializer.loads(value)

    def hgetall(self, key):
        """
        Returns all fields and values of the hash stored at key. In the returned
        value, every field name is followed by its value, so the length of the
        reply is twice the size of the hash.
        Args:
            key: hash key

        Returns: dict

        """
        client = self.get_client(key)
        value = client.hgetall(key)
        return {
            k.decode(): self._serializer.loads(v) for k, v in value.items() if v is not None
        }

    def hkeys(self, key):
        """
        Returns all field names in the hash stored at key.
        Args:
            key: hash key

        Returns: list

        """
        client = self.get_client(key)
        values = client.hkeys(key)
        return [value.decode() for value in values]

    def hlen(self, key):
        """
        Returns the number of fields contained in the hash stored at key.
        Args:
            key: hash key

        Returns: int

        """
        client = self.get_client(key)
        value = client.hlen(key)
        return value

    def hmget(self, key, *fields):
        """
        Returns the values associated with the specified fields in the hash
         stored at key if hash/field exists.

        Args:
            key: hash key
            *fields: fields names

        Returns:

        """
        client = self.get_client(key)
        ret = client.hmget(key, fields)
        return {
            k: self._serializer.loads(v) for k, v in zip(fields, ret) if v is not None
        }

    def hmset(self, key, data, timeout):
        """
        Set many values to hash.
        Args:
            key: hash name
            data: data to store
            timeout: timeout. will be set to whole hash

        Returns:

        """
        client = self.get_client(None, write=True)
        pipeline = client.pipeline()
        pipeline.hmset(key, {k: self._serializer.dumps(v) for k, v in data.items()})

        if timeout is not None:
            # Setting timeout for each key as redis does not support timeout
            # with mset().
            for key in data:
                pipeline.expire(key, timeout)
        pipeline.execute()

    def hscan(self, key, cursor=0, match=None, count=None):

        client = self.get_client(key)
        cur, ret = client.hscan(key, cursor=cursor, match=match, count=count)
        return cur, {
            k.decode(): self._serializer.loads(v) for k, v in ret.items() if v is not None
        }

    def hset(self, key, field, value):
        client = self.get_client(key, write=True)
        value = self._serializer.dumps(value)
        client.hset(key, field, value)


class CustomRedisCache(RedisCache):
    def __init__(self, server, params):
        super().__init__(server, params)
        self._class = CustomRedisClient

    def hdel(self, key, *fields, version=None):
        key = self.make_and_validate_key(key, version=version)
        for f in fields:
            self.validate_key(f)
        return self._cache.hdel(key, *fields)

    async def ahdel(self, key, *fields, version=None):
        return await sync_to_async(self.hdel)(key, *fields, version=version)

    def hexists(self, key, field, version=None):
        key = self.make_and_validate_key(key, version=version)
        self.validate_key(field)
        return self._cache.hexists(key, field)

    async def ahexists(self, key, field, version=None):
        return await sync_to_async(self.hexists)(key, field, version=version)

    def hget(self, key, field, default=None, version=None):
        key = self.make_and_validate_key(key, version=version)
        self.validate_key(field)
        return self._cache.hget(key, field, default)

    async def ahget(self, key, field, default=None, version=None):
        return await sync_to_async(self.hget)(key, field, default, version=version)

    def hgetall(self, key, version=None):
        key = self.make_and_validate_key(key, version=version)
        return self._cache.hgetall(key)

    async def ahgetall(self, key, version=None):
        return await sync_to_async(self.hgetall)(key, version=version)

    def hkeys(self, key, version=None):
        key = self.make_and_validate_key(key, version=version)
        return self._cache.hkeys(key)

    async def ahkeys(self, key, version=None):
        return await sync_to_async(self.hkeys)(key, version=version)

    def hlen(self, key, version=None):
        key = self.make_and_validate_key(key, version=version)
        return self._cache.hlen(key)

    async def ahlen(self, key, version=None):
        return await sync_to_async(self.hlen)(key, version=version)

    def hmget(self, key, *fields, version=None):
        key = self.make_and_validate_key(key, version=version)
        for f in fields:
            self.validate_key(f)
        return self._cache.hmget(key, *fields)

    async def ahmget(self, key, *fields, version=None):
        return await sync_to_async(self.hmget)(key, *fields, version=version)

    def hmset(self, key, data, timeout=DEFAULT_TIMEOUT, version=None):
        key = self.make_and_validate_key(key, version=version)
        safe_data = {}
        for field, value in data.items():
            self.validate_key(field)
            safe_data[field] = value
        return self._cache.hmset(key, data, timeout=self.get_backend_timeout(timeout))

    async def ahmset(self, key, data, timeout=DEFAULT_TIMEOUT, version=None):
        return await sync_to_async(self.hmset)(key, data, timeout=timeout, version=version)

    def hscan(self, key, cursor=0, match=None, count=None, version=None):
        """
        Scanning hash for keys matching pattern.
        Args:
            key: hash key
            cursor: cursor to start scanning
            match: match pattern
            count: a "minimum" count of returned keys. it can return be less or more. it depends on many things
            version: value version

        Returns:

        """
        key = self.make_and_validate_key(key, version=version)
        return self._cache.hscan(key, cursor=cursor, match=match, count=count)

    async def ahscan(self, key, cursor=0, match=None, count=None, version=None):
        return await sync_to_async(self.hscan)(key, cursor=cursor, match=match, count=count, version=version)

    def hset(self, key, field, value, version=None):
        key = self.make_and_validate_key(key, version=version)
        self.validate_key(field)
        return self._cache.hset(key, field, value)

    async def ahset(self, key, field, value, version=None):
        return await sync_to_async(self.hset)(key, field, value, version=version)

