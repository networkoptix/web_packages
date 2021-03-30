from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from django.core.cache import caches
from django.db import transaction
from django.core.exceptions import PermissionDenied
from django.http import Http404
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import exceptions, status
from rest_framework.authentication import BasicAuthentication, SessionAuthentication
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.generics import GenericAPIView, RetrieveAPIView
from rest_framework.mixins import CreateModelMixin, RetrieveModelMixin, UpdateModelMixin
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from api.controllers.cloud_api import Account as Clouddb_Account, System as Clouddb_System
from api.helpers.exceptions import handle_exceptions, APIRequestException, APIServiceException,\
    api_success, get_client_ip, APINotAuthorisedException, ErrorCodes, APILogicException, clean_passwords
from api.models import Account
from cms.models import Asset, AssetType, Customization
from notifications.tasks import send_push_notification
from notifications.models import PushNotification, PushDevice
from notifications.serializers import NotificationSerializer, SubscriptionSerializer, \
    DeviceSubscriptionsSerializer, UnregisterDeviceSerializer

import json
import logging
import traceback

logger = logging.getLogger(__name__)


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


class IsAuthenticatedUserOrSystem(BasePermission):
    def has_permission(self, request, view):
        return getattr(request.user, 'is_system', False) or request.user.is_authenticated


class CloudSystemBasicAuthentication(BasicAuthentication):
    def authenticate_credentials(self, user, password, request=None):
        request.data['username'] = user
        request.data['password'] = password
        request.data['systemId'] = request.data.get('systemId', user)
        authentication_cache = caches['push_authentication']
        system = authentication_cache.get(f'{user}:{password}')
        if system:
            request.data['system'] = system
        else:
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
                        authentication_cache.set(f'{user}:{password}', request.data['system'])
                    else:
                        raise exceptions.AuthenticationFailed('Invalid system credentials')
                except APINotAuthorisedException:
                    raise exceptions.AuthenticationFailed('Invalid system credentials')

        system_account = AnonymousUser()
        system_account.is_system = True
        return system_account, None


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
            if request.session and 'login' in request.session and 'password' in request.session:
                clouddb_account = Clouddb_Account.get(request.session['login'], request.session['password'], ip)
            else:
                return None
        except APINotAuthorisedException:
            raise exceptions.AuthenticationFailed('Invalid email/password for cloud_db.')

        if not account.email.endswith('@networkoptix.com'):
            raise exceptions.AuthenticationFailed('Must authenticate with an @networkoptix.com account')

        request.data['clouddb_account'] = clouddb_account
        request.data['username'] = request.session['login']
        request.data['password'] = request.session['password']

        return account, None


@swagger_auto_schema(method='POST', operation_description='Send a push notification',
                     request_body=NotificationSerializer,
                     responses={
                         '200': openapi.Schema(type=openapi.TYPE_OBJECT, properties={'notificationId': openapi.Schema(type=openapi.TYPE_INTEGER)})
                     })
@api_view(['POST'])
@permission_classes((IsAuthenticatedUserOrSystem,))
@authentication_classes((CloudSystemBasicAuthentication, CloudSessionAuthentication))
def push_notification(request):
    # Try/except is a temporary solution for logging DRF handled exceptions
    # TODO: CLOUD-5625: Subclass DRF exception handler and combine it with handle_exceptions decorator
    try:
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

        transaction.on_commit(lambda: send_push_notification.apply_async(
            args=[notification_object.id], kwargs={'request_data': request.data},
            queue=settings.NOTIFICATIONS_CONFIG['push_notification']['queue']
        ))

        return api_success({'notificationId': notification_object.id})
    except (exceptions.APIException, Http404, PermissionDenied) as e:
        request_data = request.data.copy()
        clean_passwords(request_data)
        logger.warning(f'Request data: {request_data}')
        logger.warning(f'\nCall Stack: {traceback.format_exc().replace("Traceback", "")}')
        raise e


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




