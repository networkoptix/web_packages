from cms.serializers import OpenAPIJSONSerializer

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

from cloud.helpers.exceptions import api_success
from cms.models import OpenAPIJSON

id_route_param = openapi.Parameter("json_id", openapi.IN_PATH,
                                          description="The OpenAPI JSON's id.",
                                          required=True,
                                          type=openapi.TYPE_STRING)

type__query_param = openapi.Parameter("type", openapi.IN_QUERY,
                                       description="Filter OpenAPI JSON's by type.",
                                       type=openapi.TYPE_STRING)

# Status Messages
JSON_NOT_FOUND = "OpenAPI JSON not found."
INVALID_JSON_TYPE = "This OpenAPI JSON type does not exist."

@swagger_auto_schema(method='GET',
                     operation_description="Returns an OpenAPI JSON by id",
                     manual_parameters=[id_route_param])
@api_view(("GET", ))
@permission_classes((AllowAny, ))
def get_openapi_json(request, json_id=None):

    if not json_id:
        return api_success(JSON_NOT_FOUND, status_code=status.HTTP_404_NOT_FOUND)

    json_id = int(json_id)

    try:
        json = OpenAPIJSON.objects.get(id=json_id)
    except OpenAPIJSON.DoesNotExist:
        return api_success(JSON_NOT_FOUND, status_code=status.HTTP_404_NOT_FOUND)

    serializer = OpenAPIJSONSerializer(json)

    return api_success(serializer.data)


@swagger_auto_schema(method='GET',
                     operation_description="Returns a list of OpenAPI JSONs. Can be filtered by type.",
                     manual_parameters=[type__query_param])
@api_view(("GET", ))
@permission_classes((AllowAny, ))
def get_openapi_jsons(request):
    type = request.GET.get('type', False)

    if type:
        if (json_type := getattr(OpenAPIJSON.JSON_TYPES, type, False)) is False:
            return api_success(INVALID_JSON_TYPE, status_code=status.HTTP_404_NOT_FOUND)
        jsons = OpenAPIJSON.objects.filter(type=json_type)
    else:
        jsons = OpenAPIJSON.objects.all()

    response = []
    for json in jsons:
        response.append(OpenAPIJSONSerializer(json).data)


    return api_success({ 'data': response })