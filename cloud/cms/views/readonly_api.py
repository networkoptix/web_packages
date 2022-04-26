from cms.serializers import ReadOnlyAPIDetailSerializer, ReadOnlyAPIListSerializer

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

from cloud.helpers.exceptions import api_success
from cms.models import ReadOnlyAPI

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
                     responses={'200': openapi.Response('ReadOnlyAPI', ReadOnlyAPIDetailSerializer)},
                     manual_parameters=[id_route_param])
@api_view(("GET", ))
@permission_classes((AllowAny, ))
def get_readonly_api(request, api_id=None):

    if not api_id:
        return api_success(API_NOT_FOUND, status_code=status.HTTP_404_NOT_FOUND)

    api_id = int(api_id)

    try:
        api = ReadOnlyAPI.objects.get(id=api_id)
    except ReadOnlyAPI.DoesNotExist:
        return api_success(API_NOT_FOUND, status_code=status.HTTP_404_NOT_FOUND)

    serializer = ReadOnlyAPIDetailSerializer(api)

    return api_success(serializer.data)


@swagger_auto_schema(method='GET',
                     operation_description="Returns a list of readonlyAPIs. Can be filtered by type.",
                     responses={'200': openapi.Response('ReadOnlyAPI List', ReadOnlyAPIListSerializer)},
                     manual_parameters=[type__query_param])
@api_view(("GET", ))
@permission_classes((AllowAny, ))
def get_readonly_apis(request):
    type = request.GET.get('type', False)

    if type:
        if (api_type := getattr(ReadOnlyAPI.API_TYPES, type, False)) is False:
            return api_success(INVALID_API_TYPE, status_code=status.HTTP_404_NOT_FOUND)
        apis = ReadOnlyAPI.objects.filter(type=api_type)
    else:
        apis = ReadOnlyAPI.objects.all()

    response = []
    for api in apis:
        response.append(ReadOnlyAPIListSerializer(api).data)


    return api_success({ 'data': response })
