from uuid import uuid4

import pytest
from rest_framework.reverse import reverse
from rest_framework.test import APIClient

from partners.models import ServiceToSubChannelProperties


class TestChannelPartnerAvailableServiceViewSet:
    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, cp_service_factory, cp_user_factory, cloud_test_host):
        self.channel_partner = channel_partner_factory()
        self.cp_user = cp_user_factory(channel_partner=self.channel_partner)
        self.local_recording_service = cp_service_factory(
            channel_partner=self.channel_partner)
        self.sub_channel_partner = channel_partner_factory(
            parent_channel_partner=self.channel_partner)
        self.client = APIClient(SERVER_NAME=cloud_test_host.hostname)
        self.def_kwargs = {'parent_lookup_channel_partner': self.sub_channel_partner.id}

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