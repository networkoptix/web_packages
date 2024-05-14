import json

import pytest
from django.db import transaction

from partners.models import (
    ChannelPartnerRoles,
    ChannelPartnerToUser,
    CloudUser,
)
from partners.views import ChannelPartnerUserViewSet


class TestChannelPartnerUserViewSet:
    @pytest.fixture(autouse=True)
    def setup_method(self, channel_partner_factory, cp_user_factory, organization_factory, org_user_factory):
        self.parent_cp = channel_partner_factory()
        self.parent_cp_user = cp_user_factory(channel_partner=self.parent_cp)
        self.parent_org = organization_factory(channel_partner=self.parent_cp)
        self.parent_org_user = org_user_factory(organization=self.parent_org)
        self.cp = channel_partner_factory(parent_channel_partner=self.parent_cp)
        self.cp_user = cp_user_factory(channel_partner=self.cp)
        self.org = organization_factory(channel_partner=self.cp)
        self.org_user = org_user_factory(organization=self.org)
        self.child_cp = channel_partner_factory(parent_channel_partner=self.cp)
        self.child_cp_user = cp_user_factory(channel_partner=self.child_cp)

    def test_destroy_last_admin(self, mock_auth_with_user, arf, cp_user_factory):
        user_2 = cp_user_factory(channel_partner=self.cp)
        request = arf.delete('/')
        mock_auth_with_user(self.parent_cp_user)
        view = ChannelPartnerUserViewSet.as_view({'delete': 'destroy'})
        with transaction.atomic():
            response = view(request, parent_lookup_channel_partner=self.cp.id, email=user_2.user.email)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_user)
        with transaction.atomic():
            response = view(request, parent_lookup_channel_partner=self.cp.id, email=user_2.user.email)
        assert response.status_code == 204
        assert not ChannelPartnerToUser.objects.filter(user__email=user_2.user.email).exists()
        assert CloudUser.objects.filter(email=user_2.user.email).exists()

        with transaction.atomic():
            response = view(request, parent_lookup_channel_partner=self.cp.id, email=self.cp_user.user.email)
        assert ChannelPartnerToUser.objects.filter(user__email=self.cp_user.user.email).exists()
        assert response.status_code == 409
        assert response.data['detail']
        assert "is the only Administrator and may not be demoted or removed" in response.data['detail']

    def test_destroy_user_with_no_admin(self, mock_auth_with_user, arf, cp_user_factory):
        user_2 = cp_user_factory(channel_partner=self.cp, role=ChannelPartnerRoles.REPORTS_VIEWER)
        request = arf.delete('/')
        mock_auth_with_user(self.parent_cp_user)
        view = ChannelPartnerUserViewSet.as_view({'delete': 'destroy'})
        with transaction.atomic():
            response = view(request, parent_lookup_channel_partner=self.cp.id, email=user_2.user.email)
        assert response.status_code == 403

        self.cp_user.delete()
        with transaction.atomic():
            response = view(request, parent_lookup_channel_partner=self.cp.id, email=user_2.user.email)
        assert response.status_code == 204
        assert not ChannelPartnerToUser.objects.filter(user__email=user_2.user.email).exists()
        assert CloudUser.objects.filter(email=user_2.user.email).exists()

    def test_destroy_self(self, channel_partner_factory, cp_user_factory, default_channel_partner,
                                mock_auth_with_user, arf, default_cp_admin):
        # https://networkoptix.atlassian.net/wiki/spaces/FS/pages/2844524545/Channel+Partners+Orgs+access+matrix#Users
        cp = channel_partner_factory(parent_channel_partner=default_channel_partner)
        user = cp_user_factory(channel_partner=cp, role=ChannelPartnerRoles.REPORTS_VIEWER)
        request = arf.delete('/')
        mock_auth_with_user(user)
        view = ChannelPartnerUserViewSet.as_view({'delete': 'destroy'})
        with transaction.atomic():
            response = view(request, parent_lookup_channel_partner=cp.id, email=user.user.email)
        assert response.status_code == 204
        assert not ChannelPartnerToUser.objects.filter(user__email=user.user.email).exists()
        assert CloudUser.objects.filter(email=user.user.email).exists()

    @pytest.mark.no_tasks_autofix
    def test_create_with_partner_admin(self,cp_user_factory, mock_auth_with_user, arf, random_email,
                                       mock_account_status, mock_get_customization_request,
                                       mock_post_notification, httpx_mock):
        email = random_email
        data = {
            'email': email,
            'role': 'Administrator',
            'title': 'cp user'
        }
        view = ChannelPartnerUserViewSet.as_view(actions={'post': 'create'})
        request = arf.post('/', data=data, format='json')
        mock_account_status(email=email, active=False)
        mock_get_customization_request()
        notification_send_url = mock_post_notification()
        mock_auth_with_user(self.cp_user)
        response = view(request, parent_lookup_channel_partner=self.cp.id)
        assert response.status_code == 200
        notification_send_request = httpx_mock.get_request(url=notification_send_url)
        notification_data = json.loads(notification_send_request.content)
        assert notification_data['type'] == 'cps_partner_invite'
        assert notification_data['user_email'] == email
        assert notification_data['message']['partner_name'] == self.cp.name
        # Checking against Email since, by default full_name is None
        assert notification_data['message']['sharer_name'] == self.cp_user.user.email


    @pytest.mark.no_tasks_autofix
    def test_create_with_partner_admin_with_attributes(self,cp_user_factory, mock_auth_with_user, arf, random_email,
                                       mock_account_status, mock_get_customization_request,
                                       mock_post_notification, httpx_mock):
        email = random_email
        data = {
            'email': email,
            'role': 'Administrator',
            'title': 'cp user',
            'attributes': {
                'test': 'test'
            }
        }
        view = ChannelPartnerUserViewSet.as_view(actions={'post': 'create'})
        request = arf.post('/', data=data, format='json')
        mock_account_status(email=email, active=False)
        mock_get_customization_request()
        notification_send_url = mock_post_notification()
        mock_auth_with_user(self.cp_user)
        response = view(request, parent_lookup_channel_partner=self.cp.id)
        assert response.status_code == 200
        notification_send_request = httpx_mock.get_request(url=notification_send_url)
        notification_data = json.loads(notification_send_request.content)
        assert response.data.get("attributes").get("test") == "test"
        assert notification_data['type'] == 'cps_partner_invite'
        assert notification_data['user_email'] == email
        assert notification_data['message']['partner_name'] == self.cp.name
        # Checking against Email since, by default full_name is None
        assert notification_data['message']['sharer_name'] == self.cp_user.user.email

    @pytest.mark.no_tasks_autofix
    def test_create_and_update_with_partner_admin_with_attributes(
            self,
            cp_user_factory,
            mock_auth_with_user,
            arf,
            random_email,
            mock_account_status,
            mock_get_customization_request,
            mock_post_notification,
            httpx_mock
    ):
        email = random_email
        data = {
            'email': email,
            'role': 'Administrator',
            'title': 'cp user',
            'attributes': {
                'test': 'test'
            }
        }
        view = ChannelPartnerUserViewSet.as_view(actions={'post': 'create'})
        request = arf.post('/', data=data, format='json')
        mock_account_status(email=email, active=False)
        mock_get_customization_request()
        mock_post_notification()
        mock_auth_with_user(self.cp_user)

        response = view(request, parent_lookup_channel_partner=self.cp.id)
        assert response.status_code == 200
        assert response.data.get("attributes").get("test") == "test"

        # Request #2
        data = {
            'email': email,
            'role': 'Administrator',
            'title': 'cp user',
            'attributes': {
                'test': '*unset*'
            }
        }
        request = arf.post('/', data=data, format='json')
        response = view(request, parent_lookup_channel_partner=self.cp.id)
        assert response.status_code == 200
        assert "test" not in response.data.get("attributes")

    @pytest.mark.no_tasks_autofix
    def test_create_with_parent_admin(self,cp_user_factory, mock_auth_with_user, arf, random_email,
                                      mock_account_status, mock_get_customization_request,
                                      mock_post_notification, httpx_mock):
        email = random_email
        data = {
            'email': email,
            'role': 'Administrator',
            'title': 'cp user'
        }
        view = ChannelPartnerUserViewSet.as_view(actions={'post': 'create'})
        request = arf.post('/', data=data, format='json')
        mock_account_status(email=email, active=False)
        mock_get_customization_request()
        notification_send_url = mock_post_notification()
        mock_auth_with_user(self.parent_cp_user)
        with transaction.atomic():
            response = view(request, parent_lookup_channel_partner=self.cp.id)
        assert response.status_code == 403

        # Check if it is possible to add user when there is no admins
        self.cp_user.delete()
        response = view(request, parent_lookup_channel_partner=self.cp.id)
        assert response.status_code == 200
        notification_send_request = httpx_mock.get_request(url=notification_send_url)
        notification_data = json.loads(notification_send_request.content)
        assert notification_data['type'] == 'cps_partner_invite'
        assert notification_data['user_email'] == email
        assert notification_data['message']['partner_name'] == self.cp.name
        # Checking against Email since, by default full_name is None
        assert notification_data['message']['sharer_name'] == self.parent_cp_user.user.email

    def test_user_validation(self, channel_partner_factory, cp_user_factory, organization_factory,
                             mock_auth_with_user, arf, org_user_factory, random_email):
        email = random_email
        cp = channel_partner_factory()
        cp_admin = cp_user_factory(channel_partner=cp)
        data = {
            'email': email,
            'role': 'Administrator',
            'title': 'cp user'
        }
        view = ChannelPartnerUserViewSet.as_view(actions={'post': 'create'})
        mock_auth_with_user(cp_admin)

        organization = organization_factory(channel_partner=cp)
        org_user = org_user_factory(email=email, organization=organization)
        request = arf.post('/', data=data, format='json')
        response = view(request, parent_lookup_channel_partner=cp.id)
        assert response.status_code == 400
        assert f"User {email} has a role in the channel partner child organization" in response.data['email'][0]

    def test_bulk_delete_403(self, channel_partner_factory, cp_user_factory,
                             mock_auth_with_user, arf):
        other_cp = channel_partner_factory()
        users = [cp_user_factory(channel_partner=self.cp, role=ChannelPartnerRoles.REPORTS_VIEWER) for _ in range(3)]
        emails = [u.user.email for u in users]
        other_user = cp_user_factory(channel_partner=other_cp)
        data = emails + [other_user.user.email]
        request = arf.post('/', data=data, format='json')
        mock_auth_with_user(other_user)
        view = ChannelPartnerUserViewSet.as_view({'post': 'bulk_delete'})
        response = view(request, parent_lookup_channel_partner=self.cp.id)
        assert response.status_code == 403

    def test_bulk_delete_400(self, channel_partner_factory, cp_user_factory,
                             mock_auth_with_user, arf):
        users = [cp_user_factory(channel_partner=self.cp, role=ChannelPartnerRoles.REPORTS_VIEWER) for _ in range(3)]
        emails = [u.user.email for u in users]
        view = ChannelPartnerUserViewSet.as_view({'post': 'bulk_delete'})
        data = emails + ['invalid_email']
        request = arf.post('/', data=data, format='json')
        mock_auth_with_user(self.cp_user)
        response = view(request, parent_lookup_channel_partner=self.cp.id)
        assert response.status_code == 400

    def test_bulk_delete_409(self, channel_partner_factory, cp_user_factory,
                             mock_auth_with_user, arf):
        users = [cp_user_factory(channel_partner=self.cp, role=ChannelPartnerRoles.REPORTS_VIEWER) for _ in range(3)]
        emails = [u.user.email for u in users]
        view = ChannelPartnerUserViewSet.as_view({'post': 'bulk_delete'})
        # test all admins
        data = emails + [self.cp_user.user.email]
        request = arf.post('/', data=data, format='json')
        mock_auth_with_user(self.cp_user)
        response = view(request, parent_lookup_channel_partner=self.cp.id)
        assert response.status_code == 409

    def test_bulk_delete(self, channel_partner_factory, cp_user_factory,
                         mock_auth_with_user, arf, random_email):
        users = [cp_user_factory(channel_partner=self.cp, role=ChannelPartnerRoles.REPORTS_VIEWER) for _ in range(3)]
        emails = [u.user.email for u in users]
        view = ChannelPartnerUserViewSet.as_view({'post': 'bulk_delete'})
        # test all admins
        data = emails + [random_email]
        request = arf.post('/', data=data, format='json')
        mock_auth_with_user(self.cp_user)
        response = view(request, parent_lookup_channel_partner=self.cp.id)

        assert response.status_code == 200
        assert 'emails' in response.data
        assert set(response.data['emails']) == set(emails)

    def test_list_permissions(self, mock_auth_with_user, arf):
        view = ChannelPartnerUserViewSet.as_view(actions={'get': 'list'})
        request = arf.get('/')
        mock_auth_with_user(self.cp_user)
        with transaction.atomic():
            response = view(request, parent_lookup_channel_partner=self.cp.id)
        assert response.status_code == 200

        mock_auth_with_user(self.child_cp_user)
        with transaction.atomic():
            response = view(request, parent_lookup_channel_partner=self.cp.id)
        assert response.status_code == 403

        mock_auth_with_user(self.org_user)
        with transaction.atomic():
            response = view(request, parent_lookup_channel_partner=self.cp.id)
        assert response.status_code == 403

        mock_auth_with_user(self.parent_cp_user)
        with transaction.atomic():
            response = view(request, parent_lookup_channel_partner=self.cp.id)
        assert response.status_code == 403

        self.cp_user.delete()
        mock_auth_with_user(self.parent_cp_user)
        with transaction.atomic():
            response = view(request, parent_lookup_channel_partner=self.cp.id)
        assert response.status_code == 200

    def test_retrieve_permissions(self, mock_auth_with_user, arf, cp_user_factory):
        view = ChannelPartnerUserViewSet.as_view(actions={'get': 'retrieve'})
        manager = cp_user_factory(channel_partner=self.cp, role=ChannelPartnerRoles.MANAGER)
        request = arf.get('/')
        mock_auth_with_user(self.cp_user)
        with transaction.atomic():
            response = view(request, parent_lookup_channel_partner=self.cp.id, email=manager.user.email)
        assert response.status_code == 200

        mock_auth_with_user(self.child_cp_user)
        with transaction.atomic():
            response = view(request, parent_lookup_channel_partner=self.cp.id, email=manager.user.email)
        assert response.status_code == 403

        mock_auth_with_user(self.org_user)
        with transaction.atomic():
            response = view(request, parent_lookup_channel_partner=self.cp.id, email=manager.user.email)
        assert response.status_code == 403

        mock_auth_with_user(self.parent_cp_user)
        with transaction.atomic():
            response = view(request, parent_lookup_channel_partner=self.cp.id, email=manager.user.email)
        assert response.status_code == 403

        self.cp_user.delete()
        mock_auth_with_user(self.parent_cp_user)
        with transaction.atomic():
            response = view(request, parent_lookup_channel_partner=self.cp.id, email=manager.user.email)
        assert response.status_code == 200

    def test_retrieve(self, mock_auth_with_user, arf, cp_user_factory):
        view = ChannelPartnerUserViewSet.as_view(actions={'get': 'retrieve'})
        manager = cp_user_factory(channel_partner=self.cp, role=ChannelPartnerRoles.MANAGER)
        request = arf.get('/')
        mock_auth_with_user(self.cp_user)
        with transaction.atomic():
            response = view(request, parent_lookup_channel_partner=self.cp.id, email=manager.user.email)
        assert response.status_code == 200
        assert response.data['email'] == manager.user.email
        assert response.data['rolesIds'] == [str(ChannelPartnerRoles.MANAGER)]
        assert response.data['created']
        assert response.data['lastModified']

    def test_paginated_list(self, mock_auth_with_user, arf, cp_user_factory):
        init_users = self.cp.users.count()
        for _ in range(150):
            cp_user_factory(channel_partner=self.cp)
        mock_auth_with_user(self.cp_user)
        request = arf.get('/')
        view = ChannelPartnerUserViewSet.as_view(actions={'get': 'paginated_list'})
        response = view(request, parent_lookup_channel_partner=self.cp.id)
        assert response.status_code == 200
        assert isinstance(response.data, dict)
        assert response.data['count'] == 150 + init_users
        assert response.data['next']