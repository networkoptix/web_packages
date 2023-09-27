import asyncio
import os
import redis.asyncio as redis

from utils import generate_uuid
import json

REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = os.getenv('REDIS_PORT', '6379')

REDIS_URL = f'redis://{REDIS_HOST}:{REDIS_PORT}'

connection = redis.from_url(REDIS_URL, decode_responses=True)

class GenericCache:
    def __init__(self, cache_id):
        self.cache_id = cache_id

    def get(self, key):
        return connection.get(f"{self.cache_id}:{key}")

    def set(self, key, value):
        return connection.set(f"{self.cache_id}:{key}", value)

    def delete(self, key):
        return connection.delete(f"{self.cache_id}:{key}")

    async def clear(self):
        async for key in connection.scan_iter(f"{self.cache_id}:*"):
            await connection.delete(key)

    def publish(self, channel, message):
        return connection.publish(f"{channel}:{self.cache_id}", message)

    async def subscribe(self, channel):
        async with connection.pubsub() as pubsub:
            await pubsub.subscribe(f"{channel}:{self.cache_id}")
            while True:
                message = await pubsub.get_message(ignore_subscribe_messages=True)
                if message:
                    yield message['data']
                else:
                    await asyncio.sleep(0.1)

class OrgCache(GenericCache):
    def __init__(self, org_id):
        super().__init__(org_id)

    @property
    async def current_list_groups_key(self):
        return f"{await self.get(self.current_cache_key)}:list_groups"

    async def cached_list_groups(self):
        async def update_cached(value):
            await self.set(await self.current_list_groups_key, json.dumps(value))

        if cached := await self.get(await self.current_list_groups_key):
            return json.loads(cached), update_cached

        return None, update_cached

    @property
    def current_cache_key(self):
        return "current"

    @property
    async def current(self):
        if current := await self.get(self.current_cache_key):
            return current
        current = await self.update_current()
        return current

    @property
    def current_generator(self):
        return self.subscribe(self.current_cache_key)

    async def update_current(self):
        await self.clear()
        current = generate_uuid()
        await self.set(self.current_cache_key, current)
        await self.publish(self.current_cache_key, current)
        return current