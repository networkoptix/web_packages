from api.helpers.exceptions import api_success
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from celery.result import AsyncResult


@api_view(["GET"])
@permission_classes((IsAuthenticated,))
def check_status(request, task_id):
    task = AsyncResult(task_id)
    return api_success(task.result or task.state)
