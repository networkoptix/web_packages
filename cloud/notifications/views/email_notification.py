from rest_framework.decorators import api_view, permission_classes, authentication_classes
from django.conf import settings

# Maybe move helpers to package
from cloud.helpers.exceptions import api_success, require_params
from notifications.views.push_notification import CloudSessionAuthentication, CloudSystemBasicAuthentication, IsAuthenticatedUserOrSystem
from notifications.serializers import SystemEmailSerializer
from util.helpers import get_customization


@api_view(['POST'])
@permission_classes((IsAuthenticatedUserOrSystem,))
@authentication_classes((CloudSystemBasicAuthentication, CloudSessionAuthentication))
def email_notification(request):
    customization = get_customization(request)
    serializer = SystemEmailSerializer(data={**request.data, customization: request.data.get('customization', customization)})

    email_obj = serializer.create(customization=customization)

    access_token = request.session.get('access_token')
    refresh_token = request.session.get('refresh_token')
    username = request.data.get('username', '')
    password = request.data.get('password', '')
    email_obj.send({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'username': username,
        'password': password
    })

    # Including original attachment instead of cache_key in response
    email_obj.attachments = request.data.get('attachments', [])

    return api_success(SystemEmailSerializer(email_obj).data)
