import statistics

from django.conf import settings
from oauth2_provider.contrib.rest_framework import IsAuthenticatedOrTokenHasScope
from rest_framework.decorators import api_view, permission_classes
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

from cloud.controllers import cloud_api
from cloud.helpers.exceptions import (
    APIInternalException, APINotFoundException, handle_exceptions, api_success, require_params)
from cms.models import cloud_portal_customization_cache


# Swagger params
systemId__query_params = openapi.Parameter(
    'systemId', openapi.IN_PATH, type=openapi.TYPE_STRING)

# Swagger Schema
destinationSystemId__body = openapi.Schema(type=openapi.TYPE_STRING)
password__body = openapi.Schema(type=openapi.TYPE_STRING)
sourceSystemId__body = openapi.Schema(type=openapi.TYPE_STRING)
systemId__body = openapi.Schema(type=openapi.TYPE_STRING)


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="Creates a cloud storage for the system.",
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "systemId": systemId__body
                         },
                         required=["systemId"]
                     ))
@api_view(['POST'])
@permission_classes((IsAuthenticatedOrTokenHasScope, ))
def create(request):
    require_params(request, ['systemId'])
    storage_size = cloud_portal_customization_cache(settings.CUSTOMIZATION)\
        .get('config', {}).get('cloud_storage_size', 0)

    if int(storage_size) < 1:
        raise APIInternalException('Storage size not set.')

    storage_info = cloud_api.Storage.create(request,
                                            request.data.get('systemId'),
                                            storage_size)
    return api_success(storage_info)


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="Deletes a cloud storage from the system.",
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "password": password__body,
                             "systemId": systemId__body
                         },
                         required=["systemId"]
                     ))
@api_view(['POST'])
@permission_classes((IsAuthenticatedOrTokenHasScope, ))
def delete(request):
    require_params(request, ['systemId', 'password'])
    with cloud_api.TempLogin(request.user.email, request.data.get('password')) as credentials:
        cloud_api.Storage.delete_from_system(
            credentials.tokens, request.data.get('systemId'))
    return api_success()


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="Moves the cloud storage(s) from one system to another system.",
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "destinationSystemId": destinationSystemId__body,
                             "sourceSystemId": sourceSystemId__body
                         },
                         required=["destinationSystemId", "sourceSystemId"]
                     ))
@api_view(['POST'])
@permission_classes((IsAuthenticatedOrTokenHasScope, ))
def move(request):
    require_params(request, ["destinationSystemId", "sourceSystemId"])
    cloud_api.Storage.move(request,
                           request.data.get("destinationSystemId"),
                           request.data.get("sourceSystemId"))
    return api_success()


@swagger_auto_schema(method="GET",  # auto_schema=None,
                     operation_description="Returns the cloud storage usage statistics for a system.",
                     manual_parameters=[systemId__query_params])
@api_view(['GET'])
@permission_classes((IsAuthenticatedOrTokenHasScope, ))
def usage_stats(request):
    require_params(request, ['systemId'])
    storages = cloud_api.Storage.list_system_storages(request,
                                                      request.query_params.get('systemId'))

    if len(storages) == 0:
        raise APINotFoundException(
            {'message': 'System does not cloud storage.'})

    storage_size = cloud_portal_customization_cache(settings.CUSTOMIZATION) \
        .get('config', {}).get('cloud_storage_size', 0)

    aggregated_storage_info = {
        'spaceUsed': 0,
        'currentRecordingBitrate': [],
        'maxLiveDelay': [],
        'maxCameraRetention': 0,
        'cameraCount': 0,
        'cloudCapacity': 0
    }
    for storage in storages:
        storage_id = storage.get('id')
        if storage_id is None:
            continue

        storage_info = cloud_api.Storage.statistics(request, storage_id)

        aggregated_storage_info['cameraCount'] += storage_info.get(
            'cameraCount', 0)
        aggregated_storage_info['maxCameraRetention'] += storage_info.get(
            'maxCameraRetention', 0)
        aggregated_storage_info['spaceUsed'] += int(
            storage_info.get('spaceUsed', 0))

        currentBitRate = storage_info.get('currentRecordingBitrate')
        if currentBitRate is not None:
            aggregated_storage_info['currentRecordingBitrate'].append(
                currentBitRate)

        maxLiveDelay = storage_info.get('maxLiveDelay')
        if maxLiveDelay is not None:
            aggregated_storage_info['maxLiveDelay'].append(maxLiveDelay)
        aggregated_storage_info['cloudCapacity'] += int(
            storage_info.get('totalSize', storage_size))
    else:
        # After going over storages average certain statistics
        aggregated_storage_info['currentRecordingBitrate'] = int(statistics.mean(
            aggregated_storage_info['currentRecordingBitrate']))
        aggregated_storage_info['maxLiveDelay'] = int(
            statistics.mean(aggregated_storage_info['maxLiveDelay']))
        aggregated_storage_info['spaceUsed'] = str(
            aggregated_storage_info['spaceUsed'])
        aggregated_storage_info['cloudCapacity'] = str(
            aggregated_storage_info['cloudCapacity'])

    return api_success(aggregated_storage_info)
