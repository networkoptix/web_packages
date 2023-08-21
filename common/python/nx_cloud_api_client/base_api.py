import logging
import typing
import httpx


logger = logging.getLogger(__name__)


class _BaseAPI(object):
    """
    Base API class. Initializes http client, base url and determines interfaces handlers
    for common requests method. Synchronous or asynchronous behavior depends on an HTTP
    client class. Client must be a subclass of one of httpx.Client or httpx.AsyncClient.
    Attributes:
        client_class: default client class, client will be initialized as an instance of
         this class if another client object is not passed during initialization
        base_path: base URL to API endpoints, can be overriden during initialization
    """
    client_class = None
    client: typing.Union[httpx.Client, httpx.AsyncClient] = None
    host: str = ''
    base_path: str = ''

    def __init__(self, host: str = '',
                 client: typing.Union[httpx.Client, httpx.AsyncClient, None] = None):
        """
        Args:
            host: if set then class default base url will be overriden
            client: http client object. if set will be used instead of default class object

        """
        if client:
            self.client = client
        else:
            self.client = self.client_class()
        if host:
            if not host.startswith('http'):
                self.host = f'https://{host}'
            else:
                self.host = host

    @staticmethod
    def exclude_not_used(**kwargs) -> typing.Optional[dict]:
        """
        Used to exclude empty parameters that are empty (not set in call).
        Args:
            **kwargs: dict with parameters to check
        Returns:

        """
        data = {}
        for key, val in kwargs.items():
            if not isinstance(val, NotUsedInRequest):
                data[key] = val
        return data

    def get_full_url(self, path: str):
        """
        Helper method for simplifying using API endpoints paths.
        Args:
            path: API endpoint relative (to API base_path) path

        Returns: str: full endpoint url

        """
        return f'{self.host}{self.base_path}{path}'
    
    def get(self, path, **kwargs) \
            -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        url = self.get_full_url(path)
        return self.client.get(url=url, **kwargs)

    def post(self, path, **kwargs) \
            -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        url = self.get_full_url(path)
        return self.client.post(url=url, **kwargs)

    def put(self, path, **kwargs) \
            -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        url = self.get_full_url(path)
        return self.client.put(url=url, **kwargs)

    def patch(self, path, **kwargs) \
            -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        url = self.get_full_url(path)
        return self.client.patch(url=url, **kwargs)

    def delete(self, path, **kwargs) \
            -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        url = self.get_full_url(path)
        return self.client.delete(url=url, **kwargs)


class ContextAPIMixin:
    """
    Mixin class for API subclasses for adding context manager features and common methods.
    """

    async def aclose(self):
        await self.client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.aclose()

    def __enter__(self):
        return self

    def close(self):
        self.client.close()

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


class NotUsedInRequest:
    """
    Used for excluding arguments that is no defined explicitly in function call.
    `None` cannot be used for exclusion because NULL can be used in some API resources.
    """


NOT_USED_IN_REQUEST = NotUsedInRequest()
