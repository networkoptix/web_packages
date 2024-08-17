from uuid import uuid4

import pytest
from django.core.cache import caches
from mock import MagicMock
from rest_framework.reverse import reverse
from rest_framework.test import APIClient

from partners.models import (
    ChannelPartnerRoles,
    OrganizationRoles,
    VmsRoles,
)


class TestCloudSystemViewSetPermissions:
    @pytest.fixture(autouse=True, scope='function')
    def setup(self,
              root_nx_channel_partner,
              channel_partner_factory,
              organization_factory,
              system_factory,
              cp_user_factory,
              org_user_factory,
              cloud_user_factory,
              cloud_test_host,
              sys_group_user_factory,
              system_group_factory):
        self.root_user = cp_user_factory(channel_partner=root_nx_channel_partner)

        self.cp_lvl_1 = channel_partner_factory(parent_channel_partner=root_nx_channel_partner)
        self.cp_admin_lvl_1 = cp_user_factory(channel_partner=self.cp_lvl_1)
        self.cp_manager_lvl_1 = cp_user_factory(channel_partner=self.cp_lvl_1, role=ChannelPartnerRoles.MANAGER)
        self.cp_accountant_lvl_1 = cp_user_factory(channel_partner=self.cp_lvl_1, role=ChannelPartnerRoles.REPORTS_VIEWER)
        self.org_lvl_1 = organization_factory(channel_partner=self.cp_lvl_1)
        self.org_admin_lvl_1 = org_user_factory(organization=self.org_lvl_1)
        self.org_viewer_lvl_1 = org_user_factory(organization=self.org_lvl_1, role=OrganizationRoles.VIEWER)
        self.group_user_lvl_1 = sys_group_user_factory(self.org_lvl_1)
        self.system_lvl_1 = system_factory(organization=self.org_lvl_1)

        self.cp_lvl_2 = channel_partner_factory(parent_channel_partner=self.cp_lvl_1)
        self.cp_admin_lvl_2 = cp_user_factory(channel_partner=self.cp_lvl_2)
        self.cp_manager_lvl_2 = cp_user_factory(channel_partner=self.cp_lvl_2, role=ChannelPartnerRoles.MANAGER)
        self.cp_accountant_lvl_2 = cp_user_factory(channel_partner=self.cp_lvl_2, role=ChannelPartnerRoles.REPORTS_VIEWER)
        self.org_lvl_2 = organization_factory(channel_partner=self.cp_lvl_2)
        self.org_admin_lvl_2 = org_user_factory(organization=self.org_lvl_2)
        self.org_viewer_lvl_2 = org_user_factory(organization=self.org_lvl_2, role=OrganizationRoles.VIEWER)
        self.group_user_lvl_2 = sys_group_user_factory(self.org_lvl_2)
        self.system_lvl_2 = system_factory(organization=self.org_lvl_2)

        self.cp_lvl_3 = channel_partner_factory(parent_channel_partner=self.cp_lvl_2)
        self.cp_admin_lvl_3 = cp_user_factory(channel_partner=self.cp_lvl_3)
        self.cp_manager_lvl_3 = cp_user_factory(channel_partner=self.cp_lvl_3, role=ChannelPartnerRoles.MANAGER)
        self.cp_accountant_lvl_3 = cp_user_factory(channel_partner=self.cp_lvl_3, role=ChannelPartnerRoles.REPORTS_VIEWER)
        self.org_lvl_3 = organization_factory(channel_partner=self.cp_lvl_3)
        self.org_admin_lvl_3 = org_user_factory(organization=self.org_lvl_3)
        self.org_viewer_lvl_3 = org_user_factory(organization=self.org_lvl_3, role=OrganizationRoles.VIEWER)
        self.group_lvl_3 = system_group_factory(organization=self.org_lvl_3)
        self.group_user_lvl_3 = sys_group_user_factory(self.org_lvl_3, group=self.group_lvl_3)
        self.system_lvl_3 = system_factory(organization=self.org_lvl_3)
        self.system_lvl_3_1 = system_factory(organization=self.org_lvl_3, system_group=self.group_lvl_3)

        self.cp_other = channel_partner_factory(parent_channel_partner=root_nx_channel_partner)
        self.cp_admin_other = cp_user_factory(channel_partner=self.cp_other)
        self.org_other = organization_factory(channel_partner=self.cp_other)
        self.org_admin_other = org_user_factory(organization=self.org_other)
        self.org_viewer_other = org_user_factory(organization=self.org_other, role=OrganizationRoles.VIEWER)
        self.group_user_other = sys_group_user_factory(self.org_other)

        self.client = APIClient(SERVER_NAME=cloud_test_host.hostname)
        self.path_list = reverse('v3:cloudsystem-list')
        self.kwargs_lvl_1 = {'id': str(self.system_lvl_1.system_id)}
        self.kwargs_lvl_2 = {'id': str(self.system_lvl_2.system_id)}
        self.kwargs_lvl_3 = {'id': str(self.system_lvl_3.system_id)}
        self.kwargs_lvl_3_1 = {'id': str(self.system_lvl_3_1.system_id)}
        caches['default'].clear()

    @property
    def auth(self):
        return f'Bearer {uuid4()}'

    def test_list_cp_user(self, mock_auth_with_user):
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_1)

        response = self.client.get(path=self.path_list)
        # TODO. Check if this endpoint must be deprecated
        assert response.status_code == 405
        # assert len(response.data['results']) == 0

    def test_list_org_user(self, mock_auth_with_user):
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.org_admin_lvl_1)
        response = self.client.get(path=self.path_list)
        # TODO. Check if this endpoint must be deprecated
        assert response.status_code == 405
        # assert len(response.data['results']) == 0

    def test_retrieve_cp_user(self, mock_auth_with_user):
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.root_user)
        view_name = 'v3:cloudsystem-detail'
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_retrieve_org_user(self, mock_auth_with_user):
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v3:cloudsystem-detail'

        mock_auth_with_user(self.org_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.org_viewer_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.group_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3_1)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.group_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_viewer_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.group_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_partial_update_cp_users(self, mock_auth_with_user):

        view_name = 'v3:cloudsystem-detail'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.root_user)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_accountant_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 200

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.patch(path=path)
        assert response.status_code == 403

    def test_system_usage_report_org_users(self, mock_cdb_basic_auth, mock_auth_with_user):
        view_name = 'v3:cloudsystem-system-usage-report'

        auth = mock_cdb_basic_auth(self.system_lvl_1)
        self.client.credentials(HTTP_AUTHORIZATION=auth)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.post(path=path)
        assert response.status_code == 403

        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.post(path=path)
        assert response.status_code == 400

        mock_auth_with_user(self.org_admin_lvl_1)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)

        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.post(path=path)
        assert response.status_code == 403

    def test_service_quantity_cp_users(self, mock_auth_with_user):

        view_name = 'v3:cloudsystem-service-quantity'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.root_user)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_service_quantity_org_users(self, mock_auth_with_user):

        view_name = 'v3:cloudsystem-service-quantity'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)

        mock_auth_with_user(self.org_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.org_viewer_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_services_cp_users(self, mock_auth_with_user):

        view_name = 'v3:cloudsystem-services'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.root_user)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_services_org_users(self, mock_auth_with_user):

        view_name = 'v3:cloudsystem-services'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)

        mock_auth_with_user(self.org_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.org_viewer_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.group_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3_1)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.group_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_service_quantity_patch_org_users(self, mock_auth_with_user):
        view_name = 'v3:cloudsystem-service-quantity'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)

        mock_auth_with_user(self.org_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.patch(path=path)
        assert response.status_code == 403

    def test_service_quantity_patch_cp_user(self, mock_auth_with_user):
        view_name = 'v3:cloudsystem-service-quantity'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)

        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 400

        mock_auth_with_user(self.cp_manager_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 400

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.patch(path=path)
        assert response.status_code == 403

    def test_destroy_cp_users(self, mock_auth_with_user, mocker):
        view_name = 'v3:cloudsystem-detail'
        cdb_response = MagicMock()
        cdb_response.status_code = 200
        mocker.patch('nx_cloud_api_client.apis.CdbSystemAPIBase.delete_system', return_value=cdb_response)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.root_user)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.delete(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.delete(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.delete(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.delete(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.delete(path=path)
        assert response.status_code == 403

        # 401 raised after permission check
        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.delete(path=path)
        assert response.status_code == 204

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.delete(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.delete(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.delete(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_destroy_org_users(self, mock_auth_with_user, mocker):
        view_name = 'v3:cloudsystem-detail'
        cdb_response = MagicMock()
        cdb_response.status_code = 200
        mocker.patch('nx_cloud_api_client.apis.CdbSystemAPIBase.delete_system', return_value=cdb_response)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)

        mock_auth_with_user(self.org_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.delete(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.delete(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.delete(path=path)
        assert response.status_code == 204

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.delete(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.delete(path=path)
        assert response.status_code == 403

    def test_saas_report_org_users(self, mock_auth_with_user, mocker):
        view_name = 'v3:cloudsystem-saas-report'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)

        mock_auth_with_user(self.org_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.org_viewer_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.group_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.group_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3_1)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_saas_report_cp_users(self, mock_auth_with_user, mocker):

        view_name = 'v3:cloudsystem-saas-report'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.root_user)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_retrieve_system_user_jwt_expired(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, jwt_is_valid=False)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v3:cloudsystem-detail'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 401

    def test_retrieve_system_user_ok(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, system_role=VmsRoles.ADMINISTRATOR)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v3:cloudsystem-detail'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 200

    def test_retrieve_system_user_no_roles(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, system_role=None)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v3:cloudsystem-detail'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 200

    def test_retrieve_system_user_no_system(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=None)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v3:cloudsystem-detail'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_retrieve_system_user_viewer_ok(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, system_role=VmsRoles.VIEWER)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v3:cloudsystem-detail'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 200

    def test_saas_report_system_viewer(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, system_role=VmsRoles.VIEWER)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v3:cloudsystem-saas-report'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 200

    def test_saas_report_system_admin(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, system_role=VmsRoles.ADMINISTRATOR)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v3:cloudsystem-saas-report'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 200

    def test_saas_report_system_user_no_roles(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, system_role=None)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v3:cloudsystem-saas-report'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_service_quantity_system_viewer(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, system_role=VmsRoles.VIEWER)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v3:cloudsystem-service-quantity'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 200

    def test_service_quantity_system_admin(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, system_role=VmsRoles.ADMINISTRATOR)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v3:cloudsystem-service-quantity'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 200

    def test_service_quantity_system_user_no_roles(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, system_role=None)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v3:cloudsystem-service-quantity'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 200

    def test_services_system_viewer(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, system_role=VmsRoles.VIEWER)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v3:cloudsystem-services'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 200

    def test_services_system_admin(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, system_role=VmsRoles.ADMINISTRATOR)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v3:cloudsystem-services'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 200

    def test_services_system_user_no_roles(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, system_role=None)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v3:cloudsystem-services'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 200

    def test_migrate_legacy_licenses_system_viewer(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, system_role=VmsRoles.VIEWER)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v3:cloudsystem-migrate-legacy-licenses'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.post(path=path)
        # validation error expected
        assert response.status_code == 400
        assert response.data

    def test_migrate_legacy_licenses_system_admin(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, system_role=VmsRoles.ADMINISTRATOR)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v3:cloudsystem-migrate-legacy-licenses'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.post(path=path)
        # validation error expected
        assert response.status_code == 400
        assert response.data

    def test_migrate_legacy_licenses_system_user_no_roles(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, system_role=None)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v3:cloudsystem-migrate-legacy-licenses'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.post(path=path)
        assert response.status_code == 403

    def test_invalid_method_405(self, mock_cdb_basic_auth, mock_auth_with_user):
        view_name = 'v3:cloudsystem-system-usage-report'

        auth = mock_cdb_basic_auth(self.system_lvl_1)
        self.client.credentials(HTTP_AUTHORIZATION=auth)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 405
