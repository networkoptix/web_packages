import httpx
import asyncio

from base_api import _BaseAPI

from systems import System


class _API(_BaseAPI):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.system = System(base_api=self)


class SyncAPI(_API):
    async_mode = False

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.client = httpx.Client()

    def __enter__(self):
        return self

    def close(self):
        self.client.close()

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def __del__(self):
        self.close()


class AsyncAPI(_API):
    async_mode = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.client = httpx.AsyncClient()

    async def close(self):
        await self.client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()


def main():
    x = SyncAPI(host='')
    r = x.google()
    print(r.text[:40])


async def async_main():
    async_api = AsyncAPI(host='')
    sync_api = SyncAPI(host='')
    r = await async_api.google()
    print(r.text[:40])
    r = sync_api.google()
    print(r.text[:40])
    r = await async_api.system.get_systems()
    print(r.text[:40])
    r = sync_api.system.get_systems()
    print(r.text[:40])


if __name__ == '__main__':
    asyncio.run(async_main())
    main()
