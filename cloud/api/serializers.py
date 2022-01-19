from rest_framework import serializers


class AuthKeySerializer(serializers.Serializer):
    authGet = serializers.CharField()
    authPost = serializers.CharField()
    authPlay = serializers.CharField()


class TwoFaSerializer(serializers.Serializer):
    verification_code = serializers.CharField(
        label='A 2fa code from your 2fa app.')


class CloudResponseSerializer(serializers.Serializer):
    errorClass = serializers.CharField(label='Type of error')
    errorDetail = serializers.CharField(
        label='Details from error such as stack trace')
    errorText = serializers.CharField(label='Description of error from cloud')
    resultCode = serializers.CharField(
        label='Result of request, "ok" if successful or some other code if error')


class CreateBackupCodeSerializer(serializers.Serializer):
    count = serializers.IntegerField(required=False, default=8, min_value=1)


class DeleteBackupCodeSerializer(serializers.Serializer):
    backup_codes = serializers.CharField()

    @staticmethod
    def validate_backup_codes(data):
        if ' ' in data:
            raise serializers.ValidationError(
                "Backup Codes should be comma seperated with no spaces")
        return data


class VerificationSerializer(serializers.Serializer):
    code = serializers.CharField(required=True)
    verification_code = serializers.CharField(required=True)
