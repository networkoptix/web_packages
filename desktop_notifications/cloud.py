# TODO: Move out as common lib. Therefore we keep this module as generic as possible
# Purpose: Cloud API asyncio client
import aiohttp
from aiohttp import ClientSession
import asyncio


class CloudAPI:
    OAUTH_URL = '/cdb/oauth2'

    def __init__(self):
        self.client: ClientSession = ClientSession()

    @classmethod
    async def create(cls):
        self = cls()
        self.client = await self.client.__aenter__()
        return self

    async def close(self):
        await asyncio.sleep(0.25)
        await self.client.__aexit__(None, None, None)

    async def validate_token(self, access_token, cloud_host):
        headers = {
            'Authorization': f'Bearer {access_token}'
        }
        async with self.client.get(f'https://{cloud_host}{self.OAUTH_URL}/token/{access_token}', headers=headers) as resp:
            if resp.ok:
                return await resp.json()
            return False

    async def check_system_credentials(self, system_id, system_auth_key, cloud_host):
        async with self.client.get(
                f'https://{cloud_host}/cdb/system/{system_id}',
                auth=aiohttp.BasicAuth(login=system_id, password=system_auth_key)
        ) as resp:
            if resp.ok:
                resp = await resp.json()
                resp_system_id = resp.get('id')
                if resp_system_id:
                    return resp_system_id == system_id
            return False

    async def system_users(self, system_id, system_auth_key, cloud_host):
        async with self.client.get(
                f'https://{cloud_host}/cdb/system/{system_id}/users',
                auth=aiohttp.BasicAuth(login=system_id, password=system_auth_key)
        ) as resp:
            if resp.ok:
                resp_json = await resp.json()
                if type(resp_json) is list:
                    return resp_json

                if type(resp_json) is dict:
                    return resp_json.get('sharing')
            return []
