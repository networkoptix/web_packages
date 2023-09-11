from django.core.cache import caches
from rest_framework.decorators import permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from drf_yasg.utils import swagger_auto_schema
from rest_framework.response import Response

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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@handle_exceptions
def redis_connections(request):
    if request.user.email != 'noptixautoqa@gmail.com' and not request.user.is_superuser:
        return Response({"message": "Not authorized."}, status=403)
    client_list = caches['default'].client_list() or []
    conn_cnt = len(client_list)
    async_cnt = len(list(filter(lambda c: c['name'] == 'async', client_list)))
    sync_cnt = len(list(filter(lambda c: c['name'] == 'sync', client_list)))
    unspecified_cnt = len(list(filter(lambda c: c['name'] == '', client_list)))

    data = {
        'total_count': conn_cnt,
        'async_count': async_cnt,
        'sync_count': sync_cnt,
        'unspecified_count': unspecified_cnt
    }
    return Response(data)
