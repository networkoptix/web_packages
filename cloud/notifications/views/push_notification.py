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
@permission_classes((IsAuthenticated, ))
@handle_exceptions
def push_notification(request):
    # TODO: serialize for easier and better validation
    validation_error = False
    error_data = {}

    if 'systemId' not in request.data or not request.data['systemId']:
        validation_error = True
        error_data['systemId'] = ['This field is required']

    if 'targets' not in request.data or not request.data['targets']:
        validation_error = True
        error_data['targets'] = ['This field is required']

    if 'notification' not in request.data or not request.data['notification']:
        validation_error = True
        error_data['notification'] = ['This field is required']
    elif 'title' not in request.data['notification'] or 'body' not in request.data['notification']:
        validation_error = True
        error_data['notification'] = ['Title and body are required']

    if validation_error:
        raise APIRequestException('Invalid parameters', ErrorCodes.wrong_parameters,
                                  error_data=error_data)

    payload = request.data['notification']['payload'] if 'payload' in request.data['notification'] else dict()
    payload_str = ''
    if payload:
        payload_str = json.dumps(payload)

    notification_object = PushNotification.objects.create(
        title=request.data['notification']['title'], body=request.data['notification']['body'],
        payload=payload_str, raw_targets=json.dumps(request.data['targets']), raw_system_id=request.data['systemId']
    )

    send_push_notification.apply_async(args=[notification_object.id])

    return api_success({'notification_id': notification_object.id})
