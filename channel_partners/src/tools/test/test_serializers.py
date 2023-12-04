from uuid import uuid4

from django.core import validators
from model_bakery import baker
from rest_framework import serializers

from partners.models import OrganizationToUser, CloudSystemId, CloudInstance, CloudHost, ChannelPartner, Organization
from tools.serializers import FieldAccessSerializer, FieldAccessModelSerializer, VALUE_REPLACEMENT


class TestFieldAccessSerializer:

    def test_can_write(self):

        class RegularSerializer(serializers.Serializer):
            email_can_be_written = serializers.CharField(max_length=64, validators=[validators.EmailValidator()], required=True)
            uuid_cannot_be_written = serializers.CharField(max_length=12, required=True)

        class NoPermCheckSerializer(FieldAccessSerializer):
            email_can_be_written = serializers.CharField(max_length=64, validators=[validators.EmailValidator()], required=True)
            uuid_cannot_be_written = serializers.CharField(max_length=12, required=True)

        class CanWriteSerializer(FieldAccessSerializer):
            email_can_be_written = serializers.CharField(max_length=64, validators=[validators.EmailValidator()], required=True)
            uuid_cannot_be_written = serializers.CharField(max_length=12, required=True)

            def can_write_uuid_cannot_be_written(self):
                return True

        class CanNotWriteSerializer(FieldAccessSerializer):
            email_can_be_written = serializers.CharField(max_length=64, validators=[validators.EmailValidator()],
                                                         required=True)
            uuid_cannot_be_written = serializers.CharField(max_length=12, required=True)

            def can_write_uuid_cannot_be_written(self):
                return False

        data = {
            "email_can_be_written": f"{uuid4()}",
            "uuid_cannot_be_written": f"{uuid4()}",
        }

        ser = RegularSerializer(data=data)
        ser.is_valid()

        assert "email" in ser.errors["email_can_be_written"][0]
        assert ser.errors["email_can_be_written"][0].code == 'invalid'
        assert "Ensure this field has no more than 12 characters" in ser.errors["uuid_cannot_be_written"][0]
        assert ser.errors["uuid_cannot_be_written"][0].code == 'max_length'

        ser = NoPermCheckSerializer(data=data)
        ser.is_valid()

        assert "email" in ser.errors["email_can_be_written"][0]
        assert ser.errors["email_can_be_written"][0].code == 'invalid'
        assert "Ensure this field has no more than 12 characters" in ser.errors["uuid_cannot_be_written"][0]
        assert ser.errors["uuid_cannot_be_written"][0].code == 'max_length'

        ser = CanWriteSerializer(data=data)
        ser.is_valid()

        assert "email" in ser.errors["email_can_be_written"][0]
        assert ser.errors["email_can_be_written"][0].code == 'invalid'
        assert "Ensure this field has no more than 12 characters" in ser.errors["uuid_cannot_be_written"][0]
        assert ser.errors["uuid_cannot_be_written"][0].code == 'max_length'

        data['camelCase'] = f'{uuid4()}'
        ser = CanNotWriteSerializer(data=data)
        ser.is_valid()

        assert "email" in ser.errors["email_can_be_written"][0]
        assert ser.errors["email_can_be_written"][0].code == 'invalid'
        assert "User is not allowed to modify this field" in ser.errors["uuid_cannot_be_written"][0]
        assert ser.errors["uuid_cannot_be_written"][0].code == 'forbidden'

    def test_can_read(self):

        class RegularSerializer(serializers.Serializer):
            email_can_be_written = serializers.CharField(max_length=64, validators=[validators.EmailValidator()], required=True)
            uuid_cannot_be_written = serializers.CharField(max_length=64, required=True)

        class NoPermCheckSerializer(FieldAccessSerializer):
            email_can_be_written = serializers.CharField(max_length=64, validators=[validators.EmailValidator()], required=True)
            uuid_cannot_be_written = serializers.CharField(max_length=64, required=True)

        class CanWriteSerializer(FieldAccessSerializer):
            email_can_be_written = serializers.CharField(max_length=64, validators=[validators.EmailValidator()], required=True)
            uuid_cannot_be_written = serializers.CharField(max_length=64, required=True)

            def can_read_uuid_cannot_be_written(self, instance=None):
                return True

        class CanNotWriteSerializer(FieldAccessSerializer):
            email_can_be_written = serializers.CharField(max_length=64, validators=[validators.EmailValidator()],
                                                         required=True)
            uuid_cannot_be_written = serializers.CharField(max_length=64, required=True)
            methodField = serializers.SerializerMethodField(method_name='get_string')

            def get_string(self, instance):
                return f"{uuid4()}"

            def can_read_uuid_cannot_be_written(self, instance=None):
                return False

            def can_read_methodField(self, instance=None):
                return False


        data = {
            "email_can_be_written": f"{uuid4()}@example.com",
            "uuid_cannot_be_written": f"{uuid4()}",
        }

        ser = RegularSerializer(instance=data)

        assert ser.data == data

        ser = NoPermCheckSerializer(instance=data)

        assert ser.data == data

        ser = CanWriteSerializer(instance=data)

        assert ser.data == data

        data["snake_case"] = f"{uuid4()}"
        ser = CanNotWriteSerializer(instance=data)

        assert ser.data != data
        assert ser.data["uuid_cannot_be_written"] == VALUE_REPLACEMENT
        assert ser.data["methodField"] == VALUE_REPLACEMENT



class TestFieldAccessModelSerializer:

    def test_can_write(self, db):
        class CreateSystemSerializer(serializers.ModelSerializer):
            cloudSystemId = serializers.UUIDField(source='system_id')
            class Meta:
                model = CloudSystemId
                fields = ['cloudSystemId', 'organization']

        class NoPermCheckSerializer(FieldAccessModelSerializer):
            cloudSystemId = serializers.UUIDField(source='system_id')
            class Meta:
                model = CloudSystemId
                fields = ['cloudSystemId', 'organization']

        class CanWriteSerializer(FieldAccessModelSerializer):
            cloudSystemId = serializers.UUIDField(source='system_id')
            class Meta:
                model = CloudSystemId
                fields = ['cloudSystemId', 'organization']

            def can_write_cloudSystemId(self, instance=None):
                return True

        class CanNotWriteSerializer(FieldAccessModelSerializer):
            cloudSystemId = serializers.UUIDField(source='system_id')
            class Meta:
                model = CloudSystemId
                fields = ['cloudSystemId', 'organization']

            def can_write_cloudSystemId(self, instance=None):
                return False

        data = {
            "organization": f"{uuid4()}",
            "cloudSystemId": "sefq4rf3oj97gf3fed",
        }

        ser = CreateSystemSerializer(data=data)
        ser.is_valid()

        assert "Invalid pk" in ser.errors["organization"][0]
        assert ser.errors["organization"][0].code == 'does_not_exist'
        assert "Must be a valid UUID" in ser.errors["cloudSystemId"][0]
        assert ser.errors["cloudSystemId"][0].code == 'invalid'

        ser = NoPermCheckSerializer(data=data)
        ser.is_valid()

        assert "Invalid pk" in ser.errors["organization"][0]
        assert ser.errors["organization"][0].code == 'does_not_exist'
        assert "Must be a valid UUID" in ser.errors["cloudSystemId"][0]
        assert ser.errors["cloudSystemId"][0].code == 'invalid'

        ser = CanWriteSerializer(data=data)
        ser.is_valid()

        assert "Invalid pk" in ser.errors["organization"][0]
        assert ser.errors["organization"][0].code == 'does_not_exist'
        assert "Must be a valid UUID" in ser.errors["cloudSystemId"][0]
        assert ser.errors["cloudSystemId"][0].code == 'invalid'

        ser = CanNotWriteSerializer(data=data)
        ser.is_valid()

        assert "Invalid pk" in ser.errors["organization"][0]
        assert ser.errors["organization"][0].code == 'does_not_exist'
        assert "User is not allowed to modify this field" in ser.errors["cloudSystemId"][0]
        assert ser.errors["cloudSystemId"][0].code == 'forbidden'

    def test_can_read(self, channel_partner_factory, organization_factory, system_factory):
        class CreateSystemSerializer(serializers.ModelSerializer):
            cloudSystemId = serializers.UUIDField(source='system_id')
            class Meta:
                model = CloudSystemId
                fields = ['cloudSystemId', 'organization']

        class NoPermCheckSerializer(FieldAccessModelSerializer):
            cloudSystemId = serializers.UUIDField(source='system_id')
            class Meta:
                model = CloudSystemId
                fields = ['cloudSystemId', 'organization']

        class CanWriteSerializer(FieldAccessModelSerializer):
            cloudSystemId = serializers.UUIDField(source='system_id')
            class Meta:
                model = CloudSystemId
                fields = ['cloudSystemId', 'organization']

            def can_read_cloudSystemId(self, instance=None):
                return True

        class CanNotWriteSerializer(FieldAccessModelSerializer):
            cloudSystemId = serializers.UUIDField(source='system_id')
            class Meta:
                model = CloudSystemId
                fields = ['cloudSystemId', 'organization']

            def can_read_cloudSystemId(self, instance=None):
                return False


        channel_partner = channel_partner_factory()
        organization = organization_factory(channel_partner=channel_partner)

        system = system_factory(organization=organization)

        ser = CreateSystemSerializer(instance=system)
        assert ser.data['cloudSystemId'] == str(system.system_id)
        assert ser.data['organization'] == organization.id


        ser = NoPermCheckSerializer(instance=system)
        assert ser.data['cloudSystemId'] == str(system.system_id)
        assert ser.data['organization'] == organization.id

        ser = CanWriteSerializer(instance=system)
        assert ser.data['cloudSystemId'] == str(system.system_id)
        assert ser.data['organization'] == organization.id

        ser = CanNotWriteSerializer(instance=system)
        assert ser.data['cloudSystemId'] == VALUE_REPLACEMENT
        assert ser.data['organization'] == organization.id

