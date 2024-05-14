from uuid import uuid4

import pytest
from django.db import transaction

from partners.models import (
    ChannelPartnerRoles,
    CloudUser,
    OrganizationRole,
    OrganizationRoles,
    OrganizationToUser,
)
from partners.views import OrganizationUserViewSet


class TestOrganizationUserViewSet:

    def test_get_200(
            self, organization_factory, org_user_factory, system_factory,
            mock_auth_with_user, arf, random_email, mock_account_status,
            mock_get_customization_request, mock_post_notification, httpx_mock
    ):
        other_org = organization_factory()
        org = organization_factory()
        other_org_user = org_user_factory(organization=other_org)
        org_admin = org_user_factory(organization=org)
        org_user = org_user_factory(
            organization=org,
            email=other_org_user.user.email,
            role=OrganizationRoles.VIEWER
        )
        request = arf.get('/')
        mock_auth_with_user(org_admin)
        view = OrganizationUserViewSet.as_view(actions={'get': 'retrieve'}, detail=True)
        response = view(request, parent_lookup_organization=org.id, email=org_user.user.email)
        assert response.status_code == 200
        assert response.data['email'] == org_user.user.email
        assert response.data['rolesIds'] == org_user.roles

    def test_create_200(self, organization_factory, org_user_factory, system_factory,
                        mock_auth_with_user, arf, random_email, mock_account_status,
                        mock_get_customization_request, mock_post_notification, httpx_mock):
        gen_count = 10
        org = organization_factory()
        admin_user = org_user_factory(organization=org)
        systems = [system_factory(organization=org) for _ in range(gen_count)]
        role = OrganizationRole.objects.get(name="Power User")
        new_user_data = {
            "email": random_email,
            "role": role.name
        }
        request = arf.post('/', data=new_user_data, format='json')
        mock_account_status(email=random_email, active=False)
        mock_get_customization_request()
        notification_send_url = mock_post_notification()
        mock_auth_with_user(admin_user)
        view = OrganizationUserViewSet.as_view(actions={'post': 'create'}, detail=True)
        response = view(request, parent_lookup_organization=org.id)

        assert response.status_code == 200
        assert OrganizationToUser.objects\
            .filter(user__email=new_user_data["email"], organization=org, roles__contains=[role.id]).exists()
        assert response.data["email"] == new_user_data["email"]
        assert response.data['fullName'] is None
        assert response.data["roles"] == [role.name]


    def test_update_200(self, organization_factory, org_user_factory, system_factory,
                        mock_auth_with_user, arf, random_email, mock_account_status,
                        mock_get_customization_request, mock_post_notification, httpx_mock):
        gen_count = 10
        org = organization_factory()
        admin_user = org_user_factory(organization=org)
        systems = [system_factory(organization=org) for _ in range(gen_count)]
        role = OrganizationRole.objects.get(name="Power User")
        user_data = {
            "email": random_email,
            "role": role.name
        }
        user = org_user_factory(email=user_data['email'], organization=org)
        request = arf.post('/', data=user_data, format='json')
        mock_account_status(email=random_email, active=False)
        mock_get_customization_request()
        notification_send_url = mock_post_notification()
        mock_auth_with_user(admin_user)
        view = OrganizationUserViewSet.as_view(actions={'post': 'create'}, detail=True)
        response = view(request, parent_lookup_organization=org.id)
        assert OrganizationToUser.objects\
            .filter(user__email=user_data["email"], organization=org).count() == 1
        assert response.status_code == 200
        assert response.data["email"] == user_data["email"]
        assert response.data['fullName']  is None
        user_data["title"] = f"{uuid4()}"
        request = arf.post('/', data=user_data, format='json')
        response = view(request, parent_lookup_organization=org.id)
        assert OrganizationToUser.objects\
            .filter(user__email=user_data["email"], organization=org).count() == 1
        assert response.status_code == 200
        assert response.data["title"] == user_data["title"]

    def test_destroy_204(self, organization_factory, org_user_factory, system_factory,
                         mock_auth_with_user, arf, httpx_mock, mocker):
        org = organization_factory()
        admin_user = org_user_factory(organization=org)
        role = OrganizationRole.objects.get(name="Power User")
        user = org_user_factory(organization=org, role=role.name)
        request = arf.delete('/')
        mock_auth_with_user(admin_user)
        view = OrganizationUserViewSet.as_view({'delete': 'destroy'})
        with transaction.atomic():
            response = view(request, parent_lookup_organization=org.id, email=user.user.email)
        assert response.status_code == 204
        assert not OrganizationToUser.objects.filter(user__email=user.user.email).exists()
        assert CloudUser.objects.filter(email=user.user.email).exists()

    def test_destroy_self_204(self, organization_factory, org_user_factory, system_factory,
                         mock_auth_with_user, arf, httpx_mock, mocker):
        org = organization_factory()
        user = org_user_factory(organization=org, role=OrganizationRoles.SYSTEM_HEALTH_VIEWER)
        request = arf.delete('/')
        mock_auth_with_user(user)
        view = OrganizationUserViewSet.as_view({'delete': 'destroy'})
        with transaction.atomic():
            response = view(request, parent_lookup_organization=org.id, email=user.user.email)
        assert response.status_code == 204
        assert not OrganizationToUser.objects.filter(user__email=user.user.email).exists()
        assert CloudUser.objects.filter(email=user.user.email).exists()

    def test_destroy_403(self, organization_factory, org_user_factory, system_factory,
                         mock_auth_with_user, arf, httpx_mock, mocker):
        org = organization_factory()
        viewer_user = org_user_factory(organization=org, role=OrganizationRoles.SYSTEM_HEALTH_VIEWER)
        role = OrganizationRole.objects.get(name="Power User")
        user = org_user_factory(organization=org, role=role.name)
        request = arf.delete('/')
        mock_auth_with_user(viewer_user)
        view = OrganizationUserViewSet.as_view({'delete': 'destroy'})
        with transaction.atomic():
            response = view(request, parent_lookup_organization=org.id, email=user.user.email)
        assert OrganizationToUser.objects.filter(user__email=user.user.email).exists()
        assert response.status_code == 403

    def test_destroy_last_admin(self, organization_factory, org_user_factory, system_factory,
                                mock_auth_with_user, arf, httpx_mock, default_cp_admin):
        gen_count = 10
        org = organization_factory()
        role = OrganizationRole.objects.get(name="Organization Administrator")
        user = org_user_factory(organization=org)
        user_2 = org_user_factory(organization=org)
        request = arf.delete('/')
        mock_auth_with_user(default_cp_admin)
        view = OrganizationUserViewSet.as_view({'delete': 'destroy'})
        with transaction.atomic():
            response = view(request, parent_lookup_organization=org.id, email=user.user.email)
        assert response.status_code == 204
        assert not OrganizationToUser.objects.filter(user__email=user.user.email).exists()

        with transaction.atomic():
            response = view(request, parent_lookup_organization=org.id, email=user_2.user.email)
        assert OrganizationToUser.objects.filter(user__email=user_2.user.email).exists()
        assert response.status_code == 409
        assert response.data['detail']
        assert "is the only Administrator and may not be demoted or removed" in response.data['detail']

    def test_bulk_delete_403(self, channel_partner_factory, organization_factory, org_user_factory,
                             mock_auth_with_user, arf):
        cp = channel_partner_factory()
        org = organization_factory(channel_partner=cp)
        other_org = organization_factory(channel_partner=cp)
        users = [org_user_factory(organization=org, role=OrganizationRoles.SYSTEM_HEALTH_VIEWER) for _ in range(3)]
        emails = [u.user.email for u in users]
        other_user = org_user_factory(organization=other_org)
        # test other organization user deletion
        data = emails + [other_user.user.email]
        request = arf.post('/', json=data)
        mock_auth_with_user(other_user)
        view = OrganizationUserViewSet.as_view({'post': 'bulk_delete'})
        response = view(request, parent_lookup_organization=org.id)
        assert response.status_code == 403

    def test_bulk_delete_400(self, channel_partner_factory, organization_factory, org_user_factory,
                         mock_auth_with_user, arf):
        cp = channel_partner_factory()
        org = organization_factory(channel_partner=cp)
        other_org = organization_factory(channel_partner=cp)
        users = [org_user_factory(organization=org, role=OrganizationRoles.SYSTEM_HEALTH_VIEWER) for _ in range(3)]
        emails = [u.user.email for u in users]
        admin = org_user_factory(organization=org)
        other_user = org_user_factory(organization=other_org)
        view = OrganizationUserViewSet.as_view({'post': 'bulk_delete'})
        # test other organization user deletion
        data = emails + ['invalid_email']
        request = arf.post('/', data=data, format='json')
        mock_auth_with_user(admin)
        response = view(request, parent_lookup_organization=org.id)
        assert response.status_code == 400

    def test_bulk_delete_409(self, channel_partner_factory, organization_factory, org_user_factory,
                         mock_auth_with_user, arf):
        cp = channel_partner_factory()
        org = organization_factory(channel_partner=cp)
        other_org = organization_factory(channel_partner=cp)
        users = [org_user_factory(organization=org, role=OrganizationRoles.SYSTEM_HEALTH_VIEWER) for _ in range(3)]
        emails = [u.user.email for u in users]
        admin = org_user_factory(organization=org)
        other_user = org_user_factory(organization=other_org)
        view = OrganizationUserViewSet.as_view({'post': 'bulk_delete'})
        # test all admins
        data = emails + [admin.user.email]
        request = arf.post('/', data=data, format='json')
        mock_auth_with_user(admin)
        response = view(request, parent_lookup_organization=org.id)
        assert response.status_code == 409

    def test_bulk_delete(self, channel_partner_factory, organization_factory, org_user_factory,
                         mock_auth_with_user, arf):
        cp = channel_partner_factory()
        org = organization_factory(channel_partner=cp)
        other_org = organization_factory(channel_partner=cp)
        users = [org_user_factory(organization=org, role=OrganizationRoles.SYSTEM_HEALTH_VIEWER) for _ in range(3)]
        emails = [u.user.email for u in users]
        admin = org_user_factory(organization=org)
        other_user = org_user_factory(organization=other_org)
        view = OrganizationUserViewSet.as_view({'post': 'bulk_delete'})
        # test all admins
        data = emails
        request = arf.post('/', data=data, format='json')
        mock_auth_with_user(admin)
        response = view(request, parent_lookup_organization=org.id)

        assert response.status_code == 200
        assert 'emails' in response.data

    def test_remove_groups(self, channel_partner_factory, organization_factory, org_user_factory,
                           sys_group_user_factory, arf, mock_auth_with_user, cloud_user_factory):
        cloud_user = cloud_user_factory()
        cp = channel_partner_factory()
        org = organization_factory(channel_partner=cp)
        org_admin = org_user_factory(organization=org)
        other_org = organization_factory(channel_partner=cp)
        groups_users = [sys_group_user_factory(organization=org, cloud_user=cloud_user) for _ in range(5)]
        other_group = sys_group_user_factory(organization=other_org)
        view = OrganizationUserViewSet.as_view({'post': 'remove_groups'})
        mock_auth_with_user(org_admin)
        data = [str(u.system_group_id) for u in groups_users[:-1]]
        request = arf.post('/', data=data, format='json')
        response = view(request, parent_lookup_organization=org.id, email=cloud_user.email)
        assert response.status_code == 204

    def test_user_validation(self, channel_partner_factory, cp_user_factory, organization_factory,
                             mock_auth_with_user, arf, org_user_factory):
        cp = channel_partner_factory()
        cp_admin = cp_user_factory(channel_partner=cp)
        data = {
            'email': cp_admin.user.email,
            'role': 'Administrator',
            'title': 'cp user'
        }
        view = OrganizationUserViewSet.as_view(actions={'post': 'create'})
        mock_auth_with_user(cp_admin)

        organization = organization_factory(channel_partner=cp)
        request = arf.post('/', data=data, format='json')
        response = view(request, parent_lookup_organization=organization.id)
        assert response.status_code == 400
        assert (f"User {cp_admin.user.email} has a role in the organization parent channel partner"
                in response.data['email'][0])


class TestOrganizationUserViewSetList:

    @pytest.fixture(autouse=True)
    def setup_method(self, channel_partner_factory, organization_factory, system_group_factory,
                     mock_auth_with_user, arf, org_user_factory, cp_user_factory, sys_group_user_factory):
        self.parent_cp = channel_partner_factory()
        self.parent_cp_admin = cp_user_factory(channel_partner=self.parent_cp)
        self.cp = channel_partner_factory(parent_channel_partner=self.parent_cp)
        self.cp_admin = cp_user_factory(channel_partner=self.cp)
        self.cp_manager = cp_user_factory(channel_partner=self.cp, role=ChannelPartnerRoles.MANAGER)
        self.cp_viewer = cp_user_factory(channel_partner=self.cp, role=ChannelPartnerRoles.REPORTS_VIEWER)
        self.organization = organization_factory(channel_partner=self.cp)
        self.org_viewer = org_user_factory(organization=self.organization,
                                           role=OrganizationRoles.VIEWER)
        self.org_admin = org_user_factory(organization=self.organization,
                                          role=OrganizationRoles.ORGANIZATION_ADMINISTRATOR)
        self.org_power_user = org_user_factory(organization=self.organization,
                                               role=OrganizationRoles.POWER_USER)
        self.group = system_group_factory(organization=self.organization)
        self.group_admin = sys_group_user_factory(organization=self.organization,
                                                  role_id=OrganizationRoles.ADMINISTRATOR,
                                                  group=self.group)
        self.view = OrganizationUserViewSet.as_view(actions={'get': 'list'}, detail=True)
        self.request = arf.get('/')

    def test_2xx(self, mock_auth_with_user):
        mock_auth_with_user(self.org_admin)
        response = self.view(self.request,
                             parent_lookup_organization=self.organization.id)
        assert response.status_code == 200
        assert len(response.data) == 4

    def test_2xx_cpal_admin(self, mock_auth_with_user):
        mock_auth_with_user(self.cp_admin)
        response = self.view(self.request,
                             parent_lookup_organization=self.organization.id)
        assert response.status_code == 200
        assert len(response.data) == 4

        mock_auth_with_user(self.cp_manager)
        response = self.view(self.request,
                             parent_lookup_organization=self.organization.id)
        assert response.status_code == 200
        assert len(response.data) == 4

    def test_2xx_no_cpal_with_no_admins(self, mock_auth_with_user):
        self.org_admin.delete()
        self.organization.channel_partner_access_level_id = None
        self.organization.save()
        mock_auth_with_user(self.cp_admin)
        response = self.view(self.request,
                             parent_lookup_organization=self.organization.id)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_manager)
        response = self.view(self.request,
                             parent_lookup_organization=self.organization.id)
        assert response.status_code == 200

    def test_403_cpal_cp_reports_viewe(self, mock_auth_with_user):
        mock_auth_with_user(self.cp_viewer)
        response = self.view(self.request,
                             parent_lookup_organization=self.organization.id)
        assert response.status_code == 403

    def test_403_cpal_health_viewer(self, mock_auth_with_user):
        self.organization.channel_partner_access_level_id = OrganizationRoles.SYSTEM_HEALTH_VIEWER
        self.organization.save()
        mock_auth_with_user(self.cp_admin)
        with transaction.atomic():
            response = self.view(self.request,
                                 parent_lookup_organization=self.organization.id)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_manager)
        with transaction.atomic():
            response = self.view(self.request,
                                 parent_lookup_organization=self.organization.id)
        assert response.status_code == 403

    def test_403_parent_cp_user(self, mock_auth_with_user):
        mock_auth_with_user(self.parent_cp_admin)
        with transaction.atomic():
            response = self.view(self.request,
                                 parent_lookup_organization=self.organization.id)
        assert response.status_code == 403

    def test_403_group_user(self, mock_auth_with_user):
        mock_auth_with_user(self.group_admin)
        with transaction.atomic():
            response = self.view(self.request,
                                 parent_lookup_organization=self.organization.id)
        assert response.status_code == 403

    def test_403_org_power_user(self, mock_auth_with_user):
        mock_auth_with_user(self.org_power_user)
        with transaction.atomic():
            response = self.view(self.request,
                                 parent_lookup_organization=self.organization.id)
        assert response.status_code == 403

    def test_403_org_viewer(self, mock_auth_with_user):
        mock_auth_with_user(self.org_viewer)
        with transaction.atomic():
            response = self.view(self.request,
                                 parent_lookup_organization=self.organization.id)
        assert response.status_code == 403

    def test_paginated_response(self, mock_auth_with_user, org_user_factory):
        mock_auth_with_user(self.org_admin)
        view = OrganizationUserViewSet.as_view(actions={'get': 'paginated_list'}, detail=True)
        init_users = self.organization.users.count()
        for _ in range(150):
            org_user_factory(organization=self.organization)
        response = view(self.request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 200
        assert response.data['count'] == 150 + init_users
        assert len(response.data['results']) == 100
        assert response.data['next']


class TestOrganizationUserViewSetRetrieve:

    @pytest.fixture(autouse=True)
    def setup_method(self, channel_partner_factory, organization_factory, system_group_factory,
                     mock_auth_with_user, arf, org_user_factory, cp_user_factory, sys_group_user_factory):
        self.parent_cp = channel_partner_factory()
        self.parent_cp_admin = cp_user_factory(channel_partner=self.parent_cp)
        self.cp = channel_partner_factory(parent_channel_partner=self.parent_cp)
        self.cp_admin = cp_user_factory(channel_partner=self.cp)
        self.cp_manager = cp_user_factory(channel_partner=self.cp, role=ChannelPartnerRoles.MANAGER)
        self.cp_viewer = cp_user_factory(channel_partner=self.cp, role=ChannelPartnerRoles.REPORTS_VIEWER)
        self.organization = organization_factory(channel_partner=self.cp)
        self.org_viewer = org_user_factory(organization=self.organization,
                                           role=OrganizationRoles.VIEWER)
        self.org_viewer.full_name = "Full Name"
        self.org_viewer.save()
        self.org_admin = org_user_factory(organization=self.organization,
                                          role=OrganizationRoles.ORGANIZATION_ADMINISTRATOR)
        self.org_power_user = org_user_factory(organization=self.organization,
                                               role=OrganizationRoles.POWER_USER)
        self.group = system_group_factory(organization=self.organization)
        self.group_admin = sys_group_user_factory(organization=self.organization,
                                                  role_id=OrganizationRoles.ADMINISTRATOR,
                                                  group=self.group)
        self.view = OrganizationUserViewSet.as_view(actions={'get': 'retrieve'}, detail=True)
        self.request = arf.get('/')

    def test_2xx(self, mock_auth_with_user):
        mock_auth_with_user(self.org_admin)
        response = self.view(self.request,
                             parent_lookup_organization=self.organization.id,
                             email=self.org_viewer.user.email)
        assert response.status_code == 200
        assert response.data['email'] == self.org_viewer.user.email
        assert response.data['fullName'] == self.org_viewer.user.full_name
        assert response.data['roles'] == ["Viewer"]
        assert response.data['rolesIds'] == self.org_viewer.roles
        assert response.data['groupRoles'] == []
        assert response.data['created']
        assert response.data['title'] == ''

    def test_2xx_cpal_admin(self, mock_auth_with_user):
        mock_auth_with_user(self.cp_admin)
        response = self.view(self.request,
                             parent_lookup_organization=self.organization.id,
                             email=self.org_viewer.user.email)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_manager)
        response = self.view(self.request,
                             parent_lookup_organization=self.organization.id,
                             email=self.org_viewer.user.email)
        assert response.status_code == 200

    def test_2xx_cpal_with_no_admins(self, mock_auth_with_user):
        self.org_admin.delete()
        self.organization.channel_partner_access_level_id = None
        self.organization.save()
        mock_auth_with_user(self.cp_admin)
        response = self.view(self.request,
                             parent_lookup_organization=self.organization.id,
                             email=self.org_viewer.user.email)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_manager)
        response = self.view(self.request,
                             parent_lookup_organization=self.organization.id,
                             email=self.org_viewer.user.email)
        assert response.status_code == 200

    def test_403_cpal_cp_reports_viewer(self, mock_auth_with_user):
        mock_auth_with_user(self.cp_viewer)
        response = self.view(self.request,
                             parent_lookup_organization=self.organization.id,
                             email=self.org_viewer.user.email)
        assert response.status_code == 403

    def test_403_no_cpal(self, mock_auth_with_user):
        self.organization.channel_partner_access_level_id = None
        self.organization.save()
        mock_auth_with_user(self.cp_admin)
        with transaction.atomic():
            response = self.view(self.request,
                                 parent_lookup_organization=self.organization.id,
                                 email=self.org_viewer.user.email)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_manager)
        with transaction.atomic():
            response = self.view(self.request,
                                 parent_lookup_organization=self.organization.id,
                                 email=self.org_viewer.user.email)
        assert response.status_code == 403

    def test_403_parent_cp_user(self, mock_auth_with_user):
        mock_auth_with_user(self.parent_cp_admin)
        with transaction.atomic():
            response = self.view(self.request,
                                 parent_lookup_organization=self.organization.id,
                                 email=self.org_viewer.user.email)
        assert response.status_code == 403

    def test_403_group_user(self, mock_auth_with_user):
        mock_auth_with_user(self.group_admin)
        with transaction.atomic():
            response = self.view(self.request,
                                 parent_lookup_organization=self.organization.id,
                                 email=self.org_viewer.user.email)
        assert response.status_code == 403

    def test_403_org_power_user(self, mock_auth_with_user):
        mock_auth_with_user(self.org_power_user)
        with transaction.atomic():
            response = self.view(self.request,
                                 parent_lookup_organization=self.organization.id,
                                 email=self.org_viewer.user.email)
        assert response.status_code == 403

    def test_2xx_self(self, mock_auth_with_user):
        mock_auth_with_user(self.org_viewer)
        with transaction.atomic():
            response = self.view(self.request,
                                 parent_lookup_organization=self.organization.id,
                                 email=self.org_viewer.user.email)
        assert response.status_code == 200

    def test_2xx_get_group_user(self, mock_auth_with_user):
        mock_auth_with_user(self.org_admin)
        with transaction.atomic():
            response = self.view(self.request,
                                 parent_lookup_organization=self.organization.id,
                                 email=self.group_admin.user.email)
        assert response.status_code == 200
        assert response.data['email'] == self.group_admin.user.email
        assert response.data['fullName'] == self.group_admin.user.full_name
        assert response.data['groupRoles'][0]['groupId'] == str(self.group.id)
        assert response.data['groupRoles'][0]['roles'] == ['Administrator']
        assert response.data['groupRoles'][0]['rolesIds'] == [str(OrganizationRoles.ADMINISTRATOR)]
        assert response.data['roles'] == []
        assert response.data['rolesIds'] == []
        assert response.data['created']
        assert response.data['title'] == ''


class TestOrganizationUserViewSetCreateUpdate:

    @pytest.fixture(autouse=True)
    def setup_method(self, channel_partner_factory, organization_factory, system_group_factory,
                     mock_auth_with_user, arf, org_user_factory, cp_user_factory,
                     sys_group_user_factory, cloud_user_factory):
        self.parent_cp = channel_partner_factory()
        self.parent_cp_admin = cp_user_factory(channel_partner=self.parent_cp)
        self.cp = channel_partner_factory(parent_channel_partner=self.parent_cp)
        self.cp_admin = cp_user_factory(channel_partner=self.cp)
        self.cp_manager = cp_user_factory(channel_partner=self.cp, role=ChannelPartnerRoles.MANAGER)
        self.cp_viewer = cp_user_factory(channel_partner=self.cp, role=ChannelPartnerRoles.REPORTS_VIEWER)
        self.organization = organization_factory(channel_partner=self.cp)
        self.org_viewer = org_user_factory(organization=self.organization,
                                           role=OrganizationRoles.VIEWER)
        self.org_viewer.full_name = "Full Name"
        self.org_viewer.save()
        self.org_admin = org_user_factory(organization=self.organization,
                                          role=OrganizationRoles.ORGANIZATION_ADMINISTRATOR)
        self.org_power_user = org_user_factory(organization=self.organization,
                                               role=OrganizationRoles.POWER_USER)
        self.group = system_group_factory(organization=self.organization)
        self.group_admin = sys_group_user_factory(organization=self.organization,
                                                  role_id=OrganizationRoles.ADMINISTRATOR,
                                                  group=self.group)
        self.view = OrganizationUserViewSet.as_view(actions={'post': 'create'}, detail=True)
        self.request = arf.get('/')
        self.cloud_user = cloud_user_factory()
        self.cloud_user_data = {
            'email': self.cloud_user.email,
            'roleId': OrganizationRoles.POWER_USER
        }
        self.new_user_data = {
            'email': f'{uuid4()}@networkoptix.com',
            'roleId': OrganizationRoles.VIEWER
        }
        self.org_viewer_data = {
            'email': self.org_viewer.user.email,
            'roleId': OrganizationRoles.SYSTEM_HEALTH_VIEWER
        }

    def test_create_new_user_200(self, mock_auth_with_user, arf):
        mock_auth_with_user(self.org_admin)
        request = arf.post('/', data=self.new_user_data, format='json')
        response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 200
        assert response.data['email'] == self.new_user_data['email']
        assert response.data['fullName'] is None
        assert response.data['roles'] == ["Viewer"]
        assert response.data['rolesIds'] == [self.new_user_data['roleId']]
        assert response.data['groupRoles'] == []
        assert response.data['created']
        assert response.data['title'] == ''

    def test_create_cloud_user_200(self, mock_auth_with_user, arf):
        mock_auth_with_user(self.org_admin)
        request = arf.post('/', data=self.cloud_user_data, format='json')
        response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 200
        assert response.data['email'] == self.cloud_user_data['email']
        assert response.data['fullName'] is None
        assert response.data['roles'] == ["Power User"]
        assert response.data['rolesIds'] == [self.cloud_user_data['roleId']]
        assert response.data['groupRoles'] == []
        assert response.data['created']
        assert response.data['title'] == ''

    def test_update_200(self, mock_auth_with_user, arf):
        mock_auth_with_user(self.org_admin)
        request = arf.post('/', data=self.org_viewer_data, format='json')
        response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 200
        assert response.data['email'] == self.org_viewer_data['email']
        assert response.data['fullName'] is None
        assert response.data['roles'] == ["System Health Viewer"]
        assert response.data['rolesIds'] == [self.org_viewer_data['roleId']]
        assert response.data['groupRoles'] == []
        assert response.data['created']
        assert response.data['title'] == ''
        assert OrganizationToUser.objects.filter(user=self.org_viewer.user).count() == 1
        assert CloudUser.objects.filter(email=self.org_viewer_data['email']).count() == 1
        self.org_viewer.refresh_from_db()
        assert self.org_viewer.roles == [OrganizationRoles.SYSTEM_HEALTH_VIEWER]

    def test_create_200_cpal_admin(self, mock_auth_with_user, arf):
        mock_auth_with_user(self.cp_admin)
        request = arf.post('/', data=self.cloud_user_data, format='json')
        response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_manager)
        request = arf.post('/', data=self.new_user_data, format='json')
        response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 200

    def test_2xx_cpal_with_no_admins(self, mock_auth_with_user, arf):
        self.org_admin.delete()
        self.organization.channel_partner_access_level_id = None
        self.organization.save()
        mock_auth_with_user(self.cp_admin)
        request = arf.post('/', data=self.cloud_user_data, format='json')
        response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_manager)
        request = arf.post('/', data=self.new_user_data, format='json')
        response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 200

    def test_403_cpal_cp_reports_viewer(self, mock_auth_with_user, arf):
        mock_auth_with_user(self.cp_viewer)
        request = arf.post('/', data=self.new_user_data, format='json')
        response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 403

    def test_403_no_cpal(self, mock_auth_with_user, arf):
        self.organization.channel_partner_access_level_id = None
        self.organization.save()
        mock_auth_with_user(self.cp_admin)
        request = arf.post('/', data=self.cloud_user_data, format='json')
        with transaction.atomic():
            response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_manager)
        request = arf.post('/', data=self.new_user_data, format='json')
        with transaction.atomic():
            response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 403

    def test_403_parent_cp_user(self, mock_auth_with_user, arf):
        mock_auth_with_user(self.parent_cp_admin)
        request = arf.post('/', data=self.new_user_data, format='json')
        with transaction.atomic():
            response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 403

    def test_403_group_user(self, mock_auth_with_user, arf):
        mock_auth_with_user(self.group_admin)
        request = arf.post('/', data=self.new_user_data, format='json')
        with transaction.atomic():
            response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 403

    def test_403_org_power_user(self, mock_auth_with_user, arf):
        mock_auth_with_user(self.org_power_user)
        request = arf.post('/', data=self.new_user_data, format='json')
        with transaction.atomic():
            response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 403

    def test_update_403_self(self, mock_auth_with_user, arf):
        mock_auth_with_user(self.org_viewer)
        request = arf.post('/', data=self.org_viewer_data, format='json')
        with transaction.atomic():
            response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 403


class TestOrganizationUserViewSetDestroy:

    @pytest.fixture(autouse=True)
    def setup_method(self, channel_partner_factory, organization_factory, system_group_factory,
                     mock_auth_with_user, arf, org_user_factory, cp_user_factory, sys_group_user_factory):
        self.parent_cp = channel_partner_factory()
        self.parent_cp_admin = cp_user_factory(channel_partner=self.parent_cp)
        self.cp = channel_partner_factory(parent_channel_partner=self.parent_cp)
        self.cp_admin = cp_user_factory(channel_partner=self.cp)
        self.cp_manager = cp_user_factory(channel_partner=self.cp, role=ChannelPartnerRoles.MANAGER)
        self.cp_viewer = cp_user_factory(channel_partner=self.cp, role=ChannelPartnerRoles.REPORTS_VIEWER)
        self.organization = organization_factory(channel_partner=self.cp)
        self.org_viewer = org_user_factory(organization=self.organization,
                                           role=OrganizationRoles.VIEWER)
        self.org_viewer.full_name = "Full Name"
        self.org_viewer.save()
        self.org_admin = org_user_factory(organization=self.organization,
                                          role=OrganizationRoles.ORGANIZATION_ADMINISTRATOR)
        self.org_power_user = org_user_factory(organization=self.organization,
                                               role=OrganizationRoles.POWER_USER)
        self.group = system_group_factory(organization=self.organization)
        self.group_admin = sys_group_user_factory(organization=self.organization,
                                                  role_id=OrganizationRoles.ADMINISTRATOR,
                                                  group=self.group)
        self.view = OrganizationUserViewSet.as_view(actions={'delete': 'destroy'}, detail=True)
        self.request = arf.delete('/')

    def test_2xx(self, mock_auth_with_user):
        mock_auth_with_user(self.org_admin)
        response = self.view(self.request,
                             parent_lookup_organization=self.organization.id,
                             email=self.org_viewer.user.email)
        assert response.status_code == 204

    def test_2xx_cpal_admin(self, mock_auth_with_user):
        mock_auth_with_user(self.cp_admin)
        response = self.view(self.request,
                             parent_lookup_organization=self.organization.id,
                             email=self.org_viewer.user.email)
        assert response.status_code == 204

        mock_auth_with_user(self.cp_manager)
        response = self.view(self.request,
                             parent_lookup_organization=self.organization.id,
                             email=self.org_power_user.user.email)
        assert response.status_code == 204

        mock_auth_with_user(self.cp_manager)
        response = self.view(self.request,
                             parent_lookup_organization=self.organization.id,
                             email=self.org_admin.user.email)
        assert response.status_code == 409

    def test_2xx_cpal_with_no_admins(self, mock_auth_with_user):
        self.org_admin.delete()
        self.organization.channel_partner_access_level_id = None
        self.organization.save()
        mock_auth_with_user(self.cp_admin)
        response = self.view(self.request,
                             parent_lookup_organization=self.organization.id,
                             email=self.org_viewer.user.email)
        assert response.status_code == 204

        mock_auth_with_user(self.cp_manager)
        response = self.view(self.request,
                             parent_lookup_organization=self.organization.id,
                             email=self.org_power_user.user.email)
        assert response.status_code == 204

        response = self.view(self.request,
                             parent_lookup_organization=self.organization.id,
                             email=self.org_power_user.user.email)
        assert response.status_code == 404

    def test_403_cpal_cp_reports_viewer(self, mock_auth_with_user):
        mock_auth_with_user(self.cp_viewer)
        response = self.view(self.request,
                             parent_lookup_organization=self.organization.id,
                             email=self.org_viewer.user.email)
        assert response.status_code == 403

    def test_403_no_cpal(self, mock_auth_with_user):
        self.organization.channel_partner_access_level_id = None
        self.organization.save()
        mock_auth_with_user(self.cp_admin)
        with transaction.atomic():
            response = self.view(self.request,
                                 parent_lookup_organization=self.organization.id,
                                 email=self.org_viewer.user.email)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_manager)
        with transaction.atomic():
            response = self.view(self.request,
                                 parent_lookup_organization=self.organization.id,
                                 email=self.org_viewer.user.email)
        assert response.status_code == 403

    def test_403_parent_cp_user(self, mock_auth_with_user):
        mock_auth_with_user(self.parent_cp_admin)
        with transaction.atomic():
            response = self.view(self.request,
                                 parent_lookup_organization=self.organization.id,
                                 email=self.org_viewer.user.email)
        assert response.status_code == 403

    def test_403_group_user(self, mock_auth_with_user):
        mock_auth_with_user(self.group_admin)
        with transaction.atomic():
            response = self.view(self.request,
                                 parent_lookup_organization=self.organization.id,
                                 email=self.org_viewer.user.email)
        assert response.status_code == 403

    def test_403_org_power_user(self, mock_auth_with_user):
        mock_auth_with_user(self.org_power_user)
        with transaction.atomic():
            response = self.view(self.request,
                                 parent_lookup_organization=self.organization.id,
                                 email=self.org_viewer.user.email)
        assert response.status_code == 403

    def test_2xx_self(self, mock_auth_with_user):
        mock_auth_with_user(self.org_viewer)
        with transaction.atomic():
            response = self.view(self.request,
                                 parent_lookup_organization=self.organization.id,
                                 email=self.org_viewer.user.email)
        assert response.status_code == 204

    def test_2xx_group_user_self(self, mock_auth_with_user):
        mock_auth_with_user(self.org_admin)
        with transaction.atomic():
            response = self.view(self.request,
                                 parent_lookup_organization=self.organization.id,
                                 email=self.group_admin.user.email)
        assert response.status_code == 204


class TestOrganizationUserViewSetCreateUpdate:

    @pytest.fixture(autouse=True)
    def setup_method(self, channel_partner_factory, organization_factory, system_group_factory,
                     mock_auth_with_user, arf, org_user_factory, cp_user_factory,
                     sys_group_user_factory, cloud_user_factory):
        self.parent_cp = channel_partner_factory()
        self.parent_cp_admin = cp_user_factory(channel_partner=self.parent_cp)
        self.cp = channel_partner_factory(parent_channel_partner=self.parent_cp)
        self.cp_admin = cp_user_factory(channel_partner=self.cp)
        self.cp_manager = cp_user_factory(channel_partner=self.cp, role=ChannelPartnerRoles.MANAGER)
        self.cp_viewer = cp_user_factory(channel_partner=self.cp, role=ChannelPartnerRoles.REPORTS_VIEWER)
        self.organization = organization_factory(channel_partner=self.cp)
        self.org_viewer = org_user_factory(organization=self.organization,
                                           role=OrganizationRoles.VIEWER)
        self.org_viewer.full_name = "Full Name"
        self.org_viewer.save()
        self.org_admin = org_user_factory(organization=self.organization,
                                          role=OrganizationRoles.ORGANIZATION_ADMINISTRATOR)
        self.org_power_user = org_user_factory(organization=self.organization,
                                               role=OrganizationRoles.POWER_USER)
        self.group = system_group_factory(organization=self.organization)
        self.group_admin = sys_group_user_factory(organization=self.organization,
                                                  role_id=OrganizationRoles.ADMINISTRATOR,
                                                  group=self.group)
        self.view = OrganizationUserViewSet.as_view(actions={'post': 'create'}, detail=True)
        self.request = arf.get('/')
        self.cloud_user = cloud_user_factory()
        self.cloud_user_data = {
            'email': self.cloud_user.email,
            'roleId': OrganizationRoles.POWER_USER
        }
        self.new_user_data = {
            'email': f'{uuid4()}@networkoptix.com',
            'roleId': OrganizationRoles.VIEWER
        }
        self.org_viewer_data = {
            'email': self.org_viewer.user.email,
            'roleId': OrganizationRoles.SYSTEM_HEALTH_VIEWER
        }

    def test_create_new_user_200(self, mock_auth_with_user, arf):
        mock_auth_with_user(self.org_admin)
        request = arf.post('/', data=self.new_user_data, format='json')
        response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 200
        assert response.data['email'] == self.new_user_data['email']
        assert response.data['fullName'] is None
        assert response.data['roles'] == ["Viewer"]
        assert response.data['rolesIds'] == [self.new_user_data['roleId']]
        assert response.data['groupRoles'] == []
        assert response.data['created']
        assert response.data['title'] == ''

    def test_create_cloud_user_200(self, mock_auth_with_user, arf):
        mock_auth_with_user(self.org_admin)
        request = arf.post('/', data=self.cloud_user_data, format='json')
        response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 200
        assert response.data['email'] == self.cloud_user_data['email']
        assert response.data['fullName'] is None
        assert response.data['roles'] == ["Power User"]
        assert response.data['rolesIds'] == [self.cloud_user_data['roleId']]
        assert response.data['groupRoles'] == []
        assert response.data['created']
        assert response.data['title'] == ''

    def test_update_200(self, mock_auth_with_user, arf):
        mock_auth_with_user(self.org_admin)
        request = arf.post('/', data=self.org_viewer_data, format='json')
        response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 200
        assert response.data['email'] == self.org_viewer_data['email']
        assert response.data['fullName'] is None
        assert response.data['roles'] == ["System Health Viewer"]
        assert response.data['rolesIds'] == [self.org_viewer_data['roleId']]
        assert response.data['groupRoles'] == []
        assert response.data['created']
        assert response.data['title'] == ''
        assert OrganizationToUser.objects.filter(user=self.org_viewer.user).count() == 1
        assert CloudUser.objects.filter(email=self.org_viewer_data['email']).count() == 1
        self.org_viewer.refresh_from_db()
        assert self.org_viewer.roles == [OrganizationRoles.SYSTEM_HEALTH_VIEWER]

    def test_create_200_cpal_admin(self, mock_auth_with_user, arf):
        mock_auth_with_user(self.cp_admin)
        request = arf.post('/', data=self.cloud_user_data, format='json')
        response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_manager)
        request = arf.post('/', data=self.new_user_data, format='json')
        response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 200

    def test_2xx_cpal_with_no_admins(self, mock_auth_with_user, arf):
        self.org_admin.delete()
        self.organization.channel_partner_access_level_id = None
        self.organization.save()
        mock_auth_with_user(self.cp_admin)
        request = arf.post('/', data=self.cloud_user_data, format='json')
        response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_manager)
        request = arf.post('/', data=self.new_user_data, format='json')
        response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 200

    def test_403_cpal_cp_reports_viewer(self, mock_auth_with_user, arf):
        mock_auth_with_user(self.cp_viewer)
        request = arf.post('/', data=self.new_user_data, format='json')
        response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 403

    def test_403_no_cpal(self, mock_auth_with_user, arf):
        self.organization.channel_partner_access_level_id = None
        self.organization.save()
        mock_auth_with_user(self.cp_admin)
        request = arf.post('/', data=self.cloud_user_data, format='json')
        with transaction.atomic():
            response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_manager)
        request = arf.post('/', data=self.new_user_data, format='json')
        with transaction.atomic():
            response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 403

    def test_403_parent_cp_user(self, mock_auth_with_user, arf):
        mock_auth_with_user(self.parent_cp_admin)
        request = arf.post('/', data=self.new_user_data, format='json')
        with transaction.atomic():
            response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 403

    def test_403_group_user(self, mock_auth_with_user, arf):
        mock_auth_with_user(self.group_admin)
        request = arf.post('/', data=self.new_user_data, format='json')
        with transaction.atomic():
            response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 403

    def test_403_org_power_user(self, mock_auth_with_user, arf):
        mock_auth_with_user(self.org_power_user)
        request = arf.post('/', data=self.new_user_data, format='json')
        with transaction.atomic():
            response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 403

    def test_update_403_self(self, mock_auth_with_user, arf):
        mock_auth_with_user(self.org_viewer)
        request = arf.post('/', data=self.org_viewer_data, format='json')
        with transaction.atomic():
            response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 403


class TestOrganizationUserViewSetCreateUpdate:

    @pytest.fixture(autouse=True)
    def setup_method(self, channel_partner_factory, organization_factory, system_group_factory,
                     mock_auth_with_user, arf, org_user_factory, cp_user_factory,
                     sys_group_user_factory, cloud_user_factory):
        self.parent_cp = channel_partner_factory()
        self.parent_cp_admin = cp_user_factory(channel_partner=self.parent_cp)
        self.cp = channel_partner_factory(parent_channel_partner=self.parent_cp)
        self.cp_admin = cp_user_factory(channel_partner=self.cp)
        self.cp_manager = cp_user_factory(channel_partner=self.cp, role=ChannelPartnerRoles.MANAGER)
        self.cp_viewer = cp_user_factory(channel_partner=self.cp, role=ChannelPartnerRoles.REPORTS_VIEWER)
        self.organization = organization_factory(channel_partner=self.cp)
        self.org_viewer = org_user_factory(organization=self.organization,
                                           role=OrganizationRoles.VIEWER)
        self.org_viewer.full_name = "Full Name"
        self.org_viewer.save()
        self.org_admin = org_user_factory(organization=self.organization,
                                          role=OrganizationRoles.ORGANIZATION_ADMINISTRATOR)
        self.org_power_user = org_user_factory(organization=self.organization,
                                               role=OrganizationRoles.POWER_USER)
        self.group = system_group_factory(organization=self.organization)
        self.group_admin = sys_group_user_factory(organization=self.organization,
                                                  role_id=OrganizationRoles.ADMINISTRATOR,
                                                  group=self.group)
        self.view = OrganizationUserViewSet.as_view(actions={'post': 'bulk_delete'}, detail=True)
        self.request = arf.get('/')
        self.cloud_user = cloud_user_factory()
        self.users = [
            self.org_power_user.user.email,
            self.org_viewer.user.email
        ]
        self.all_users = self.users + [self.org_admin.user.email]

    def test_2xx_non_admin_users(self, mock_auth_with_user, arf):
        mock_auth_with_user(self.org_admin)
        request = arf.post('/', data=self.users, format='json')
        response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 200
        assert set(response.data['emails']) == set(self.users)
        assert self.organization.users.count() == 2 # admin and group admin

    def test_409_delete_with_admin_users(self, mock_auth_with_user, arf, org_user_factory):
        mock_auth_with_user(self.org_admin)
        request = arf.post('/', data=self.all_users, format='json')
        with transaction.atomic():
            response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 409

    def test_2xx_with_admin_users(self, mock_auth_with_user, arf, org_user_factory):
        mock_auth_with_user(self.org_admin)
        org_user_factory(organization=self.organization)
        request = arf.post('/', data=self.all_users, format='json')
        response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 200
        assert set(response.data['emails']) == set(self.all_users)
        assert self.organization.users.count() == 2 # admin and group admin

    def test_2xx_with_non_existing(self, mock_auth_with_user, arf):
        mock_auth_with_user(self.org_admin)
        data = [f'nonexist@networkoptix.com'] + self.users
        request = arf.post('/', data=data, format='json')
        response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 200
        assert set(response.data['emails']) == set(self.users)

        request = arf.post('/', data=[f'nonexist@networkoptix.com'], format='json')
        response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 200
        assert response.data['emails'] == []

    def test_2xx_cpal_admin(self, mock_auth_with_user, arf):
        mock_auth_with_user(self.cp_admin)
        request = arf.post('/', data=self.users, format='json')
        response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 200
        assert set(response.data['emails']) == set(self.users)

        mock_auth_with_user(self.cp_manager)
        request = arf.post('/', data=self.users, format='json')
        response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 200
        assert response.data['emails'] == []

    def test_2xx_cpal_with_no_admins(self, mock_auth_with_user, arf):
        self.org_admin.delete()
        self.organization.channel_partner_access_level_id = None
        self.organization.save()
        mock_auth_with_user(self.cp_admin)
        request = arf.post('/', data=self.users, format='json')
        response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 200
        assert set(response.data['emails']) == set(self.users)

        mock_auth_with_user(self.cp_manager)
        request = arf.post('/', data=self.users, format='json')
        response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 200
        assert response.data['emails'] == []

    def test_403_cpal_cp_reports_viewer(self, mock_auth_with_user, arf):
        mock_auth_with_user(self.cp_viewer)
        request = arf.post('/', data=self.users, format='json')
        response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 403

    def test_403_no_cpal(self, mock_auth_with_user, arf):
        self.organization.channel_partner_access_level_id = None
        self.organization.save()
        mock_auth_with_user(self.cp_admin)
        request = arf.post('/', data=self.users, format='json')
        with transaction.atomic():
            response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_manager)
        request = arf.post('/', data=self.users, format='json')
        with transaction.atomic():
            response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 403

    def test_403_parent_cp_user(self, mock_auth_with_user, arf):
        mock_auth_with_user(self.parent_cp_admin)
        request = arf.post('/', data=self.users, format='json')
        with transaction.atomic():
            response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 403

    def test_403_group_user(self, mock_auth_with_user, arf):
        mock_auth_with_user(self.group_admin)
        request = arf.post('/', data=self.users, format='json')
        with transaction.atomic():
            response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 403

    def test_403_org_power_user(self, mock_auth_with_user, arf):
        mock_auth_with_user(self.org_power_user)
        request = arf.post('/', data=self.users, format='json')
        with transaction.atomic():
            response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 403

    def test_403_self(self, mock_auth_with_user, arf):
        mock_auth_with_user(self.org_viewer)
        request = arf.post('/', data=[self.org_viewer.user.email], format='json')
        with transaction.atomic():
            response = self.view(request, parent_lookup_organization=self.organization.id)
        assert response.status_code == 403
