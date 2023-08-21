import typing
from asyncio import Lock
from datetime import datetime
from threading import Lock as ThreadingLock
from uuid import uuid4

import httpx

from nx_cloud_api_client.base_api import (
    ContextAPIMixin, _BaseAPI, NotUsedInRequest, NOT_USED_IN_REQUEST
)


class AuthenticationNotPossible(Exception):
    pass


class AuthenticationFailedBefore(Exception):
    pass


class Grant:
    authorization_code = "authorization_code"
    password = "password"
    refresh_token = "refresh_token"


class ResponseType:
    code = "code"
    token = "token"


class BearerTokenAuth(httpx.Auth):
    """
    Allows the 'auth' argument to be passed as a token string,
    and uses Bearer authentication. Made in purpose to avoid
    passing multiple authentications.

    """

    def __init__(
        self, token: str
    ):
        self.token = token

    def auth_flow(self, request: httpx.Request) -> typing.Generator[httpx.Request, httpx.Response, None]:
        request.headers["Authorization"] = f"Bearer {self.token}"
        yield request


class QueryParamAuth(httpx.Auth):
    """
        Allows an auth token to be passed as a query string parameter.
    """

    def __init__(self, token: str, query_param_name: str = "token"):
        """

        Args:
            token: token string
            query_param_name: query parameter name
        """
        self.query_param_value = token
        self.query_param_name = query_param_name

    def auth_flow(self, request: httpx.Request) -> typing.Generator[httpx.Request, httpx.Response, None]:
        request.url = request.url.copy_merge_params({self.query_param_name: self.query_param_value})
        yield request


class RequestedTokenAuth(httpx.Auth):
    """
    Request token from oauth2 server and use it in Bearer token authentication.
    Access token can be requested by refresh_token, authorization code or username/password.
    Selection goes in same order, used first acceptable.
    By default, force refresh is set to False. Token will be request on the first request and
    stored in self.token. Further, this object can be used for another request until token expires.
    If force refresh is set to True, then if token already stored, `expires_at` time will be checked
    and if token will be expired soon then a new one will be requested within stored refresh token.

    On any token request HTTPx exception will be raised if there is an error.
    """
    refresh_in = 10

    def __init__(
            self,
            client: typing.Union[httpx.Client, httpx.AsyncClient],
            cdb_host: str,
            refresh_token: typing.Optional[str] = None,
            authorization_code: typing.Optional[str] = None,
            username: typing.Optional[str] = None,
            password: typing.Optional[str] = None,
            client_id: typing.Union[str, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            scope: typing.Union[str, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            refresh_token_lifetime: typing.Union[int, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            force_refresh: bool = False,
    ):
        self.cdb_host = cdb_host
        self.client = client
        self.token = None
        self.client_id = client_id
        self.scope = scope
        self.refresh_token_lifetime = refresh_token_lifetime
        self.force_refresh = force_refresh
        if refresh_token:
            self.grant_type = Grant.refresh_token
            self.cred = {"refresh_token": refresh_token}
        elif authorization_code:
            self.grant_type = Grant.authorization_code
            self.cred = {"code": authorization_code}
        elif username and password:
            self.grant_type = Grant.password
            self.cred = {"username": username, "password": password}
        else:
            raise ValueError("At least one type of credentials must be given.")

    def auth_flow(self, request: httpx.Request) -> typing.Generator[httpx.Request, httpx.Response, None]:
        request.headers["Authorization"] = f"Bearer {self.token['access_token']}"
        yield request

    def do_refresh(self):
        # first run
        if not self.token:
            return True
        # no refresh
        if not self.force_refresh:
            return False
        expires_at = int(self.token("expires_at", 0)) / 1000
        # it's not a time
        if datetime.now().timestamp() + self.refresh_in < expires_at:
            return False
        # do refresh
        return True

    def get_kwargs(self):
        # first run
        if not self.token:
            kwargs = {
                "grant_type": self.grant_type,
                "response_type": ResponseType.token,
                "refresh_token_lifetime": self.refresh_token_lifetime,
                "scope": self.scope,
                "client_id": self.client_id,
                **self.cred
            }
            return kwargs
        # refresh from existing tokens
        self.cred = None
        self.grant_type = None
        kwargs = {
            "grant_type": Grant.refresh_token,
            "response_type": ResponseType.token,
            "refresh_token": self.token["refresh_roken"],
            "refresh_token_lifetime": self.refresh_token_lifetime,
            "scope": self.scope,
            "client_id": self.client_id
        }
        return kwargs

    def get_api(self):
        return CdbOauth2APIBase(host=self.cdb_host, client=self.client)

    async def async_auth_flow(
        self, request: httpx.Request
    ) -> typing.AsyncGenerator[httpx.Request, httpx.Response]:
        if self.do_refresh():
            api = self.get_api()
            kwargs = self.get_kwargs()
            resp = await api.token_post(**kwargs)
            resp.raise_for_status()
            self.token = resp.json()
        yield await super().async_auth_flow(request=request).__anext__()

    def sync_auth_flow(
        self, request: httpx.Request
    ) -> typing.Generator[httpx.Request, httpx.Response, None]:
        if self.do_refresh():
            api = self.get_api()
            kwargs = self.get_kwargs()
            resp = api.token_post(**kwargs)
            resp.raise_for_status()
            self.token = resp.json()
        return super().sync_auth_flow(request=request)


class RequestedTokenQueryAuth(RequestedTokenAuth):
    """
    Added requested/refreshed token a query params.
    """

    def __init__(
            self,
            client: typing.Union[httpx.Client, httpx.AsyncClient],
            cdb_host: str,
            refresh_token: typing.Optional[str] = None,
            authorization_code: typing.Optional[str] = None,
            username: typing.Optional[str] = None,
            password: typing.Optional[str] = None,
            client_id: typing.Union[str, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            scope: typing.Union[str, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            refresh_token_lifetime: typing.Union[int, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            force_refresh: bool = False,
            query_param_name: str = "token"
    ):
        self.query_param_name = query_param_name
        super().__init__(cdb_host=cdb_host, client=client,
                         refresh_token=refresh_token, authorization_code=authorization_code,
                         username=username, password=password, client_id=client_id, scope=scope,
                         refresh_token_lifetime=refresh_token_lifetime, force_refresh=force_refresh)

    def auth_flow(self, request: httpx.Request) -> typing.Generator[httpx.Request, httpx.Response, None]:
        request.url = request.url.copy_merge_params({self.query_param_name: self.token["access_token"]})
        yield request


class AUTH_TYPES:
    ALL = typing.Union[
        None, httpx.BasicAuth, BearerTokenAuth, QueryParamAuth,
        RequestedTokenQueryAuth, RequestedTokenAuth
    ]
    BASIC = typing.Union[None, httpx.BasicAuth]
    BEARER = typing.Union[None, BearerTokenAuth, RequestedTokenAuth]
    QUERY = typing.Union[None, QueryParamAuth, RequestedTokenQueryAuth]
    BASIC_BEARER = typing.Union[None, BearerTokenAuth, RequestedTokenAuth, httpx.BasicAuth]
    BASIC_QUERY = typing.Union[None, QueryParamAuth, RequestedTokenQueryAuth, httpx.BasicAuth]
    BEARER_QUERY = typing.Union[
        None, QueryParamAuth, RequestedTokenQueryAuth,
        QueryParamAuth, RequestedTokenQueryAuth
    ]


class CdbOauth2APIBase(ContextAPIMixin, _BaseAPI):
    """
    CDB Oauth2 API. Implement calls to `/cdb/oauth2` API endpoints.
    """
    base_path = '/cdb/oauth2'

    def token_post(
            self,
            grant_type: str,
            response_type: str,
            client_id: typing.Union[str, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            scope: typing.Union[str, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            refresh_token_lifetime: typing.Union[int, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            username: typing.Union[str, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            password: typing.Union[str, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            refresh_token: typing.Union[str, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            code: typing.Union[str, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        POST /cdb/oauth2/token
        Obtain new OAUTH2 access token or an authorization code.
        https://networkoptix.atlassian.net/wiki/spaces/PM/pages/1459388473/OAUTH2+support+by+Cloud+Backend#Authenticating-via-the-cloud-account-authentication-web-page
        https://cloud-test.hdw.mx/cdb/docs/api/v1/swagger/index.html#/OAUTH2/post_cdb_oauth2_token
        If optional argument is not explicitly defined it will not be passed further.
        Accepted/Required authentication depends on grant and response types.
        Args:
            grant_type (str, required): Grant type. Supported types are 'password', 'authorization_code','refresh_token'.
            response_type (str, required): Response type. Supported types are 'code' and 'token'.
            client_id (str, required): Client ID. Used to define this client in the system. Actually, it is not required.
            scope (str, optional): Oauth2 scope. Optional.
            refresh_token_lifetime (int, optional): Refresh token lifetime. If empty use 3600s.
            username (str, optional): User username
            password (str, optional): User password
            refresh_token (str, optional): Refresh token string
            code (str, optional): Authorization code string
            auth (httpx.Auth, optional): Authentication class object, can be any of subclasses of httpx. Auth or pair (username, password).
            **kwargs: Any keyword arguments that can be passed to method handler, e.g. `params`

        Returns (httpx.Response): Response with access token in content.

        """
        request_data = self.exclude_not_used(**{
            "grant_type": grant_type,
            "response_type": response_type,
            "client_id": client_id,
            "scope": scope,
            "refresh_token_lifetime": refresh_token_lifetime,
            "username": username,
            "password": password,
            "refresh_token": refresh_token,
            "code": code
        })
        return self.post('/token', json=request_data, auth=auth, **kwargs)

    def token_get(
            self, token: str,
            username: typing.Optional[str] = None,
            password: typing.Optional[str] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            headers: typing.Optional[dict] = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        GET /cdb/oauth2/token/{token}
        https://cloud-test.hdw.mx/cdb/docs/api/v1/swagger/index.html#/OAUTH2/get_cdb_oauth2_token__token_
        Get an access token information. Bearer and basic auth supported
        Args
            token (str, required): access or refresh token which information required
            username (str, optional): username for Basic Auth.
            password (str, optional): password for Basic Auth.
            auth (typeof(httpx.Auth) | Tuple[str, str] | dict, optional): basic, digest auth. User/pass pair will be converted to basic auth.
            headers (dict, optional): request headers, authentication args can pe passed here too
            **kwargs: request handler kwargs.
        Returns (httpx.Response): response with token information in content

        """
        if username and password:
            auth = httpx.BasicAuth(username=username, password=password)
        return self.get(f'/token/{token}', headers=headers, auth=auth, **kwargs)

    def token_delete(
            self, token: str,
            username: typing.Optional[str] = None,
            password: typing.Optional[str] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            headers: typing.Optional[dict] = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        DELETE /cdb/oauth2/token/{token}
        Delete specified access/refresh token.
        Note: When a refresh token is deleted no access tokens are invalidated.
        Accepted Basic Auth, Bearer token can be used if it has scope valid for cdb/oauth2.
        Args:
            token (str, required): access or refresh token which information required
            username (str, optional): username for Basic Auth.
            password (str, optional): password for Basic Auth.
            auth (typeof(httpx.Auth) | Tuple[str, str] | dict, optional): basic, digest auth. User/pass pair will be converted to basic auth.
            headers (dict, optional): request headers, authentication args can pe passed here too
            **kwargs: request handler kwargs.

        Returns (httpx.Response): 200 {"errorClass": "noError","errorDetail": "0","errorText": "","resultCode": "ok"}

        """
        if username and password:
            auth = httpx.BasicAuth(username=username, password=password)
        return self.delete(f'/token/{token}', auth=auth, headers=headers, **kwargs)

    def client_tokens_delete(
            self, client_id: str,
            username: typing.Optional[str] = None,
            password: typing.Optional[str] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            headers: typing.Optional[dict] = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        DELETE /cdb/oauth2/user/self/client/{clientId}
        Delete all access tokens issued to specified client.
        Accepted Basic Auth, Bearer token can be used if it has scope valid for cdb/oauth2.
        Args:
            client_id (str, required): client_id which tokens must be deleted.
            username (str, optional): username for Basic Auth.
            password (str, optional): password for Basic Auth.
            auth (typeof(httpx.Auth) | Tuple[str, str] | dict, optional): basic, digest auth. User/pass pair will be converted to basic auth.
            headers (dict, optional): request headers, authentication args can pe passed here too
            **kwargs: request handler kwargs.

        Returns (httpx.Response): 200 {"errorClass": "noError","errorDetail": "0","errorText": "","resultCode": "ok"}

        """
        if username and password:
            auth = httpx.BasicAuth(username=username, password=password)
        return self.delete(f'/user/self/client/{client_id}', auth=auth, headers=headers, **kwargs)

    def user_tokens_delete(
            self,
            username: typing.Optional[str] = None,
            password: typing.Optional[str] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            headers: typing.Optional[dict] = None,
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        DELETE /cdb/oauth2/user/self
        Delete all access tokens issued to current user.
        Accepted Basic Auth, Bearer token can be used if it has scope valid for cdb/oauth2.
        Args:
            client_id (str, required): client_id which tokens must be deleted.
            username (str, optional): username for Basic Auth.
            password (str, optional): password for Basic Auth.
            auth (typeof(httpx.Auth) | Tuple[str, str] | dict, optional): basic, digest auth. User/pass pair will be converted to basic auth.
            headers (dict, optional): request headers, authentication args can pe passed here too
            **kwargs: request handler kwargs.

        Returns (httpx.Response): 200 {"errorClass": "noError","errorDetail": "0","errorText": "","resultCode": "ok"}

        """
        if username and password:
            auth = httpx.BasicAuth(username=username, password=password)
        return self.delete(f'/user/self', auth=auth, headers=headers)

    def stun_token_post(
            self, system_id: str, auth_key: str, server_name: str
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        POST /cdb/oauth2/stun-token
        Obtain new OAUTH2 token for TURN server.
        Args:
            system_id: System ID
            auth_key: System authKey which was issued during binding
            server_name: Stun server name

        Returns:

        """
        auth = httpx.BasicAuth(username=system_id, password=auth_key)
        return self.post('/stuntoken', json={'server_name': server_name}, auth=auth)


class CdbAuthAPIClient(CdbOauth2APIBase):
    """
    Helper class to get token or code quickly in common cases.
    It is not clear will it be useful.
    """
    class Token:
        access_token: str = None
        refresh_token: str = None
        expires_at: int = None
        scope: str = None
        refreshable_until: int = None

        def __init__(self, token: dict = None, refresh_token_lifetime: int = None):
            self.auth_failed = False
            if not token:
                return
            self.access_token = token["access_token"]
            self.refresh_token = token.get("refresh_token")
            self.expires_at = int(int(token["expires_at"]) / 1000)
            self.scope = token["scope"]
            self.refresh_token_lifetime = refresh_token_lifetime
            self.refreshable_until = self.expires_at \
                if refresh_token_lifetime <= 3600 else \
                self.expires_at - 3600 + refresh_token_lifetime


        @property
        def is_stored(self):
            if self.access_token:
                return True
            return False

        @property
        def is_refreshable(self):
            return self.refresh_token and self.refreshable_until > datetime.now().timestamp()

        @property
        def expires_in(self) -> int:
            if self.is_stored:
                return int(self.expires_at - datetime.now().timestamp())
            return -1

        def get_bearer_auth(self):
            return BearerTokenAuth(token=self.access_token)

        def get_query_param_auth(self):
            return QueryParamAuth(token=self.access_token)

        @property
        def expiration_period(self):
            if self.refresh_token_lifetime >= 3600:
                return 3600
            return self.refresh_token_lifetime

        @property
        def needs_refresh(self):
            if not self.is_stored or not self.refresh_token_lifetime:
                return True
            return self.expires_in < self.expiration_period/2

    def __init__(
            self,
            client_id: typing.Union[str, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            scope: typing.Union[str, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            password: typing.Union[str, None] = None,
            username: typing.Union[str, None] = None,
            access_token: typing.Union[str, None] = None,
            refresh_token: typing.Union[str, None] = None,
            code: typing.Union[str, None] = None,
            refresh_token_lifetime: typing.Union[int] = 3600,
            raise_error_on_refresh: bool = False,
            *args, **kwargs
    ):
        self.raise_http_error = raise_error_on_refresh
        if not isinstance(client_id, NotUsedInRequest):
            self.client_id = client_id or f'nx-api-client-{uuid4()}'
        else:
            self.client_id = client_id
        self.scope = scope
        self.password = password
        self.username = username
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.code = code
        self.refresh_token_lifetime = refresh_token_lifetime
        self.expires_at = None
        self.token = CdbAuthAPIClient.Token()
        if self.access_token:
            self.token.access_token = self.access_token
        super().__init__(*args, **kwargs)
        if self.is_async:
            # set up asyncio.Lock
            self.lock = Lock()
        else:
            self.lock = ThreadingLock()

    @property
    def is_async(self):
        return hasattr(self.client, '__aenter__')

    @property
    def auth_header(self) -> dict:
        if not self.access_token:
            raise AuthenticationNotPossible("Auth Client must be authenticated and access_token property is set.")
        return {'Authorization': f'Bearer {self.access_token}'}

    def get_basic_auth(self):
        return httpx.BasicAuth(username=self.username, password=self.password)

    def get_bearer_auth(self):
        return self.token.get_bearer_auth()

    def get_query_param_auth(self):
        return self.token.get_query_param_auth()

    def get_access_token_by_refresh(self):
        response = self.token_post(
            **self.exclude_not_used(**dict(
                grant_type=Grant.refresh_token, response_type=ResponseType.token,
                client_id=self.client_id, scope=self.scope, refresh_token=self.refresh_token,
                refresh_token_lifetime=self.refresh_token_lifetime
            ))
        )
        return response

    def get_access_token_by_code(self):
        response = self.token_post(
            **self.exclude_not_used(**dict(
                grant_type=Grant.authorization_code, response_type=ResponseType.token,
                refresh_token_lifetime=self.refresh_token_lifetime, code=self.code,
                client_id=self.client_id
            ))
        )
        return response

    def get_access_token_by_password(self):
        response = self.token_post(
            **self.exclude_not_used(**dict(
                grant_type=Grant.password, response_type=ResponseType.token,
                client_id=self.client_id, scope=self.scope,
                refresh_token_lifetime=self.refresh_token_lifetime,
                username=self.username, password=self.password
            ))
        )
        return response

    def get_code_by_refresh(self):
        token = self.token.refresh_token or self.refresh_token
        response = self.token_post(
            **self.exclude_not_used(**dict(
                grant_type=Grant.refresh_token, response_type=ResponseType.code,
                client_id=self.client_id, scope=self.scope, refresh_token=token,
                refresh_token_lifetime=self.refresh_token_lifetime,
            ))
        )
        return response

    def get_code_by_password(self):
        response = self.token_post(
            **self.exclude_not_used(**dict(
                grant_type=Grant.password, response_type=ResponseType.code,
                client_id=self.client_id, scope=self.scope,
                username=self.username, password=self.password,
                refresh_token_lifetime=self.refresh_token_lifetime,
            ))
        )
        return response

    def authenticate(self):
        if self.refresh_token:
            return self.get_access_token_by_refresh()
        if self.code:
            return self.get_access_token_by_code()
        if self.username and self.password:
            return self.get_access_token_by_password()
        raise AuthenticationNotPossible(
            "Authentication parameters must be given. None of username/password, "
            "refresh token or authorization code is found."
        )

    def save_token_from_response(self, token_response: httpx.Response):
        if token_response.is_success:
            self.token = CdbAuthAPIClient.Token(token_response.json(),
                                                refresh_token_lifetime=self.refresh_token_lifetime)
        if self.raise_http_error:
            token_response.raise_for_status()
        return token_response

    async def authenticate_and_save_async(self) -> httpx.Response:
        token_response = await self.authenticate()
        return self.save_token_from_response(token_response)

    def authenticate_and_save_sync(self) -> httpx.Response:
        token_response = self.authenticate()
        return self.save_token_from_response(token_response)

    def refresh_and_save_sync(self) -> httpx.Response:
        token_response = self.get_access_token_by_refresh()
        return self.save_token_from_response(token_response)

    async def refresh_and_save_async(self) -> httpx.Response:
        token_response = await self.get_access_token_by_refresh()
        return self.save_token_from_response(token_response)

    def refresh_and_save(self):
        if self.is_async:
            return self.refresh_and_save_async()
        return self.refresh_and_save_sync()

    def authenticate_and_save(self):
        if self.is_async:
            return self.authenticate_and_save_async()
        return self.authenticate_and_save_sync()

    @property
    def _refresh_token_handler(self) -> typing.Union[typing.Coroutine, typing.Callable]:
        """
        Decides how to get new token. There are a few options depends on state and credentials:
         - token object is not stored and credentials allow to authenticate
         - token object is not stored and there is an access_token set only (auth not possible)
         - token object is store and refresh is possible
         - token object is stored but refresh token is expired
         - refresh token expired but username/password is given
        If authentication is not possible then AuthenticationNotPossible will be raised
        Returns:

        """
        if not self.token.is_stored:
            return self.authenticate_and_save
        if self.token.is_refreshable:
            return self.refresh_and_save
        # Check if refresh token exists, expired and password authentication is possible.
        if self.token.refresh_token and not self.token.refreshable_until < datetime.now().timestamp():
            if self.username and self.password:
                return self.authenticate_and_save

        raise AuthenticationNotPossible("Token cannot be refreshed with given credentials.")

    async def safe_token_refresh_async(self):
        err = None
        async with self.lock:
            # auth_failed is set to True means that with current credential request was failed
            if self.token.auth_failed:
                raise AuthenticationFailedBefore
            # lock acquiring can happen both in time of first execution and after it
            try:
                if not self.token.needs_refresh:
                    # If token does not need refresh then it has just been updated,
                    # probably. Not a goog decision requires for improving.
                    return
                resp = await self._refresh_token_handler()
                # throw any response HTTP errors
                resp.raise_for_status()
            except Exception as ex:
                # set auth_failed to indicate that authentication is not possible with this creds
                self.token.auth_failed = True
                err = ex

        # throw unexpected exception or timeout expiration
        if err:
            raise err

    def safe_token_refresh_sync(self):
        if not self.lock.acquire(blocking=False):
            # just wait for results in parallel thread
            self.lock.acquire(blocking=True)
            self.lock.release()
            if self.token.auth_failed:
                raise AuthenticationFailedBefore
            return
        try:
            resp = self._refresh_token_handler()
        except Exception as ex:
            self.lock.release()
            raise ex

        self.lock.release()
        # throw any response HTTP errors
        resp.raise_for_status()

    def refresh_token_and_save(self) -> typing.Union[typing.Coroutine, None]:
        if self.is_async:
            return self.safe_token_refresh_async()
        return self.safe_token_refresh_sync()

    def get_auth(self, classes):
        """
        Returns instantiated object of Auth call suitable for classes from auth
        keyword annotation
        Args:
            classes (list, required): list of allowed Auth classes

        Returns:

        """
        # Todo. Change to return callable instead of object.
        #  To run check before authentication requests.
        if BearerTokenAuth in classes:
            auth = self.token.get_bearer_auth()
        elif QueryParamAuth in classes:
            auth = self.token.get_query_param_auth()
        elif httpx.BasicAuth in classes:
            auth = self.get_basic_auth()
        else:
            raise TypeError(f'Cannot select authentication for {classes}')
        return auth
