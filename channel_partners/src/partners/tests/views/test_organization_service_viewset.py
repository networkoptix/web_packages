from decimal import Decimal
from uuid import uuid4

import pytest
from rest_framework.reverse import reverse
from rest_framework.test import APIClient

from partners.models import ChannelPartnerService, ServiceToOrganizationProperties


class TestOrganizationServiceViewSet:
    @pytest.fixture(autouse=True)
    def setup_method(self, channel_partner_factory, organization_factory, cp_user_factory,
                     cp_service_factory, cloud_test_host):
        self.channel_partner = channel_partner_factory()
        self.local_recording_service = cp_service_factory(channel_partner=self.channel_partner,
                                                          service_type=ChannelPartnerService.LOCAL_RECORDING)
        self.cloud_storage_service = cp_service_factory(channel_partner=self.channel_partner,
                                                        service_type=ChannelPartnerService.CLOUD_STORAGE)
        self.analytics_service = cp_service_factory(channel_partner=self.channel_partner,
                                                    service_type=ChannelPartnerService.ANALYTICS)
        self.organization = organization_factory(channel_partner=self.channel_partner)
        self.cp_user = cp_user_factory(channel_partner=self.channel_partner)
        self.client = APIClient(SERVER_NAME=cloud_test_host.hostname)
        self.list_path = reverse('channelpartners-owned-service-list',
                                 kwargs={'parent_lookup_organization': self.organization.id})
        self.detail_view_name = 'channelpartners-owned-service-detail'
        self.def_kwargs = {'parent_lookup_organization': self.organization.id}

    def test_partner_services(self):
        assert ChannelPartnerService.objects.count() == 3
        assert ServiceToOrganizationProperties.objects.count() == 0

    def test_list(self):
        self.client.force_authenticate(user=self.cp_user.user)
        response = self.client.get(self.list_path)
        assert response.status_code == 200
        assert len(response.data) == 3

    def test_retrieve(self, mock_auth_with_user):
        kwargs = {
            **self.def_kwargs,
            'service_id': self.cloud_storage_service.id
        }
        path = reverse(self.detail_view_name, kwargs=kwargs)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        mock_auth_with_user(self.cp_user)
        response = self.client.get(path)
        assert response.status_code == 200
        assert response.data['service']['id'] == str(self.cloud_storage_service.id)

    def test_update(self, mock_auth_with_user):
        kwargs = {
            **self.def_kwargs,
            'service_id': self.cloud_storage_service.id
        }
        data = {'price': 12}
        path = reverse(self.detail_view_name, kwargs=kwargs)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        mock_auth_with_user(self.cp_user)
        response = self.client.patch(path, data=data, format='json')
        assert response.status_code == 200
        assert response.data['service']['id'] == str(self.cloud_storage_service.id)
        assert response.data['price'] == '12.000'
