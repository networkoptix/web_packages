import typing
import uuid

import httpx
import structlog
from nx_cloud_api_client.client import (
    NxCloudAPIAsyncClient,
    NxCloudAPISyncClient,
)


class NxCloudApiClientFactory:

    @staticmethod
    def on_request(request: httpx.Request, request_id: str = None) -> None:
        context = structlog.contextvars.get_contextvars()

        # Add Amazon Trace ID to the request headers
        trace_id = context.get('x_amzn_trace_id', None)
        if trace_id is None:
            trace_id = "NOT_SET"
        request.headers["X-Amzn-Trace-Id"] = trace_id

        # Add request ID to the request headers if it is missing
        # Useful for explicit request tracing outside the request context
        if request_id is None:
            request_id = context.get('request_id', str(uuid.uuid4()))

        request.headers["x-request-id"] = request_id

    @staticmethod
    def get_sync_client(
            host: str,
            password: typing.Optional[str] = None,
            username: typing.Optional[str] = None,
            access_token: typing.Optional[str] = None,
            refresh_token: typing.Optional[str] = None,
            code: typing.Optional[str] = None,
            refresh_token_lifetime: int = 3600,
            raise_error_on_refresh: bool = False,
            auto_refresh: bool = True,
            request_id: typing.Optional[str] = None,
    ) -> NxCloudAPISyncClient:
        client = NxCloudAPISyncClient(
            host=host,
            password=password,
            username=username,
            access_token=access_token,
            refresh_token=refresh_token,
            code=code,
            refresh_token_lifetime=refresh_token_lifetime,
            raise_error_on_refresh=raise_error_on_refresh,
            auto_refresh=auto_refresh,
            headers={'User-Agent': None, "x-original-host": host},
            event_hooks={"request": [lambda r: NxCloudApiClientFactory.on_request(r, request_id)]}
        )
        return client

    @staticmethod
    def get_async_client(
            host: str,
            password: typing.Optional[str] = None,
            username: typing.Optional[str] = None,
            access_token: typing.Optional[str] = None,
            refresh_token: typing.Optional[str] = None,
            code: typing.Optional[str] = None,
            refresh_token_lifetime: int = 3600,
            raise_error_on_refresh: bool = False,
            auto_refresh: bool = True,
            request_id: typing.Optional[str] = None,
    ) -> NxCloudAPIAsyncClient:
        client = NxCloudAPIAsyncClient(
            host=host,
            password=password,
            username=username,
            access_token=access_token,
            refresh_token=refresh_token,
            code=code,
            refresh_token_lifetime=refresh_token_lifetime,
            raise_error_on_refresh=raise_error_on_refresh,
            auto_refresh=auto_refresh,
            headers={'User-Agent': None, "x-original-host": host},
            event_hooks={"request": [lambda r: NxCloudApiClientFactory.on_request(r, request_id)]}
        )
        return client
