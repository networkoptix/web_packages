from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from celery.result import AsyncResult

from api.helpers.exceptions import APIException, api_success

from cms.models import PackagesCache
from cms.permissions import IsSuperuser


@api_view(["GET"])
@permission_classes((IsAuthenticated,))
def check_status(request, task_id):
    task = AsyncResult(task_id)
    return api_success(task.result or task.state)


@api_view(["GET"])
@permission_classes((IsSuperuser,))
def download_result(request, task_id):
    from cms.views.asset import response_attachment
    DOWNLOAD_CACHE = PackagesCache()
    result = DOWNLOAD_CACHE.get(task_id)
    if not result:
        return APIException('File not available', 404)
    return response_attachment(result['file'], result['file_name'], 'application/json', attachment=True)
