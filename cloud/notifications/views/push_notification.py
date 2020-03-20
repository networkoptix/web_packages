from django.core.cache import caches
from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.authentication import BasicAuthentication, SessionAuthentication
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.generics import GenericAPIView, RetrieveAPIView
from rest_framework.mixins import CreateModelMixin, RetrieveModelMixin, UpdateModelMixin
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from api.controllers.cloud_api import Account as Clouddb_Account, System as Clouddb_System
from api.helpers.exceptions import handle_exceptions, APIRequestException, APIServiceException,\
    api_success, get_client_ip, APINotAuthorisedException, ErrorCodes, APILogicException
from api.models import Account
from cms.models import Asset, AssetType, Customization
from notifications.tasks import send_push_notification
from notifications.models import PushNotification, PushDevice
from notifications.serializers import NotificationSerializer, SubscriptionSerializer, \
    DeviceSubscriptionsSerializer, UnregisterDeviceSerializer

import json
from django.conf import settings


def get_mobile_compatible_customization():
    mobile_customizations = caches['push_config'].get('mobile_customizations', {})
    current_customization = settings.CUSTOMIZATION
    if current_customization not in mobile_customizations:
        current_portal = Asset.objects.get(
            asset_type__type=AssetType.ASSET_TYPES.cloud_portal, customizations__name=current_customization
        )
        mobile_customizations[current_customization] = current_portal.read_global_value(
            '%PUSH_CUSTOMIZATION%') or current_customization
        caches['push_config'].set('mobile_customizations', mobile_customizations)
    return Customization.objects.get(name=mobile_customizations[current_customization])


class CloudSystemBasicAuthentication(BasicAuthentication):
    def authenticate_credentials(self, user, password, request=None):
        try:
            ip = get_client_ip(request)
            # System credentials should fail account.get and raise an exception
            Clouddb_Account.get(user, password, ip)
            raise exceptions.AuthenticationFailed('Must use system credentials, not account credentials')
        except (APINotAuthorisedException, APILogicException):
            try:
                system_response = Clouddb_System.get(user, password, user)
                if 'systems' in system_response and system_response['systems'][0]:
                    request.data['system'] = system_response['systems'][0]
                else:
                    raise exceptions.AuthenticationFailed('Invalid system credentials')
            except APINotAuthorisedException:
                raise exceptions.AuthenticationFailed('Invalid system credentials')

        request.data['username'] = user
        request.data['password'] = password
        request.data['systemId'] = request.data.get('systemId', user)

        return None, None


class CloudAccountBasicAuthentication(BasicAuthentication):
    def authenticate_credentials(self, user, password, request=None):
        try:
            ip = get_client_ip(request)
            clouddb_account = Clouddb_Account.get(user, password, ip)
        except (APINotAuthorisedException, APILogicException):
            raise exceptions.AuthenticationFailed('Invalid email/password')

        account = Account.objects.filter(email=clouddb_account['email']).first()

        request.data['username'] = user
        request.data['password'] = password

        return account, None


class CloudSessionAuthentication(SessionAuthentication):
    def authenticate(self, request=None):
        try:
            ip = get_client_ip(request)
            account = getattr(request._request, 'user', None)
            clouddb_account = Clouddb_Account.get(request.session['login'], request.session['password'], ip)
        except APINotAuthorisedException:
            raise exceptions.AuthenticationFailed('Invalid email/password for cloud_db.')

        if not account.email.endswith('@networkoptix.com'):
            raise exceptions.AuthenticationFailed('Must authenticate with an @networkoptix.com account')

        request.data['clouddb_account'] = clouddb_account
        request.data['username'] = request.session['login']
        request.data['password'] = request.session['password']

        return (account, None)


@api_view(['POST'])
@permission_classes((AllowAny,))
# @authentication_classes((CloudSystemBasicAuthentication, CloudSessionAuthentication))
def push_notification(request):
    serializer = NotificationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    payload = data['notification'].get('payload', None)
    payload_str = json.dumps(payload) if payload else ''
    options = data['notification'].get('options', None)
    options_str = json.dumps(options) if options else ''

    notification_object = PushNotification.objects.create(
        title=data['notification']['title'], body=data['notification']['body'],
        payload=payload_str, options=options_str, raw_targets=json.dumps(data['targets']),
        raw_system_id=data['systemId'], customization=get_mobile_compatible_customization()
    )

    send_push_notification.apply_async(
        args=[notification_object.id], kwargs={'request_data': request.data},
        queue=settings.NOTIFICATIONS_CONFIG['push_notification']['queue']
    )

    return api_success({'notificationId': notification_object.id})


# @api_view(['GET', 'POST'])
# @permission_classes((IsAuthenticated,))
# @authentication_classes((CloudAccountBasicAuthentication, CloudSessionAuthentication))
# def register_device(request):
#     if request.method == 'GET':
#         serializer = RegisterDeviceSerializer(data=request.GET)
#         serializer.is_valid(raise_exception=True)
#         data = serializer.validated_data
#
#         registered = PushDevice.objects.filter(registration_id=data['deviceToken']).exists()
#         return api_success({'registered': registered})
#
#     elif request.method == 'POST':
#         serializer = RegisterDeviceSerializer(data=request.data)
#         serializer.is_valid(raise_exception=True)
#         data = serializer.validated_data
#
#         error_data = dict()
#         device = PushDevice.objects.filter(registration_id=data['deviceToken']).first()
#
#         if not device:
#             device = PushDevice(
#                 registration_id=data['deviceToken'], model=data['model'], name=data['name'], cloud_message_type='FCM',
#                 user=request.user
#             )
#             response = device.send_message(message='', dry_run=True)
#             if response['success'] == 1:
#                 device.save()
#             else:
#                 error_data['deviceToken'] = "Token could not be validated"
#         else:
#             device.model = data['model']
#             device.name = data['name']
#             if device.user != request.user:
#                 device.subscriptions.all().delete()
#                 device.user = request.user
#             device.save()
#
#         if error_data:
#             raise ValidationError(error_data)
#
#         return api_success()


class DeviceSubscriptionListView(RetrieveAPIView):
    serializer_class = DeviceSubscriptionsSerializer
    authentication_classes = (CloudAccountBasicAuthentication, CloudSessionAuthentication)
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return PushDevice.objects.filter(user=self.request.user)

    def get(self, request, *args, **kwargs):
        devices = {}
        for device in self.get_queryset():
            serializer = self.get_serializer(device)
            devices[device.registration_id] = serializer.data
        return Response(devices)


class Subscriptions(UpdateModelMixin, CreateModelMixin, RetrieveModelMixin, GenericAPIView):
    authentication_classes = (CloudAccountBasicAuthentication, CloudSessionAuthentication)
    permission_classes = (IsAuthenticated, )
    serializer_class = SubscriptionSerializer

    def get_queryset(self):
        return PushDevice.objects.filter(user=self.request.user)

    def get_object(self):
        device = None

        if 'deviceToken' in self.kwargs:
            self.request.data['deviceToken'] = self.kwargs['deviceToken']
            device = self.get_queryset().filter(registration_id=self.request.data['deviceToken']).first()

        return device

    def format_response(self, instance):
        return {
            'type': PushDevice.TYPES[instance.type],
            'systems': [sub.system_id for sub in instance.subscriptions.all()],
            'deviceInfo': {'name': instance.name, 'model': instance.model, 'os': PushDevice.OS[instance.os]},
            'isEnabled': instance.active
        }

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if not instance:
            raise Http404
        return Response(DeviceSubscriptionsSerializer(instance).data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(
            {'status': 'created', **DeviceSubscriptionsSerializer(instance).data},
            status=status.HTTP_201_CREATED,)

    def update(self, request, *args, **kwargs):
        instance = kwargs.pop('object')
        serializer = self.get_serializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()

        return Response({'status': 'updated', **DeviceSubscriptionsSerializer(instance).data})

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def put(self, request, *args, **kwargs):
        device = self.get_object()

        if device:
            kwargs['object'] = device
            return self.update(request, *args, **kwargs)
        else:
            return self.create(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        device = self.get_object()
        if device:
            device.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        else:
            raise Http404




