from asgiref.sync import sync_to_async
from rest_framework.decorators import permission_classes
from rest_framework.permissions import AllowAny
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

from cloud.helpers.exceptions import require_params, api_success, APIForbiddenException
from cloud.drf_async import async_api_view as api_view
from cms.models import Flag
from notifications.models import Message
from waffle.models import Switch

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
@permission_classes((AllowAny, ))
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


@swagger_auto_schema(method="POST", operation_description="Set feature flags",
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "flag name": openapi.Schema(type=openapi.TYPE_BOOLEAN)
                         })
                     )
@api_view(['POST'])
@permission_classes([AllowAny])
async def set_flags(request):
    flags = request.data
    flag_objs = Flag.objects.filter(name__in=flags.keys())
    switch_objs = Switch.objects.filter(name__in=flags.keys())

    set_flags = {}

    async for flag in flag_objs:
        flag.everyone = flags[flag.name]
        await sync_to_async(flag.save)()
        set_flags[flag.name] = flag.everyone

    async for switch in switch_objs:
        switch.active = flags[switch.name]
        await sync_to_async(switch.save)()
        set_flags[switch.name] = switch.active

    return api_success(set_flags)
