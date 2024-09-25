from uuid import uuid4

import pytest
from rest_framework.reverse import reverse
from rest_framework.test import APIClient

from partners.models import (
    ChannelPartnerService,
    ServiceToOrganizationProperties,
)


class TestOrganizationServiceViewSet:
    @pytest.fixture(autouse=True)
    def setup_method(
            self,
            channel_partner_factory,
            organization_factory,
            cp_user_factory,
            cp_service_factory,
            cloud_test_host):
        # Create a channel partner
        self.channel_partner = channel_partner_factory()

        # Create services for the channel partner
        self.local_recording_service = cp_service_factory(
            channel_partner=self.channel_partner,
            service_type=ChannelPartnerService.LOCAL_RECORDING)
        self.cloud_storage_service = cp_service_factory(
            channel_partner=self.channel_partner,
            service_type=ChannelPartnerService.CLOUD_STORAGE)
        self.analytics_service = cp_service_factory(
            channel_partner=self.channel_partner,
            service_type=ChannelPartnerService.ANALYTICS)

        # Create a disabled service for the channel partner
        self.disabled_service = cp_service_factory(
            channel_partner=self.channel_partner,
            service_type=ChannelPartnerService.ANALYTICS,
            is_enabled=False)

        # Create an organization for the channel partner
        self.organization = organization_factory(
            channel_partner=self.channel_partner)

        # Create a user for the channel partner
        self.cp_user = cp_user_factory(
            channel_partner=self.channel_partner)

        # Initialize the APIClient
        self.client = APIClient(SERVER_NAME=cloud_test_host.hostname)

        # Define the list path and detail view name
        self.list_path = reverse('v2:organizations-owned-service-list',
                                 kwargs={'parent_lookup_organization': self.organization.id})
        self.detail_view_name = 'v2:organizations-owned-service-detail'

        # Define default kwargs
        self.def_kwargs = {'parent_lookup_organization': self.organization.id}

    def test_partner_services(self):
        all_services_count = ChannelPartnerService.objects.count()
        assert all_services_count == 4

        non_disabled_services_count = ChannelPartnerService.objects.filter(enabled=True).count()
        assert non_disabled_services_count == 3

        assert ServiceToOrganizationProperties.objects.count() == 0

    def test_list(self):
        self.client.force_authenticate(user=self.cp_user.user)
        response = self.client.get(self.list_path)
        assert response.status_code == 200
        assert len(response.data) == 3

    def test_retrieve_enabled(self, mock_auth_with_user):
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

    def test_retrieve_disabled(self, mock_auth_with_user):
        kwargs = {
            **self.def_kwargs,
            'service_id': self.disabled_service.id
        }
        path = reverse(self.detail_view_name, kwargs=kwargs)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        mock_auth_with_user(self.cp_user)
        response = self.client.get(path)
        assert response.status_code == 404

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

    def test_price_history(self, mock_auth_with_user):
        kwargs = {
            **self.def_kwargs,
            'service_id': self.cloud_storage_service.id
        }
        init_price = 10
        service_props = ServiceToOrganizationProperties.objects.create(
            organization=self.organization,
            service=self.cloud_storage_service,
            price=init_price
        )
        for i in range(10):
            service_props.price = init_price + i
            service_props.save()
        path = reverse('v2:organizations-owned-service-price-history', kwargs=kwargs)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        mock_auth_with_user(self.cp_user)
        response = self.client.get(path)
        assert response.status_code == 200
        assert len(response.data) == 10
        first = response.data[0]
        assert len(first) == 2
        assert first['price'] == '10.000'
        assert first['createdTs'][:-1] in service_props.created_ts.isoformat()
        last = response.data[-1]
        assert last['price'] == '19.000'
        assert last['createdTs'][:-1] not in service_props.created_ts.isoformat()
