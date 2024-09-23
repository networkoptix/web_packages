from uuid import uuid4

import pytest
import structlog
from rest_framework.exceptions import (
    APIException,
    PermissionDenied,
)

from partners.models import (
    ChannelPartnerStates,
    CloudSystemId,
    Organization,
    OrganizationRoles,
)
from partners.serializers.v2.serializers import SystemToOrgTransferSerializer


class TestSystemToOrgTransferSerializer:
    @pytest.fixture(autouse=True)
    def setUp(self, channel_partner_factory, organization_factory, org_user_factory,
              arf, cloud_test_host):
        self.cp = channel_partner_factory()
        self.org = organization_factory(channel_partner=self.cp)
        self.other_org = organization_factory(channel_partner=self.cp)
        self.org_admin = org_user_factory(organization=self.org)
        self.org_viewer = org_user_factory(organization=self.org, role=OrganizationRoles.VIEWER)
        self.comment = f'{uuid4()}'
        self.sys_id = f'{uuid4()}'
        self.valid_data = {'organizationId': self.org.id, 'comment': self.comment}
        self.no_comment_data = {'organizationId': self.org.id}
        self.invalid_data = {'organizationId': self.comment, 'comment': self.comment}
        self.other_org_data = {'organizationId': self.other_org.id, 'comment': self.comment}
        self.offer_url = f'https://{cloud_test_host.hostname}/cdb/v0/systems/{self.sys_id}/offer'
        self.accept_url = (f'https://{cloud_test_host.hostname}/cdb/v0'
                           f'/organizations/{self.org.id}/system-offers/{self.sys_id}/accept')
        self.offer_response = {
            "fromAccount": self.org_admin.user.email,
            "organizationId": f"{self.org.id}",
            "systemId": self.sys_id,
            "systemName": "string",
            "comment": self.comment,
            "status": "offered"
        }
        self.accept_response = {
            "errorClass": "noError",
            "errorDetail": "0",
            "errorText": "",
            "resultCode": "ok"
        }
        self.request = arf.post('/')
        self.request.auth = f'Bearer {uuid4()}'
        self.request.cloud_host = cloud_test_host
        structlog.contextvars.bind_contextvars(request_id=str(uuid4()))

    def make_context(self, user):
        self.request.user = user
        return {
            'request': self.request
        }

    def test_invalid_organization_id(self, mock_auth_with_user):
        serializer = SystemToOrgTransferSerializer(data=self.invalid_data,
                                                   context=self.make_context(self.org_admin.user))
        assert serializer.is_valid() is False
        assert serializer.errors['organizationId']

    def test_other_organization_id(self, mock_auth_with_user):
        try:
            serializer = SystemToOrgTransferSerializer(data=self.other_org_data,
                                                       context=self.make_context(self.org_admin.user))
            serializer.is_valid()
        except PermissionDenied as ex:
            assert (ex.detail ==
                    f'User does not have {Organization.permissions.manage_systems} permission for this organization')
        else:
            assert False, 'Permission denied must be raised'

    def test_failed_offer_request(self, mock_auth_with_user, httpx_mock):
        offer_error = {
            "errorClass": "unauthorized",
            "errorDetail": "101",
            "errorText": "forbidden",
            "resultCode": "forbidden"
        }
        httpx_mock.add_response(url=self.offer_url, status_code=403, json=offer_error)
        httpx_mock.add_response(url=self.accept_url, status_code=400)
        serializer = SystemToOrgTransferSerializer(data=self.valid_data,
                                                   context=self.make_context(self.org_admin.user))
        assert serializer.is_valid() is True
        try:
            serializer.save(self.sys_id)
        except APIException as ex:
            assert ex.status_code == 403
        else:
            assert False, 'Permission denied must be returned via exception'

    def test_failed_accept_request(self, mock_auth_with_user, httpx_mock):
        accept_error = {
            "errorClass": "badRequest",
            "errorDetail": "112",
            "errorText": "Offer not in valid state",
            "resultCode": "badRequest"
        }
        httpx_mock.add_response(url=self.offer_url, status_code=200, json=self.offer_response)
        httpx_mock.add_response(url=self.accept_url, status_code=400, json=accept_error)
        serializer = SystemToOrgTransferSerializer(data=self.valid_data,
                                                   context=self.make_context(self.org_admin.user))
        assert serializer.is_valid() is True
        try:
            serializer.save(self.sys_id)
        except APIException as ex:
            assert ex.status_code == 400
        else:
            assert False, 'Permission denied must be returned via exception'

    def test_success_request(self, mock_auth_with_user, httpx_mock):
        httpx_mock.add_response(url=self.offer_url, status_code=200, json=self.offer_response)
        httpx_mock.add_response(url=self.accept_url, status_code=200, json=self.accept_response)
        serializer = SystemToOrgTransferSerializer(data=self.valid_data,
                                                   context=self.make_context(self.org_admin.user))
        assert serializer.is_valid() is True
        serializer.save(self.sys_id)
        assert CloudSystemId.objects.filter(system_id=self.sys_id, organization=self.org).exists()

    def test_organization_suspended(self, mock_auth_with_user, httpx_mock):
        self.org.state = ChannelPartnerStates.SUSPENDED
        self.org.save()
        httpx_mock.add_response(url=self.offer_url, status_code=200, json=self.offer_response)
        httpx_mock.add_response(url=self.accept_url, status_code=200, json=self.accept_response)
        serializer = SystemToOrgTransferSerializer(data=self.valid_data,
                                                   context=self.make_context(self.org_admin.user))
        assert serializer.is_valid() is False
        assert serializer.errors['organizationId'] == ['Organization is suspended.']

    def test_organization_shutdown(self, mock_auth_with_user, httpx_mock):
        self.org.state = ChannelPartnerStates.SHUTDOWN
        self.org.save()
        httpx_mock.add_response(url=self.offer_url, status_code=200, json=self.offer_response)
        httpx_mock.add_response(url=self.accept_url, status_code=200, json=self.accept_response)
        serializer = SystemToOrgTransferSerializer(data=self.valid_data,
                                                   context=self.make_context(self.org_admin.user))
        assert serializer.is_valid() is False
        assert serializer.errors['organizationId'] == ['Organization is shut down.']
