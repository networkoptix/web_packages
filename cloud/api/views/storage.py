from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from api.controllers import cloud_api
from api.helpers.exceptions import handle_exceptions, api_success, require_params


@api_view(['POST'])
@permission_classes((IsAuthenticated, ))
@handle_exceptions
def enable(request):
    require_params(request, ['systemId'])
    storage_info = cloud_api.Storage.create(request.session['login'],
                                            request.session['password'],
                                            request.data.get('systemId'))
    return api_success(storage_info)


@api_view(['POST'])
@permission_classes((IsAuthenticated, ))
@handle_exceptions
def delete(request):
    require_params(request, ['systemId', 'password'])
    cloud_api.Storage.delete_from_system(request.session['login'],
                                         request.data.get('password'),
                                         request.data.get('systemId'))
    return api_success()


@api_view(['POST'])
@permission_classes((IsAuthenticated, ))
@handle_exceptions
def move(request):
    require_params(request, ['sourceSystemId', 'destinationSystemId'])
    cloud_api.Storage.move(request.session['login'],
                           request.session['password'],
                           request.data.get('sourceSystemId'),
                           request.data.get('destinationSystemId'))
    return api_success()


@api_view(['GET'])
@permission_classes((IsAuthenticated, ))
@handle_exceptions
def usage_stats(request):
    require_params(request, ['systemId'])
    storage_info = cloud_api.Storage.statistics(request.session['login'],
                                                request.session['password'],
                                                request.data.get('systemId'))
    return api_success(storage_info)
