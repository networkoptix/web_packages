from django.utils.decorators import method_decorator
from drf_yasg.utils import swagger_auto_schema
from oauth2_provider.contrib.rest_framework import IsAuthenticatedOrTokenHasScope
from rest_framework import decorators, serializers
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

from api.controllers.cloud_api import Auth
from api.helpers.exceptions import api_success


class TwoFactorPermissionsMixin(APIView):
    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return super().get_permissions()


class BackupCodeSerializer(serializers.Serializer):
    backup_codes = serializers.CharField()

    @staticmethod
    def validate_backup_codes(data):
        if ' ' in data:
            raise serializers.ValidationError("Backup Codes should be comma seperated with no spaces")
        return data


class VerificationSerializer(serializers.Serializer):
    access_code = serializers.CharField(required=True)
    verification_code = serializers.CharField(required=True)


class TwoFactorVerification(TwoFactorPermissionsMixin):
    permission_classes = [IsAuthenticatedOrTokenHasScope]
    serializer_class = None

    @method_decorator(swagger_auto_schema(query_serializer=VerificationSerializer))
    def get(self, request, *args, **kwargs):
        """
        Verifies an access code using a 2fa code.
        """
        verificationSerializer = VerificationSerializer(data=request.query_params)
        verificationSerializer.is_valid(raise_exception=True)
        data = verificationSerializer.validated_data
        return api_success(Auth.verify_2fa_code(data["verification_code"], data["access_code"]))

    def post(self, request, *args, **kwargs):
        """
        Generates and save a new key for the user.
        """
        return api_success(Auth.generate_2fa_key(request))


class BackupCode(TwoFactorPermissionsMixin):
    permission_classes = [IsAuthenticatedOrTokenHasScope]
    serializer_class = None

    @method_decorator(swagger_auto_schema(query_serializer=VerificationSerializer))
    def get(self, request, *args, **kwargs):
        """
        Verifies an access code using a backup code.
        """
        verificationSerializer = VerificationSerializer(data=request.query_params)
        verificationSerializer.is_valid(raise_exception=True)
        data = verificationSerializer.validated_data
        return api_success(Auth.verify_2fa_code(data["verification_code"], data["access_code"]))

    def post(self, request, *args, **kwargs):
        """
        Generates and save a new backup code for the user.
        """
        return api_success(Auth.generate_backup_code(request))

    @method_decorator(swagger_auto_schema(request_body=BackupCodeSerializer))
    def delete(self, request, *args, **kwargs):
        """
        Codes should be separated by “,“. If no codes specified, all codes will be deleted for the user.
        """
        backupCodeSerializer = BackupCodeSerializer(data=request.data)
        data = backupCodeSerializer.validated_data
        return api_success(Auth.delete_backup_codes(request, data["backup_codes"]))


@decorators.api_view(["GET"])
@decorators.permission_classes((IsAuthenticatedOrTokenHasScope,))
def get_active_backup_codes(request):
    """
    Returns a list of all of the users backup codes.
    """
    return api_success(Auth.get_active_backup_codes(request))
