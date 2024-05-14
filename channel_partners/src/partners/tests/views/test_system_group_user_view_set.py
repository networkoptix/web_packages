import json
from uuid import uuid4

import pytest
from django.core.cache import caches
from django.db import transaction

from partners.models import (
    ChannelPartnerRoles,
    Organization,
    OrganizationRoles,
    OrganizationToUser,
    SystemGroup,
)
from partners.views import SystemGroupUserViewSet


class TestSystemGroupUserViewSet:

    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory, sys_group_user_factory,
              cloud_user_factory, org_user_factory, system_group_factory):
        self.cp = channel_partner_factory()
        self.org = organization_factory(channel_partner=self.cp)
        self.org_user = org_user_factory(email=f'{uuid4()}@networkoptix.com', organization=self.org)
        self.other_user = org_user_factory(email=f'{uuid4()}@networkoptix.com')
        self.group = system_group_factory(organization=self.org)
        self.users = [sys_group_user_factory(organization=self.org, group=self.group) for _ in range(5)]
        self.other_org = organization_factory(channel_partner=self.cp)
        self.other_group = system_group_factory(organization=self.other_org)
        self.org_adm_name = 'Organization Administrator'
        self.org_power_user_name = 'Power User'

    def test_list_403(self, mock_auth_with_user, arf):
        view = SystemGroupUserViewSet.as_view(actions={'get': 'list'})
        request = arf.get('/')
        mock_auth_with_user(self.other_user)
        response = view(request, parent_lookup_system_group=str(self.group.id))
        assert response.status_code == 403

    def test_list_200(self, mock_auth_with_user, arf):
        view = SystemGroupUserViewSet.as_view(actions={'get': 'list'})
        request = arf.get('/')

        mock_auth_with_user(self.org_user)
        response = view(request, parent_lookup_system_group=str(self.group.id))
        assert response.status_code == 200
        assert len(response.data) == len(self.users)
        for i, data in enumerate(response.data):
            assert data['email'] == self.users[i].user.email
            assert data['fullName'] == self.users[i].user.full_name
            assert data['roles'] == self.users[i].roles_name

    def test_retrieve_403(self, mock_auth_with_user, arf):
        view = SystemGroupUserViewSet.as_view(actions={'get': 'retrieve'})
        request = arf.get('/')
        mock_auth_with_user(self.other_user)
        response = view(request, parent_lookup_system_group=str(self.group.id), email=self.users[0].user.email)
        assert response.status_code == 403

    def test_retrieve_200(self, mock_auth_with_user, arf):
        view = SystemGroupUserViewSet.as_view(actions={'get': 'retrieve'})
        request = arf.get('/')

        mock_auth_with_user(self.org_user)
        response = view(request, parent_lookup_system_group=str(self.group.id), email=self.users[0].user.email)
        assert response.status_code == 200
        assert response.data['email'] == self.users[0].user.email
        assert response.data['fullName'] == self.users[0].user.full_name
        assert response.data['roles'] == self.users[0].roles_name\

    def test_create_403(self, mock_auth_with_user, arf, org_user_factory):
        view = SystemGroupUserViewSet.as_view(actions={'post': 'create'})
        user_rel = org_user_factory(organization=self.org)
        user = user_rel.user
        data = {
            'email': user.email,
            'role': 'Power User'
        }
        request = arf.post('/', data=data)
        mock_auth_with_user(self.other_user)

        response = view(request, parent_lookup_system_group=str(self.group.id), email=self.users[0].user.email)
        assert response.status_code == 403

    def test_update_group_user_201(
            self, mock_auth_with_user, arf, sys_group_user_factory,
            mock_account_status, mock_get_customization_request,
            mock_post_notification, httpx_mock, system_group_factory):

        view = SystemGroupUserViewSet.as_view(actions={'post': 'create'})
        group_1 = system_group_factory(organization=self.org, parent=self.group)
        user_rel = sys_group_user_factory(organization=self.org, group=group_1)
        user = user_rel.user
        data = {
            'email': user.email,
            'roleId': str(OrganizationRoles.POWER_USER)
        }
        request = arf.post('/', data=data)
        mock_auth_with_user(self.org_user)
        mock_account_status(email=user.email, active=True)
        mock_get_customization_request()
        notification_send_url = mock_post_notification()
        response = view(request, parent_lookup_system_group=str(self.group.id), email=self.users[0].user.email)
        assert response.status_code == 201
        assert response.data['email'] == user.email
        assert response.data['fullName'] == user.full_name
        assert response.data['roles'] == ['Power User']
        assert response.data['rolesIds'] == [str(OrganizationRoles.POWER_USER)]
        assert httpx_mock.get_request(url=notification_send_url) is None
        assert OrganizationToUser.objects.filter(organization=self.org, system_group=self.group, user=user).exists()

    def test_update_org_user_400(
            self, mock_auth_with_user, arf, org_user_factory,
            mock_account_status, mock_get_customization_request,
            mock_post_notification, httpx_mock):

        view = SystemGroupUserViewSet.as_view(actions={'post': 'create'})
        org_admin = org_user_factory(organization=self.org)
        user_rel = org_user_factory(organization=self.org)
        user = user_rel.user
        data = {
            'email': user.email,
            'role': 'Power User'
        }
        request = arf.post('/', data=data)
        mock_auth_with_user(self.org_user)
        mock_account_status(email=user.email, active=True)
        mock_get_customization_request()
        notification_send_url = mock_post_notification()
        response = view(request, parent_lookup_system_group=str(self.group.id), email=self.users[0].user.email)
        assert response.status_code == 400
        assert 'cannot be added to group' in response.data['email'][0]

    def test_create_201(self, mock_auth_with_user, arf, org_user_factory,
                        mock_account_status, mock_get_customization_request,
                        mock_post_notification, httpx_mock, cloud_user_factory):
        view = SystemGroupUserViewSet.as_view(actions={'post': 'create'})
        user = cloud_user_factory()
        data = {
            'email': user.email,
            'role': 'Power User'
        }
        request = arf.post('/', data=data)
        mock_auth_with_user(self.org_user)
        mock_account_status(email=user.email, active=True)
        mock_get_customization_request()
        notification_send_url = mock_post_notification()
        response = view(request, parent_lookup_system_group=str(self.group.id), email=self.users[0].user.email)
        assert response.status_code == 201
        assert response.data['email'] == user.email
        assert response.data['fullName'] == user.full_name
        assert response.data['roles'] == ['Power User']
        notification_data = json.loads(httpx_mock.get_request(url=notification_send_url).content)
        assert notification_data['type'] == 'cps_organization_share'
        assert not OrganizationToUser.objects.filter(
            organization=self.org, user=user, system_group__isnull=True
        ).exists()
        assert OrganizationToUser.objects.filter(user=user, organization=self.org, system_group=self.group).exists()

    def test_bulk_delete_403(self, channel_partner_factory, organization_factory, org_user_factory,
                             mock_auth_with_user, arf):
        emails = [u.user.email for u in self.users]
        # test other organization user deletion
        data = emails + [self.other_user.user.email]
        request = arf.post('/', json=data)
        mock_auth_with_user(self.other_user)
        view = SystemGroupUserViewSet.as_view({'post': 'bulk_delete'})
        response = view(request, parent_lookup_system_group=self.group.id)
        assert response.status_code == 403

    def test_bulk_delete_400(self, channel_partner_factory, organization_factory, org_user_factory,
                         mock_auth_with_user, arf):
        emails = [u.user.email for u in self.users]
        view = SystemGroupUserViewSet.as_view({'post': 'bulk_delete'})
        # test other organization user deletion
        data = emails + ['invalid_email']
        request = arf.post('/', data=data, format='json')
        mock_auth_with_user(self.org_user)
        response = view(request, parent_lookup_system_group=self.group.id)
        assert response.status_code == 400

    def test_bulk_delete(self, channel_partner_factory, organization_factory, org_user_factory,
                         mock_auth_with_user, arf):
        emails = [u.user.email for u in self.users]
        view = SystemGroupUserViewSet.as_view({'post': 'bulk_delete'})
        # test all admins
        data = emails
        request = arf.post('/', data=data, format='json')
        mock_auth_with_user(self.org_user)
        response = view(request, parent_lookup_system_group=self.group.id)

        assert response.status_code == 200
        assert "emails" in response.data

    def test_can_access(self, system_group_factory, sys_group_user_factory, arf, mock_auth_with_user):
        caches['default'].clear()
        self.group_1 = system_group_factory(organization=self.org, parent=self.group)
        self.group_2 = system_group_factory(organization=self.org, parent=self.group_1)
        self.group_3 = system_group_factory(organization=self.org, parent=self.group_2)

        users = [sys_group_user_factory(organization=self.org, group=g)
                 for g in [self.group_1, self.group_2, self.group_3]]

        view = SystemGroupUserViewSet.as_view({'get': 'can_access'})
        request = arf.get('/')
        mock_auth_with_user(self.org_user)

        response = view(request, parent_lookup_system_group=self.group.id)
        assert response.status_code == 200
        assert len(response.data) == len(self.users + [self.org_user])
        for data in response.data:
            assert data['hasAccessTo']
            instance_id = data['hasAccessTo']['id']
            instance = SystemGroup.objects.filter(id=instance_id).first() or Organization.objects.get(id=instance_id)
            assert data['hasAccessTo']['name'] == instance.name
            assert data['hasAccessTo']['membershipType'] == instance._meta.model_name

        response = view(request, parent_lookup_system_group=self.group_2.id)

        assert response.status_code == 200
        assert len(response.data) == len(self.users + [self.org_user]) + 2
        for data in response.data:
            assert data['hasAccessTo']
            instance_id = data['hasAccessTo']['id']
            instance = SystemGroup.objects.filter(id=instance_id).first() or Organization.objects.get(id=instance_id)
            assert data['hasAccessTo']['name'] == instance.name
            assert data['hasAccessTo']['membershipType'] == instance._meta.model_name

    def test_paginated_list(self, mock_auth_with_user, arf):
        view = SystemGroupUserViewSet.as_view(actions={'get': 'paginated_list'})
        request = arf.get('/')
        mock_auth_with_user(self.org_user)
        response = view(request, parent_lookup_system_group=str(self.group.id))
        assert response.status_code == 200
        assert response.data['count'] == len(self.users)
        assert response.data['next'] is None


class TestSystemGroupUserViewSetRetrieve:

    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory, sys_group_user_factory,
              cloud_user_factory, org_user_factory, system_group_factory, arf, cp_user_factory):
        self.cp = channel_partner_factory()
        self.cp_admin =  cp_user_factory(channel_partner=self.cp)
        self.cp_reports_viewer = cp_user_factory(channel_partner=self.cp, role=ChannelPartnerRoles.REPORTS_VIEWER)
        self.org = organization_factory(channel_partner=self.cp)
        self.org_admin = org_user_factory(organization=self.org)
        self.org_power_user = org_user_factory(organization=self.org, role=OrganizationRoles.POWER_USER)
        self.group = system_group_factory(organization=self.org)
        self.group_users = [sys_group_user_factory(organization=self.org, group=self.group) for _ in range(5)]
        self.sub_group = system_group_factory(organization=self.org, parent=self.group)
        self.sub_group_users = [sys_group_user_factory(organization=self.org, group=self.sub_group) for _ in range(5)]
        self.other_org = organization_factory(channel_partner=self.cp)
        self.other_org_user = org_user_factory(organization=self.other_org)
        self.org_adm_name = 'Organization Administrator'
        self.org_power_user_name = 'Power User'
        self.view = SystemGroupUserViewSet.as_view(actions={'get': 'retrieve'}, detail=True)
        self.request = arf.get('/')

    def test_2xx_org_admin(self, mock_auth_with_user):
        mock_auth_with_user(self.org_admin)
        response = self.view(self.request,
                             parent_lookup_system_group=self.sub_group.id,
                             email=self.sub_group_users[0].user.email)
        assert response.status_code == 200

        mock_auth_with_user(self.org_admin)
        user_rel = self.group_users[0]
        response = self.view(self.request,
                             parent_lookup_system_group=self.group.id,
                             email=user_rel.user.email)
        assert response.status_code == 200
        assert response.data['email'] == user_rel.user.email

    def test_404_org_admin(self, mock_auth_with_user):
        mock_auth_with_user(self.org_admin)
        response = self.view(self.request,
                             parent_lookup_system_group=self.group.id,
                             email=self.sub_group_users[0].user.email)
        assert response.status_code == 404

    def test_403_group_admin(self, mock_auth_with_user):
        mock_auth_with_user(self.group_users[0])
        with transaction.atomic():
            response = self.view(self.request,
                                 parent_lookup_system_group=self.sub_group.id,
                                 email=self.sub_group_users[0].user.email)
        assert response.status_code == 403

        mock_auth_with_user(self.group_users[0])
        with transaction.atomic():
            response = self.view(self.request,
                                 parent_lookup_system_group=self.group.id,
                                 email=self.group_users[0].user.email)
        assert response.status_code == 403

    def test_403_org_power_user(self, mock_auth_with_user):
        mock_auth_with_user(self.org_power_user)
        with transaction.atomic():
            response = self.view(self.request,
                                 parent_lookup_system_group=self.sub_group.id,
                                 email=self.sub_group_users[0].user.email)
        assert response.status_code == 403

        mock_auth_with_user(self.org_power_user)
        with transaction.atomic():
            response = self.view(self.request,
                                 parent_lookup_system_group=self.group.id,
                                 email=self.group_users[0].user.email)
        assert response.status_code == 403

    def test_2xx_cpal_on_cp_admin(self, mock_auth_with_user):
        mock_auth_with_user(self.cp_admin)
        with transaction.atomic():
            response = self.view(self.request,
                                 parent_lookup_system_group=self.sub_group.id,
                                 email=self.sub_group_users[0].user.email)
        assert response.status_code == 200

        with transaction.atomic():
            response = self.view(self.request,
                                 parent_lookup_system_group=self.group.id,
                                 email=self.group_users[0].user.email)
        assert response.status_code == 200

    def test_403_cpal_on_cp_reports_viewer(self, mock_auth_with_user):
        mock_auth_with_user(self.cp_reports_viewer)
        with transaction.atomic():
            response = self.view(self.request,
                                 parent_lookup_system_group=self.sub_group.id,
                                 email=self.sub_group_users[0].user.email)
        assert response.status_code == 403

        with transaction.atomic():
            response = self.view(self.request,
                                 parent_lookup_system_group=self.group.id,
                                 email=self.group_users[0].user.email)
        assert response.status_code == 403

    def test_403_cpal_aff_cp_admin(self, mock_auth_with_user):
        self.org.channel_partner_access_level = None
        self.org.save()
        mock_auth_with_user(self.cp_admin)
        with transaction.atomic():
            response = self.view(self.request,
                                 parent_lookup_system_group=self.sub_group.id,
                                 email=self.sub_group_users[0].user.email)
        assert response.status_code == 403

        with transaction.atomic():
            response = self.view(self.request,
                                 parent_lookup_system_group=self.group.id,
                                 email=self.group_users[0].user.email)
        assert response.status_code == 403
