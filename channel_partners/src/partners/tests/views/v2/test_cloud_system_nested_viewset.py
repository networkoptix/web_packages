from uuid import uuid4

import pytest
from django.core.cache import caches
from rest_framework.reverse import reverse
from rest_framework.test import APIClient

from partners.models import (
    ChannelPartnerRoles,
    CloudSystemId,
    OrganizationRoles,
)
from tools.helpers import cast_uuid


class TestCloudSystemNestedViewSet:
    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, cp_user_factory,
              organization_factory, org_user_factory,
              system_group_factory, sys_group_user_factory,
              system_factory, cloud_test_host):

        self.parent_cp = channel_partner_factory()
        self.parent_cp_admin = cp_user_factory(channel_partner=self.parent_cp)

        self.cp = channel_partner_factory(parent_channel_partner=self.parent_cp)
        self.cp_admin = cp_user_factory(channel_partner=self.cp)

        self.organization = organization_factory(channel_partner=self.cp)
        self.organization_admin = org_user_factory(organization=self.organization)

        self.other_organization = organization_factory(channel_partner=self.cp)
        self.system_group_0 = system_group_factory(organization=self.organization)
        self.system_group_0_admin = sys_group_user_factory(organization=self.organization, group=self.system_group_0)
        self.system_group_1 = system_group_factory(organization=self.organization)
        self.system_group_1_admin = sys_group_user_factory(organization=self.organization, group=self.system_group_1)
        self.system_group_0_0 = system_group_factory(organization=self.organization, parent=self.system_group_0)
        self.system_group_0_0_admin = sys_group_user_factory(organization=self.organization, group=self.system_group_0_0)
        self.system_group_1_0 = system_group_factory(organization=self.organization, parent=self.system_group_1)
        self.system_group_1_0_admin = sys_group_user_factory(organization=self.organization, group=self.system_group_1_0)
        self.other_organization_group = system_group_factory(organization=self.other_organization)
        self.organization_sys = system_factory(organization=self.organization)
        self.system_group_0_sys = system_factory(organization=self.organization, system_group=self.system_group_0)
        self.system_group_1_sys = system_factory(organization=self.organization, system_group=self.system_group_1)
        self.system_group_0_0_sys = system_factory(organization=self.organization, system_group=self.system_group_0_0)
        self.system_group_1_0_sys = system_factory(organization=self.organization, system_group=self.system_group_1_0)
        self.other_organization_sys = system_factory(organization=self.other_organization)
        self.other_organization_group_sys = system_factory(organization=self.other_organization,
                                                           system_group=self.other_organization_group)
        self.client = APIClient(SERVER_NAME=cloud_test_host.hostname)
        view_name = 'organizations-cloudsystem-user-systems'
        kwargs = {'parent_lookup_organization': self.organization.id}
        self.path = reverse(view_name, kwargs=kwargs)

    def test_initial(self):
        assert CloudSystemId.objects.filter(organization=self.organization).count() == 5

    def test_parent_cp_user_200(self, mock_auth_with_user):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {uuid4()}")
        mock_auth_with_user(self.parent_cp_admin)
        response = self.client.get(self.path)
        assert response.status_code == 200
        assert response.data['results'].__len__() == 5

    def test_cp_user_200(self, mock_auth_with_user):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {uuid4()}")
        mock_auth_with_user(self.cp_admin)
        response = self.client.get(self.path)
        assert response.status_code == 200
        assert response.data['results'].__len__() == 5

    def test_organization_user_200(self, mock_auth_with_user):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {uuid4()}")
        mock_auth_with_user(self.organization_admin)
        response = self.client.get(self.path)
        assert response.status_code == 200
        assert response.data['results'].__len__() == 5

    def test_bottom_group_user_200(self, mock_auth_with_user):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {uuid4()}")
        mock_auth_with_user(self.system_group_0_0_admin)
        response = self.client.get(self.path)
        assert response.status_code == 200
        assert response.data['results'].__len__() == 1
        assert cast_uuid(response.data['results'][0]['systemId']) == self.system_group_0_0_sys.system_id

    def test_top_group_user_200(self, mock_auth_with_user):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {uuid4()}")
        ids = [self.system_group_0_0_sys.system_id, self.system_group_0_sys.system_id]
        mock_auth_with_user(self.system_group_0_admin)
        response = self.client.get(self.path)
        assert response.status_code == 200
        assert response.data['results'].__len__() == 2
        assert cast_uuid(response.data['results'][0]['systemId']) in ids
        assert cast_uuid(response.data['results'][1]['systemId']) in ids

    def test_multiple_branches_user_200(self, mock_auth_with_user, sys_group_user_factory):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {uuid4()}")
        user = sys_group_user_factory(organization=self.organization,
                                      cloud_user=self.system_group_0_admin.user,
                                      group=self.system_group_1_0)
        ids = [self.system_group_0_0_sys.system_id,
               self.system_group_0_sys.system_id,
               self.system_group_1_0_sys.system_id]
        mock_auth_with_user(self.system_group_0_admin)
        response = self.client.get(self.path)
        assert response.status_code == 200
        assert response.data['results'].__len__() == 3
        assert cast_uuid(response.data['results'][0]['systemId']) in ids
        assert cast_uuid(response.data['results'][1]['systemId']) in ids
        assert cast_uuid(response.data['results'][2]['systemId']) in ids


class TestCloudSystemNestedViewSetPermissions:
    @pytest.fixture(autouse=True, scope='function')
    def setup(self, root_nx_channel_partner, channel_partner_factory, organization_factory,
              cp_user_factory, org_user_factory, cloud_user_factory, cloud_test_host, sys_group_user_factory):
        self.root_user = cp_user_factory(channel_partner=root_nx_channel_partner)

        self.cp_lvl_1 = channel_partner_factory(parent_channel_partner=root_nx_channel_partner)
        self.cp_admin_lvl_1 = cp_user_factory(channel_partner=self.cp_lvl_1)
        self.cp_manager_lvl_1 = cp_user_factory(channel_partner=self.cp_lvl_1, role=ChannelPartnerRoles.MANAGER)
        self.cp_accountant_lvl_1 = cp_user_factory(channel_partner=self.cp_lvl_1, role=ChannelPartnerRoles.REPORTS_VIEWER)
        self.org_lvl_1 = organization_factory(channel_partner=self.cp_lvl_1)
        self.org_admin_lvl_1 = org_user_factory(organization=self.org_lvl_1)
        self.org_viewer_lvl_1 = org_user_factory(organization=self.org_lvl_1, role=OrganizationRoles.VIEWER)
        self.group_user_lvl_1 = sys_group_user_factory(self.org_lvl_1)

        self.cp_lvl_2 = channel_partner_factory(parent_channel_partner=self.cp_lvl_1)
        self.cp_admin_lvl_2 = cp_user_factory(channel_partner=self.cp_lvl_2)
        self.cp_manager_lvl_2 = cp_user_factory(channel_partner=self.cp_lvl_2, role=ChannelPartnerRoles.MANAGER)
        self.cp_accountant_lvl_2 = cp_user_factory(channel_partner=self.cp_lvl_2, role=ChannelPartnerRoles.REPORTS_VIEWER)
        self.org_lvl_2 = organization_factory(channel_partner=self.cp_lvl_2)
        self.org_admin_lvl_2 = org_user_factory(organization=self.org_lvl_2)
        self.org_viewer_lvl_2 = org_user_factory(organization=self.org_lvl_2, role=OrganizationRoles.VIEWER)
        self.group_user_lvl_2 = sys_group_user_factory(self.org_lvl_2)

        self.cp_lvl_3 = channel_partner_factory(parent_channel_partner=self.cp_lvl_2)
        self.cp_admin_lvl_3 = cp_user_factory(channel_partner=self.cp_lvl_3)
        self.cp_manager_lvl_3 = cp_user_factory(channel_partner=self.cp_lvl_3, role=ChannelPartnerRoles.MANAGER)
        self.cp_accountant_lvl_3 = cp_user_factory(channel_partner=self.cp_lvl_3, role=ChannelPartnerRoles.REPORTS_VIEWER)
        self.org_lvl_3 = organization_factory(channel_partner=self.cp_lvl_3)
        self.org_admin_lvl_3 = org_user_factory(organization=self.org_lvl_3)
        self.org_viewer_lvl_3 = org_user_factory(organization=self.org_lvl_3, role=OrganizationRoles.VIEWER)
        self.group_user_lvl_3 = sys_group_user_factory(self.org_lvl_3)

        self.cp_other = channel_partner_factory(parent_channel_partner=root_nx_channel_partner)
        self.cp_admin_other = cp_user_factory(channel_partner=self.cp_other)
        self.org_other = organization_factory(channel_partner=self.cp_other)
        self.org_admin_other = org_user_factory(organization=self.org_other)
        self.org_viewer_other = org_user_factory(organization=self.org_other, role=OrganizationRoles.VIEWER)
        self.group_user_other = sys_group_user_factory(self.org_other)

        self.client = APIClient(SERVER_NAME=cloud_test_host.hostname)
        self.kwargs_lvl_1 = {'parent_lookup_organization': str(self.org_lvl_1.id)}
        self.kwargs_lvl_2 = {'parent_lookup_organization': str(self.org_lvl_2.id)}
        self.kwargs_lvl_3 = {'parent_lookup_organization': str(self.org_lvl_3.id)}
        caches['default'].clear()
        self.view_name = 'organizations-cloudsystem-list'

    @property
    def auth(self):
        return f'Bearer {uuid4()}'

    def test_list_cp_user(self, mock_auth_with_user):
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(self.view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)

        assert response.status_code == 200

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(self.view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)

        assert response.status_code == 200

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(self.view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)

        assert response.status_code == 200

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(self.view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)

        assert response.status_code == 200

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(self.view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)

        assert response.status_code == 403

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(self.view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)

        assert response.status_code == 403

    def test_list_org_user(self, mock_auth_with_user):
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.org_admin_lvl_1)
        path = reverse(self.view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.org_admin_lvl_1)
        path = reverse(self.view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_1)
        path = reverse(self.view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_list_group_user(self, mock_auth_with_user):
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.group_user_lvl_1)
        path = reverse(self.view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.group_user_lvl_2)
        path = reverse(self.view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_1)
        path = reverse(self.view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403


class TestCloudSystemNestedViewSetRootOnlyParam:

    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory,
              system_group_factory, system_factory, org_user_factory,
              cloud_test_host, mock_auth_with_user):

        cp = channel_partner_factory()
        self.organization = organization_factory(channel_partner=cp)
        system_factory(organization=self.organization)

        group_0 = system_group_factory(organization=self.organization)
        system_factory(organization=self.organization, system_group=group_0)

        group_1 = system_group_factory(organization=self.organization, parent=group_0)
        system_factory(organization=self.organization, system_group=group_1)

        group_2 = system_group_factory(organization=self.organization, parent=group_1)
        system_factory(organization=self.organization, system_group=group_2)

        self.user = org_user_factory(organization=self.organization)
        mock_auth_with_user(self.user)

        self.client = APIClient(SERVER_NAME=cloud_test_host.hostname)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')

        kwargs = {'parent_lookup_organization': str(self.organization.id)}
        self.base_url = reverse('organizations-cloudsystem-list', kwargs=kwargs)

    def test_no_param(self):
        response = self.client.get(self.base_url)
        assert response.status_code == 200
        assert len(response.data['results']) == 4

    def test_true(self):
        for value in ['true', 'True', 'on', 'yes', '1']:
            response = self.client.get(self.base_url + f'?rootOnly={value}')
            assert response.status_code == 200
            assert len(response.data['results']) == 1

    def test_false(self):
        for value in ['false', 'False', 'off', 'no', '0']:
            response = self.client.get(self.base_url + f'?rootOnly={value}')
            assert response.status_code == 200
            assert len(response.data['results']) == 4
