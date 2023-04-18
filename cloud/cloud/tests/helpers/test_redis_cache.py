from uuid import uuid4

import pytest
from django.core.cache import caches


class TestCustomRedisCache:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.cache = caches["global"]
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


class TestCustomRedisCacheAsync:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.cache = caches["global"]
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
