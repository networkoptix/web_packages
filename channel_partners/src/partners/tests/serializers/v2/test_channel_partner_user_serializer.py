import uuid
from dataclasses import dataclass

import pytest
from rest_framework.exceptions import ValidationError

from partners.models import (
    ChannelPartner,
    ChannelPartnerRoles,
    ChannelPartnerToUser,
    CloudHost,
    CloudUser,
)
from partners.serializers.v2.serializers import ChannelPartnerUserSerializer


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


def create_context(cp: ChannelPartner, created_by: CloudUser, cloud_host: CloudHost):
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
    setattr(context.request, 'cloud_host', cloud_host)
    return context


class TestChannelPartnerUserSerializer:
    @pytest.fixture(autouse=True)
    def setUp(self, cloud_host_factory, channel_partner_factory, arf,
              cloud_test_host, mock_new_partner_user_role_notification):
        # Cloud User
        self.user: CloudUser = CloudUser.objects.create(email="nx_user@example.com")

        # Cloud Hosts
        self.cloud_host = cloud_test_host

        # Channel Partners
        self.nx_cp: ChannelPartner = channel_partner_factory(
            name='nx',
            cloud_host=self.cloud_host,
            parent_channel_partner=None)

        # Roles
        self.cp_admin_role: uuid.UUID = ChannelPartnerRoles.ADMINISTRATOR
        self.context = create_context(cp=self.nx_cp, created_by=self.user, cloud_host=self.cloud_host)
        self.mock_notification = mock_new_partner_user_role_notification

        self.request = arf.post('/')
        self.request.cloud_host = self.cloud_host

    def test_validate_new_user_email(self):
        data = {
            'email': self.user.email,
            'title': 'New Title',
            "roleId": self.cp_admin_role
        }

        serializer = ChannelPartnerUserSerializer(data=data, context=self.context)
        assert serializer.is_valid(), "Serializer should be valid for new user email"

    def test_create_channel_partner_to_user_relationship(self, mock_mark_organization_user):
        data = {
            'email': self.user.email,
            'title': 'New Title',
            "roleId": self.cp_admin_role
        }
        serializer = ChannelPartnerUserSerializer(data=data, context=self.context)
        assert serializer.is_valid(), "Serializer should be valid"

        # Create instance
        instance = serializer.save()
        assert isinstance(instance, ChannelPartnerToUser), "Should create a ChannelPartnerToUser instance"
        assert instance.title == 'New Title', "Title should be set correctly"

        self.mock_notification.assert_called_once()
        mock_mark_organization_user.asser_called_once_with(self.user.email)

    def test_serializer_with_invalid_data(self):
        serializer_data = {
            'email': 'not-an-email',
            'title': 'New Title',
            "roleId": self.cp_admin_role
        }
        serializer = ChannelPartnerUserSerializer(data=serializer_data)

        with pytest.raises(ValidationError):
            serializer.is_valid(raise_exception=True)

    def test_create_with_attributes(self):
        data = {
            'email': self.user.email,
            'title': 'New Title',
            "roleId": self.cp_admin_role,
            'attributes': {'key1': 'value1', 'key2': 'value2'}
        }
        serializer = ChannelPartnerUserSerializer(data=data, context=self.context)

        assert serializer.is_valid(), "Serializer should be valid with attributes"
        instance = serializer.save()
        assert instance.attributes == {'key1': 'value1', 'key2': 'value2'}, "Attributes should be set correctly"
        self.mock_notification.assert_called_once()


    def test_update_attributes(self):
        relation = create_relation(
            self.user.email,
            'New Title',
            self.cp_admin_role,
            {'key1': 'value1'},
            self.context
        )

        data = {
            'email': self.user.email,
            'title': 'New Title',
            "roleId": self.cp_admin_role,
            'attributes': {'key1': 'new_value', 'key2': 'value2'}
        }

        serializer = ChannelPartnerUserSerializer(
            data=data,
            context=self.context)

        assert serializer.is_valid(), "Serializer should be valid for partial updates"

        updated_instance = serializer.save()
        assert updated_instance.attributes == {
            'key1': 'new_value',
            'key2': 'value2'
        }, "Attributes should be updated correctly"
        self.mock_notification.assert_called_once()

    def test_create_attribute_too_long(self):

        relation = create_relation(
            self.user.email,
            'New Title',
            self.cp_admin_role,
            {'key1': 'value1'},
            self.context
        )

        data = {
            'email': self.user.email,
            'title': 'New Title',
            "roleId": self.cp_admin_role,
            'attributes': {'key1': 'a' * 3000}
        }

        serializer = ChannelPartnerUserSerializer(
            data=data,
            context=self.context)

        assert serializer.is_valid() is False
        assert serializer.errors['attributes'][0] == 'JSON size exceeds the maximum allowed size of 3000 bytes.'

    def test_update_attribute_too_long(self):
        relation = create_relation(
            self.user.email,
            'New Title',
            self.cp_admin_role,
            {'key1': 'value1'},
            self.context
        )

        data = {
            'email': self.user.email,
            'title': 'New Title',
            "roleId": self.cp_admin_role,
            'attributes': {'key1': 'value1'}
        }

        serializer = ChannelPartnerUserSerializer(
            data=data,
            context=self.context)

        assert serializer.is_valid() is True
        serializer.save()

        for iteration in range(1, 147):
            data['attributes'][f'key{iteration}'] = f'value{iteration}'
        serializer = ChannelPartnerUserSerializer(data=data, context=self.context)
        serializer.is_valid()
        serializer.save()


        data['attributes'][f'key148'] = 'value148'
        serializer = ChannelPartnerUserSerializer(data=data, context=self.context)
        serializer.is_valid()
        assert serializer.is_valid() is False
        assert serializer.errors['attributes'][0] == 'JSON size exceeds the maximum allowed size of 3000 bytes.'


    def test_unset_attribute(self, cp_user_factory):
        relation = cp_user_factory(email=self.user.email, channel_partner=self.nx_cp)
        relation.set_attributes(attributes={'key1': 'value1', 'key2': 'value2'})
        relation.save()

        data = {
            'email': self.user.email,
            'title': 'New Title',
            "roleId": self.cp_admin_role,
            'attributes': {'key1': '*unset*'},
        }
        serializer = ChannelPartnerUserSerializer(
            data=data,
            context=self.context)

        assert serializer.is_valid(), "Serializer should be valid for unsetting attributes"

        updated_instance = serializer.save()
        assert 'key1' not in updated_instance.attributes, "Attribute key1 should be removed"
        assert updated_instance.attributes.get('key2') == 'value2', "Other attributes should remain unchanged"

    def test_creating_admin_role(self, channel_partner_factory, random_email,
                                 httpx_mock, cp_user_factory, arf):
        cp = channel_partner_factory()
        user = cp_user_factory(channel_partner=cp)
        self.request.user = user
        context = {
            "channel_partner": cp,
            "request": self.request,
        }
        # test valid update
        data = {
            'email': random_email,
            'title': 'New Title',
            "roleId": self.cp_admin_role,
        }
        serializer = ChannelPartnerUserSerializer(data=data, context=context)
        serializer.is_valid()
        instance = serializer.save()
        assert instance.user.email == data['email']
        assert instance.channel_partner == cp
        assert instance.roles == [ChannelPartnerRoles.ADMINISTRATOR]
        self.mock_notification.assert_called_once()

    def test_changing_only_admin_role(self, channel_partner_factory,
                                          cp_user_factory, arf, mock_post_notification):
        cp = channel_partner_factory()
        user = cp_user_factory(channel_partner=cp)
        self.request.user = user
        context = {
            "channel_partner": cp,
            "request": self.request,
        }
        data = {
            'email': user.user.email,
            'title': 'New Title',
            "roleId": ChannelPartnerRoles.REPORTS_VIEWER,
        }
        serializer = ChannelPartnerUserSerializer(data=data, context=context)
        assert serializer.is_valid() is False
        assert serializer.errors['roleId'][0] == 'It is impossible to change role for the only administrator.'
        self.mock_notification.assert_not_called()

    def test_changing_second_admin_role(self, channel_partner_factory, cp_user_factory,
                                        arf, mock_post_notification, mock_mark_organization_user):
        cp = channel_partner_factory()
        user = cp_user_factory(channel_partner=cp)
        mock_mark_organization_user.asser_called_once_with(user.user.email)
        self.request.user = user
        context = {
            "channel_partner": cp,
            "request": self.request,
        }
        other_user = cp_user_factory(channel_partner=cp)
        assert mock_mark_organization_user.call_count == 2

        data = {
            'email': other_user.user.email,
            'title': 'New Title',
            "roleId": ChannelPartnerRoles.REPORTS_VIEWER,
        }
        serializer = ChannelPartnerUserSerializer(data=data, context=context)
        assert serializer.is_valid() is True
        serializer.save()
        self.mock_notification.assert_not_called()
        assert mock_mark_organization_user.call_count == 2

    def test_changing_only_admin_role_2_users(self, channel_partner_factory,
                                        cp_user_factory, arf, mock_post_notification):
        cp = channel_partner_factory()
        user = cp_user_factory(channel_partner=cp)
        self.request.user = user
        context = {
            "channel_partner": cp,
            "request": self.request,
        }
        other_user = cp_user_factory(channel_partner=cp, role=ChannelPartnerRoles.REPORTS_VIEWER)
        data = {
            'email': user.user.email,
            'title': 'New Title',
            "roleId": ChannelPartnerRoles.REPORTS_VIEWER,
        }
        serializer = ChannelPartnerUserSerializer(data=data, context=context)
        assert serializer.is_valid() is False
        assert serializer.errors['roleId'][0] == 'It is impossible to change role for the only administrator.'
        self.mock_notification.assert_not_called()

    def test_existing_cps_user(self, cp_user_factory, channel_partner_factory,
                               mock_mark_organization_user):
        other_cp = channel_partner_factory()
        user = cp_user_factory(channel_partner=other_cp)
        mock_mark_organization_user.asser_called_once_with(user.user.email)

        data = {
            'email': user.user.email,
            'title': 'New Title',
            "roleId": self.cp_admin_role,
        }
        serializer = ChannelPartnerUserSerializer(data=data, context=self.context)
        assert serializer.is_valid() is True
        serializer.save()
        self.mock_notification.assert_called_once()
        assert mock_mark_organization_user.call_count == 1

