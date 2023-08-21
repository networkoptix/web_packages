# Breif description

Module `nx_cloud_api_client.apis.base_api` - contains base classes

Module `nx_cloud_api_client.apis.base_auth` - contains Oauth2 API and authentication classes 

- Class `nx_cloud_api_client.apis.base_auth.CdbOauth2APIBase` - CDB Oauth2 API, provide request methods

- Class `nx_cloud_api_client.apis.base_auth.CdbAuthAPIClient` - Authentication helper class, allows to 
request token in a simple way by given credentials. Class provided methods to request token
automatically when used within `NxCloudAPIClient`.

- Class `nx_cloud_api_client.apis.base_auth.BearerTokenAuth` - `httpx.Auth` subclass, provides bearer 
token authentication in a `httpx` manner.

- Class `nx_cloud_api_client.apis.base_auth.QueryParamAuth` - `httpx.Auth` subclass, provides query param 
token authentication in a `httpx` manner.

- `nx_cloud_api_client.apis.base_auth.RequestedTokenAuth`,`nx_cloud_api_client.apis.base_auth.RequestedTokenAuth` - 
the same as two above, but allows to request token from Ouath2 API on a first request and 
reuse them. **Note!** Do not use these classes in concurrent coroutines or threads.

Module `nx_cloud_api_client.apis` - contains classes to access all CDB API endpoints.

- Class `nx_cloud_api_client.apis.CdbAccountAPIBase` - Account information, settings, security management. 
Base path `/cdb/account`

- Class `nx_cloud_api_client.apis.CdbSystemAPIBase` - Adding/removing systems. Granting/revoking access to them. 
Base path `/cdb/system`

- Class `nx_cloud_api_client.apis.CdbSystemTransferAPIBase` - Transferring system ownership between cloud accounts. 
Base path `/cdb/offered-systems`

- Class `nx_cloud_api_client.apis.CdbAuthSupportAPIBase` - API for forwarding authentication to the cloud_db. 
Allows other Cloud services to authenticate incoming requests using account and system credentials. 
Base paths `/cdb/auth` and `/cdb/auth_provider`.

- Class `nx_cloud_api_client.apis.Cdb2faAPIBase` - Multifactor authentication: TOTP, backup codes. 
Base path `/cdb/account/self/2fa`

All request method are documented and annotated. **Note** Any API request method must be annotated if 
it will be used with `NxCloudAPIClient`.
Request methods pass kwargs down to request handlers. It is possible to pass any keyword argument to 
clients request handler even if it is not annotated explicitly in method.

# Usage

## Development environment
To pass package to development environment and make it accessible by `nx_cloud_api_client` name path to client 
must be set in PYTHONPATH environment variable. e.g.:

```shell
export PYTHONPATH=/develop/cloud_portal/common/python/nx_cloud_api_client/
```
On deployment client directory can be simply copied to python project root directory then all imports stay valid.


## Synchronous and asynchronous usage

APIs and Client can be used in both sync and async functions. 
Their behavior is defined by used http client it is possible 
to use subclasses of `httpx.Client` or `httpx.AsyncClient`. 
All methods are identical but asynchronous ones must be awaited. 

```python
import httpx
from nx_cloud_api_client.apis import CdbAccountAPIBase
from nx_cloud_api_client.base_auth import BearerTokenAuth
auth = httpx.BasicAuth(username='user', password='pass')

sync_api = CdbAccountAPIBase(base_url='https://cloud-test.hdw.mx', 
                             client=httpx.Client())
sync_response = sync_api.fetch_account(auth=auth)
token = '123qwe'
auth = BearerTokenAuth(token=token)
async_api = CdbAccountAPIBase(base_url='https://cloud-test.hdw.mx', 
                             client=httpx.AsyncClient())
async_response = await sync_api.fetch_account(auth=auth)
```

## Authentication order

Keyword argument `auth` accept parameters for `httpx.Client` or `httpx.AsyncClient`. This authentication 
will be applied last and can override one passed in headers or query params.

```python
import httpx
from nx_cloud_api_client.apis import CdbAccountAPIBase
from nx_cloud_api_client.base_auth import BearerTokenAuth, RequestedTokenQueryAuth
auth = httpx.BasicAuth(username='user', password='pass')
# Proper usage of Basic Auth
sync_api = CdbAccountAPIBase(host='https://cloud-test.hdw.mx', 
                             client=httpx.Client())
sync_response = sync_api.fetch_account(auth=auth)

# Proper usage of authentication via query param
token = '123qwe'
async_api = CdbAccountAPIBase(host='https://cloud-test.hdw.mx',
                              client=httpx.AsyncClient())
auth = RequestedTokenQueryAuth(cdb_host='https://cloud-test.hdw.mx', client=async_api.client, 
                               refresh_token=token)
async_response = await async_api.fetch_account(auth=auth)

# Invalid usage. Passed header will be overriden within token from BearerTokenAuth
token = '123qwe'
auth = BearerTokenAuth(token=token)
async_api = CdbAccountAPIBase(base_url='https://cloud-test.hdw.mx', 
                             client=httpx.AsyncClient())
async_response = await async_api.fetch_account(auth=auth, headers={'Authorization': 'Bearer qweasd'})
```


## Clients and context manager

`httpx.AsyncClient` object must be closed when finished. Because of these API classes can be used as context managers.
Also, you can use clients itself as context manager or close connections explicitly with `client.close()` 
or `await client.aclose()`.

```python
import asyncio
import httpx
from nx_cloud_api_client.apis import CdbAccountAPIBase, CdbSystemAPIBase
from nx_cloud_api_client.base_auth import BearerTokenAuth, RequestedTokenQueryAuth

auth = httpx.BasicAuth(username='user', password='pass')
data = {}
async with CdbAccountAPIBase(host='https://cloud-test.hdw.mx', client=httpx.AsyncClient()) as api:
    sync_response = api.fetch_account(auth=auth)
    api.update_account(**data, auth=auth)
    
auth = BearerTokenAuth(token='token')
async with httpx.AsyncClient() as client:
    acc_api = CdbAccountAPIBase(host='https://cloud-test.hdw.mx',
                                client=client)
    sys_api = CdbSystemAPIBase(base_url='https://cloud-test.hdw.mx',
                               client=client)

    account, systems = await asyncio.gather(
        acc_api.fetch_account(auth=auth), 
        sys_api.get_systems(auth=auth)
    )
    
# this throws error, because client has been closed already
sys_api.get_system(system_id='id', auth=auth)    

client = httpx.AsyncClient()
auth = RequestedTokenQueryAuth(cdb_host='https://cloud-test.hdw.mx', client=client,
                               username='user', password='pass')
acc_api = CdbAccountAPIBase(host='https://cloud-test.hdw.mx',
                            client=client)
sys_api = CdbSystemAPIBase(base_url='https://cloud-test.hdw.mx',
                           client=client)
account = await acc_api.fetch_account(auth=auth)
systems = await sys_api.get_systems(auth=auth)

await client.aclose()
```

Context manager work in a similar way with synchronous client.


## Using CdbAuthAPIClient class for authentication and token renewal

Class `CdbAuthAPIClient` made to simplify authentication. It accepts any information which can be to retrieve 
authentication token.

```python
import httpx
from nx_cloud_api_client.base_auth import CdbAuthAPIClient

auth_client = CdbAuthAPIClient(host='https://cloud-test.hdw.mx', 
                               client=httpx.AsyncClient(),
                               username='username', password='password')
# authenticate and save tokens
await auth_client.authenticate_and_save()
token: CdbAuthAPIClient.Token = auth_client.token # token object
refresh_token = token.refresh_token # just request refresh token
access_token = token.access_token # just request access token
expires_in = token.expires_in # access token expires in seconds
await auth_client.refresh_token_and_save() # renew token and save it

auth = auth_client.get_basic_auth() # return BasicAuth
auth = auth_client.get_bearer_auth() # return BearerTokenAuth
auth = auth_client.get_query_param_auth() # return QueryParamAuth

await auth_client.aclose() # closing httpx client
```

Methods `CdbAuthAPIClient.authenticate_and_save` and `CdbAuthAPIClient.refresh_token_and_save` are safe 
for concurrent usage. **With async client is thread unsafe.**

## Using NxCloudAPIClient

Class `NxCloudAPIClient` contains all APIs and tools to provide auto-authentication and token renewal.
On instantiation class looks for API requests methods by annotation and replacing them with a wrapper to add 
auto-authentication. Authentication to use for request is chosen by `auth` keyword annotation. 

It is possible to use this class in a many ways. With a single authentication client, 
without authentication client by passing it to a request method, simultaneously called endpoints within 
single `httpx` client and different authentication credentials.


```python
import httpx
import asyncio
from nx_cloud_api_client.client import NxCloudAPIClient
from nx_cloud_api_client.base_auth import CdbAuthAPIClient

http_client = httpx.AsyncClient()
user_1_client = NxCloudAPIClient(client=http_client,
                                 host='https://cloud-test.hdw.mx',
                                 username='usr1', password='pwd')
common_client = NxCloudAPIClient(client=http_client, 
                                 host='https://cloud-test.hdw.mx') 
# credentials are not given. common_client will be used without authentication client.
auth_2 = CdbAuthAPIClient(client=http_client, host='https://cloud-test.hdw.mx',
                          username='usr2', password='pwd')
auth_3 = CdbAuthAPIClient(client=http_client, host='https://cloud-test.hdw.mx',
                          username='usr3', password='pwd')
coros = [
    user_1_client.account.fetch_account(),
    user_1_client.system.get_systems(),
    # passing authentication client directly to request method
    common_client.account.fetch_account(authenticator=auth_2),
    common_client.system.get_systems(authenticator=auth_2),
    common_client.account.fetch_account(authenticator=auth_3),
    common_client.system.get_systems(authenticator=auth_3),
]
responses = await asyncio.gather(*coros)
```
For full example see `example.py`.

Output:

```
[INFO] 2023-04-28 01:35:36,469 base_auth 43563 8600230720 Token requested for nx-client-test-usr-95ac8056@networkoptix.com
[INFO] 2023-04-28 01:35:36,483 base_auth 43563 8600230720 Token requested for nx-client-test-usr-fda1d2f7@networkoptix.com
[INFO] 2023-04-28 01:35:36,483 base_auth 43563 8600230720 Token requested for nx-client-test-usr-506dd226@networkoptix.com
{'account2faEnabled': False,
 'activationTime': '1680307266132',
 'customization': 'default',
 'email': 'nx-client-test-usr-95ac8056@networkoptix.com',
 'fullName': 'name a1dade59-d0d8-4b35-a21f-99432b0235c6',
 'httpDigestAuthEnabled': True,
 'id': '5c9ae9bf-37b4-4e12-b562-f62e758e84b0',
 'registrationTime': '1680307010843',
 'statusCode': 'activated'}
======
{'systems': [{'accessRole': 'owner',
              'authKey': '',
              'authKeyHash': '',
              'capabilities': {},
              'cloudConnectionSubscriptionStatus': True,
              'customization': 'default',
              'id': '9d8cf081-e5d1-459f-ac76-dc86f4f3b751',
              'lastLoginTime': '1681857113430',
              'name': 'd7df623284a7',
              'opaque': '{"localSystemId":"{}"}',
              'ownerAccountEmail': 'nx-client-test-usr-95ac8056@networkoptix.com',
              'ownerFullName': 'name a1dade59-d0d8-4b35-a21f-99432b0235c6',
              'registrationTime': '1681857113365',
              'sharingPermissions': [{'accessRole': 'maintenance'},
                                     {'accessRole': 'liveViewer'},
                                     {'accessRole': 'viewer'},
                                     {'accessRole': 'advancedViewer'},
                                     {'accessRole': 'localAdmin'},
                                     {'accessRole': 'cloudAdmin'}],
              'stateOfHealth': 'offline',
              'status': 'activated',
              'system2faEnabled': False,
              'systemSequence': 155867,
              'usageFrequency': 0.0,
              'version': '5.2.0.36623'}]}
======
{'account2faEnabled': False,
 'activationTime': '1680307171098',
 'customization': 'default',
 'email': 'nx-client-test-usr-fda1d2f7@networkoptix.com',
 'fullName': 'nx test',
 'httpDigestAuthEnabled': True,
 'id': '63ce4809-2d84-44aa-9e02-ece767578d22',
 'registrationTime': '1680306912453',
 'statusCode': 'activated'}
======
{'systems': []}
======
{'account2faEnabled': False,
 'activationTime': '1680305856389',
 'customization': 'default',
 'email': 'nx-client-test-usr-506dd226@networkoptix.com',
 'fullName': 'name 845cb4cb-9cb5-408b-b55b-2e1043ffe41c',
 'httpDigestAuthEnabled': True,
 'id': '55ed6485-7dc3-47df-96f9-86b3b41a09d7',
 'registrationTime': '1680304605756',
 'statusCode': 'activated'}
======
{'systems': []}
======

```

### Default client class
`NxCloudAPIClient` can be extended to use default client class if it is not defined during assignment. 

```python
import httpx
from nx_cloud_api_client.client import NxCloudAPIClient

class SyncClient(NxCloudAPIClient):
    _default_client_class = httpx.Client

class AsyncClient(NxCloudAPIClient):
    _default_client_class = httpx.AsyncClient

client = AsyncClient('base_host')
assert isinstance(client.client, httpx.AsyncClient)

client = SyncClient('base_host')
assert isinstance(client.client, httpx.Client)

```

## Known issue

1. When using `NxCloudAPIClient` and `CdbAuthAPIClient`, on token request if credentials are incorrect 403 
will be raised on concurrent coroutines. 