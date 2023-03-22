import httpx
from typing import Union, Awaitable


class _BaseAPI:
    async_mode = False
    client: Union[httpx.Client, httpx.AsyncClient] = None

    def __init__(self, host: str):
        self.host = host
        if not self.host.startswith('http'):
            self.host = f'https://{self.host}'

    def get(self, url, headers=None) -> Union[httpx.Response, Awaitable[httpx.Response]]:
        return self.client.get(url=url, headers=headers)

    def post(self, url, headers, data) -> Union[httpx.Response, Awaitable[httpx.Response]]:
        return self.client.post(url=url, headers=headers, data=data)

    def put(self, url, headers, data) -> Union[httpx.Response, Awaitable[httpx.Response]]:
        return self.client.put(url=url, headers=headers, data=data)

    def patch(self, url, headers, data) -> Union[httpx.Response, Awaitable[httpx.Response]]:
        return self.client.patch(url=url, headers=headers, data=data)

    def delete(self, url, headers) -> Union[httpx.Response, Awaitable[httpx.Response]]:
        return self.client.delete(url=url, headers=headers)

    def google(self):
        return self.get('https://www.google.com')
