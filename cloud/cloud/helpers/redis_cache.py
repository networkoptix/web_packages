import asyncio
import random
import threading
import typing
import types
import pickle
import weakref
from logging import getLogger

from asgiref.sync import sync_to_async
from django.utils.module_loading import import_string
from django.utils.functional import cached_property
from django.core.cache.backends.redis import RedisCacheClient, RedisCache
from django.core.cache.backends.base import DEFAULT_TIMEOUT
from redis.asyncio import Redis as AsyncRedis, ConnectionPool as AsyncConnectionPool
from redis.asyncio.connection import DefaultParser
from redis.backoff import NoBackoff
from redis.asyncio.retry import Retry

logger = getLogger(__name__)
thread_local = threading.local()


def _wrap_close(loop):
    # wrapper for loop.close() stolen from django-channels
    # https://github.com/django/channels_redis/pull/347/files
    orig_close = loop.close

    def _wrapper(self, *args, **kwargs):
        """
        Looking for pools in weak reference stored thread local.
        If pool for loop exists close all connections.
        """
        self.close = orig_close
        if not (pools_ref := getattr(thread_local, 'pools_ref', None)) or not pools_ref():
            return self.close(*args, **kwargs)
        if pool := pools_ref().get(loop, {}):
            logger.info(f"Loop {id(loop)} is closing. Close pool {id(pool)}")
            self.run_until_complete(pool.disconnect())
        return self.close(*args, **kwargs)

    setattr(loop, 'is_wrapped', True)
    loop.close = types.MethodType(_wrapper, loop)


class RedisSerializer:
    def __init__(self, protocol=None):
        self.protocol = pickle.HIGHEST_PROTOCOL if protocol is None else protocol

    def dumps(self, obj):
        # Only skip pickling for integers, a int subclasses as bool should be
        # pickled.
        if type(obj) is int:
            return obj
        if asyncio.iscoroutine(obj) or asyncio.isfuture(obj) or asyncio.iscoroutinefunction(obj):
            # Catch awaitable before it is saved to cache.
            raise ValueError(f"Awaitable cannot be cached. Got object: {obj!r}")
        return pickle.dumps(obj, self.protocol)

    def loads(self, data):
        try:
            return int(data)
        except ValueError:
            return pickle.loads(data)


class AsyncRedisSerializer(RedisSerializer):
    async def adumps(self, obj):
        return await sync_to_async(self.dumps)(obj)

    async def aloads(self, obj):
        return await sync_to_async(self.loads)(obj)


class Pools(dict):
    pass


class AsyncCacheClient:
    def __init__(
        self,
        servers,
        serializer=None,
        pool_class=None,
        parser_class=None,
        **options,
    ):
        import redis
        self._lib = redis.asyncio
        self._servers = servers
        self._new_pool_lock = asyncio.Lock()

        # Initialize _pools dictionary and create weak reference on it or use existing one.
        # Motivation to use weak reference is that redis requests usually go in a bunch within request/response
        # life cycle. So, on a short period we can delete AsyncCacheClient instance but pools wer assigned to it
        # will be still alive. Concurrent instance will use reference to the same object which means the pool will
        # be shared by clients on a one thread. When weak reference expired pools dictionary, pools and all child
        # connections will be deleted and closed. This reference is saved in thread local which is thread-safe
        # by default. Even if AsyncCacheClient runs in case when a same loop used in different threads, there
        # will be different storage for pools and different pools.
        if getattr(thread_local, 'pools_ref', None) is None or not thread_local.pools_ref():
            logger.debug(f"No references on pool.")
            self._pools = Pools()
        else:
            logger.debug(f"References on pool exists.")
            self._pools = thread_local.pools_ref()
        thread_local.pools_ref = weakref.ref(self._pools)

        self._client = AsyncRedis

        if isinstance(pool_class, str):
            pool_class = import_string(pool_class)
        self._pool_class = pool_class or AsyncConnectionPool

        if isinstance(serializer, str):
            serializer = import_string(serializer)
        if callable(serializer):
            serializer = serializer()
        # Note! Serializer can call Django ORM what is not possible from out async coroutine.
        # Serializer methods 'loads' and 'dumps' must be decorated by sync_to_async.
        # Serializers method 'aloads' and 'adumps' must be async.
        self._serializer = serializer or AsyncRedisSerializer()

        if isinstance(parser_class, str):
            parser_class = import_string(parser_class)
        parser_class = parser_class or DefaultParser

        self._pool_options = {
            "parser_class": parser_class,
            "client_name": "async",
            "retry": Retry(NoBackoff(), retries=2),
            "retry_on_error": [redis.exceptions.ConnectionError],
            **options}

    def _get_connection_server_index(self, write):
        # left in a case of using multiple servers in future
        if write or len(self._servers) == 1:
            return 0
        return random.randint(1, len(self._servers) - 1)

    def sanitize_pools(self):
        """
        Removes pools with closed loops.
        """
        for loop in list(self._pools.keys()):
            if loop.is_closed():
                logger.debug(f"Loop {loop} closed, remove pool.")
                del self._pools[loop]

    async def _get_connection_pool(self, write):
        self.sanitize_pools()
        # connection pool must be assigned to loop where it was initialized
        loop = asyncio.get_running_loop()
        async with self._new_pool_lock:
            if loop not in self._pools:
                pool = self._pool_class.from_url(
                    self._servers[self._get_connection_server_index(write)],
                    **self._pool_options,
                )
                if not getattr(loop, 'is_wrapped', False):
                    # This is no more required, probably. Tests needed,
                    _wrap_close(loop)
                self._pools[loop] = pool
                logger.debug(f"New pool {id(pool)} on client {id(self)} in loop {id(loop)} "
                             f"and thread {threading.get_native_id()}:{threading.get_ident()}")
        return self._pools[loop]

    async def get_client(self, key=None, *, write=False) -> AsyncRedis:
        pool = await self._get_connection_pool(write)
        client = self._client(connection_pool=pool)
        return client

    async def add(self, key, value, timeout):
        client = await self.get_client(key, write=True)
        value = await self._serializer.adumps(value)

        if timeout == 0:
            if ret := bool(await client.set(key, value, nx=True)):
                await client.delete(key)
            return ret
        else:
            return bool(await client.set(key, value, ex=timeout, nx=True))

    async def get(self, key, default):
        client = await self.get_client(key)
        value = await client.get(key)
        return default if value is None else await self._serializer.aloads(value)

    async def ttl(self, key):
        client = await self.get_client(key)
        value = await client.ttl(key)
        return await self._serializer.aloads(value)

    async def set(self, key, value, timeout):
        client = await self.get_client(key, write=True)
        value = await self._serializer.adumps(value)
        if timeout == 0:
            await client.delete(key)
        else:
            await client.set(key, value, ex=timeout)

    async def touch(self, key, timeout):
        client = await self.get_client(key, write=True)
        if timeout is None:
            return bool(await client.persist(key))
        else:
            return bool(await client.expire(key, timeout))

    async def delete(self, key):
        client = await self.get_client(key, write=True)
        return bool(await client.delete(key))

    async def get_many(self, keys):
        client = await self.get_client(None)
        ret = await client.mget(keys)
        return {
            k: await self._serializer.aloads(v) for k, v in zip(keys, ret) if v is not None
        }

    async def has_key(self, key):
        client = await self.get_client(key)
        return bool(await client.exists(key))

    async def incr(self, key, delta):
        client = await self.get_client(key)
        if not (await client.exists(key)):
            raise ValueError("Key '%s' not found." % key)
        return await client.incr(key, delta)

    async def set_many(self, data, timeout):
        client = await self.get_client(None, write=True)
        async with client.pipeline() as pipeline:
            pipeline.mset({k: await self._serializer.adumps(v) for k, v in data.items()})

            if timeout is not None:
                # Setting timeout for each key as redis does not support timeout
                # with mset().
                for key in data:
                    pipeline.expire(key, timeout)
            await pipeline.execute()

    async def delete_many(self, keys):
        client = await self.get_client(None, write=True)
        await client.delete(*keys)

    async def clear(self):
        client = await self.get_client(None, write=True)
        return bool(await client.flushdb())

    async def hdel(self, key, *fields):
        """
        Removes the specified fields from the hash stored at key. Specified fields
        that do not exist within this hash are ignored. If key does not exist, it
        is treated as an empty hash and this command returns 0.
        Args:
            key: hash key
            *fields: fields names
        Returns: bool

        """
        client = await self.get_client(key, write=True)
        return bool(await client.hdel(key, *fields))

    async def hexists(self, key, field):
        """
        Returns if field is an existing field in the hash stored at key.
        Args:
            key: hash key
            field: field name

        Returns: bool

        """
        client = await self.get_client(key)
        return bool(await client.hexists(key, field))

    async def hget(self, key, field, default):
        """
        Returns the value associated with field in the hash stored at key.
        Args:
            key: hash key
            field: field name
            default: default value is field does not exist

        Returns:

        """
        client = await self.get_client(key)
        value = await client.hget(key, field)
        return default if value is None else await self._serializer.aloads(value)

    async def hgetall(self, key):
        """
        Returns all fields and values of the hash stored at key. In the returned
        value, every field name is followed by its value, so the length of the
        reply is twice the size of the hash.
        Args:
            key: hash key

        Returns: dict

        """
        client = await self.get_client(key)
        value = await client.hgetall(key)
        return {
            k.decode(): await self._serializer.aloads(v) for k, v in value.items() if v is not None
        }

    async def hkeys(self, key):
        """
        Returns all field names in the hash stored at key.
        Args:
            key: hash key

        Returns: list

        """
        client = await self.get_client(key)
        values = await client.hkeys(key)
        return [value.decode() for value in values]

    async def hlen(self, key):
        """
        Returns the number of fields contained in the hash stored at key.
        Args:
            key: hash key

        Returns: int

        """
        client = await self.get_client(key)
        value = await client.hlen(key)
        return value

    async def hmget(self, key, *fields):
        """
        Returns the values associated with the specified fields in the hash
         stored at key if hash/field exists.

        Args:
            key: hash key
            *fields: fields names

        Returns:

        """
        client = await self.get_client(key)
        ret = await client.hmget(key, fields)
        return {
            k: await self._serializer.aloads(v) for k, v in zip(fields, ret) if v is not None
        }

    async def hmset(self, key, data, timeout):
        """
        Set many values to hash.
        Args:
            key: hash name
            data: data to store
            timeout: timeout. will be set to whole hash

        Returns:

        """
        client = await self.get_client(None, write=True)
        async with client.pipeline() as pipeline:
            pipeline.hset(key, mapping={k: await self._serializer.adumps(v) for k, v in data.items()})

            if timeout is not None:
                # Setting timeout for each key as redis does not support timeout
                # with mset().
                for key in data:
                    pipeline.expire(key, timeout)
            await pipeline.execute()

    async def hscan(self, key, cursor=0, match=None, count=None):

        client = await self.get_client(key)
        cur, ret = await client.hscan(key, cursor=cursor, match=match, count=count)
        return cur, {
            k.decode(): await self._serializer.aloads(v) for k, v in ret.items() if v is not None
        }

    async def hset(self, key, field, value):
        client = await self.get_client(key, write=True)
        value = await self._serializer.adumps(value)
        await client.hset(key, field, value)

    async def unlink(self, *keys):
        client = await self.get_client(key=None, write=True)
        await client.unlink(*keys)


class CustomRedisClient(RedisCacheClient):
    def __init__(
        self,
        servers,
        serializer=None,
        pool_class=None,
        parser_class=None,
        **options,
    ):
        # rewrite serializer class to custom one to avoid awaitable caching
        super().__init__(
            servers, serializer=RedisSerializer,
            pool_class=pool_class, parser_class=parser_class,
            client_name="sync",
            **options
        )

    def keys(self, pattern):
        client = self.get_client(None, write=False)
        return client.keys(pattern=pattern)

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

    def hmset(self, key, data, timeout=None):
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
        pipeline.hset(key, mapping={k: self._serializer.dumps(v) for k, v in data.items()})

        if timeout is not None:
            # Setting timeout for each key as redis does not support timeout
            # with mset().
            for key in data:
                pipeline.expire(key, timeout)
        pipeline.execute()

    def hscan(self, key, cursor=0, match=None, count=None) -> typing.Tuple[int, dict]:

        client = self.get_client(key)
        cur, ret = client.hscan(key, cursor=cursor, match=match, count=count)
        return cur, {
            k.decode(): self._serializer.loads(v) for k, v in ret.items() if v is not None
        }

    def hset(self, key, field, value):
        client = self.get_client(key, write=True)
        value = self._serializer.dumps(value)
        client.hset(key, field, value)

    def unlink(self, *keys):
        client = self.get_client(None, write=True)
        client.unlink(*keys)

    def expire(self, key, timeout):
        client = self.get_client(key)
        return client.expire(key, timeout)

    def scan(self, key, cursor=0, match='*', count=None):
        client = self.get_client(key, write=True)
        return client.scan(key, cursor=cursor, match=match, count=count)

    def scan_iter(self, match=None, count=None):
        client = self.get_client(match, write=True)
        return client.scan_iter(match=match, count=count)

    def client_list(self):
        return self.get_client(None).client_list()


class CustomRedisCache(RedisCache):
    def __init__(self, server, params):
        super().__init__(server, params)
        self._class = CustomRedisClient
        self._async_class = AsyncCacheClient

    @cached_property
    def _async_cache(self):
        """
        It's kind of counterintuitive thing. `django.core.cache.caches` stores connections
        (read as cache backend class) in asgiref.Local, which is suggested to work fine with
        threads and coroutines. In fact, it creates new instances almost each time when used
        some threading or concurrency. `@cached_property` saves values in instance. These cause
        creation a new pool almost on all calls and as soon as pool created clean all connections
        are being created from scratch too. I'm not sure why, but it works fine within single
        request/response cycle. Probably, it is suggested that objects in `asgiref.Local` are
        released within dieing of thread/loop, but it's obviously not true.
        See `AsyncCacheClient.__ini__` for solution description.
        """
        return self._async_class(self._servers, **self._options)

    @cached_property
    def _cache(self):
        return self._class(self._servers, **self._options)

    def keys(self, pattern, version=None):
        key = self.make_and_validate_key(pattern, version=version)
        return self._cache.keys(key)

    def hdel(self, key, *fields, version=None):
        key = self.make_and_validate_key(key, version=version)
        for f in fields:
            self.validate_key(f)
        return self._cache.hdel(key, *fields)

    async def ahdel(self, key, *fields, version=None):
        key = self.make_and_validate_key(key, version=version)
        for f in fields:
            self.validate_key(f)
        return await self._async_cache.hdel(key, *fields)

    def hexists(self, key, field, version=None):
        key = self.make_and_validate_key(key, version=version)
        self.validate_key(field)
        return self._cache.hexists(key, field)

    async def ahexists(self, key, field, version=None):
        key = self.make_and_validate_key(key, version=version)
        self.validate_key(field)
        return await self._async_cache.hexists(key, field)

    def hget(self, key, field, default=None, version=None):
        key = self.make_and_validate_key(key, version=version)
        self.validate_key(field)
        return self._cache.hget(key, field, default)

    async def ahget(self, key, field, default=None, version=None):
        key = self.make_and_validate_key(key, version=version)
        self.validate_key(field)
        return await self._async_cache.hget(key, field, default)

    def hgetall(self, key, version=None):
        key = self.make_and_validate_key(key, version=version)
        return self._cache.hgetall(key)

    async def ahgetall(self, key, version=None):
        key = self.make_and_validate_key(key, version=version)
        return await self._async_cache.hgetall(key)

    def hkeys(self, key, version=None):
        key = self.make_and_validate_key(key, version=version)
        return self._cache.hkeys(key)

    async def ahkeys(self, key, version=None):
        key = self.make_and_validate_key(key, version=version)
        return await self._async_cache.hkeys(key)

    def hlen(self, key, version=None):
        key = self.make_and_validate_key(key, version=version)
        return self._cache.hlen(key)

    async def ahlen(self, key, version=None):
        key = self.make_and_validate_key(key, version=version)
        return await self._async_cache.hlen(key)

    def hmget(self, key, *fields, version=None):
        key = self.make_and_validate_key(key, version=version)
        for f in fields:
            self.validate_key(f)
        return self._cache.hmget(key, *fields)

    async def ahmget(self, key, *fields, version=None):
        key = self.make_and_validate_key(key, version=version)
        for f in fields:
            self.validate_key(f)
        return await self._async_cache.hmget(key, *fields)

    def hmset(self, key, data, timeout=DEFAULT_TIMEOUT, version=None):
        key = self.make_and_validate_key(key, version=version)
        safe_data = {}
        for field, value in data.items():
            self.validate_key(field)
            safe_data[field] = value
        return self._cache.hmset(key, data, timeout=self.get_backend_timeout(timeout))

    async def ahmset(self, key, data, timeout=DEFAULT_TIMEOUT, version=None):
        key = self.make_and_validate_key(key, version=version)
        safe_data = {}
        for field, value in data.items():
            self.validate_key(field)
            safe_data[field] = value
        return await self._async_cache.hmset(key, data, timeout=self.get_backend_timeout(timeout))

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
        return await self._async_cache.hscan(key, cursor=cursor, match=match, count=count)

    def hset(self, key, field, value, version=None):
        key = self.make_and_validate_key(key, version=version)
        self.validate_key(field)
        return self._cache.hset(key, field, value)

    async def ahset(self, key, field, value, version=None):
        key = self.make_and_validate_key(key, version=version)
        self.validate_key(field)
        return await self._async_cache.hset(key, field, value)

    async def aadd(self, key, value, timeout=DEFAULT_TIMEOUT, version=None):
        key = self.make_and_validate_key(key, version=version)
        return await self._async_cache.add(key, value, self.get_backend_timeout(timeout))

    async def aget(self, key, default=None, version=None):
        key = self.make_and_validate_key(key, version=version)
        return await self._async_cache.get(key, default)

    async def aset(self, key, value, timeout=DEFAULT_TIMEOUT, version=None):
        key = self.make_and_validate_key(key, version=version)
        await self._async_cache.set(key, value, self.get_backend_timeout(timeout))

    async def atouch(self, key, timeout=DEFAULT_TIMEOUT, version=None):
        key = self.make_and_validate_key(key, version=version)
        return await self._async_cache.touch(key, self.get_backend_timeout(timeout))

    async def adelete(self, key, version=None):
        key = self.make_and_validate_key(key, version=version)
        return await self._async_cache.delete(key)

    async def aget_many(self, keys, version=None):
        key_map = {
            self.make_and_validate_key(key, version=version): key for key in keys
        }
        ret = self._cache.get_many(key_map.keys())
        return {key_map[k]: v for k, v in ret.items()}

    async def ahas_key(self, key, version=None):
        key = self.make_and_validate_key(key, version=version)
        return await self._async_cache.has_key(key)

    async def aincr(self, key, delta=1, version=None):
        key = self.make_and_validate_key(key, version=version)
        return await self._async_cache.incr(key, delta)

    async def aset_many(self, data, timeout=DEFAULT_TIMEOUT, version=None):
        safe_data = {}
        for key, value in data.items():
            key = self.make_and_validate_key(key, version=version)
            safe_data[key] = value
        await self._async_cache.set_many(safe_data, self.get_backend_timeout(timeout))
        return []

    async def adelete_many(self, keys, version=None):
        safe_keys = []
        for key in keys:
            key = self.make_and_validate_key(key, version=version)
            safe_keys.append(key)
        await self._async_cache.delete_many(safe_keys)

    async def aexpire(self, key, timeout, version=None):
        key = self.make_and_validate_key(key, version=version)
        return await sync_to_async(self._cache.expire)(key, timeout)

    def expire(self, key, timeout, version=None):
        key = self.make_and_validate_key(key, version=version)
        return self._cache.expire(key, timeout)

    async def attl(self, key, version=None):
        key = self.make_and_validate_key(key, version=version)
        return await self._async_cache.ttl(key)

    async def aclear(self):
        return await self._async_cache.clear()

    def scan_unlink(self, match='*', count=None, version=None):
        match = self.make_and_validate_key(match, version=version)
        for key in self._cache.scan_iter(match=match, count=count):
            self._cache.unlink(key)

    def unlink(self, keys, version=None):
        keys = [self.make_and_validate_key(key, version=version) for key in keys]
        self._cache.unlink(*keys)

    def client_list(self):
        return self._cache.client_list()
