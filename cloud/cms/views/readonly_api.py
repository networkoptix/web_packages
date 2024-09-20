from uuid import uuid4

from nx_drf.drf_async import async_api_view
from util.base_cache import ReadOnlyAPICache, BaseCacheV2
from cms.serializers import ReadOnlyAPIDetailSerializer, ReadOnlyAPIListSerializer

from django.urls import reverse
from django.shortcuts import redirect
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from asgiref.sync import sync_to_async
from cloud.helpers.exceptions import api_success
from cms.models import ReadOnlyAPI

READONLY_EXPIRES = 60 * 60 * 24 * 365 # 1 Year
READONLY_CACHE_HEADER = {'Cache-Control': f'max-age={READONLY_EXPIRES}'}

id_route_param = openapi.Parameter("json_id", openapi.IN_PATH,
                                          description="The readonlyAPIs id.",
                                          required=True,
                                          type=openapi.TYPE_STRING)

type__query_param = openapi.Parameter("type", openapi.IN_QUERY,
                                       description="Filter readonlyAPIs by type.",
                                       type=openapi.TYPE_STRING)

# Status Messages
API_NOT_FOUND = "readonlyAPI not found."
INVALID_API_TYPE = "This readonlyAPI type does not exist."

@swagger_auto_schema(method='GET',
                     operation_description="Returns a readonlyAPI with its files",
                     responses={'200': openapi.Response(
                         'ReadOnlyAPI', ReadOnlyAPIDetailSerializer)},
                     manual_parameters=[id_route_param])
@async_api_view(("GET", ))
@permission_classes((AllowAny, ))
async def get_readonly_api(request, api_id=None):
    request_version = request.GET.get('version')
    if not api_id:
        return api_success(API_NOT_FOUND, status_code=status.HTTP_404_NOT_FOUND)

    api_id = int(api_id)

    readonly_api_cache = ReadOnlyAPICache(api_id=api_id)
    api_cache = await readonly_api_cache.aget_cached_item() or {}
    if not api_cache:
        try:
            api = await ReadOnlyAPI.objects.aget(id=api_id)
        except ReadOnlyAPI.DoesNotExist:
            return api_success(API_NOT_FOUND, status_code=status.HTTP_404_NOT_FOUND)
        cache_version = str(uuid4())
        data = await sync_to_async(lambda: ReadOnlyAPIDetailSerializer(api).data)()
        await readonly_api_cache.aset_cached_item({'data': data, 'version': cache_version})
        return redirect(f'{reverse("get_readonly_api", args=(api_id,))}?version={cache_version}')
    cache_version = api_cache['version']
    if request_version != cache_version:
        return redirect(f'{reverse("get_readonly_api", args=(api_id,))}?version={cache_version}')

    return api_success(api_cache['data'], additional_headers=READONLY_CACHE_HEADER)


@swagger_auto_schema(method='GET',
                     operation_description="Returns a list of readonlyAPIs. Can be filtered by type.",
                     responses={'200': openapi.Response('ReadOnlyAPI List', ReadOnlyAPIListSerializer)},
                     manual_parameters=[type__query_param])
@swagger_auto_schema(method='DELETE')
@async_api_view(("GET", "DELETE"))
@permission_classes((AllowAny, ))
async def get_readonly_apis(request):
    type = request.GET.get('type', False)
    lookup_key = f'readonly_apis-{type}' if type else 'readonly_apis'
    api_cache = BaseCacheV2(lookup_key=lookup_key, cache_key='readonly_apis',
                            customization_name=request.CUSTOMIZATION)

    if request.method == 'DELETE':
        if request.user.is_staff:
            api_cache.clear_cache()
            readonly_apis = await sync_to_async(list)(ReadOnlyAPI.objects.all().values_list('id', flat=True))
            for api_id in readonly_apis:
                ReadOnlyAPICache(api_id=api_id).clear_cache()
            return api_success('Cache cleared.', status_code=status.HTTP_204_NO_CONTENT)
        else:
            return api_success('You do not have permission to clear the cache.', status_code=status.HTTP_403_FORBIDDEN)

    data = await api_cache.aget_cached_item()

    if not data:
        if type:
            if (api_type := getattr(ReadOnlyAPI.API_TYPES, type, False)) is False:
                return api_success(INVALID_API_TYPE, status_code=status.HTTP_404_NOT_FOUND)
            apis = ReadOnlyAPI.objects.filter(type=api_type)
        else:
            apis = ReadOnlyAPI.objects.all()
        data = await sync_to_async(lambda: ReadOnlyAPIListSerializer(apis, many=True).data)()
        await api_cache.cache.aset(api_cache.lookup_key, data, timeout=3600)
    return api_success({'data': data})
