from rest_framework import exceptions
from rest_framework.authentication import BasicAuthentication
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from api.controllers.cloud_api import Account as Clouddb_Account
from api.helpers.exceptions import handle_exceptions, APIRequestException, APIServiceException,\
    api_success, get_client_ip, APINotAuthorisedException
from api.models import Account
from notifications.tasks import send_push_notification
from notifications.models import PushNotification
from notifications.serializers import NotificationSerializer

import json


class CloudBasicAuthentication(BasicAuthentication):
    def authenticate_credentials(self, user, password, request=None):
        try:
            ip = get_client_ip(request)
            clouddb_account = Clouddb_Account.get(user, password, ip)
        except APINotAuthorisedException:
            raise exceptions.AuthenticationFailed('Invalid email/password.')

        if 'email' in clouddb_account:
            account = Account.objects.filter(email=clouddb_account['email']).first()

        request.data['clouddb_account'] = clouddb_account
        request.data['username'] = user
        request.data['password'] = password

        return (account, None)


@api_view(['POST'])
@permission_classes((AllowAny,))
@authentication_classes((CloudBasicAuthentication,))
@handle_exceptions
def push_notification(request):
    serializer = NotificationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    payload = data['notification']['payload'] if 'payload' in data['notification'] else dict()
    payload_str = ''
    if payload:
        payload_str = json.dumps(payload)

    notification_object = PushNotification.objects.create(
        title=data['notification']['title'], body=data['notification']['body'],
        payload=payload_str, raw_targets=json.dumps(data['targets']), raw_system_id=data['systemId']
    )

    # send_push_notification(notification_object.id, request_data=request.data)

    send_push_notification.apply_async(
        args=[notification_object.id], kwargs={'request_data': request.data}
    )

    return api_success({'notificationId': notification_object.id})
