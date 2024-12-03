from uuid import uuid4

import pytest
from django.core.cache import caches
from rest_framework.reverse import reverse
from rest_framework.test import APIClient

from partners.auth.cache import TokenCache
from partners.models import (
    ChannelPartnerRoles,
    CloudHost,
    OrganizationRole,
    OrganizationRoles,
    VmsRoles,
)


class TestSystemUsersBugs:

    @pytest.mark.parametrize("user, expected", [
        ("admin", {"example-admin@networkoptix.com", "example-manager@networkoptix.com"}),
        ("manager", {"example-admin@networkoptix.com", "example-manager@networkoptix.com"}),
        ("viewer", set())
    ], ids=["admin access should have data", "manager access should have data", "viewer access should not have data"])
    def test_system_users_access_by_role(
            self, channel_partner_factory, cp_user_factory, organization_factory,
            org_user_factory, system_group_factory, system_factory, cloud_test_host,
            sys_group_user_factory, cloud_user_factory, arf, mock_internal_token_auth, user, expected):
        # Test Setup
        channel_partner_a = channel_partner_factory(name="[CP] - A")

        organization_b = organization_factory(
            channel_partner=channel_partner_a,
            name="[ORG] - B")
        system_x = system_factory(
            organization=organization_b,
            name="[SYS] - X")

        # Add users to Channel Partner (1x: Administrator; 1x: Manager; 1x: Reports Viewer)
        cp_user_admin = cp_user_factory(
            channel_partner=channel_partner_a,
            email="example-admin@networkoptix.com",
            role=ChannelPartnerRoles.ADMINISTRATOR).user

        cp_user_manager = cp_user_factory(
            channel_partner=channel_partner_a,
            email="example-manager@networkoptix.com",
            role=ChannelPartnerRoles.MANAGER).user

        cp_user_viewer = cp_user_factory(
            channel_partner=channel_partner_a,
            email="example-report_viewer@networkoptix.com",
            role=ChannelPartnerRoles.REPORTS_VIEWER).user

        # Setting up API Client
        client = APIClient(SERVER_NAME=cloud_test_host.hostname)
        if user == "admin":
            client.force_authenticate(cp_user_admin)
        elif user == "manager":
            client.force_authenticate(cp_user_manager)
        elif user == "viewer":
            client.force_authenticate(cp_user_viewer)

        # Test Execution
        url_args = {"system_id": system_x.system_id}
        url = reverse("v3:system_users", kwargs=url_args)

        # Make request | Get all systems for the user
        response = client.get(url)
        if isinstance(response.data, list):
            actual = {user['email'] for user in response.data}
        else:
            actual = set()

        assert actual == expected


class TestSystemUser:

    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, cp_user_factory, organization_factory,
              org_user_factory, system_group_factory, system_factory,
              sys_group_user_factory, cloud_user_factory, arf, cloud_test_host):
        cp = channel_partner_factory()
        self.org = org = organization_factory(channel_partner=cp)
        other_org = organization_factory(channel_partner=cp)
        org.channel_partner_access_level_id = OrganizationRoles.POWER_USER
        org.save()
        self.org_sys = system_factory(organization=org)
        group = system_group_factory(organization=org)
        self.group_sys = system_factory(organization=org, system_group=group)
        self.cp_admin = cp_user_factory(channel_partner=cp)
        self.other_admin = org_user_factory(organization=other_org)
        self.group_user = sys_group_user_factory(organization=org, group=group,
                                                 role_id=OrganizationRoles.VIEWER)
        self.token = f'{uuid4()}'
        self.client = APIClient(SERVER_NAME=cloud_test_host.hostname)

    def test_success_alt_host(self, channel_partner_factory, cp_user_factory):
        # Test Setup
        alt_host = CloudHost.objects.create(hostname='alt-host.hdw.mx')

        # Create Channel Partner and User
        alt_host_cp = channel_partner_factory(cloud_host=alt_host)
        alt_host_cp_user = cp_user_factory(channel_partner=alt_host_cp)

        # Setting up API Client
        self.client = APIClient(SERVER_NAME=alt_host.hostname)

        # Authenticate User
        self.client.force_authenticate(user=self.cp_admin.user)

        # Test Execution
        url_args = {
            'system_id': str(self.group_sys.system_id),
            'email': self.group_user.user.email
        }
        path = reverse('v3:system_user', kwargs=url_args)

        # Response
        response = self.client.get(path)

        # Expected
        expected = OrganizationRole.objects.get(pk=self.group_user.roles[0]).system_role_uuid

        # Test Assertion
        assert response.status_code == 200
        assert response.data['vmsRoles'][0] == expected

    def test_success_cp_admin(self):
        self.client.force_authenticate(user=self.cp_admin.user)
        url_args = {
            'system_id': str(self.group_sys.system_id),
            'email': self.group_user.user.email
        }
        path = reverse('v3:system_user', kwargs=url_args)
        response = self.client.get(path)
        assert response.status_code == 200
        assert (response.data['vmsRoles'][0] ==
                OrganizationRole.objects.get(pk=self.group_user.roles[0]).system_role_uuid)

    def test_success_group_user(self):
        self.client.force_authenticate(user=self.group_user.user)
        url_args = {
            'system_id': str(self.group_sys.system_id),
            'email': self.group_user.user.email
        }
        path = reverse('v3:system_user', kwargs=url_args)
        response = self.client.get(path)
        assert response.status_code == 200
        assert (response.data['vmsRoles'][0] ==
                OrganizationRole.objects.get(pk=self.group_user.roles[0]).system_role_uuid)

    def test_invalid_email(self):
        self.client.force_authenticate(user=self.group_user.user)
        url_args = {
            'system_id': str(self.group_sys.system_id),
            'email': self.cp_admin.user.email
        }
        path = reverse('v3:system_user', kwargs=url_args)
        response = self.client.get(path)
        assert response.status_code == 403

    def test_permission_denied(self):
        self.client.force_authenticate(user=self.group_user.user)
        url_args = {
            'system_id': str(self.org_sys.system_id),
            'email': self.cp_admin.user.email
        }
        path = reverse('v3:system_user', kwargs=url_args)
        response = self.client.get(path)
        assert response.status_code == 403

    def test_cdb_permission_power_user(self, mock_cdb_token_introspect, cloud_user_factory, ):
        sys_admin = cloud_user_factory()
        user_email = mock_cdb_token_introspect(
            user=sys_admin, system=self.org_sys, system_role=VmsRoles.POWER_USER)

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        url_args = {
            'system_id': str(self.org_sys.system_id),
            'email': self.cp_admin.user.email
        }
        path = reverse('v3:system_user', kwargs=url_args)
        response = self.client.get(path)
        assert response.status_code == 200

    def test_cdb_permission_custom_user(self, mock_cdb_token_introspect, cloud_user_factory, ):
        sys_admin = cloud_user_factory()
        user_email = mock_cdb_token_introspect(
            user=sys_admin, system=self.org_sys, system_role=None)

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        url_args = {
            'system_id': str(self.org_sys.system_id),
            'email': user_email
        }
        path = reverse('v3:system_user', kwargs=url_args)
        response = self.client.get(path)
        assert response.status_code == 200
        assert response.data['vmsRoles'] == []
        assert response.data['type'] == None
        assert response.data['email'] == user_email

    def test_disconnected(self):
        self.client.force_authenticate(user=self.cp_admin.user)
        self.group_sys.disconnect_system()
        url_args = {
            'system_id': str(self.group_sys.system_id),
            'email': self.group_user.user.email
        }
        path = reverse('v3:system_user', kwargs=url_args)
        response = self.client.get(path)
        assert response.status_code == 403

    def test_emaIl_case_insensitivity(self, cloud_user_factory):
        user = cloud_user_factory()
        self.client.force_authenticate(user=self.cp_admin.user)
        url_args = {
            'system_id': str(self.group_sys.system_id),
            'email': user.email.upper()
        }
        path = reverse('v3:system_user', kwargs=url_args)
        response = self.client.get(path)
        assert response.status_code == 200
        assert response.data['email'] == user.email.lower()

    def test_internal_service_200(self, mock_service_token_payload):
        url_args = {
            "system_id": self.group_sys.system_id,
            "email": self.group_user.user.email
        }
        self.client.credentials(HTTP_AUTHORIZATION=f'Service {uuid4()}')
        mocked_get_sa_token_payload = mock_service_token_payload()
        url = reverse("v3:system_user", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 200


    def test_internal_service_401_wrong_service(self, mock_service_token_payload, sa_jwt_payload_factory):
        url_args = {
            "system_id": self.group_sys.system_id,
            "email": self.group_user.user.email
        }
        self.client.credentials(HTTP_AUTHORIZATION=f'Service {uuid4()}')
        token_payload = sa_jwt_payload_factory(scope='[{"service":"cloud_db"}]')
        mocked_get_sa_token_payload = mock_service_token_payload(token_payload)
        url = reverse("v3:system_user", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 401



class TestSystemUsers:
    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, cp_user_factory, organization_factory,
              org_user_factory, system_group_factory, system_factory,
              sys_group_user_factory, cloud_test_host, arf):
        cp = channel_partner_factory()
        org = organization_factory(channel_partner=cp)
        org.channel_partner_access_level_id = OrganizationRoles.POWER_USER
        org.save()
        self.org_sys = system_factory(organization=org)
        group = system_group_factory(organization=org)
        self.group_sys = system_factory(organization=org, system_group=group)
        self.cp_admin = cp_user_factory(channel_partner=cp)
        self.org_admin = org_user_factory(organization=org)
        self.org_viewer = org_user_factory(organization=org, role=OrganizationRoles.VIEWER)
        self.group_user = sys_group_user_factory(organization=org, group=group)
        self.client = APIClient(SERVER_NAME=cloud_test_host.hostname)
        caches['local'].clear()
        caches['default'].clear()


    def test_cp_admin(self):
        url_args = {
            "system_id": self.group_sys.system_id
        }
        self.client.force_authenticate(self.cp_admin.user)
        url = reverse("v3:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 200
        assert len(response.data) == 4

        url_args = {
            "system_id": self.org_sys.system_id
        }
        url = reverse("v3:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 200
        assert len(response.data) == 3

    def test_org_admin(self):
        url_args = {
            "system_id": self.group_sys.system_id
        }
        self.client.force_authenticate(self.org_admin.user)
        url = reverse("v3:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 200
        assert len(response.data) == 4

        url_args = {
            "system_id": self.org_sys.system_id
        }
        url = reverse("v3:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 200
        assert len(response.data) == 3

    def test_group_user(self):
        url_args = {
            "system_id": self.group_sys.system_id
        }
        self.client.force_authenticate(self.group_user.user)
        url = reverse("v3:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 200
        assert len(response.data) == 4

        url_args = {
            "system_id": self.org_sys.system_id
        }
        url = reverse("v3:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 403

    def test_viewer(self):
        url_args = {
            "system_id": self.group_sys.system_id
        }
        self.client.force_authenticate(self.org_viewer.user)
        url = reverse("v3:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 403

        url_args = {
            "system_id": self.org_sys.system_id
        }
        url = reverse("v3:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 403

    def test_system_ok(self, mock_cdb_basic_auth):
        url_args = {
            "system_id": self.group_sys.system_id
        }

        auth = mock_cdb_basic_auth(self.group_sys)
        self.client.credentials(HTTP_AUTHORIZATION=auth)
        url = reverse("v3:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 200

        url_args = {
            "system_id": self.org_sys.system_id
        }
        auth = mock_cdb_basic_auth(self.org_sys)
        self.client.credentials(HTTP_AUTHORIZATION=auth)
        url = reverse("v3:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 200

    def test_system_failure(self, mock_cdb_basic_auth):
        url_args = {
            "system_id": self.group_sys.system_id
        }

        auth = mock_cdb_basic_auth(self.org_sys)
        self.client.credentials(HTTP_AUTHORIZATION=auth)
        url = reverse("v3:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 403

        url_args = {
            "system_id": self.org_sys.system_id
        }
        auth = mock_cdb_basic_auth(self.org_sys, status='deleted')
        self.client.credentials(HTTP_AUTHORIZATION=auth)
        url = reverse("v3:system_users", kwargs=url_args)
        response = self.client.get(url)
        # will return 200 OK as soon as cache still have authorization
        assert response.status_code == 200

        TokenCache.cache().clear()
        response = self.client.get(url)
        assert response.status_code == 401

    def test_cdb_user_ok(self, mock_cdb_token_introspect, cloud_user_factory):
        url_args = {
            "system_id": self.group_sys.system_id
        }

        user_email = mock_cdb_token_introspect(user=cloud_user_factory(), system=self.group_sys)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        url = reverse("v3:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 200
        assert len(response.data) == 4

        user_email = mock_cdb_token_introspect(user=None, system=self.group_sys)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        url = reverse("v3:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 200
        assert len(response.data) == 4

    def test_cdb_user_failure(self, mock_cdb_token_introspect, cloud_user_factory):
        url_args = {
            "system_id": self.group_sys.system_id
        }
        # invalid role
        user_email = mock_cdb_token_introspect(user=None, system=self.group_sys, system_role=VmsRoles.VIEWER)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        url = reverse("v3:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 403
        # invalid system id
        user_email = mock_cdb_token_introspect(user=None, system=self.org_sys)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        url = reverse("v3:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 403
        # missing system role in cdb response
        user_email = mock_cdb_token_introspect(user=None)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        url = reverse("v3:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 403


    def test_internal_service_200(self, mock_service_token_payload):

        url_args = {
            "system_id": self.group_sys.system_id
        }
        self.client.credentials(HTTP_AUTHORIZATION=f'Service {uuid4()}')
        mocked_get_sa_token_payload = mock_service_token_payload()
        url = reverse("v3:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 200


    def test_internal_service_401_wrong_service(self, mock_service_token_payload, sa_jwt_payload_factory):
        url_args = {
            "system_id": self.group_sys.system_id
        }
        self.client.credentials(HTTP_AUTHORIZATION=f'Service {uuid4()}')
        token_payload = sa_jwt_payload_factory(scope='[{"service":"cloud_db"}]')
        mocked_get_sa_token_payload = mock_service_token_payload(token_payload)
        url = reverse("v3:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 401

