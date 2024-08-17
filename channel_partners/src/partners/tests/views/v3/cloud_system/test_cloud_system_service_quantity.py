from datetime import timedelta
from uuid import uuid4

import pytest
from django.utils import timezone
from drf_standardized_errors.types import ErrorType
from rest_framework.reverse import reverse
from rest_framework.test import APIClient

from partners.models import (
    ChannelPartnerService,
    ChannelPartnerStates,
    CloudSystemStates,
    ServiceUsage,
    SystemServiceCurrentQuantity,
)
from tools.exception import ErrorCodes


class TestCloudSystemViewSetServiceQuantityV3:
    @pytest.fixture(autouse=True)
    def setup(self,
              channel_partner_factory,
              cp_user_factory,
              organization_factory,
              org_user_factory,
              v3arf,
              system_factory,
              cp_service_factory,
              service_record_factory,
              service_usage_factory,
              cloud_storage_usage_factory,
              cloud_test_host):
        self.quantity = 10
        usage_storage = 9
        usage_recording = int(ServiceUsage.get_usage_from_quantity(ChannelPartnerService.LOCAL_RECORDING, 1.1))
        now = timezone.now()
        self.channel_partner = channel_partner_factory()
        self.channel_partner_user = cp_user_factory(channel_partner=self.channel_partner)
        self.organization = organization_factory(channel_partner=self.channel_partner)
        self.organization_user = org_user_factory(organization=self.organization)
        self.system = system_factory(organization=self.organization)

        self.local_recording_service = cp_service_factory(
            channel_partner=self.channel_partner, service_type=ChannelPartnerService.LOCAL_RECORDING)
        self.analytics_service = cp_service_factory(
            channel_partner=self.channel_partner, service_type=ChannelPartnerService.ANALYTICS)
        self.cloud_storage_service = cp_service_factory(
            channel_partner=self.channel_partner, service_type=ChannelPartnerService.CLOUD_STORAGE)
        self.disabled_service = cp_service_factory(channel_partner=self.channel_partner, is_enabled=False)
        self.expired_service = cp_service_factory(
            channel_partner=self.channel_partner,
            sub_type=ChannelPartnerService.TRIAL,
            duration=1,
        )
        service_record_factory(self.local_recording_service, cloud_system=self.system, quantity=self.quantity)
        service_record_factory(self.cloud_storage_service, cloud_system=self.system, quantity=self.quantity)
        service_record_factory(self.analytics_service, cloud_system=self.system, quantity=self.quantity)

        service_record_factory(
            service=self.expired_service,
            cloud_system=self.system,
            quantity=10,
            created_ts=timezone.now() - timedelta(days=40),
        )

        SystemServiceCurrentQuantity.objects.create(
            cloud_system=self.system,
            organization=self.organization,
            service=self.local_recording_service,
            quantity=self.quantity
        )
        SystemServiceCurrentQuantity.objects.create(
            cloud_system=self.system,
            organization=self.organization,
            service=self.cloud_storage_service,
            quantity=self.quantity * 2
        )

        self.client = APIClient(SERVER_NAME=cloud_test_host.hostname)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        self.path = reverse('v3:cloudsystem-service-quantity', kwargs={'id': self.system.system_id})

    def test_service_quantity_get(self, mock_auth_with_user):
        mock_auth_with_user(self.channel_partner_user)
        response = self.client.get(self.path)
        assert response.status_code == 200
        assert len(response.data) == 4
        service_data = next(filter(lambda x: x['serviceId'] == str(self.local_recording_service.id), response.data))
        assert service_data['used'] == self.quantity
        assert service_data['quantity'] == self.quantity
        service_data = next(filter(lambda x: x['serviceId'] == str(self.cloud_storage_service.id), response.data))
        assert service_data['used'] == self.quantity * 2
        assert service_data['quantity'] == self.quantity
        service_data = next(filter(lambda x: x['serviceId'] == str(self.analytics_service.id), response.data))
        assert service_data['used'] == 0
        assert service_data['quantity'] == self.quantity
        service_data = next(filter(lambda x: x['serviceId'] == str(self.expired_service.id), response.data))
        assert service_data['used'] == 0
        assert service_data['quantity'] == 10


    def test_service_quantity_patch_disabled_service(self, mock_auth_with_user):
        mock_auth_with_user(self.channel_partner_user)
        data = [
            {"serviceId": str(self.disabled_service.id), "quantity": 15}
        ]
        response = self.client.patch(self.path, data=data, format='json')
        assert response.status_code == 400
        assert response.data['type'] == ErrorType.VALIDATION_ERROR
        assert response.data['errors'][0]['code'] == ErrorCodes.service_disabled
        assert response.data['errors'][0]['attr'] == '0.serviceId'
        assert response.data['errors'][0]['detail'] == f'Service {self.disabled_service.id} is disabled.'

    def test_service_quantity_patch_expired_service(self, mock_auth_with_user):
        mock_auth_with_user(self.channel_partner_user)
        data = [
            {"serviceId": str(self.expired_service.id), "quantity": 15}
        ]
        response = self.client.patch(self.path, data=data, format='json')
        assert response.status_code == 400
        assert response.data['type'] == ErrorType.VALIDATION_ERROR
        assert response.data['errors'][0]['attr'] == '0.serviceId'
        assert response.data['errors'][0]['detail'] == f'Service {self.expired_service.id} is expired.'
        assert response.data['errors'][0]['code'] == ErrorCodes.service_expired

    @pytest.mark.parametrize('state, system_status', [
        (ChannelPartnerStates.ACTIVE, CloudSystemStates.NOT_ACTIVATED),
        (ChannelPartnerStates.SHUTDOWN, CloudSystemStates.ACTIVATED),
    ])
    def test_service_quantity_patch_inactive_system(self, state, system_status, mock_auth_with_user):
        self.system.state = state
        self.system.system_state = system_status
        self.system.save()
        mock_auth_with_user(self.channel_partner_user)
        data = [
            {"serviceId": str(self.expired_service.id), "quantity": 15}
        ]
        response = self.client.patch(self.path, data=data, format='json')
        assert response.status_code == 400
        assert response.data['type'] == ErrorType.VALIDATION_ERROR
        assert response.data['errors'][0]['attr'] is None
        assert response.data['errors'][0]['detail'] == f'System is not activated.'
        assert response.data['errors'][0]['code'] == 'invalid'

    def test_busy_lock(self, mock_auth_with_user, mocker):
        mock_auth_with_user(self.channel_partner_user)
        data = [
            {"serviceId": str(self.local_recording_service.id), "quantity": 15}
        ]
        mocker.patch('nx_django_redis.redis_cache.RedisSyncBackend.add', return_value=False)
        response = self.client.patch(self.path, data=data, format='json')
        assert response.status_code == 429
        assert response['Retry-After'] == '2'

    def test_service_quantity_patch_single_service(self, mock_auth_with_user, mocker):
        mock_auth_with_user(self.channel_partner_user)
        data = [
            {"serviceId": str(self.local_recording_service.id), "quantity": 15}
        ]
        mocker.patch('partners.services.cloud_system_service.CloudSystemService.notify_service_change')
        response = self.client.patch(self.path, data=data, format='json')
        assert response.status_code == 200
        assert len(response.data) == 4
        service_data = next(filter(lambda x: x['serviceId'] == str(self.local_recording_service.id), response.data))
        assert service_data['used'] == self.quantity
        assert service_data['quantity'] == 15
        service_data = next(filter(lambda x: x['serviceId'] == str(self.cloud_storage_service.id), response.data))
        assert service_data['used'] == self.quantity * 2
        assert service_data['quantity'] == self.quantity
        service_data = next(filter(lambda x: x['serviceId'] == str(self.analytics_service.id), response.data))
        assert service_data['used'] == 0
        assert service_data['quantity'] == self.quantity
        service_data = next(filter(lambda x: x['serviceId'] == str(self.expired_service.id), response.data))
        assert service_data['used'] == 0
        assert service_data['quantity'] == 10

    def test_service_quantity_patch_multiple_services(self, mock_auth_with_user, mocker):
        mock_auth_with_user(self.channel_partner_user)
        data = [
            {"serviceId": str(self.local_recording_service.id), "quantity": 15},
            {"serviceId": str(self.analytics_service.id), "quantity": 15}
        ]
        mocker.patch('partners.services.cloud_system_service.CloudSystemService.notify_service_change')
        response = self.client.patch(self.path, data=data, format='json')
        assert response.status_code == 200
        assert len(response.data) == 4
        service_data = next(filter(lambda x: x['serviceId'] == str(self.local_recording_service.id), response.data))
        assert service_data['used'] == self.quantity
        assert service_data['quantity'] == 15
        service_data = next(filter(lambda x: x['serviceId'] == str(self.cloud_storage_service.id), response.data))
        assert service_data['used'] == self.quantity * 2
        assert service_data['quantity'] == self.quantity
        service_data = next(filter(lambda x: x['serviceId'] == str(self.analytics_service.id), response.data))
        assert service_data['used'] == 0
        assert service_data['quantity'] == 15
        service_data = next(filter(lambda x: x['serviceId'] == str(self.expired_service.id), response.data))
        assert service_data['used'] == 0
        assert service_data['quantity'] == 10
