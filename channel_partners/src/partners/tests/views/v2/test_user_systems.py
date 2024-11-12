import pytest
from rest_framework.reverse import reverse
from rest_framework.test import APIClient

from partners.models import (
    ChannelPartnerRoles,
    CloudHost,
    OrganizationRoles,
)
from tools.helpers import cast_uuid


class TestUserSystemsBugs:

    @pytest.mark.parametrize("user, expected", [
        ("admin", {"7121dc6f-8e56-4649-9db5-3645b92c5ab2"}),
        ("manager", {"7121dc6f-8e56-4649-9db5-3645b92c5ab2"}),
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
            name="[SYS] - X",
            system_id="7121dc6f-8e56-4649-9db5-3645b92c5ab2")

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
            url_args = {"email": cp_user_admin.email}
        elif user == "manager":
            client.force_authenticate(cp_user_manager)
            url_args = {"email": cp_user_manager.email}
        elif user == "viewer":
            client.force_authenticate(cp_user_viewer)
            url_args = {"email": cp_user_viewer.email}
        else:
            raise ValueError(f"Invalid user role: {user}")

        # Test Execution
        url = reverse("v2:user_systems", kwargs=url_args)

        # Make request | Get all systems for the user
        response = client.get(url)
        if isinstance(response.data, list):
            actual = {system_membership['system_id'] for system_membership in response.data}
        else:
            actual = set()

        assert actual == expected


class TestUserSystems:

    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, cp_user_factory, organization_factory,
              org_user_factory, system_group_factory, system_factory, cloud_test_host,
              sys_group_user_factory, cloud_user_factory, arf, mock_internal_token_auth):
        # Create a channel partner and an admin user for the channel partner
        cp = channel_partner_factory()
        self.cp_user_admin = cp_user_factory(channel_partner=cp)

        # Create an organization and set its access level to POWER_USER
        org = organization_factory(channel_partner=cp)
        org.channel_partner_access_level_id = OrganizationRoles.POWER_USER
        org.save()

        # Create systems for the organization
        org_sys = system_factory(organization=org)

        # Create a system group and a system within that group
        group = system_group_factory(organization=org)
        group_sys = system_factory(organization=org, system_group=group)

        # Create a subgroup and a system within that subgroup
        sub_group = system_group_factory(organization=org, parent=group)
        sub_group_sys = system_factory(organization=org, system_group=sub_group)

        # Create users with different roles within the organization
        self.org_admin = org_user_factory(organization=org)
        self.org_viewer = org_user_factory(organization=org, role=OrganizationRoles.VIEWER)
        self.group_user = sys_group_user_factory(
            organization=org, group=group,
            role_id=OrganizationRoles.SYSTEM_HEALTH_VIEWER)

        # Initialize the API client with the test host
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
        self.client.force_authenticate(user=self.cp_user_admin.user)

        # Test Execution
        url_args = {
            "email": self.cp_user_admin.user.email
        }
        url = reverse("v2:user_systems", kwargs=url_args)


        # Make request | Get all systems for the user
        response = self.client.get(url)
        actual_records = response.data

        # Expected
        required_fields = ['system_id', 'systemId', 'vmsRoles', 'membership_type', 'membershipType']
        results = []
        for record in actual_records:
            results.append(not (set(required_fields) - record.keys()))
        assert all(results)


    def test_system_user_has_all_fields(self, channel_partner_factory, cp_user_factory, arf):
        url_args = {
            "email": self.cp_user_admin.user.email
        }
        url = reverse("v2:user_systems", kwargs=url_args)
        self.client.force_authenticate(self.cp_user_admin.user)
        response = self.client.get(url)
        actual_records = response.data

        required_fields = ['system_id', 'systemId', 'vmsRoles', 'membership_type', 'membershipType']
        results = []
        for record in actual_records:
            results.append(not (set(required_fields) - record.keys()))
        assert all(results)

    def test_cp_admin_ok(self):
        url_args = {
            "email": self.cp_user_admin.user.email
        }
        url = reverse("v2:user_systems", kwargs=url_args)
        self.client.force_authenticate(self.cp_user_admin.user)
        response = self.client.get(url)
        assert response.status_code == 200
        assert len(response.data) == 3

    def test_org_admin_ok(self):
        url_args = {
            "email": self.org_admin.user.email
        }
        url = reverse("v2:user_systems", kwargs=url_args)
        self.client.force_authenticate(self.org_admin.user)
        response = self.client.get(url)
        assert response.status_code == 200
        assert len(response.data) == 3
        for sys in response.data:
            assert cast_uuid(sys['systemId'])
            assert sys['organizationId'] == str(self.org_admin.organization_id)
            assert sys['organizationName'] == self.org_admin.organization.name

    def test_group_user_ok(self):
        url_args = {
            "email": self.group_user.user.email
        }
        url = reverse("v2:user_systems", kwargs=url_args)
        self.client.force_authenticate(self.group_user.user)
        response = self.client.get(url)
        assert response.status_code == 200
        assert len(response.data) == 2

    def test_org_viewer(self):
        url_args = {
            "email": self.org_viewer.user.email
        }
        url = reverse("v2:user_systems", kwargs=url_args)
        self.client.force_authenticate(self.org_viewer.user)
        response = self.client.get(url)
        assert response.status_code == 200
        assert len(response.data) == 3

    def test_incorrect_email(self):
        url_args = {
            "email": self.org_viewer.user.email
        }
        url = reverse("v2:user_systems", kwargs=url_args)
        self.client.force_authenticate(self.org_admin.user)
        response = self.client.get(url)
        assert response.status_code == 403

    def test_unauthenticated(self):
        url_args = {
            "email": self.org_viewer.user.email
        }
        url = reverse("v2:user_systems", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 401

    def test_email_case_insensitivity(self):
        url_args = {
            "email": self.cp_user_admin.user.email.upper()
        }
        url = reverse("v2:user_systems", kwargs=url_args)
        self.client.force_authenticate(self.cp_user_admin.user)
        response = self.client.get(url)
        assert response.status_code == 200
        assert len(response.data) == 3