from uuid import uuid4

import pytest
from django.core.cache import caches
from rest_framework import exceptions
from rest_framework.reverse import reverse
from rest_framework.test import APIClient

from partners.models import (
    ChannelPartnerService,
    CloudSystemId,
    ServiceUsage,
    VmsRoles,
)
from partners.views.v2.internal_views import get_authorized_system


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
class TestGetAuthorizedSystem:

    @pytest.fixture(autouse=True)
    def setup(self, arf, channel_partner_factory, organization_factory, system_factory,
                         cp_user_factory, sys_group_user_factory, org_user_factory, mock_cdb_token_introspect):
        cp = channel_partner_factory()
        organization = organization_factory(channel_partner=cp)
        other_organization = organization_factory(channel_partner=cp)
        other_organization.channel_partner_access_level_id = None
        other_organization.save()
        self.cp_admin = cp_user_factory(channel_partner=cp)
        self.org_admin = org_user_factory(organization=organization)
        self.other_admin = org_user_factory(organization=other_organization)
        self.group_user = sys_group_user_factory(organization=organization)
        self.cloud_system = system_factory(organization=organization)
        self.group_system = system_factory(organization=organization, system_group=self.group_user.system_group)
        self.other_system = system_factory(organization=other_organization)


    def test_system_auth(self, arf, channel_partner_factory, organization_factory, system_factory):

        request = arf.get('/')
        request.cloud_system = self.cloud_system
        assert get_authorized_system(request, self.cloud_system.system_id) == self.cloud_system

        try:
            get_authorized_system(request, self.other_system.system_id)
        except exceptions.PermissionDenied as ex:
            assert 'Insufficient permissions' in str(ex)
        else:
            assert False, 'Permission denied must be raised'

    def test_cp_admin(self, arf, mock_cdb_token_introspect):
        request = arf.get('/')
        request.auth = f'Bearer {uuid4()}'

        request.user = self.cp_admin.user
        mock_cdb_token_introspect(self.cp_admin)
        assert get_authorized_system(request, self.cloud_system.system_id) == self.cloud_system
        assert get_authorized_system(request, self.group_system.system_id) == self.group_system
        # test cpal disabled
        try:
            get_authorized_system(request, self.other_system.system_id)
        except exceptions.PermissionDenied as ex:
            assert 'Insufficient permissions' in str(ex)
        else:
            assert False, 'Permission denied must be raised'

    def test_org_admin(self, arf, mock_cdb_token_introspect):
        request = arf.get('/')
        request.auth = f'Bearer {uuid4()}'
        request.user = self.org_admin.user
        mock_cdb_token_introspect(self.org_admin)

        assert get_authorized_system(request, self.cloud_system.system_id) == self.cloud_system
        assert get_authorized_system(request, self.group_system.system_id) == self.group_system

        # test insufficient permissions
        try:
            get_authorized_system(request, self.other_system.system_id)
        except exceptions.PermissionDenied as ex:
            assert 'Insufficient permissions' in str(ex)
        else:
            assert False, 'Permission denied must be raised'

    def test_group_user(self, arf, mock_cdb_token_introspect):
        request = arf.get('/')
        request.auth = f'Bearer {uuid4()}'
        request.user = self.group_user.user
        mock_cdb_token_introspect(self.group_user)
        assert get_authorized_system(request, self.group_system.system_id) == self.group_system
        try:
            get_authorized_system(request, self.cloud_system.system_id)
        except exceptions.PermissionDenied as ex:
            assert 'Insufficient permissions' in str(ex)
        else:
            assert False, 'Permission denied must be raised'
        try:
            get_authorized_system(request, self.other_system.system_id)
        except exceptions.PermissionDenied as ex:
            assert 'Insufficient permissions' in str(ex)
        else:
            assert False, 'Permission denied must be raised'

    def test_vms_user(self, arf, mock_cdb_token_introspect, cloud_user_factory, httpx_mock):
        user = cloud_user_factory()
        request = arf.get('/')
        request.auth = f'Bearer {uuid4()}'
        request.user = user
        mock_cdb_token_introspect(user, system=self.other_system)
        assert get_authorized_system(request, self.other_system.system_id) == self.other_system
        try:
            get_authorized_system(request, uuid4())
        except exceptions.PermissionDenied as ex:
            assert 'Insufficient permissions' in str(ex)
        else:
            assert False, 'Permission denied must be raised'
        caches['default'].clear()
        mock_cdb_token_introspect(user, system=self.cloud_system)
        assert get_authorized_system(request, self.cloud_system.system_id) == self.cloud_system
        caches['default'].clear()
        mock_cdb_token_introspect(user, system=self.cloud_system, system_role=VmsRoles.VIEWER)
        assert get_authorized_system(
            request, self.cloud_system.system_id, roles=[VmsRoles.VIEWER]) == self.cloud_system

        caches['default'].clear()
        try:
            get_authorized_system(request, self.cloud_system.system_id)
        except exceptions.PermissionDenied as ex:
            assert 'Insufficient permissions' in str(ex)
        else:
            assert False, 'Permission denied must be raised'

    def test_disconnected_system(self, arf):
        self.cloud_system.disconnect_system()

        request = arf.get('/')
        request.auth = f'Bearer {uuid4()}'

        request.user = self.cp_admin.user
        with pytest.raises(exceptions.PermissionDenied):
            get_authorized_system(request, self.cloud_system.system_id)


class TestCloudStorageUsageReport:

    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, cp_service_factory, organization_factory, system_factory,
              service_record_factory, cloud_test_host, mock_internal_token_auth):
        self.cp = channel_partner_factory()
        self.organization = organization_factory(channel_partner=self.cp)
        self.system = system_factory(organization=self.organization)
        self.service_quantity = 10
        self.local_recording_service = cp_service_factory(
            channel_partner=self.cp, service_type=ChannelPartnerService.LOCAL_RECORDING)
        self.local_recording_service_record = service_record_factory(self.local_recording_service,
                                                                     cloud_system=self.system,
                                                                     organization=self.organization,
                                                                     quantity=self.service_quantity)
        self.cloud_storage_service = cp_service_factory(
            channel_partner=self.cp, service_type=ChannelPartnerService.CLOUD_STORAGE)
        self.cloud_storage_service_record = service_record_factory(self.cloud_storage_service,
                                                                   cloud_system=self.system,
                                                                   organization=self.organization,
                                                                   quantity=self.service_quantity)
        self.cloud_storage_service_2 = cp_service_factory(
            channel_partner=self.cp, service_type=ChannelPartnerService.CLOUD_STORAGE)
        self.cloud_storage_service_record_2 = service_record_factory(self.cloud_storage_service_2,
                                                                     cloud_system=self.system,
                                                                     organization=self.organization,
                                                                     quantity=self.service_quantity)
        self.non_system_service = cp_service_factory(
            channel_partner=self.cp, service_type=ChannelPartnerService.CLOUD_STORAGE)
        self.service_types = {v: k for k, v in ChannelPartnerService.SERVICE_TYPE_CODES}
        self.client = APIClient(SERVER_NAME=cloud_test_host.hostname)
        self.token = f'{uuid4()}'
        self.auth_token = mock_internal_token_auth(self.token)
        self.auth = f'Bearer {self.token}'
        self.path = reverse('v3:cloud_storage_usage_report')
        self.headers = {"Authorization": self}

    def device_data(self, service_id):
        return {
            'id': f'{uuid4()}',
            'serviceId': str(service_id),
        }

    def test_401(self):
        data = {
            "usedDevices": {
                "cloudSystemId": str(self.system.system_id),
                "devices": [self.device_data(self.cloud_storage_service.id)]
            }
        }
        response = self.client.post(path=self.path, data=data, format='json')
        assert response.status_code == 401
        self.client.credentials(HTTP_AUTHORIZATION=f'{uuid4()}')
        response = self.client.post(path=self.path, data=data, format='json')
        assert response.status_code == 401


    def test_200_single_device(self):
        data = {
            "usedDevices": {
                "cloudSystemId": str(self.system.system_id),
                "devices": [
                    self.device_data(self.cloud_storage_service.id)
                ]
            }
        }
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        response = self.client.post(path=self.path, data=data, format='json')
        assert response.status_code == 200
        assert ServiceUsage.objects.all().count() == 1
        assert ServiceUsage.objects.first().service_id == self.cloud_storage_service.id
        assert ServiceUsage.objects.first().usage == 1


    def test_200_multiple_devices_single_service(self):
        data = {
            "usedDevices": {
                "cloudSystemId": str(self.system.system_id),
                "devices": [
                    self.device_data(self.cloud_storage_service.id),
                    self.device_data(self.cloud_storage_service.id),
                    self.device_data(self.cloud_storage_service.id),
                    self.device_data(self.cloud_storage_service.id),
                ]
            }
        }
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        response = self.client.post(path=self.path, data=data, format='json')
        assert response.status_code == 200
        assert ServiceUsage.objects.all().count() == 1
        assert ServiceUsage.objects.first().service_id == self.cloud_storage_service.id
        assert ServiceUsage.objects.first().usage == 4
        self.system.refresh_from_db()
        assert self.system.usage_issue_detected is False

    def test_200_multiple_devices_multiple_services(self):
        data = {
            "usedDevices": {
                "cloudSystemId": str(self.system.system_id),
                "devices": [
                    self.device_data(self.cloud_storage_service.id),
                    self.device_data(self.cloud_storage_service_2.id),
                    self.device_data(self.cloud_storage_service.id),
                    self.device_data(self.cloud_storage_service_2.id),
                    self.device_data(self.cloud_storage_service_2.id),
                ]
            }
        }
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        response = self.client.post(path=self.path, data=data, format='json')
        assert response.status_code == 200
        assert ServiceUsage.objects.all().count() == 2
        usage = ServiceUsage.objects.get(service_id=self.cloud_storage_service.id)
        assert usage.service_id == self.cloud_storage_service.id
        assert usage.usage == 2
        usage = ServiceUsage.objects.get(service_id=self.cloud_storage_service_2.id)
        assert usage.service_id == self.cloud_storage_service_2.id
        assert usage.usage == 3
        self.system.refresh_from_db()
        assert self.system.usage_issue_detected is False

    def test_200_multiple_devices_multiple_services_excess(self):
        data = {
            "usedDevices": {
                "cloudSystemId": str(self.system.system_id),
                "devices": [
                    self.device_data(self.cloud_storage_service.id)
                    for _ in range(self.service_quantity * 2)
                ]
            }
        }
        data['usedDevices']['devices'] += [self.device_data(self.cloud_storage_service_2.id)]
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        response = self.client.post(path=self.path, data=data, format='json')
        assert response.status_code == 200
        assert ServiceUsage.objects.all().count() == 2
        usage = ServiceUsage.objects.get(service_id=self.cloud_storage_service.id)
        assert usage.service_id == self.cloud_storage_service.id
        assert usage.usage == self.service_quantity * 2

        self.system.refresh_from_db()
        system = CloudSystemId.objects.get(system_id=self.system.system_id)
        assert self.system.usage_issue_detected is True
