import re
from hashlib import sha256

from asgiref.sync import async_to_sync
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from django.core.cache import caches
from django.db import transaction
from django.utils.translation import gettext_lazy as _
from django.http import Http404
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import exceptions, status
from rest_framework.authentication import BasicAuthentication, SessionAuthentication, TokenAuthentication, get_authorization_header
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.generics import GenericAPIView, RetrieveAPIView
from rest_framework.mixins import CreateModelMixin, RetrieveModelMixin, UpdateModelMixin
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from cloud.controllers.cloud_api import Account as Clouddb_Account, System as Clouddb_System, Auth as Clouddb_Auth, CloudDbConfig
from cloud.customization_context import customization_ctx
from cloud.helpers.exceptions import (
    api_success, APINotAuthorisedException, APILogicException,
)
from api.models import Account
from api.views.account import create_user
from cms.models import Customization, get_cloud_portal_asset
from notifications.tasks import send_push_notification
from notifications.models import PushNotification, PushDevice
from notifications.serializers import NotificationSerializer, SubscriptionSerializer, \
    DeviceSubscriptionsSerializer, PROVIDERS_REVERSE_MAP

import json
import logging




logger = logging.getLogger(__name__)


def get_mobile_compatible_customization(current_customization):
    mobile_customizations = caches['push_config'].get(
        'mobile_customizations', {})
    if current_customization not in mobile_customizations:
        current_portal = get_cloud_portal_asset(customization=current_customization)
        mobile_customizations[current_customization] = current_portal.read_global_value(
            '%PUSH_CUSTOMIZATION%') or current_customization
        caches['push_config'].set(
            'mobile_customizations', mobile_customizations)
    return Customization.objects.get(name=mobile_customizations[current_customization])


class IsAuthenticatedUserOrSystem(BasePermission):
    def has_permission(self, request, view):
        return getattr(request.user, 'is_system', False) or request.user.is_authenticated


class CloudSystemBasicAuthentication(BasicAuthentication):
    def authenticate_credentials(self, user, password: str, request=None):
        if not password:
            raise exceptions.AuthenticationFailed('Invalid system credentials')
        request.data['username'] = user
        request.data['password'] = password
        request.data['systemId'] = request.data.get('systemId', user)
        authentication_cache = caches['push_authentication']
        password_hash = sha256(password.encode()).hexdigest()
        system = authentication_cache.get(f'{user}:{password_hash}')
        if system:
            request.data['system'] = system
        elif re.match(
                r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', user):

            try:
                system_response = Clouddb_System.basic_get(
                    user, password, user)
                if 'systems' in system_response and system_response['systems'][0]:
                    request.data['system'] = system_response['systems'][0]
                    authentication_cache.set(
                        f'{user}:{password_hash}', request.data['system'])
                else:
                    raise exceptions.AuthenticationFailed(
                        'Invalid system credentials')
            except APINotAuthorisedException:
                raise exceptions.AuthenticationFailed(
                    'Invalid system credentials')
        else:
            raise exceptions.AuthenticationFailed(
                'Invalid system credentials')
        system_account = AnonymousUser()
        system_account.is_system = True
        return system_account, None


class CloudAccountBasicAuthentication(BasicAuthentication):
    def authenticate_credentials(self, user, password, request=None):
        try:
            clouddb_account = Clouddb_Account.get(
                request, email=user, password=password)
        except (APINotAuthorisedException, APILogicException):
            raise exceptions.AuthenticationFailed('Invalid email/password')

        account = Account.objects.filter(
            email=clouddb_account['email']).first()

        request.data['username'] = user
        request.data['password'] = password

        return account, None


class CloudSessionAuthentication(SessionAuthentication):
    def authenticate(self, request=None):
        try:
            account = getattr(request._request, 'user', None)
            if request.session and 'access_token' in request.session and 'refresh_token' in request.session:
                clouddb_account = Clouddb_Account.get(request)
                credentials = Clouddb_Account.create_temporary_credentials(
                    request, credential_type='short')
                request.session['login'] = credentials['login']
                request.session['password'] = credentials['password']
            elif request.session and 'login' in request.session and 'password' in request.session:
                clouddb_account = Clouddb_Account.get(
                    request, request.session['login'], request.session['password'])
            else:
                return None
        except APINotAuthorisedException:
            raise exceptions.AuthenticationFailed(
                'Invalid email/password for cloud_db.')

        if not account.email.endswith('@networkoptix.com'):
            raise exceptions.AuthenticationFailed(
                'Must authenticate with an @networkoptix.com account')

        request.data['clouddb_account'] = clouddb_account
        request.data['username'] = request.session['login']
        request.data['password'] = request.session['password']

        return account, None


class CustomizationBearerAuthentication(TokenAuthentication):
    keyword = 'Bearer'
    model = Account

    def authenticate_credentials(self, token, request):
        """
        Authenticate credentials using a Bearer token.

        This method validates the provided token by interacting with the cloud database
        and then retrieves the associated user from the database model.

        Args:
            token (str): The Bearer token extracted from the request header.
            request (Request): The request object that contains the credentials.

        Returns:
            tuple: A tuple of (user, token) if authentication is successful, 
                   or (None, token) if authentication fails.
        """
        model = self.get_model()
        customization = getattr(request, 'CUSTOMIZATION', customization_ctx.get())

        try:
            cloud_db_url = CloudDbConfig.url(customization_name=customization)
            validate_token = Clouddb_Auth.validate_token(token, cloud_db_url=cloud_db_url)
        except APINotAuthorisedException:
            return None

        email = validate_token['username']
        user = None
        try:
            user = model.objects.get(email=email)
        except model.DoesNotExist:
            try: # Create user if it does not exist
                user = async_to_sync(create_user)(email=email, customization=customization, use_customization=False)
            except Exception as e:
                logger.error(f'Error creating user: {e}')
        return user, token

    def authenticate(self, request):
        """
        Authenticate a request using a Bearer token.
    
        This method extracts the token from the authorization header and validates 
        it against the cloud database. If the token is valid and belongs to a user, 
        the user is authenticated.
    
        Args:
            request (Request): The request object containing the authorization header.
    
        Returns:
            tuple: A tuple of (user, token) if authentication is successful, 
                   otherwise None.
        
        Raises:
            AuthenticationFailed: If the token header is invalid, or the token string 
                                  contains invalid characters.
        """
        auth = get_authorization_header(request)
        auth = auth.decode().split()
        if not auth or auth[0].lower() != self.keyword.lower():
            return None

        if len(auth) == 1:
            msg = 'Invalid token header. No credentials provided.'
            raise exceptions.AuthenticationFailed(msg)
        elif len(auth) > 2:
            msg = 'Invalid token header. Token string should not contain spaces.'
            raise exceptions.AuthenticationFailed(msg)

        token = auth[1]
        try:
            token.encode()
        except UnicodeError:
            msg = _('Invalid token header. Token string should not contain invalid characters.')
            raise exceptions.AuthenticationFailed(msg)
        return self.authenticate_credentials(token, request)


@swagger_auto_schema(method='POST', operation_description='Send a push notification',
                     request_body=NotificationSerializer,
                     responses={
                         '200': openapi.Schema(type=openapi.TYPE_OBJECT, properties={'notificationId': openapi.Schema(type=openapi.TYPE_INTEGER)})
                     })
@api_view(['POST'])
@permission_classes((IsAuthenticatedUserOrSystem,))
@authentication_classes((CloudSystemBasicAuthentication, CloudSessionAuthentication))
def push_notification(request):
    customization = request.CUSTOMIZATION
    serializer = NotificationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    payload = data['notification'].get('payload', None)
    payload_str = json.dumps(payload) if payload else ''
    options = data['notification'].get('options', None)
    options_str = json.dumps(options) if options else ''

    notification_object = PushNotification.objects.create(
        title=data['notification']['title'], body=data['notification']['body'],
        payload=payload_str, options=options_str, raw_targets=json.dumps(
            data['targets']),
        raw_system_id=data['systemId'], customization=get_mobile_compatible_customization(customization)
    )

    transaction.on_commit(lambda: send_push_notification.apply_async(
        args=[notification_object.id], kwargs={'request_data': request.data},
        queue=settings.NOTIFICATIONS_CONFIG['push_notification']['queue']
    ))

    return api_success({'notificationId': notification_object.id})


class DeviceSubscriptionListView(RetrieveAPIView):
    serializer_class = DeviceSubscriptionsSerializer
    authentication_classes = (
        CustomizationBearerAuthentication, CloudAccountBasicAuthentication, CloudSessionAuthentication)
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return PushDevice.objects.filter(user=self.request.user)

    def get(self, request, *args, **kwargs):
        return Response({
            device.registration_id: self.get_serializer(device).data
            for device in self.get_queryset()
        })


class Subscriptions(UpdateModelMixin, CreateModelMixin, RetrieveModelMixin, GenericAPIView):
    authentication_classes = (
        CustomizationBearerAuthentication,
        CloudAccountBasicAuthentication,
        CloudSessionAuthentication
    )
    permission_classes = (IsAuthenticated, )
    serializer_class = SubscriptionSerializer

    def get_queryset(self):
        return PushDevice.objects.filter(user=self.request.user)

    def get_object(self):
        device = None

        if 'deviceToken' in self.kwargs:
            self.request.data['deviceToken'] = self.kwargs['deviceToken']
            provider = self.request.query_params.get(
                'provider') or self.request.data.get('provider', 'firebase_legacy')
            provider = getattr(PushDevice.PROVIDERS, provider,
                               PushDevice.PROVIDERS.firebase_legacy)
            device = self.get_queryset().filter(
                registration_id=self.request.data['deviceToken'], provider=provider).first()

        return device

    def format_response(self, instance):
        return {
            'type': PushDevice.TYPES[instance.type],
            'systems': [sub.system_id for sub in instance.subscriptions.all()],
            'deviceInfo': {'name': instance.name, 'model': instance.model, 'os': PushDevice.OS[instance.os]},
            'isEnabled': instance.active,
            'provider': PROVIDERS_REVERSE_MAP[instance.provider]
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
            {'status': 'created', **
                DeviceSubscriptionsSerializer(instance).data},
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
