import inspect
import logging
import typing
from functools import wraps

import httpx

from .apis import (
    CdbAccountAPIBase, CdbSystemTransferAPIBase,
    CdbAuthSupportAPIBase, CdbSystemAPIBase, Cdb2faAPIBase, CdbOrganizationAPIBase
)
from .base_api import NotUsedInRequest, NOT_USED_IN_REQUEST, ContextAPIMixin
from .base_auth import BearerTokenAuth, QueryParamAuth, CdbAuthAPIClient

RESPONSES_TYPE = typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]
CLIENTS_TYPES = typing.Union[httpx.Client, httpx.AsyncClient]

logger = logging.getLogger(__name__)


def auto_auth_method(method):
    @wraps(method)
    def wrapped(obj, *args, **kwargs):
        if kwargs.get("auth") is not None:
            return method(obj, *args, **kwargs)
        allowed = method.__annotations__.get("auth")
        if typing.get_origin(allowed) is None:
            classes = [allowed]
        elif typing.get_origin(allowed) is typing.Union:
            classes = typing.get_args(allowed)
        else:
            raise ValueError(f"Something wrong with annotation handling. Auth annotation: {allowed}")
        if BearerTokenAuth in classes:
            auth = obj.authentication.token.get_bearer_auth()
        elif QueryParamAuth in classes:
            auth = obj.authentication.token.get_query_param_auth()
        elif httpx.BasicAuth in classes:
            auth = obj.authentication.get_basic_auth()
        kwargs["auth"] = auth
        return method(obj, *args, **kwargs)

    return wrapped


class AddAuthMixin:
    """
    Mixin to add automatic authentication to each method that has annotated `auth` keyword.
    Motivation to for creating this mixin is simplifying code support. APIs classes are clean
    and does not contain auto-authentication/decoration or so. Call works autonomously, it
    requires that request function returns RESPONSES_TYPES (return must be annotated) and
    keyword `auth` annotated with allowed authentication types. Auto-auth can be disabled
    per client class using `auto_refresh` argument or per handler using `auto_auth` keyword.
    Also possible to use original handlers with `_orig_` prefix.
    """

    def __init__(self, authenticator: CdbAuthAPIClient, *args, auto_refresh=False, **kwargs):
        self.authenticator = authenticator
        self.auto_refresh = auto_refresh
        for name, func in self._request_functions():
            self._copy_func(name, func)
        super().__init__(*args, **kwargs)

    def _request_functions(self):
        excluded = [
            'get', 'post', 'put', 'patch', 'delete', 'options', 'head'
        ]
        funcs = inspect.getmembers(self.__class__, lambda a: inspect.isfunction(a))
        return [
            f for f in funcs
            if not f[0].startswith('_') and f[0] not in excluded
               and f[1].__annotations__.get("return") == RESPONSES_TYPE
               and f[1].__annotations__.get("auth")
        ]

    def _copy_func(self, name, func):
        allowed = func.__annotations__.get("auth")
        if typing.get_origin(allowed) is None:
            classes = [allowed]
        elif typing.get_origin(allowed) is typing.Union:
            classes = typing.get_args(allowed)
        else:
            raise TypeError(f"Something wrong with annotation handling. Auth annotation: {allowed}")

        def wrapper_sync(*args, auto_auth=True, **kwargs):
            if auto_auth and not kwargs.get("auth"):
                if auto_auth and self.auto_refresh:
                    self.authenticator.refresh_token_and_save()
                kwargs["auth"] = self.authenticator.get_auth(classes)
            return self.__getattribute__(f'_orig_{name}')(*args, **kwargs)

        async def wrapper_async(*args, auto_auth=True, **kwargs):
            if auto_auth and not kwargs.get("auth"):
                if auto_auth and self.auto_refresh:
                    await self.authenticator.refresh_token_and_save()
                kwargs["auth"] = self.authenticator.get_auth(classes)
            return await self.__getattribute__(f'_orig_{name}')(*args, **kwargs)

        wrapper = wrapper_async if self.authenticator.is_async else wrapper_sync

        # Dirty hack to pass functions signatures and annotations to IDE's auto-completion engine. Copying
        # original handler to `_orig_{name}` and replacing `{name}` with wrapping function calling original
        # one by a new name. Tested on PyCharm. Debugger works. Console auto-completion and annotations work.
        # Code editor auto-completion and annotations work. Does not work completion and annotation for
        # `auto_auth` keyword.

        sig = inspect.signature(getattr(self.__class__, name))

        params = list(sig.parameters.values())
        params.insert(
            -1, inspect.Parameter('auto_auth', inspect._KEYWORD_ONLY, default=True, annotation=str)
        )
        wrapper.__signature__ = sig.replace(parameters=params, return_annotation=sig.return_annotation)
        wrapper.__signature__ = sig
        wrapper.__annotations__ = func.__annotations__
        self.__setattr__(f'_orig_{name}', super().__getattribute__(name))
        self.__setattr__(name, wrapper)


class ASystemApi(AddAuthMixin, CdbSystemAPIBase):
    pass


class ASystemTransferApi(AddAuthMixin, CdbSystemTransferAPIBase):
    pass


class AAccountApi(AddAuthMixin, CdbAccountAPIBase):
    pass


class AAuthSupportApi(AddAuthMixin, CdbAuthSupportAPIBase):
    pass


class AMfaApi(AddAuthMixin, Cdb2faAPIBase):
    pass


class AOrganizationAPI(AddAuthMixin, CdbOrganizationAPIBase):
    pass


class NxCloudAPIClient(ContextAPIMixin):
    """
    NX CDB API Client.
    - Used for access API with auto credentials refresh. Class automatically
      determined request methods requiring authentication and select appropriate authentication
      based on available credentials and method `auth` keyword annotation.
    - Credentials can be set per class instance by passing one of credentials acceptable for
      making success request and/or requesting an access_token.
    - If credentials is not set or there is another user authentication required it is possible
      to use credentials directly to request handler passing CdbAuthAPIClient in `authenticator`
      keyword argument or object of `httpx.Auth` subclass to `auth` keyword argument.
    - Due to using dynamic methods overrides auto-completion is not work properly. For request
      methods added keyword arguments `auto_auth` and `authenticator` are not shown in IDE.
    - Added functionality to handle User-Agent headers.
        - The client now sets the User-Agent header from the provided headers.
            - If it exists, or uses a default value.
            - if no User-Agent is provided.
            - If the User-Agent is set to None in the headers,
              the User-Agent header will be removed from the request.
    """
    _default_client_class: typing.Union[typing.Type[httpx.Client], typing.Type[httpx.AsyncClient], None] = None

    def __init__(
            self,
            host: str,
            client: typing.Union[httpx.Client, httpx.AsyncClient, None] = None,
            client_id: typing.Union[str, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            scope: typing.Union[str, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            password: typing.Union[str, None] = None,
            username: typing.Union[str, None] = None,
            access_token: typing.Union[str, None] = None,
            refresh_token: typing.Union[str, None] = None,
            code: typing.Union[str, None] = None,
            refresh_token_lifetime: typing.Union[int] = 3600,
            raise_error_on_refresh: bool = False,
            auto_refresh: bool = True,
            *args, **kwargs
    ):
        self.auto_refresh = auto_refresh
        if client:
            self.client = client
        elif not client and self._default_client_class:
            self.client = self._default_client_class()
        else:
            raise TypeError("Client of _default_client_class must be defined.")

        # Add Event Hooks
        self.client.event_hooks.update(kwargs.get("event_hooks", {}))

        self.authentication: typing.Optional[CdbAuthAPIClient] = None

        if any([access_token, refresh_token, code, (username and password)]):
            self.authentication = CdbAuthAPIClient(
                client=self.client, client_id=client_id, scope=scope, password=password, username=username,
                access_token=access_token, refresh_token=refresh_token, code=code, host=host,
                refresh_token_lifetime=refresh_token_lifetime, raise_error_on_refresh=raise_error_on_refresh
            )
        self._handle_headers(kwargs.get("headers", {}))
        self.system: CdbSystemAPIBase = CdbSystemAPIBase(client=self.client, host=host)
        self.system_transfer: CdbSystemTransferAPIBase = CdbSystemTransferAPIBase(client=self.client, host=host)
        self.account: CdbAccountAPIBase = CdbAccountAPIBase(client=self.client, host=host)
        self.auth_support: CdbAuthSupportAPIBase = CdbAuthSupportAPIBase(client=self.client, host=host)
        self.mfa: Cdb2faAPIBase = Cdb2faAPIBase(client=self.client, host=host)
        self.organizations: CdbOrganizationAPIBase = CdbOrganizationAPIBase(client=self.client, host=host)
        self._update_api_modules()

    @property
    def is_async(self):
        return hasattr(self.client, '__aenter__')

    def _handle_headers(self, supplied_headers: typing.Dict) -> None:
        headers = supplied_headers.copy()
        # Handle 'User-Agent' specifically
        user_agent_key = 'User-Agent'
        if user_agent_key in headers:
            user_agent = headers.pop(user_agent_key)
            if user_agent is None:
                self.client.headers.pop(user_agent_key, None)
            else:
                self.client.headers[user_agent_key] = user_agent

        # Update all other headers
        for key, value in headers.copy().items():
            if value is None:
                # Remove the header if the value is None
                self.client.headers.pop(key, None)
            else:
                # Set or update the header
                self.client.headers[key] = value

    def _update_api_modules(self):
        apis = [
            self.system,
            self.system_transfer,
            self.mfa,
            self.account,
            self.auth_support
        ]
        for module in apis:
            for name, func in self._request_functions(module):
                self._copy_func(module, name, func)

    @staticmethod
    def _request_functions(module):
        excluded = [
            'get', 'post', 'put', 'patch', 'delete', 'options', 'head'
        ]
        funcs = inspect.getmembers(module.__class__, lambda a: inspect.isfunction(a))
        return [
            f for f in funcs
            if not f[0].startswith('_') and f[0] not in excluded
               and f[1].__annotations__.get("return") == RESPONSES_TYPE
               and f[1].__annotations__.get("auth")
        ]

    def _get_authenticator(self):
        return self.authentication

    def _copy_func(self, module, name, func):
        allowed = func.__annotations__.get("auth")
        if typing.get_origin(allowed) is None:
            classes = [allowed]
        elif typing.get_origin(allowed) is typing.Union:
            classes = typing.get_args(allowed)
        else:
            raise TypeError(f"Something wrong with annotation handling. Auth annotation: {allowed}")

        def wrapper_sync(*args, auto_auth=True, authenticator: CdbAuthAPIClient = None, **kwargs):
            if auto_auth and not kwargs.get('auth'):
                authenticator = authenticator or self._get_authenticator()
                if authenticator:
                    if auto_auth and self.auto_refresh and authenticator.token.needs_refresh:
                        authenticator.refresh_token_and_save()
                    kwargs["auth"] = authenticator.get_auth(classes)
            return module.__getattribute__(f'_orig_{name}')(*args, **kwargs)

        async def wrapper_async(*args, auto_auth=True, authenticator: CdbAuthAPIClient = None, **kwargs):
            if auto_auth and not kwargs.get('auth'):
                authenticator = authenticator or self._get_authenticator()
                if authenticator:
                    if auto_auth and self.auto_refresh and authenticator.token.needs_refresh:
                        await authenticator.refresh_token_and_save()
                    kwargs["auth"] = authenticator.get_auth(classes)
            return await module.__getattribute__(f'_orig_{name}')(*args, **kwargs)

        wrapper = wrapper_async if self.is_async else wrapper_sync

        # Dirty hack to pass functions signatures and annotations to IDE's auto-completion engine. Copying
        # original handler to `_orig_{name}` and replacing `{name}` with wrapping function calling original
        # one by a new name. Tested on PyCharm. Debugger works. Console auto-completion and annotations work.
        # Code editor auto-completion and annotations work. Does not work completion and annotation for
        # `auto_auth` keyword.

        sig = inspect.signature(getattr(module.__class__, name))

        params = list(sig.parameters.values())
        params.insert(
            -1, inspect.Parameter('auto_auth', inspect._KEYWORD_ONLY, default=True, annotation=bool)
        )
        params.insert(
            -1, inspect.Parameter('authenticator', inspect._KEYWORD_ONLY, default=None,
                                  annotation=typing.Optional[CdbAuthAPIClient])
        )
        annotations = func.__annotations__
        annotations.update(auto_auth=bool, authenticator=typing.Optional[CdbAuthAPIClient])
        wrapper.__signature__ = sig.replace(parameters=params, return_annotation=sig.return_annotation)
        wrapper.__signature__ = sig
        wrapper.__annotations__ = annotations
        module.__setattr__(f'_orig_{name}', module.__getattribute__(name))
        module.__setattr__(name, wrapper)


class NxCloudAPISyncClient(NxCloudAPIClient):
    _default_client_class = httpx.Client


class NxCloudAPIAsyncClient(NxCloudAPIClient):
    _default_client_class = httpx.AsyncClient
