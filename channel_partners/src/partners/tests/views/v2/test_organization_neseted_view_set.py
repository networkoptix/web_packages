from uuid import uuid4

import pytest
from django.urls import reverse
from rest_framework.test import APIClient


class TestOrganizationNesetedViewSet:
    @pytest.fixture(autouse=True)
    def setup_method(self, channel_partner_factory, organization_factory, cp_user_factory,
                     org_user_factory, sys_group_user_factory, cloud_test_host):
        self.cp_lvl_0 = channel_partner_factory()
        self.cp_lvl_1 = channel_partner_factory(parent_channel_partner=self.cp_lvl_0)
        self.cp_lvl_1_1 = channel_partner_factory(parent_channel_partner=self.cp_lvl_0)
        self.cp_lvl_2 = channel_partner_factory(parent_channel_partner=self.cp_lvl_1)
        self.cp_lvl_2_1 = channel_partner_factory(parent_channel_partner=self.cp_lvl_1)
        self.cp_lvl_3 = channel_partner_factory(parent_channel_partner=self.cp_lvl_2)
        self.cp_user_lvl_0 = cp_user_factory(channel_partner=self.cp_lvl_0)
        self.cp_user_lvl_1 = cp_user_factory(channel_partner=self.cp_lvl_1)
        self.cp_user_lvl_1_1 = cp_user_factory(channel_partner=self.cp_lvl_1_1)
        self.cp_user_lvl_2 = cp_user_factory(channel_partner=self.cp_lvl_2)
        self.cp_user_lvl_2_1 = cp_user_factory(channel_partner=self.cp_lvl_2_1)
        self.cp_user_lvl_3 = cp_user_factory(channel_partner=self.cp_lvl_3)
        self.org = organization_factory(channel_partner=self.cp_lvl_2)
        self.org_user = org_user_factory(organization=self.org)
        self.users_with_access = [
            self.cp_user_lvl_0,
            self.cp_user_lvl_1,
            self.cp_user_lvl_2,
        ]
        self.users_without_access = [
            self.cp_user_lvl_1_1,
            self.cp_user_lvl_2_1,
            self.cp_user_lvl_3,
            self.org_user
        ]
        self.list_url = reverse('v2:channelpartners-organization-list',
                                kwargs={'parent_lookup_channel_partner': self.cp_lvl_2.id})
        self.client = APIClient(SERVER_NAME=cloud_test_host.hostname)

    def test_list_200(self, mock_auth_with_user):
        for user in self.users_with_access:
            mock_auth_with_user(user)
            self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
            response = self.client.get(self.list_url)
            assert response.status_code == 200
            assert len(response.data['results']) == 1

    def test_list_403(self, mock_auth_with_user):
        for user in self.users_without_access:
            mock_auth_with_user(user)
            self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
            response = self.client.get(self.list_url)
            assert response.status_code == 403