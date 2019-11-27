from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from api.helpers.exceptions import handle_exceptions, require_params, api_success
from notifications.models import Message


@api_view(['POST'])
@permission_classes((IsAuthenticated, ))
@handle_exceptions
def get_code(request):
    require_params(request, ('email', 'type'))
    data = request.data
    message = Message.objects.get(user_email=data['email'], type=data['type'])
    return api_success({"code": message.message['code']})
