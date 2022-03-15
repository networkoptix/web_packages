from django.utils.decorators import method_decorator
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from oauth2_provider.contrib.rest_framework import IsAuthenticatedOrTokenHasScope
from rest_framework.views import APIView

from api.serializers import CloudResponseSerializer, TransferSystemActionSerializer,\
    TransferSystemOwnerSerializer, TransferSystemSerializer
from cloud.controllers.cloud_api import OwnershipTransfer
from cloud.helpers.exceptions import api_success


cloud__response = openapi.Response('Cloud response.', CloudResponseSerializer)
ownership_transfer__response = openapi.Response('Ownership transfer info.', TransferSystemSerializer)


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
