from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from drf_yasg.utils import swagger_auto_schema

from cloud.helpers.exceptions import handle_exceptions, api_success
from cloud.controllers import cloud_api


@swagger_auto_schema(method="GET", auto_schema=None)
@api_view(['GET'])
@permission_classes((AllowAny, ))
def ping(request):
    data = cloud_api.ping()
    return api_success(data)


@swagger_auto_schema(method="GET", auto_schema=None)
@api_view(['GET'])
@permission_classes((AllowAny, ))
def maintenance_health(request):
    return api_success({})
