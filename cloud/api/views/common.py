from rest_framework.decorators import permission_classes
from rest_framework.permissions import AllowAny
from drf_yasg.utils import swagger_auto_schema

from cloud.helpers.exceptions import handle_exceptions, api_success
from cloud.controllers import cloud_api
from nx_drf.drf_async import async_api_view as api_view

from asgiref.sync import sync_to_async
import asyncio


@swagger_auto_schema(method="GET", auto_schema=None)
@api_view(['GET'])
@permission_classes((AllowAny, ))
async def ping(request):
    data = await sync_to_async(cloud_api.ping, thread_sensitive=False)()
    return api_success(data)


@swagger_auto_schema(method="GET", auto_schema=None)
@api_view(['GET'])
@permission_classes((AllowAny, ))
async def maintenance_health(request):
    return api_success({})


@api_view(['GET'])
@permission_classes((AllowAny, ))
async def long_request(request):
    await asyncio.sleep(10)
    return api_success()
