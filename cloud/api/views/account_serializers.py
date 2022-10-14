import django
from django.conf import settings
from rest_framework import serializers

from api.models import Account
from cloud.controllers.cloud_api import Account as Cdb_Account
from cms.models import UserGroupsToAssetPermissions, AssetType, UserGroupsToAssetType


class CreateAccountSerializer(serializers.Serializer):  # ModelSerializer
    password = serializers.CharField(required=True, allow_blank=False, max_length=255,
                                     min_length=settings.PASSWORD_REQUIREMENTS['minLength'])
    email = serializers.CharField(required=True, allow_blank=False, max_length=255)
    language = serializers.CharField(required=True, allow_blank=False, max_length=7)
    first_name = serializers.CharField(required=True, allow_blank=False, max_length=255)
    last_name = serializers.CharField(required=True, allow_blank=False, max_length=255)

    code = serializers.CharField(required=False, max_length=255)

    @staticmethod
    def validate_password(value):

        if len(value) < settings.PASSWORD_REQUIREMENTS['minLength']:
            raise serializers.ValidationError("Too short password")

        if len(value) > 255:
            raise serializers.ValidationError("Too long password")

        # Correct characters
        pattern = settings.PASSWORD_REQUIREMENTS['requiredRegex']
        if not pattern.match(value):
            raise serializers.ValidationError("Incorrect password")

        # popular passwords list
        if value in settings.PASSWORD_REQUIREMENTS['common_passwords'] or \
                (value.upper() == value and value.lower() in settings.PASSWORD_REQUIREMENTS['common_passwords']):
            raise serializers.ValidationError("Too common password")

        return value

    @staticmethod
    def validate_email(value):
        django.core.validators.validate_email(value)
        return value

    @staticmethod
    def create(validated_data):
        return Account.objects.create_user(**validated_data)

class CdbAccountMixin(serializers.Serializer):
    account2faEnabled = serializers.BooleanField(required=False)
    totpExistsForAccount = serializers.BooleanField(required=False)
    sessionVerified = serializers.BooleanField(required=False)
    accessToken = serializers.CharField(required=False)
    sessionExpires = serializers.FloatField(required=False)

    class Meta:
        fields = ('account2faEnabled', 'totpExistsForAccount', 'sessionVerified', 'accessToken', 'sessionExpires')

    def get_cdb_fields(self, request):
        cdb_account = {}
        cdb_account_security = {}
        if request.user.is_authenticated:
            cdb_account = Cdb_Account.get(request)
            cdb_account_security = Cdb_Account.get_2fa_settings(request)
            request.session["has2fa"] = cdb_account.get("account2faEnabled", False)
        self.instance.account2faEnabled = cdb_account.get("account2faEnabled", False)
        self.instance.totpExistsForAccount = cdb_account_security.get("totpExistsForAccount", False)

        self.instance.sessionVerified = request.session.get("has2fa", False)
        self.instance.accessToken = request.session.get("access_token", '')
        self.instance.sessionExpires = request.session.get_expiry_date().timestamp()

class BaseAccountModelSerializer(CdbAccountMixin, serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = CdbAccountMixin.Meta.fields + ('first_name', 'last_name', 'language', 'account2faEnabled')

    def __init__(self, request, *args, **kwargs):
        kwargs['context'] = {'request': request}
        super().__init__(request.user, *args, **kwargs)
        super().get_cdb_fields(request)

    def save(self, *args, **kwargs):
        validated_data = { key: val for key, val in self.validated_data.items() if key not in CdbAccountMixin.Meta.fields }
        self.update(self.instance, validated_data)

class AccountSerializer(BaseAccountModelSerializer):
    can_publish_integration = serializers.SerializerMethodField()

    class Meta:
        model = Account
        fields = BaseAccountModelSerializer.Meta.fields + ('is_staff', 'is_superuser', 'cookie_reviewed', 'permissions', 'can_publish_integration', 'is_authenticated', 'email')

    def get_can_publish_integration(self, obj):
        return UserGroupsToAssetPermissions.check_customization_publish(obj, request=self.context['request']) and \
               UserGroupsToAssetType.check_asset_type(obj, AssetType.ASSET_TYPES.integration, 'cms.publish_version'
    )


class AccountSecuritySerializer(serializers.Serializer):
    action = serializers.CharField(required=True)
    mfaCode = serializers.CharField(required=True)


class AccountUpdateSerializer(BaseAccountModelSerializer):
    pass
