from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.authentication import BasicAuthentication, SessionAuthentication
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.generics import GenericAPIView, ListAPIView
from rest_framework.mixins import CreateModelMixin, RetrieveModelMixin, UpdateModelMixin
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from api.controllers.cloud_api import Account as Clouddb_Account
from api.helpers.exceptions import handle_exceptions, APIRequestException, APIServiceException,\
    api_success, get_client_ip, APINotAuthorisedException, ErrorCodes
from api.models import Account
from notifications.tasks import send_push_notification
from notifications.models import PushNotification, PushDevice, PushSubscription
from notifications.serializers import NotificationSerializer, RegisterDeviceSerializer, SubscriptionSerializer, \
    DeviceSubscriptionsSerializer

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
@authentication_classes((CloudBasicAuthentication, CloudSessionAuthentication))
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
        raw_system_id=data['systemId']
    )

    send_push_notification.apply_async(
        args=[notification_object.id], kwargs={'request_data': request.data}
    )

    return api_success({'notificationId': notification_object.id})


@api_view(['GET', 'POST'])
@permission_classes((IsAuthenticated,))
@authentication_classes((CloudBasicAuthentication, CloudSessionAuthentication))
def register_device(request):
    if request.method == 'GET':
        serializer = RegisterDeviceSerializer(data=request.GET)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        registered = PushDevice.objects.filter(registration_id=data['deviceToken']).exists()
        return api_success({'registered': registered})

    elif request.method == 'POST':
        serializer = RegisterDeviceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        error_data = dict()

        if not PushDevice.objects.filter(registration_id=data['deviceToken']).exists():
            device = PushDevice(
                registration_id=data['deviceToken'], model=data['model'], name=data['name'], cloud_message_type='FCM',
                user=request.user
            )
            response = device.send_message(message='', dry_run=True)
            if response['success'] == 1:
                device.save()
            else:
                error_data['deviceToken'] = "Token could not be validated"
        else:
            error_data['deviceToken'] = "Device with this deviceToken already exists"

        if error_data:
            raise ValidationError(error_data)

        return api_success()


class DeviceSubscriptionListView(ListAPIView):
    serializer_class = DeviceSubscriptionsSerializer
    authentication_classes = (CloudBasicAuthentication, CloudSessionAuthentication)
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        queryset = PushDevice.objects.filter(user=self.request.user)
        device_token = self.request.query_params.get('deviceToken', None)
        if device_token is not None:
            queryset = queryset.filter(registration_id=device_token)
        return queryset


class Subscribe(UpdateModelMixin, CreateModelMixin, RetrieveModelMixin, GenericAPIView):
    authentication_classes = (CloudBasicAuthentication, CloudSessionAuthentication)
    permission_classes = (IsAuthenticated, )
    serializer_class = SubscriptionSerializer
    lookup_fields = ('deviceToken', 'systemId')

    def get_queryset(self):
        return PushSubscription.objects.filter(account=self.request.user)

    def get_object(self):
        if self.request.method == 'GET':
            for field in self.lookup_fields:
                if field in self.request.GET:
                    self.request.data[field] = self.request.GET[field]

        serializer = self.get_serializer(data=self.request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if data['deviceToken']:
            return self.get_queryset().filter(
                system_id=data['systemId'], device__registration_id=data['deviceToken']
            ).first()

        return None

    def get_serializer(self, *args, **kwargs):
        if 'data' not in kwargs or not kwargs['data'] and kwargs['instance']:
            instance = kwargs['instance']
            kwargs['data'] = {
                'deviceToken': instance.device.registration_id,
                'systemId': instance.system_id,
                'isActive': instance.active
            }
        return super().get_serializer(*args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if not instance:
            raise Http404
        data = {
            'systemId': instance.system_id,
            'deviceToken': instance.device.registration_id,
            'isActive': instance.active
        }
        return Response(data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, authenticated=True)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response({'message': 'created'}, status=status.HTTP_201_CREATED,)

    def update(self, request, *args, **kwargs):
        instance = kwargs.pop('object')
        serializer = self.get_serializer(instance, data=request.data, authenticated=True)
        serializer.is_valid(raise_exception=True)
        serializer.update(instance, request.data)

        return Response({'message': 'ok'})

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        sub = self.get_object()

        if sub or 'deviceToken' not in request.data or not request.data['deviceToken']:
            kwargs['object'] = sub
            return self.update(request, *args, **kwargs)
        else:
            return self.create(request, *args, **kwargs)



