from uuid import uuid4

import pytest
from django.core.cache import caches
from rest_framework.exceptions import PermissionDenied

from partners.models import (
    ChannelPartnerStates,
    Organization,
    OrganizationRoles,
)
from partners.serializers.v2.serializers import BindLocalSystemSerializer


class TestBindLocalSystemSerializer:
    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory, arf,
              cloud_user_factory, org_user_factory, cloud_test_host, httpx_mock):
        self.cp = channel_partner_factory()
        self.organization = organization_factory(channel_partner=self.cp)
        self.cloud_user = cloud_user_factory()
        self.administrator = org_user_factory(organization=self.organization,
                                              role=OrganizationRoles.ORGANIZATION_ADMINISTRATOR)
        self.health_viewer = org_user_factory(organization=self.organization,
                                              role=OrganizationRoles.SYSTEM_HEALTH_VIEWER)
        self.bind_url = f'https://{cloud_test_host}/cdb/systems/bind'
        self.system_id = f'{uuid4()}'
        self.valid_data = {
            "name": f"system {self.system_id}",
            "cloudSystemId": f"{self.system_id}",
            "organization": f"{self.organization.id}",
            "customization": "default",
            "opaque": ""
        }
        caches['local'].clear()
        self.bind_response = {
            "id": f"{self.system_id}",
            "status": "activated"
        }
        httpx_mock.add_response(url=self.bind_url, json=self.bind_response)
        self.request = arf.post('/')
        self.request.auth = f'Bearer {uuid4()}'
        self.request.cloud_host = cloud_test_host

    def make_context(self, user):
        self.request.user = user
        return {
            'request': self.request
        }

    def test_organization_permission_denied(self):
        try:
            serializer = BindLocalSystemSerializer(data=self.valid_data,
                                                   context=self.make_context(self.health_viewer.user))
            serializer.is_valid()
        except PermissionDenied as ex:
            assert (ex.detail ==
                    f'User does not have {Organization.permissions.manage_systems} permission for this organization')
        else:
            assert False, 'Permission denied must be raised'

        try:
            serializer = BindLocalSystemSerializer(data=self.valid_data,
                                                   context=self.make_context(self.cloud_user))
            serializer.is_valid()
        except PermissionDenied as ex:
            assert (ex.detail ==
                    f'User does not have {Organization.permissions.manage_systems} permission for this organization')
        else:
            assert False, 'Permission denied must be raised'

    def test_organization_shutdown(self):
        self.organization.state = ChannelPartnerStates.SHUTDOWN
        self.organization.save()
        serializer = BindLocalSystemSerializer(data=self.valid_data,
                                               context=self.make_context(self.administrator.user))
        assert serializer.is_valid() is False
        assert serializer.errors['organization'] == ['Organization is shut down.']

    def test_organization_suspended(self):
        self.organization.state = ChannelPartnerStates.SUSPENDED
        self.organization.save()
        serializer = BindLocalSystemSerializer(data=self.valid_data,
                                               context=self.make_context(self.administrator.user))
        assert serializer.is_valid() is False
        assert serializer.errors['organization'] == ['Organization is suspended.']

    def test_bind_error_code(self, httpx_mock):
        httpx_mock.reset(False)
        httpx_mock.add_response(url=self.bind_url, json=self.bind_response, status_code=400)
        serializer = BindLocalSystemSerializer(data=self.valid_data,
                                               context=self.make_context(self.administrator.user))
        serializer.is_valid(raise_exception=True)
        bind_data, status_code = serializer.bind_system()
        assert bind_data == self.bind_response
        assert status_code == 400

    def test_bind_ok(self, httpx_mock):
        httpx_mock.reset(False)
        httpx_mock.add_response(url=self.bind_url, json=self.bind_response, status_code=200)
        serializer = BindLocalSystemSerializer(data=self.valid_data,
                                               context=self.make_context(self.administrator.user))
        serializer.is_valid(raise_exception=True)
        bind_data, status_code = serializer.bind_system()
        assert bind_data == self.bind_response
        assert status_code == 200



