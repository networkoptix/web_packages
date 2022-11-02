from rest_framework.decorators import permission_classes
from rest_framework.permissions import IsAuthenticated
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

from cloud.helpers.exceptions import require_params, api_success, APIForbiddenException
from cloud.drf_async import async_api_view as api_view
from notifications.models import Message

email__body = openapi.Schema(
    type=openapi.TYPE_STRING, description="Target users email.")
type__body = openapi.Schema(type=openapi.TYPE_STRING,
                            description="Type of email you are extracting code from")


@swagger_auto_schema(method="POST", auto_schema=None,
                     operation_description="Returns a code based on a users email. "
                                           "The purpose of this is to help speed up auto tests so that they dont have "
                                           "to wait on emails to appear in the inbox. Only the noptixautoqa account "
                                           "can use this endpoint to get info on other noptixautoqa accounts")
@api_view(['POST'])
@permission_classes((IsAuthenticated, ))
async def get_code(request):
    NOPTIX_AUTOQA_EMAIL = 'noptixautoqa'
    require_params(request, ('email', 'type'))
    data = request.data
    target_email = data['email']
    user_email = ''
    if hasattr(request.user, 'email'):
        user_email = request.user.email
    if f"{NOPTIX_AUTOQA_EMAIL}@gmail.com" != user_email or \
            f"{NOPTIX_AUTOQA_EMAIL}+" not in target_email:
        raise APIForbiddenException('Usage of this endpoint is forbidden')
    message = await Message.objects.filter(
        user_email__iexact=data['email'], type=data['type']).alast()
    code = message.message.get(
        'code', 'Does not exist') if message else 'Does not exist'
    return api_success({"code": code})
