from django.utils.decorators import method_decorator
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from oauth2_provider.contrib.rest_framework import IsAuthenticatedOrTokenHasScope
from rest_framework import decorators
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from asgiref.sync import sync_to_async
from cloud.controllers.cloud_api import Auth
from cloud.drf_async import async_api_view, AsyncAPIView
from cloud.helpers.exceptions import api_success, APINotAuthorisedException
from api.serializers import CreateBackupCodeSerializer, DeleteBackupCodeSerializer, TwoFaSerializer, CloudResponseSerializer, VerificationSerializer
from cloud.utils import method_decorator_async


class TwoFactorPermissionsMixin:
    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return super().get_permissions()

    async def get_user_from_code(self, code, session_access_token=None):
        try:
            token = await sync_to_async(Auth.validate_token, thread_sensitive=False)(
                code, session_access_token=session_access_token
            )
            return token.get("username", "")
        # If the request fails the worst case is we don't add 2fa to the user's session.
        except APINotAuthorisedException:
            return ""


class TwoFactorVerification(TwoFactorPermissionsMixin, AsyncAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = None

    @method_decorator_async(swagger_auto_schema(query_serializer=VerificationSerializer))
    async def get(self, request, *args, **kwargs):
        """
        Verifies an access code using a 2fa code.
        """
        verificationSerializer = VerificationSerializer(
            data=request.query_params)
        verificationSerializer.is_valid(raise_exception=True)
        data = verificationSerializer.validated_data
        res = await sync_to_async(Auth.verify_2fa_code, thread_sensitive=False)(data["verification_code"], data["code"])
        email = await self.get_user_from_code(
            data["code"],
            session_access_token=request.session.get("access_token")
        )

        if request.user and request.user.is_authenticated and request.user.email == email:
            try:
                await sync_to_async(Auth.verify_2fa_code, thread_sensitive=False)(
                    data["verification_code"],
                    request.session.get("access_token")
                )
                request.session["has2fa"] = True
            # Slight possibility that your session conflicts with the code you are verifying
            except APINotAuthorisedException:
                pass
        return api_success(res)

    async def post(self, request, *args, **kwargs):
        """
        Generates and save a new key for the user.
        """
        resp = await sync_to_async(Auth.generate_2fa_key, thread_sensitive=False)(request)
        return api_success(resp)


class BackupCode(TwoFactorPermissionsMixin, AsyncAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = None

    @method_decorator_async(swagger_auto_schema(query_serializer=VerificationSerializer))
    async def get(self, request, *args, **kwargs):
        """
        Verifies an access code using a backup code.
        """
        verificationSerializer = VerificationSerializer(data=request.query_params)
        verificationSerializer.is_valid(raise_exception=True)
        data = verificationSerializer.validated_data
        res = await sync_to_async(Auth.verify_backup_code, thread_sensitive=False)(
            data["verification_code"], data["code"]
        )
        email = await self.get_user_from_code(data["code"],
                                              session_access_token=request.session.get("access_token"))

        if request.user and request.user.is_authenticated and request.user.email == email:
            await sync_to_async(Auth.verify_backup_code, thread_sensitive=False)(
                data["verification_code"], request.session.get("access_token")
            )
            request.session["has2fa"] = True

        return api_success(res)

    @method_decorator_async(swagger_auto_schema(
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                "count": openapi.Schema(type=openapi.TYPE_INTEGER, default=8)
            }
        ),
        responses={
            200: openapi.Schema(
                type=openapi.TYPE_ARRAY,
                items=openapi.Items(type=openapi.TYPE_OBJECT)
            )
        }
    ))
    async def post(self, request, *args, **kwargs):
        """
        Generates and save a new backup code for the user.
        """
        count = CreateBackupCodeSerializer(request.data).data.get("count")
        await sync_to_async(Auth.delete_backup_codes, thread_sensitive=False)(request)

        return api_success(await sync_to_async(Auth.generate_backup_code, thread_sensitive=False)(request, count))

    @method_decorator_async(swagger_auto_schema(request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT
    )))
    async def delete(self, request, *args, **kwargs):
        return api_success(await sync_to_async(Auth.delete_backup_codes, thread_sensitive=False)(request))


@swagger_auto_schema(method="POST",
                     operation_description="Verifies the current user's access_token using a 2fa code.",
                     request_body=TwoFaSerializer,
                     responses={'200': openapi.Response('Two Factor Auth', CloudResponseSerializer)})
@async_api_view(["POST"])
@decorators.permission_classes((IsAuthenticated,))
async def add_2fa_to_session(request):
    """
    Verifies the current user's access_token using a 2fa code.
    """
    serializer = TwoFaSerializer(data=request.data)
    serializer.is_valid()
    verification_code = serializer.data.get("verification_code")
    res = await sync_to_async(Auth.verify_2fa_code, thread_sensitive=False)(
        verification_code, request.session.get("access_token"))

    if request.user and request.user.is_authenticated:
        request.session["has2fa"] = True

    return api_success(res)
