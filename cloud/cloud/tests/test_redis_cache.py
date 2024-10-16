import asyncio
from time import sleep
from uuid import uuid4
import typing
import pytest
from django.core.cache import caches


class TestSyncAsyncRedisBackend:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.cache_name = 'global'
        self.cache = caches[self.cache_name]
        self.cache.clear()
        self.key = 'test_hash_key'
        self.length = 10
        self.test_set = {
            f"field-{uuid4()}": f"value-{uuid4()}" for _ in range(self.length)
        }
        self.fill_test_set()
        self.cache.touch(self.key, 3600)
        
    def test_compat(self):
        import redis
        annotations = {
            'name': str, 'key': typing.Union[str, None], 'value': typing.Union[str, None],
            'mapping': typing.Union[dict, None], 'items': typing.Union[list, None],
            'return': typing.Union[typing.Awaitable[int], int]
        }
        assert redis.Redis.hset.__annotations__ == annotations

    def test_databases_max_index(self):
        ret = self.cache._cache.get_client().config_get('databases')
        assert int(ret['databases']) == 96

    def fill_test_set(self):
        for f, v in self.test_set.items():
            self.cache.hset(self.key, f, v)

    def test_hset_and_hget(self):
        for f, v in self.test_set.items():
            val = self.cache.hget(self.key, f)
            assert val == v

    def test_exists(self):
        for f, v in self.test_set.items():
            is_exists = self.cache.hexists(self.key, f)
            assert is_exists is True
        field_not_exists = self.cache.hexists(self.key, 'none')
        key_not_exists = self.cache.hexists('none', 'none')
        assert field_not_exists is False
        assert key_not_exists is False
    def test_hlen(self):
        length = self.cache.hlen(self.key)
        assert length == self.length

    def test_hdel(self):
        to_delete = list(self.test_set.keys())[0]

        exists = self.cache.hexists(self.key, to_delete)
        assert exists is True

        invalid_field = self.cache.hdel(self.key, 'none')
        invalid_key = self.cache.hdel('none', to_delete)
        ret = self.cache.hdel(self.key, to_delete)
        assert invalid_key is False
        assert invalid_field is False
        assert ret is True

        length = self.cache.hlen(self.key)
        assert length == self.length - 1

        deleted = self.cache.hexists(self.key, to_delete)
        assert deleted is False

    def test_hgetall(self):
        values = self.cache.hgetall(self.key)
        assert values == self.test_set
        values = self.cache.hgetall('none')
        assert values == {}

    def test_hmget(self):
        fields = list(self.test_set.keys())[:5]
        values = self.cache.hmget(self.key, 'none', *fields)

        assert list(values.keys()) == fields
        for f, v in values.items():
            assert v == self.test_set[f]

    def test_hkeys(self):
        fields = set(self.test_set.keys())
        values = self.cache.hkeys(self.key)
        assert fields == set(values)

    def test_hmset(self):
        key = 'multi_set'
        self.cache.hmset(key, self.test_set)

        values = self.cache.hgetall(key)

        assert values == self.test_set

    def test_hscan(self):
        key = 'test_set'
        test_set = {
            f"field-{uuid4()}": f"value-{uuid4()}" for _ in range(2000)
        }
        self.cache.hmset(key, test_set)
        cur, ret = self.cache.hscan(key, cursor=0, count=100)
        assert all([k in test_set for k in ret.keys()])

    def test_caching_awaitable(self):
        async def future():
            return f'{uuid4()}'
        err = None
        try:
            self.cache.set('awaitable', future())
        except Exception as ex:
            err = ex

        assert isinstance(err, ValueError)
        assert err.args[0].startswith('Awaitable cannot be cached. Got object:')

    def test_scan_unlink(self):
        qty = 5
        prefix = f'test-key-{uuid4()}'
        for _ in range(qty):
            self.cache.set(f'{prefix}-{uuid4()}', f'{uuid4()}')

        keys = self.cache.keys(f'{prefix}-*')
        assert len(keys) == qty
        assert all([k.startswith(prefix) for k in keys])

        self.cache.scan_unlink(f'{prefix}-*')
        keys = self.cache.keys(f'{prefix}-*')
        assert len(keys) == 0

    def test_hscan_iter(self):
        qty = 5
        hash = f'{uuid4()}'
        prefix = f'test-key-{uuid4()}'
        for _ in range(qty):
            self.cache.hset(hash, f'{prefix}-{uuid4()}', f'{uuid4()}')

        keys = self.cache.hkeys(hash)
        assert len(keys) == qty
        assert all([k.startswith(prefix) for k in keys])

        for key, data in self.cache.hscan_iter(hash, f'{prefix}-*'):
            assert key in keys
            assert data == self.cache.hget(hash, key)

    def test_clean_keys(self):
        version = 2
        keys = [
            f'key:{self.cache_name}:{version}:{self.cache_name}:{version}:{uuid4()}',
            f'key:{self.cache_name}:{version}:{self.cache_name}:{version}:{uuid4()}',
            f'key:{self.cache_name}:{version}:{self.cache_name}:{version}:{uuid4()}',
        ]
        validated_keys = [self.cache.make_and_validate_key(k, version=version).encode() for k in keys]
        cleaned = self.cache.clean_keys(*validated_keys, version=version)

        assert cleaned == keys

    def test_hmget_keys(self):
        version = 2
        data = {f'key:{self.cache_name}:{version}:{self.cache_name}:{version}:{uuid4()}':1 for _ in range(10)}
        self.cache.hmset('test', data, version=version)
        cached = self.cache.hmget('test', *list(data.keys()), version=version)
        assert cached == data


class TestSyncAsyncRedisBackendAsync:
    @pytest.fixture(autouse=True)
    async def setup(self):
        self.cache_name = 'global'
        self.cache = caches[self.cache_name]
        self.cache.clear()
        self.key = 'test_hash_key'
        self.length = 10
        self.test_set = {
            f"field-{uuid4()}": f"value-{uuid4()}" for _ in range(self.length)
        }
        self.fill_test_set()
        self.cache.touch(self.key, 3600)

    def fill_test_set(self):
        for f, v in self.test_set.items():
            self.cache.hset(self.key, f, v)

    @pytest.mark.asyncio
    async def test_hset_and_hget(self):
        for f, v in self.test_set.items():
            val = await self.cache.ahget(self.key, f)
            assert val == v

        coros = [self.cache.ahget(self.key, f) for f, v in self.test_set.items()]
        results = await asyncio.gather(*coros)
        for v, res in zip(self.test_set.values(), results):
            assert v == res

    @pytest.mark.asyncio
    async def test_exists(self):
        for f, v in self.test_set.items():
            is_exists = await self.cache.ahexists(self.key, f)
            assert is_exists is True
        field_not_exists = await self.cache.ahexists(self.key, 'none')
        key_not_exists = await self.cache.ahexists('none', 'none')
        assert field_not_exists is False
        assert key_not_exists is False

    @pytest.mark.asyncio
    async def test_hlen(self):
        length = await self.cache.ahlen(self.key)
        assert length == self.length

    @pytest.mark.asyncio
    async def test_hdel(self):
        to_delete = list(self.test_set.keys())[0]

        exists = await self.cache.ahexists(self.key, to_delete)
        assert exists is True

        invalid_field = await self.cache.ahdel(self.key, 'none')
        invalid_key = await self.cache.ahdel('none', to_delete)
        ret = await self.cache.ahdel(self.key, to_delete)
        assert invalid_key is False
        assert invalid_field is False
        assert ret is True

        length = await self.cache.ahlen(self.key)
        assert length == self.length - 1

        deleted = await self.cache.ahexists(self.key, to_delete)
        assert deleted is False

    @pytest.mark.asyncio
    async def test_hgetall(self):
        values = await self.cache.ahgetall(self.key)
        assert values == self.test_set
        values = await self.cache.ahgetall('none')
        assert values == {}

    @pytest.mark.asyncio
    async def test_hmget(self):
        fields = list(self.test_set.keys())[:5]
        values = await self.cache.ahmget(self.key, 'none', *fields)

        assert list(values.keys()) == fields
        for f, v in values.items():
            assert v == self.test_set[f]

    @pytest.mark.asyncio
    async def test_hkeys(self):
        fields = set(self.test_set.keys())
        values = await self.cache.ahkeys(self.key)
        assert fields == set(values)

    @pytest.mark.asyncio
    async def test_hmset(self):
        key = 'multi_set'
        await self.cache.ahmset(key, self.test_set)

        values = await self.cache.ahgetall(key)

        assert values == self.test_set

    @pytest.mark.asyncio
    async def test_hscan(self):
        key = 'test_set'
        test_set = {
            f"field-{uuid4()}": f"value-{uuid4()}" for _ in range(200)
        }
        await self.cache.ahmset(key, test_set)
        cur, ret = await self.cache.ahscan(key, cursor=0, count=10)
        assert all([k in test_set for k in ret.keys()])

    @pytest.mark.asyncio
    async def test_hset(self):
        key = 'test_set'
        field, value = f"field-{uuid4()}", f"value-{uuid4()}"
        await self.cache.ahset(key, field, value)
        ret = await self.cache.ahget(key, field)
        assert ret == value

    async def test_aset(self):
        key = 'test_key'
        value = f'{uuid4()}'
        await self.cache.aset(key, value)
        assert self.cache.get(key) == value

    async def test_aget(self):
        key = 'test_key'
        value = f'{uuid4()}'
        self.cache.set(key, value)
        assert await self.cache.aget(key) == value

    async def test_aadd(self):
        key = 'test_key'
        value = f'{uuid4()}'
        assert await self.cache.aadd(key, value) is True
        assert await self.cache.aadd(key, f'failed add') is False
        assert await self.cache.aget(key) == value

    async def test_atouch(self):
        key = 'test_key'
        value = f'{uuid4()}'
        self.cache.set(key, value, timeout=60)
        assert await self.cache.attl(key) == 60
        assert await self.cache.atouch(key, timeout=3600) is True
        assert await self.cache.attl(key) == 3600
        assert await self.cache.atouch(key, timeout=None) is True
        assert await self.cache.attl(key) == -1

    async def test_adelete(self):
        key = 'test_key'
        value = f'{uuid4()}'
        self.cache.set(key, value, timeout=None)
        assert await self.cache.aget(key) == value
        assert await self.cache.ahas_key(key) is True
        assert await self.cache.adelete(key)
        assert await self.cache.aget(key) is None
        assert await self.cache.ahas_key(key) is False

    async def test_aincr(self):
        key = 'test_key'
        self.cache.set(key, 0, timeout=60)
        assert await self.cache.aget(key) == 0
        await self.cache.aincr(key, 2)
        assert await self.cache.aget(key) == 2
        await self.cache.aincr(key, -1)
        assert await self.cache.aget(key) == 1

    async def test_aset_many(self):
        await self.cache.aset_many(self.test_set)
        for k, v in self.test_set.items():
            assert await self.cache.aget(k) == v
        await self.cache.adelete_many(self.test_set.keys())
        for k, v in self.test_set.items():
            assert await self.cache.ahas_key(k) is False

    async def test_caching_awaitable(self):
        async def future():
            return f'{uuid4()}'
        err = None
        try:
            await self.cache.aset('awaitable', future())
        except Exception as ex:
            err = ex

        assert isinstance(err, ValueError)
        assert err.args[0].startswith('Awaitable cannot be cached. Got object:')

    def test_clean_keys(self):
        version = 2
        keys = [
            f'key:{self.cache_name}:{version}:{self.cache_name}:{version}:{uuid4()}',
            f'key:{self.cache_name}:{version}:{self.cache_name}:{version}:{uuid4()}',
            f'key:{self.cache_name}:{version}:{self.cache_name}:{version}:{uuid4()}',
        ]
        validated_keys = [self.cache.make_and_validate_key(k, version=version).encode() for k in keys]
        cleaned = self.cache.clean_keys(*validated_keys, version=version)

        assert cleaned == keys

    async def test_hmget_keys(self):
        version = 2
        data = {f'key:{self.cache_name}:{version}:{self.cache_name}:{version}:{uuid4()}':1 for _ in range(10)}
        await self.cache.ahmset('test', data, version=version)
        cached = await self.cache.ahmget('test', *list(data.keys()), version=version)
        assert cached == data