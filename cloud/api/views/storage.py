import statistics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from api.controllers import cloud_api
from api.helpers.exceptions import APINotFoundException, handle_exceptions, api_success, require_params


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
    storages = cloud_api.Storage.list_system_storages(request.session['login'],
                                                      request.session['password'],
                                                      request.query_params.get('systemId'))

    if len(storages) == 0:
        raise APINotFoundException({'message': 'System does not cloud storage.'})

    aggregated_storage_info = {
        'spaceUsed': 0,
        'currentRecordingBitrate': [],
        'maxLiveDelay': [],
        'maxCameraRetention': 0,
        'cameraCount': 0
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
        aggregated_storage_info['spaceUsed'] += storage_info.get('spaceUsed', 0)

        currentBitRate = storage_info.get('currentRecordingBitrate')
        if currentBitRate is not None:
            aggregated_storage_info['currentRecordingBitrate'].append(currentBitRate)

        maxLiveDelay = aggregated_storage_info.get('maxLiveDelay')
        if maxLiveDelay is not None:
            aggregated_storage_info['maxLiveDelay'].append(maxLiveDelay)
    else:
        # After going over storages average certain statistics
        aggregated_storage_info['currentRecordingBitrate'] = int(statistics.mean(
            aggregated_storage_info['currentRecordingBitrate']))
        aggregated_storage_info['maxLiveDelay'] = int(statistics.mean(aggregated_storage_info['maxLiveDelay']))

    return api_success(aggregated_storage_info)
