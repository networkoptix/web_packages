import asyncio
import pprint
import os
import httpx
from .client import NxCloudAPIClient
from .base_auth import CdbAuthAPIClient

pwd = os.environ.get('NX_CLOUD_TEST_PWD')
usr3 = os.environ.get('NX_CLOUD_TEST_ACC_3')
usr2 = os.environ.get('NX_CLOUD_TEST_ACC_2')
usr1 = os.environ.get('NX_CLOUD_TEST_ACC_1')


async def example():
    http_client = httpx.AsyncClient()
    user_1_client = NxCloudAPIClient(client=http_client, host='https://cloud-test.hdw.mx',
                                     username=usr1, password=pwd)
    common_client = NxCloudAPIClient(client=http_client, host='https://cloud-test.hdw.mx')
    auth_2 = CdbAuthAPIClient(client=http_client, host='https://cloud-test.hdw.mx',
                              username=usr2, password=pwd)
    auth_3 = CdbAuthAPIClient(client=http_client, host='https://cloud-test.hdw.mx',
                              username=usr3, password=pwd)
    coros = [
        user_1_client.account.fetch_account(),
        user_1_client.system.get_systems(),
        common_client.account.fetch_account(authenticator=auth_2),
        common_client.system.get_systems(authenticator=auth_2),
        common_client.account.fetch_account(authenticator=auth_3),
        common_client.system.get_systems(authenticator=auth_3),
    ]
    responses = await asyncio.gather(*coros)
    await http_client.aclose()
    for resp in responses:
        pprint.pprint(resp.json())
        print('======')


