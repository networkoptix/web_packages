from django.utils.decorators import method_decorator
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from oauth2_provider.contrib.rest_framework import IsAuthenticatedOrTokenHasScope
from rest_framework import decorators
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

from api.controllers.cloud_api import Auth
from api.helpers.exceptions import APIInternalException, APIRequestException, ErrorCodes, api_success
from api.serializers import CreateBackupCodeSerializer, DeleteBackupCodeSerializer, TwoFaSerializer, CloudResponseSerializer, VerificationSerializer


class TwoFactorPermissionsMixin:
    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return super().get_permissions()

class TwoFactorVerification(TwoFactorPermissionsMixin, APIView):
    permission_classes = [IsAuthenticatedOrTokenHasScope]
    serializer_class = None

    @method_decorator(swagger_auto_schema(query_serializer=VerificationSerializer))
    def get(self, request, *args, **kwargs):
        """
        Verifies an access code using a 2fa code.
        """
        verificationSerializer = VerificationSerializer(
            data=request.query_params)
        verificationSerializer.is_valid(raise_exception=True)
        data = verificationSerializer.validated_data
        res = Auth.verify_2fa_code(data["verification_code"], data["code"])

        if request.user and request.user.is_authenticated:
            Auth.verify_2fa_code(data["verification_code"], request.session.get("access_token"))
            request.session["has2fa"] = True
        return api_success(res)

    def post(self, request, *args, **kwargs):
        """
        Generates and save a new key for the user.
        """
        return api_success(Auth.generate_2fa_key(request))


class BackupCode(TwoFactorPermissionsMixin, APIView):
    permission_classes = [IsAuthenticatedOrTokenHasScope]
    serializer_class = None

    @method_decorator(swagger_auto_schema(query_serializer=VerificationSerializer))
    def get(self, request, *args, **kwargs):
        """
        Verifies an access code using a backup code.
        """
        verificationSerializer = VerificationSerializer(
            data=request.query_params)
        verificationSerializer.is_valid(raise_exception=True)
        data = verificationSerializer.validated_data
        res = Auth.verify_backup_code(data["verification_code"], data["code"])

        if request.user and request.user.is_authenticated:
            Auth.verify_backup_code(data["verification_code"], request.session.get("access_token"))
            request.session["has2fa"] = True

        return api_success(res)

    @method_decorator(swagger_auto_schema(
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
    def post(self, request, *args, **kwargs):
        """
        Generates and save a new backup code for the user.
        """
        count = CreateBackupCodeSerializer(request.data).data.get("count")
        old_codes = ",".join(
            map(lambda x: x["backup_code"], Auth.get_active_backup_codes(request)))
        Auth.delete_backup_codes(request, codes=old_codes)

        return api_success(Auth.generate_backup_code(request, count))

    @method_decorator(swagger_auto_schema(request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            "backup_codes": openapi.Schema(type=openapi.TYPE_STRING)
        },
        required=["backup_codes"]
    )))
    def delete(self, request, *args, **kwargs):
        """
        Codes should be separated by “,“. If no codes specified, all codes will be deleted for the user.
        """
        backupCodeSerializer = DeleteBackupCodeSerializer(data=request.data)
        backupCodeSerializer.is_valid()
        data = backupCodeSerializer.validated_data
        return api_success(Auth.delete_backup_codes(request, data["backup_codes"]))


@decorators.api_view(["GET"])
@decorators.permission_classes((IsAuthenticatedOrTokenHasScope,))
def get_active_backup_codes(request):
    """
    Returns a list of all of the users backup codes.
    """
    return api_success(Auth.get_active_backup_codes(request))


@swagger_auto_schema(method="POST",
                     operation_description="Verifies the current user's access_token using a 2fa code.",
                     request_body=TwoFaSerializer,
                     responses={'200': openapi.Response('Two Factor Auth', CloudResponseSerializer)})
@decorators.api_view(["POST"])
@decorators.permission_classes((IsAuthenticatedOrTokenHasScope,))
def add_2fa_to_session(request):
    """
    Verifies the current user's access_token using a 2fa code.
    """
    serializer = TwoFaSerializer(data=request.data)
    serializer.is_valid()
    verification_code = serializer.data.get("verification_code")
    res = Auth.verify_2fa_code(
        verification_code, request.session.get("access_token"))

    if request.user and request.user.is_authenticated:
        request.session["has2fa"] = True

    return api_success(res)
