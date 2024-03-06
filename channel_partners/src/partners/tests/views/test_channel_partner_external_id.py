from uuid import uuid4

import pytest
from rest_framework.test import APIClient

from partners.models import ChannelPartnerExternalId


class TestChannelPartnerExternalIdViewsetPermission:
    @pytest.fixture(autouse=True)
    def setup(self, root_nx_channel_partner, channel_partner_factory, organization_factory,
              cp_user_factory, org_user_factory, cloud_test_host):
        self.cp = channel_partner_factory(parent_channel_partner=root_nx_channel_partner)
        self.sub_cp = channel_partner_factory(parent_channel_partner=self.cp)
        self.org = organization_factory(channel_partner=self.cp)
        self.org_user = org_user_factory(organization=self.org)
        self.nx_user = cp_user_factory(channel_partner=root_nx_channel_partner)
        self.cp_user = cp_user_factory(channel_partner=self.cp)
        self.sub_cp_user = cp_user_factory(channel_partner=self.sub_cp)
        self.ext_ids = [
            ChannelPartnerExternalId.objects.create(
                channel_partner=channel_partner_factory(parent_channel_partner=self.cp),
                custom_id=f"{uuid4()}",
                created_by=self.cp,
            )
            for _ in range(5)
        ]
        self.list_view_name = 'channelpartner-externalid-list'
        # self.list_url = reverse(self.list_view_name, kwargs={'channel_partner_id': str(self.cp.id)})
        self.list_url = f'/partners/api/v2/channel_partners/{self.cp.id}/external_ids/'
        self.detail_view_name = 'channelpartner-externalid-detail'
        self.client = APIClient(SERVER_NAME=cloud_test_host.hostname)


    def test_list_200(self, mock_auth_with_user):
        mock_auth_with_user(self.cp_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        response = self.client.get(path=self.list_url)
        assert response.status_code == 200
        assert len(response.data) == 5

    def test_list_404_parent_user(self, mock_auth_with_user):
        mock_auth_with_user(self.nx_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        response = self.client.get(path=self.list_url)
        assert response.status_code == 404

    def test_list_404_child_user(self, mock_auth_with_user):
        mock_auth_with_user(self.sub_cp_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        response = self.client.get(path=self.list_url)
        assert response.status_code == 404

    def test_list_404_org_user(self, mock_auth_with_user):
        mock_auth_with_user(self.org_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        response = self.client.get(path=self.list_url)
        assert response.status_code == 404
