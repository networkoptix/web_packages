import uuid
from dataclasses import dataclass

import pytest
from rest_framework.exceptions import ValidationError

from partners.models import (
    ChannelPartner,
    ChannelPartnerToUser,
    CloudHost,
    CloudUser,
    OrganizationRoles,
)
from partners.serializers import ChannelPartnerUserSerializer


# Utility
def create_relation(email: str, title: str, roleId: uuid.UUID, attributes: dict, context: object):
    data = {
        'email': email,
        'title': title,
        "roleId": roleId,
        'attributes': attributes
    }
    serializer = ChannelPartnerUserSerializer(data=data, context=context)
    serializer.is_valid()
    return serializer.save()


def create_context(cp: ChannelPartner, created_by: CloudUser):
    @dataclass
    class Request:
        pass

    @dataclass
    class Context:
        channel_partner: ChannelPartner
        request: Request

        def __getattr__(self, name):
            return getattr(self.__dict__, name)

    context = Context(
        channel_partner=cp,
        request=Request()
    )

    setattr(context.request, 'user', created_by)  # Set the user attribute dynamically
    return context


class TestChannelPartnerUserSerializer:
    @pytest.fixture(autouse=True)
    def setUp(self, cloud_host_factory, channel_partner_factory):
        # Cloud User
        self.user: CloudUser = CloudUser.objects.create(email="nx_user@example.com")

        # Cloud Hosts
        self.cloud_host: CloudHost = cloud_host_factory(
            hostname="testing-cloud-host")

        # Channel Partners
        self.nx_cp: ChannelPartner = channel_partner_factory(
            name='nx',
            cloud_host=self.cloud_host,
            parent_channel_partner=None)

        # Roles
        self.org_admin_role: uuid.UUID = OrganizationRoles.ORGANIZATION_ADMINISTRATOR
        self.context = create_context(cp=self.nx_cp, created_by=self.user)

    def test_validate_new_user_email(self):
        data = {'email': self.user.email}

        serializer = ChannelPartnerUserSerializer(data=data, context=self.context)
        assert serializer.is_valid(), "Serializer should be valid for new user email"

    def test_create_channel_partner_to_user_relationship(self):
        data = {
            'email': self.user.email,
            'title': 'New Title',
            "roleId": self.org_admin_role
        }

        serializer = ChannelPartnerUserSerializer(data=data, context=self.context)
        assert serializer.is_valid(), "Serializer should be valid"

        # Create instance
        instance = serializer.save()
        assert isinstance(instance, ChannelPartnerToUser), "Should create a ChannelPartnerToUser instance"
        assert instance.title == 'New Title', "Title should be set correctly"

    def test_serializer_with_invalid_data(self):
        serializer_data = {'email': 'not-an-email'}
        serializer = ChannelPartnerUserSerializer(data=serializer_data)

        with pytest.raises(ValidationError):
            serializer.is_valid(raise_exception=True)

    def test_create_with_attributes(self):
        data = {
            'email': self.user.email,
            'title': 'New Title',
            "roleId": self.org_admin_role,
            'attributes': {'key1': 'value1', 'key2': 'value2'}
        }
        serializer = ChannelPartnerUserSerializer(data=data, context=self.context)

        assert serializer.is_valid(), "Serializer should be valid with attributes"
        instance = serializer.save()
        assert instance.attributes == {'key1': 'value1', 'key2': 'value2'}, "Attributes should be set correctly"

    def test_partial_update_attributes(self):
        relation = create_relation(
            self.user.email,
            'New Title',
            self.org_admin_role,
            {'key1': 'value1'},
            self.context
        )

        data = {
            'attributes': {'key1': 'new_value', 'key2': 'value2'}
        }

        serializer = ChannelPartnerUserSerializer(
            instance=relation,
            data=data,
            context=self.context,
            partial=True)

        assert serializer.is_valid(), "Serializer should be valid for partial updates"

        updated_instance = serializer.save()
        assert updated_instance.attributes == {
            'key1': 'new_value',
            'key2': 'value2'
        }, "Attributes should be updated correctly"

    def test_unset_attribute(self):
        relation = create_relation(
            self.user.email,
            'New Title',
            self.org_admin_role,
            {'key1': 'value1', 'key2': 'value2'},
            self.context
        )

        data = {
            'attributes': {'key1': '*unset*'}
        }
        serializer = ChannelPartnerUserSerializer(
            instance=relation,
            data=data,
            context=self.context,
            partial=True)

        assert serializer.is_valid(), "Serializer should be valid for unsetting attributes"

        updated_instance = serializer.save()
        assert 'key1' not in updated_instance.attributes, "Attribute key1 should be removed"
        assert updated_instance.attributes.get('key2') == 'value2', "Other attributes should remain unchanged"
