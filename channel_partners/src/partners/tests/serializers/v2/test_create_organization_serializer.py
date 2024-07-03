from uuid import uuid4

import pytest
from rest_framework import exceptions

from partners.models import (
    ChannelPartner,
    Organization,
    OrganizationRoles,
    OrganizationToUser,
)
from partners.serializers.v2.serializers import CreateOrganizationSerializer
from partners.utils.context_vars import get_context_vars


class TestCreateOrganizationSerializer:

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
            "channelPartner": f"{self.cp.id}",
        }
        self.other_cp_data = {
            "name": f'{uuid4()}',
            "channelPartner": f"{self.other_cp.id}",
        }
        self.valid_attrs = {
            "attributes": {
                "additionalProp1": "string",
                "additionalProp2": "string",
                "additionalProp3": "string"
            },
            **self.valid,
        }
        self.non_existing_partner = {
            **self.valid,
            "channelPartner": f"{uuid4()}",
        }
        self.notification_mock = mocker.patch(
            "partners.tasks.notification.added_organization_role_task.apply_async")

    def test_valid(self):
        serializer = CreateOrganizationSerializer(data=self.valid, context=self.context)
        assert serializer.is_valid()

    def test_valid_attrs(self):
        serializer = CreateOrganizationSerializer(data=self.valid_attrs, context=self.context)
        assert serializer.is_valid()

    def test_non_existing_partner(self):
        serializer = CreateOrganizationSerializer(data=self.non_existing_partner, context=self.context)
        assert serializer.is_valid() is False
        assert "Invalid pk" in serializer.errors['channelPartner'][0]

    def test_invalid_partner(self):
        serializer = CreateOrganizationSerializer(data=self.other_cp_data, context=self.context)
        try:
            serializer.is_valid()
        except exceptions.PermissionDenied as e:
            assert True
        else:
            assert False, 'Permission denied must be raised'

    def test_save(self):
        data = {
            **self.valid,
            **self.valid_attrs,
        }
        serializer = CreateOrganizationSerializer(data=data, context=self.context)
        assert serializer.is_valid()
        instance: ChannelPartner = serializer.save()
        assert instance.id
        assert instance.channel_partner == self.cp
        assert instance.name == data['name']
        assert instance.attributes == data['attributes']
        self.notification_mock.assert_not_called()

    def test_first_admin(self, random_email, context_vars):
        email = random_email
        data = {
            **self.valid,
            'firstAdminEmail': email
        }
        serializer = CreateOrganizationSerializer(data=data, context=self.context)
        assert serializer.is_valid()
        instance: Organization = serializer.save()
        assert instance.id
        cloud_user = instance.users.first()
        assert cloud_user.email == email
        user_rel = OrganizationToUser.objects.get(user=cloud_user, organization=instance)
        assert user_rel.roles[0] == OrganizationRoles.ORGANIZATION_ADMINISTRATOR
        self.notification_mock.assert_called_once_with(
            args=[
                user_rel.organization_id,
                self.cp_user.user.id,
                user_rel.user_id,
                instance.channel_partner.cloud_host.hostname,
                get_context_vars().get("request_id")
            ]
        )

    def test_first_admin_is_parent_user(self, context_vars, cp_user_factory):
        error_message = (f'User with this email has role in parent channel partner '
                         f'{self.cp.name} and cannot be added to organization.')
        parent_user = cp_user_factory(channel_partner=self.cp)
        data = {
            **self.valid,
            'firstAdminEmail': parent_user.user.email
        }
        serializer = CreateOrganizationSerializer(data=data, context=self.context)
        assert not serializer.is_valid()
        assert error_message in serializer.errors['firstAdminEmail'][0]
