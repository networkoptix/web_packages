from uuid import uuid4

import pytest
from rest_framework import exceptions

from partners.models import (
    ChannelPartner,
    ChannelPartnerRoles,
    ChannelPartnerToUser,
)
from partners.serializers.v2.serializers import CreateChannelPartnerSerializer
from partners.utils.context_vars import get_context_vars


class TestCreateChannelPartnerSerializer:

    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, cp_user_factory, arf, mocker):
        self.cp = channel_partner_factory()
        self.other_cp = channel_partner_factory()
        self.cp_user = cp_user_factory(channel_partner=self.cp)
        self.request = arf.post('/')
        self.request.user = self.cp_user.user
        self.context = {'request': self.request}
        self.valid = {
            "name": f'{uuid4()}',
            "parentChannelPartner": f"{self.cp.id}",
        }
        self.other_cp_data = {
            "name": f'{uuid4()}',
            "parentChannelPartner": f"{self.other_cp.id}",
        }
        self.valid_attrs = {
            "attributes": {
                "additionalProp1": "string",
                "additionalProp2": "string",
                "additionalProp3": "string"
            },
            **self.valid,
        }
        self.valid_support_info = {
            **self.valid,
            "supportInformation": {
                "sites": [{"value": "123", "description": ""}],
                "phones": [{"value": "123", "description": "123"}],
                "emails": [],
                "custom": [{"label": "abc", "value": "123"}]
            }
        }

        self.invalid_support_info = {
            **self.valid,
            "supportInformation": {
                "sites": [{"value": "123", "description": None}],
                "phones": [{"value": None, "description": "123"}],
                "emails": [{"value": "123"}],
                "custom": [{"label": 123, "value": "123"}]
            }
        }
        self.missed_description = {
            **self.valid,
            "supportInformation": {
                "sites": [{"value": "123"}],
                "custom": [{"label": 123, "value": "123"}]
            }
        }
        self.non_existing_partner = {
            **self.valid,
            "parentChannelPartner": f"{uuid4()}",
        }
        self.notification_mock = mocker.patch(
            "partners.tasks.notification.added_channel_partner_role_task.apply_async")

    def test_attributes_too_long(self):
        data = {
            **self.valid,
            "attributes": {
                "additionalProp1": "a" * 3000,
            }
        }
        serializer = CreateChannelPartnerSerializer(data=data, context=self.context)
        assert serializer.is_valid() is False
        assert serializer.errors['attributes'][0] == 'JSON size exceeds the maximum allowed size of 3000 bytes.'

    def test_valid(self):
        serializer = CreateChannelPartnerSerializer(data=self.valid, context=self.context)
        assert serializer.is_valid()

    def test_valid_attrs(self):
        serializer = CreateChannelPartnerSerializer(data=self.valid_attrs, context=self.context)
        assert serializer.is_valid()

    def test_valid_support_info(self):
        serializer = CreateChannelPartnerSerializer(data=self.valid_support_info, context=self.context)
        assert serializer.is_valid()

    def test_invalid_support_info(self):
        serializer = CreateChannelPartnerSerializer(data=self.invalid_support_info, context=self.context)
        assert serializer.is_valid() is False
        assert serializer.errors['supportInformation']['sites'][0]['description'][0] == 'This field may not be null.'
        assert serializer.errors['supportInformation']['phones'][0]['value'][0] == 'This field may not be null.'

    def test_missed_description(self):
        serializer = CreateChannelPartnerSerializer(data=self.missed_description, context=self.context)
        assert serializer.is_valid() is True
        assert (serializer.validated_data['support_information']['sites'][0]['value']
                == self.missed_description['supportInformation']['sites'][0]['value'])
        assert serializer.validated_data['support_information']['sites'][0]['description'] == ''

    def test_non_existing_partner(self):
        serializer = CreateChannelPartnerSerializer(data=self.non_existing_partner, context=self.context)
        assert serializer.is_valid() is False
        assert "Invalid pk" in serializer.errors['parentChannelPartner'][0]

    def test_invalid_partner(self):
        serializer = CreateChannelPartnerSerializer(data=self.other_cp_data, context=self.context)
        try:
            serializer.is_valid()
        except exceptions.PermissionDenied as e:
            assert True
        else:
            assert False, 'Permission denied must be raised'

    def test_save(self):
        data = {
            **self.valid,
            **self.valid_support_info,
            **self.valid_attrs,
            "monthlyAdditionalServiceLimit": 10,
        }
        serializer = CreateChannelPartnerSerializer(data=data, context=self.context)
        assert serializer.is_valid()
        instance: ChannelPartner = serializer.save()
        assert instance.id
        assert instance.parent_channel_partner == self.cp
        assert instance.name == data['name']
        assert instance.attributes == data['attributes']
        assert instance.support_information == data['supportInformation']
        assert instance.monthly_additional_service_limit == 10
        self.notification_mock.assert_not_called()

    def test_first_admin(self, random_email, context_vars):

        email = random_email
        data = {
            **self.valid,
            'firstAdminEmail': email
        }
        serializer = CreateChannelPartnerSerializer(data=data, context=self.context)
        assert serializer.is_valid()
        instance: ChannelPartner = serializer.save()
        assert instance.id
        cloud_user = instance.users.first()
        assert cloud_user.email == email
        user_rel = ChannelPartnerToUser.objects.get(user=cloud_user, channel_partner=instance)
        assert user_rel.roles[0] == ChannelPartnerRoles.ADMINISTRATOR
        self.notification_mock.assert_called_once_with(
            args=[
                user_rel.channel_partner_id,
                self.cp_user.user.id,
                user_rel.user_id,
                instance.cloud_host.hostname,
                get_context_vars().get("request_id")
            ]
        )

    def test_first_admin_email_len(self, random_email):
        email = random_email
        email_255 = 'a' * (255 - len(email)) + email
        email_256 = 'a' * (256 - len(email)) + email
        data = {
            **self.valid,
            'firstAdminEmail': email_255
        }
        serializer = CreateChannelPartnerSerializer(data=data, context=self.context)
        assert serializer.is_valid() is True
        serializer.save()
        data = {
            **self.valid,
            'firstAdminEmail': email_256
        }
        serializer = CreateChannelPartnerSerializer(data=data, context=self.context)
        assert serializer.is_valid() is False
        assert serializer.errors['firstAdminEmail'][0] == 'Ensure this field has no more than 255 characters.'

    def test_first_admin_email_case_insensitivity_existing_user(
            self,
            context_vars,
            cloud_user_factory):

        exiting_user = cloud_user_factory()
        data = {
            **self.valid,
            'firstAdminEmail': exiting_user.email.upper()
        }
        serializer = CreateChannelPartnerSerializer(data=data, context=self.context)
        assert serializer.is_valid()
        instance: ChannelPartner = serializer.save()
        assert instance.id
        cloud_user = instance.users.first()
        assert cloud_user.email == exiting_user.email.lower()

    def test_first_admin_email_case_insensitivity_new_user(self, random_email):
        email = random_email
        data = {
            **self.valid,
            'firstAdminEmail': email.upper()
        }
        serializer = CreateChannelPartnerSerializer(data=data, context=self.context)
        assert serializer.is_valid()
        instance: ChannelPartner = serializer.save()
        assert instance.id
        cloud_user = instance.users.first()
        assert cloud_user.email == email.lower()
