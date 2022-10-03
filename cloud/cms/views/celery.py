from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from celery import result

from api.helpers.exceptions import APINotFoundException, api_success, handle_exceptions

from cms.models import PackagesCache
from cms.permissions import IsSuperuser


@api_view(["GET"])
@permission_classes((IsAuthenticated,))
def check_status(request, task_id):
    task = result.AsyncResult(task_id)
    return api_success(task.result or task.state)


@api_view(["GET"])
@permission_classes((IsSuperuser,))
@handle_exceptions
def download_result(request, task_id):
    from cms.views.asset import response_attachment
    DOWNLOAD_CACHE = PackagesCache()
    result = DOWNLOAD_CACHE.get(task_id)
    if not result:
        raise APINotFoundException('File not available')
    return response_attachment(result['file'], result['file_name'], 'application/json', attachment=True)
