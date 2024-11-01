from uuid import uuid4

import pytest
from rest_framework.reverse import reverse
from rest_framework.test import APIClient

from partners.models import ServiceToSubChannelProperties


class TestChannelPartnerAvailableServiceViewSet:
    @pytest.fixture(autouse=True)
    def setup(self,
              channel_partner_factory,
              cp_service_factory,
              cp_user_factory,
              cloud_test_host,
              organization_factory,
              org_user_factory):
        self.parent_channel_partner = channel_partner_factory()
        self.parent_service = cp_service_factory(channel_partner=self.parent_channel_partner)
        self.parent_cp_user = cp_user_factory(channel_partner=self.parent_channel_partner)
        self.channel_partner = channel_partner_factory(parent_channel_partner=self.parent_channel_partner)
        self.cp_user = cp_user_factory(channel_partner=self.channel_partner)
        self.local_recording_service = cp_service_factory(
            channel_partner=self.channel_partner)
        self.sub_channel_partner = channel_partner_factory(
            parent_channel_partner=self.channel_partner)
        self.sub_cp_user = cp_user_factory(channel_partner=self.sub_channel_partner)
        self.client = APIClient(SERVER_NAME=cloud_test_host.hostname)
        self.def_kwargs = {'parent_lookup_channel_partner': self.sub_channel_partner.id}
        self.organization = organization_factory(channel_partner=self.channel_partner)
        self.org_user = org_user_factory(organization=self.organization)

    def test_price_history(self, mock_auth_with_user):
        kwargs = {
            **self.def_kwargs,
            'service_id': self.local_recording_service.id
        }
        init_price = 10
        service_props = ServiceToSubChannelProperties.objects.create(
            channel_partner=self.sub_channel_partner,
            service=self.local_recording_service,
            price=init_price
        )
        for i in range(10):
            service_props.price = init_price + i
            service_props.save()
        path = reverse('v2:channelpartners-available-service-price-history', kwargs=kwargs)
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

    def test_create_missing(self, mock_auth_with_user):
        path = reverse('v2:channelpartners-available-service-list', kwargs=self.def_kwargs)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        mock_auth_with_user(self.cp_user)
        response = self.client.get(path)
        assert response.status_code == 200
        available_services = list(self.channel_partner.services.all())
        services_props = ServiceToSubChannelProperties.objects.filter(
            channel_partner=self.sub_channel_partner
        )
        assert len(available_services) == services_props.count()
        for service in services_props:
            assert service.service in available_services

    @pytest.mark.parametrize(
        ['user_attr', 'list_code', 'retrieve_code', 'update_code', 'price_history_code'],
        [
            ('parent_cp_user', 200, 200, 200, 200),
            ('cp_user', 200, 200, 403, 200),
            ('org_user', 403, 403, 403, 403),
            ('sub_cp_user', 403, 403, 403, 403),
        ]
    )
    def test_permissions(self, user_attr, list_code, retrieve_code, update_code, price_history_code, mock_auth_with_user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        user = getattr(self, user_attr)
        mock_auth_with_user(user)

        list_path = reverse('v2:channelpartners-available-service-list',
                            kwargs={'parent_lookup_channel_partner': self.channel_partner.id})
        list_response = self.client.get(list_path)
        assert list_response.status_code == list_code
        detail_kwargs = {
            'parent_lookup_channel_partner': self.channel_partner.id,
            'service_id': self.parent_service.id
        }

        retrieve_path = reverse('v2:channelpartners-available-service-detail', kwargs=detail_kwargs)
        retrieve_response = self.client.get(retrieve_path)
        assert retrieve_response.status_code == retrieve_code

        update_response = self.client.patch(retrieve_path, data={'price': 12}, format='json')
        assert update_response.status_code == update_code

        price_history_path = reverse('v2:channelpartners-available-service-price-history', kwargs=detail_kwargs)
        price_history_response = self.client.get(price_history_path)
        assert price_history_response.status_code == price_history_code
