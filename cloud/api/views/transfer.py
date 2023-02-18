import asyncio

from django.conf import settings
from django.utils.decorators import method_decorator
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from oauth2_provider.contrib.rest_framework import IsAuthenticatedOrTokenHasScope
from rest_framework.views import APIView
from asgiref.sync import sync_to_async
from api.models import Account
from api.serializers import CloudResponseSerializer, TransferSystemActionSerializer,\
    TransferSystemOwnerSerializer, TransferSystemSerializer
from cloud.controllers.cloud_api import OwnershipTransfer, System
from cloud.drf_async import AsyncAPIView
from cloud.helpers.exceptions import api_success
from cloud.utils import method_decorator_async
from notifications import notifications_api
from util.helpers import get_customization


cloud__response = openapi.Response('Cloud response.', CloudResponseSerializer)
ownership_transfer__response = openapi.Response('Ownership transfer info.', TransferSystemSerializer)


async def send_ownership_transfer_email(request, system_id, new_owner_email):
    user_full_name = ""
    new_owner_account = await Account.objects.filter(email=new_owner_email).afirst()
    if new_owner_account:
        user_full_name = new_owner_account.get_full_name()

    system_info = (await sync_to_async(System.get, thread_sensitive=False)(request, system_id)).get('systems', [])[0]
    message = {
        "current_owner_full_name": request.user.get_full_name(),
        "current_owner_email": request.user.email,
        "system_id": system_id,
        "system_name": system_info.get('name'),
        "user_full_name": user_full_name
    }

    await sync_to_async(notifications_api.send, thread_sensitive=False)(
        new_owner_email,
        'ownership_transfer_invite',
        message,
        customization=get_customization(request)
    )


async def send_ownership_transfer_response_email(request, system_info, status):
    message = {
        "status": status,
        "system_name": system_info.get('name'),
        "user_full_name": request.user.get_full_name(),
        "user_email": request.user.email
    }

    await sync_to_async(notifications_api.send, thread_sensitive=False)(
        system_info.get('ownerAccountEmail'),
        'ownership_transfer_response',
        message,
        customization=get_customization(request)
    )


class TransferSystemInfo(AsyncAPIView):
    permission_classes = [IsAuthenticatedOrTokenHasScope]

    @method_decorator_async(swagger_auto_schema(
        responses={
            200: ownership_transfer__response
        }
    ))
    async def get(self, request):
        data = await OwnershipTransfer.list(request)
        res_serializer = TransferSystemSerializer(data=data, many=True)
        res_serializer.is_valid()
        return api_success(res_serializer.data)


class TransferSystemActions(AsyncAPIView):
    permission_classes = [IsAuthenticatedOrTokenHasScope]

    def get_serializer(self):
        method = self.request.method
        if method == "POST":
            return TransferSystemOwnerSerializer
        elif method == "PUT":
            return TransferSystemActionSerializer
        return super(TransferSystemActions, self).get_serializer()

    @method_decorator_async(swagger_auto_schema(
        request_body=TransferSystemOwnerSerializer,
        responses={
            200: ownership_transfer__response
        }
    ))
    async def post(self, request, system_id):
        serializer = self.get_serializer()(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = await OwnershipTransfer.start(
            request, system_id, serializer.data["newOwnerEmail"]
        )
        res_serializer = TransferSystemSerializer(data=data)
        res_serializer.is_valid()
        await send_ownership_transfer_email(request, system_id, serializer.data["newOwnerEmail"])
        return api_success(res_serializer.data)

    @method_decorator_async(swagger_auto_schema(
        request_body=TransferSystemActionSerializer,
        responses={
            200: cloud__response
        }
    ))
    async def put(self, request, system_id):
        serializer = self.get_serializer()(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Get the info so that we can email the previous owner after the transfer.
        system_info_coro = sync_to_async(System.get, thread_sensitive=False)(request, system_id)
        data_coro = OwnershipTransfer.act_on(
            request, system_id, offered_status=serializer.data["action"]
        )
        system_info, data = await asyncio.gather(system_info_coro, data_coro)
        system_info = system_info.get('systems', [])[0]
        res_serializer = CloudResponseSerializer(data=data)
        res_serializer.is_valid()
        await send_ownership_transfer_response_email(request, system_info, serializer.data["action"])
        return api_success(res_serializer.data)

    @method_decorator_async(swagger_auto_schema(
        responses={
            200: cloud__response
        }
    ))
    async def delete(self, request, system_id):
        data = await OwnershipTransfer.cancel(request, system_id)
        res_serializer = CloudResponseSerializer(data=data)
        res_serializer.is_valid()
        return api_success(res_serializer.data)
