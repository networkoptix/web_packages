import typing

from nx_cloud_api_client.client import (
    NxCloudAPIAsyncClient,
    NxCloudAPISyncClient,
)


class NxCloudApiClientFactory:
    @staticmethod
    def get_sync_client(
            host: str,
            password: typing.Union[str, None] = None,
            username: typing.Union[str, None] = None,
            access_token: typing.Union[str, None] = None,
            refresh_token: typing.Union[str, None] = None,
            code: typing.Union[str, None] = None,
            refresh_token_lifetime: int = 3600,
            raise_error_on_refresh: bool = False,
            auto_refresh: bool = True,
    ) -> NxCloudAPISyncClient:
        return NxCloudAPISyncClient(
            host=host,
            password=password,
            username=username,
            access_token=access_token,
            refresh_token=refresh_token,
            code=code,
            refresh_token_lifetime=refresh_token_lifetime,
            raise_error_on_refresh=raise_error_on_refresh,
            auto_refresh=auto_refresh,
            headers={'User-Agent': None})

    @staticmethod
    def get_async_client(
            host: str,
            password: typing.Union[str, None] = None,
            username: typing.Union[str, None] = None,
            access_token: typing.Union[str, None] = None,
            refresh_token: typing.Union[str, None] = None,
            code: typing.Union[str, None] = None,
            refresh_token_lifetime: int = 3600,
            raise_error_on_refresh: bool = False,
            auto_refresh: bool = True,
    ) -> NxCloudAPIAsyncClient:
        return NxCloudAPIAsyncClient(
            host=host,
            password=password,
            username=username,
            access_token=access_token,
            refresh_token=refresh_token,
            code=code,
            refresh_token_lifetime=refresh_token_lifetime,
            raise_error_on_refresh=raise_error_on_refresh,
            auto_refresh=auto_refresh,
            headers={'User-Agent': None})
