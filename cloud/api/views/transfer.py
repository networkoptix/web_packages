from django.conf import settings
from django.utils.decorators import method_decorator
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from oauth2_provider.contrib.rest_framework import IsAuthenticatedOrTokenHasScope
from rest_framework.views import APIView

from api.models import Account
from api.serializers import CloudResponseSerializer, TransferSystemActionSerializer,\
    TransferSystemOwnerSerializer, TransferSystemSerializer
from cloud.controllers.cloud_api import OwnershipTransfer, System
from cloud.helpers.exceptions import api_success
from notifications import notifications_api


cloud__response = openapi.Response('Cloud response.', CloudResponseSerializer)
ownership_transfer__response = openapi.Response('Ownership transfer info.', TransferSystemSerializer)


def send_ownership_transfer_email(request, system_id, new_owner_email):
    user_full_name = ""
    new_owner_account = Account.objects.filter(email=new_owner_email).first()
    if new_owner_account:
        user_full_name = new_owner_account.get_full_name()

    system_info = System.get(request, system_id).get('systems', [])[0]
    message = {
        "current_owner_full_name": request.user.get_full_name(),
        "current_owner_email": request.user.email,
        "system_id": system_id,
        "system_name": system_info.get('name'),
        "user_full_name": user_full_name
    }

    notifications_api.send(
        new_owner_email,
        'ownership_transfer_invite',
        message,
        settings.CUSTOMIZATION
    )


def send_ownership_transfer_response_email(request, system_id, status):
    system_info = System.get(request, system_id).get('systems', [])[0]
    message = {
        "status": status,
        "system_name": system_info.get('name'),
        "user_full_name": request.user.get_full_name(),
        "user_email": request.user.email
    }

    notifications_api.send(
        system_info.get('ownerAccountEmail'),
        'ownership_transfer_response',
        message,
        settings.CUSTOMIZATION
    )


class TransferSystemInfo(APIView):
    permission_classes = [IsAuthenticatedOrTokenHasScope]

    @method_decorator(swagger_auto_schema(
        responses={
            200: ownership_transfer__response
        }
    ))
    def get(self, request):
        res_serializer = TransferSystemSerializer(data=OwnershipTransfer.list(request), many=True)
        res_serializer.is_valid()
        return api_success(res_serializer.data)


class TransferSystemActions(APIView):
    permission_classes = [IsAuthenticatedOrTokenHasScope]

    def get_serializer(self):
        method = self.request.method
        if method == "POST":
            return TransferSystemOwnerSerializer
        elif method == "PUT":
            return TransferSystemActionSerializer
        return super(TransferSystemActions, self).get_serializer()

    @method_decorator(swagger_auto_schema(
        request_body=TransferSystemOwnerSerializer,
        responses={
            200: ownership_transfer__response
        }
    ))
    def post(self, request, system_id):
        serializer = self.get_serializer()(data=request.data)
        serializer.is_valid(raise_exception=True)
        res_serializer = TransferSystemSerializer(
            data=OwnershipTransfer.start(request, system_id, serializer.data["newOwnerEmail"]))
        res_serializer.is_valid()
        send_ownership_transfer_email(request, system_id, serializer.data["newOwnerEmail"])
        return api_success(res_serializer.data)

    @method_decorator(swagger_auto_schema(
        request_body=TransferSystemActionSerializer,
        responses={
            200: cloud__response
        }
    ))
    def put(self, request, system_id):
        serializer = self.get_serializer()(data=request.data)
        serializer.is_valid(raise_exception=True)
        res_serializer = CloudResponseSerializer(
            data=OwnershipTransfer.act_on(request, system_id, offered_status=serializer.data["action"]))
        res_serializer.is_valid()
        send_ownership_transfer_response_email(request, system_id, serializer.data["action"])
        return api_success(res_serializer.data)

    @method_decorator(swagger_auto_schema(
        responses={
            200: cloud__response
        }
    ))
    def delete(self, request, system_id):
        res_serializer = CloudResponseSerializer(data=OwnershipTransfer.cancel(request, system_id))
        res_serializer.is_valid()
        return api_success(res_serializer.data)
