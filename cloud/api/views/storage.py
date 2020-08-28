import statistics
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from api.controllers import cloud_api
from api.helpers.exceptions import APIInternalException, APINotFoundException, handle_exceptions, api_success, require_params
from cms.models import cloud_portal_customization_cache


@api_view(['POST'])
@permission_classes((IsAuthenticated, ))
def create(request):
    require_params(request, ['systemId'])
    storage_size = cloud_portal_customization_cache(settings.CUSTOMIZATION)\
        .get('config', {}).get('cloud_storage_size', 0)

    if int(storage_size) < 1:
        raise APIInternalException('Storage size not set.')

    storage_info = cloud_api.Storage.create(request.session['login'],
                                            request.session['password'],
                                            request.data.get('systemId'),
                                            storage_size)
    return api_success(storage_info)


@api_view(['POST'])
@permission_classes((IsAuthenticated, ))
def delete(request):
    require_params(request, ['systemId', 'password'])
    cloud_api.Storage.delete_from_system(request.user.email,
                                         request.data.get('password'),
                                         request.data.get('systemId'))
    return api_success()


@api_view(['POST'])
@permission_classes((IsAuthenticated, ))
def move(request):
    require_params(request, ['destinationSystemId', 'sourceSystemId'])
    cloud_api.Storage.move(request.session['login'],
                           request.session['password'],
                           request.data.get('destinationSystemId'),
                           request.data.get('sourceSystemId'))
    return api_success()


@api_view(['GET'])
@permission_classes((IsAuthenticated, ))
def usage_stats(request):
    require_params(request, ['systemId'])
    storages = cloud_api.Storage.list_system_storages(request.session['login'],
                                                      request.session['password'],
                                                      request.query_params.get('systemId'))

    if len(storages) == 0:
        raise APINotFoundException({'message': 'System does not cloud storage.'})

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

        storage_info = cloud_api.Storage.statistics(request.session['login'],
                                                    request.session['password'],
                                                    storage_id)

        aggregated_storage_info['cameraCount'] += storage_info.get('cameraCount', 0)
        aggregated_storage_info['maxCameraRetention'] += storage_info.get('maxCameraRetention', 0)
        aggregated_storage_info['spaceUsed'] += int(storage_info.get('spaceUsed', 0))

        currentBitRate = storage_info.get('currentRecordingBitrate')
        if currentBitRate is not None:
            aggregated_storage_info['currentRecordingBitrate'].append(currentBitRate)

        maxLiveDelay = storage_info.get('maxLiveDelay')
        if maxLiveDelay is not None:
            aggregated_storage_info['maxLiveDelay'].append(maxLiveDelay)
        aggregated_storage_info['cloudCapacity'] += int(storage_info.get('totalSize', storage_size))
    else:
        # After going over storages average certain statistics
        aggregated_storage_info['currentRecordingBitrate'] = int(statistics.mean(
            aggregated_storage_info['currentRecordingBitrate']))
        aggregated_storage_info['maxLiveDelay'] = int(statistics.mean(aggregated_storage_info['maxLiveDelay']))
        aggregated_storage_info['spaceUsed'] = str(aggregated_storage_info['spaceUsed'])
        aggregated_storage_info['cloudCapacity'] = str(aggregated_storage_info['cloudCapacity'])

    return api_success(aggregated_storage_info)
