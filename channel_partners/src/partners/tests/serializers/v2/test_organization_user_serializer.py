import json
from uuid import uuid4

import pytest
from django.db.models import Prefetch

from partners.models import (
    CloudUser,
    OrganizationRoles,
    OrganizationToUser,
)
from partners.serializers.v2.serializers import OrganizationUserSerializer


class TestOrganizationUserSerializer:

    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory,
              cloud_user_factory, org_user_factory, system_group_factory):
        self.cp = channel_partner_factory()
        self.org = organization_factory(channel_partner=self.cp)
        self.groups = [system_group_factory(organization=self.org) for _ in range(4)]
        self.user = cloud_user_factory(email='test@networkoptix.com')
        # create another user relation to test prefetched data
        org_user_factory(organization=organization_factory(), email=self.user.email,
                         role=OrganizationRoles.SYSTEM_HEALTH_VIEWER)
        self.other_org = organization_factory(channel_partner=self.cp)
        self.other_group = system_group_factory(organization=self.other_org)
        self.org_adm_name = 'Organization Administrator'
        self.adm_name = 'System Administrator'
        self.org_power_user_name = 'Power User'

    @pytest.mark.no_tasks_autofix
    def test_create_valid(self, sys_group_user_factory, arf, org_user_factory, mock_account_status,
                          mock_get_customization_request, mock_post_notification, httpx_mock, mocker,
                          mock_mark_organization_user):
        data = {
            'email': self.user.email,
            'role': self.org_adm_name
        }
        org_admin = org_user_factory(organization=self.org)
        request = arf.post('/')
        request.user = org_admin.user
        mock_account_status(email=self.user.email, active=False)
        mock_account_status(email=org_admin.user.email, active=False)
        mock_get_customization_request()
        notification_send_url = mock_post_notification()
        mock_mark_organization_user.reset_mock()
        serializer = OrganizationUserSerializer(data=data,
                                                context={'organization': self.org, 'request': request})

        serializer.is_valid()
        assert not serializer.errors
        serializer.save()
        assert serializer.data['roles'] == [self.org_adm_name]
        notification_send_request = httpx_mock.get_request(url=notification_send_url)
        notification_data = json.loads(notification_send_request.content)
        assert notification_data['type'] == 'cps_organization_invite'
        assert notification_data['user_email'] == self.user.email
        assert notification_data['message']['organization_name'] == self.org.name
        # Checking against Email since, by default full_name is None
        assert notification_data['message']['sharer_name'] == org_admin.user.email

        relations = OrganizationToUser.objects.filter(organization=self.org, user=self.user)
        assert relations.count() == 1
        assert relations.first().system_group is None
        assert relations.first().roles == [OrganizationRoles.ORGANIZATION_ADMINISTRATOR]

        user = (
            CloudUser.objects.all().
            prefetch_related(
                Prefetch(
                    'organizationtouser_set',
                    queryset=OrganizationToUser.objects.filter(organization=self.org),
                    to_attr='organization_relations'
                )
            ).distinct().get(email=self.user.email))

        serializer = OrganizationUserSerializer(instance=user)

        assert serializer.data['email'] == self.user.email
        assert len(serializer.data['groupRoles']) == 0
        assert serializer.data['roles'] == [self.org_adm_name]

        group_user = sys_group_user_factory(organization=self.org)
        user = (
            CloudUser.objects.all().
            prefetch_related(
                Prefetch(
                    'organizationtouser_set',
                    queryset=OrganizationToUser.objects.filter(organization=self.org),
                    to_attr='organization_relations'
                )
            ).distinct().get(email=group_user.user.email))
        serializer = OrganizationUserSerializer(instance=user)
        assert serializer.data['email'] == group_user.user.email
        assert serializer.data['groupRoles'][0]['roles'] == [self.adm_name]
        assert serializer.data['groupRoles'][0]['rolesIds'] == [str(OrganizationRoles.SYSTEM_ADMINISTRATOR)]
        assert serializer.data['groupRoles'][0]['groupId'] == str(group_user.system_group_id)
        assert serializer.data['groupRoles'][0]['created']
        assert serializer.data['groupRoles'][0]['lastModified']

        httpx_mock.reset()
        notification_send_url = mock_post_notification()
        user = group_user.user
        data = {
            'email': user.email,
            'role': self.org_adm_name
        }
        mock_account_status(email=self.user.email, active=False)
        mock_account_status(email=group_user.user.email, active=False)
        serializer = OrganizationUserSerializer(data=data, context={'organization': self.org, 'request': request})

        serializer.is_valid()
        serializer.save()
        assert not serializer.errors
        assert serializer.data['email'] == user.email
        assert serializer.data['fullName'] == user.full_name
        assert len(serializer.data['groupRoles']) == 0
        assert serializer.data['roles'] == [self.org_adm_name]
        # Group role deleted
        assert not (OrganizationToUser.objects
                    .filter(user=user, organization=self.org, system_group__isnull=False)
                    .exists())
        # Notification is not sent
        assert httpx_mock.get_request(url=notification_send_url) is None

    def test_create_invalid_system_group(self):
        data = {
            'email': self.user.email,
            'role': 'invalid'
        }
        serializer = OrganizationUserSerializer(data=data, context={'organization': self.org})

        serializer.is_valid()
        assert serializer.errors
        assert serializer.errors['role'][0]

    def test_changing_the_only_admin(self, mock_new_org_user_role_notification, org_user_factory):
        user= org_user_factory(organization=self.org)
        data = {
            'email': user.user.email,
            'roleId': OrganizationRoles.POWER_USER
        }
        serializer = OrganizationUserSerializer(data=data, context={'organization': self.org})

        assert serializer.is_valid() is False
        assert serializer.errors['roleId'][0] == 'It is impossible to change role for the only administrator.'

    def test_changing_the_second_admin(self, mock_new_org_user_role_notification, org_user_factory):
        user = org_user_factory(organization=self.org)
        other_user = org_user_factory(organization=self.org)
        data = {
            'email': user.user.email,
            'roleId': OrganizationRoles.POWER_USER
        }
        serializer = OrganizationUserSerializer(data=data, context={'organization': self.org})

        assert serializer.is_valid() is True

    def test_changing_the_only_admin_2_users(self, mock_new_org_user_role_notification, org_user_factory):
        user = org_user_factory(organization=self.org)
        other_user = org_user_factory(organization=self.org, role=OrganizationRoles.POWER_USER)
        data = {
            'email': user.user.email,
            'roleId': OrganizationRoles.POWER_USER
        }
        serializer = OrganizationUserSerializer(data=data, context={'organization': self.org})

        assert serializer.is_valid() is False
        assert serializer.errors['roleId'][0] == 'It is impossible to change role for the only administrator.'

    def test_the_only_admin_cpal_off(self, org_user_factory):
        self.org.channel_partner_access_level_id = None
        self.org.save()
        org_admin = org_user_factory(organization=self.org)
        data = {
            'email': org_admin.user.email,
            'roleId': OrganizationRoles.POWER_USER
        }
        serializer = OrganizationUserSerializer(data=data, context={'organization': self.org})

        assert serializer.is_valid() is False
        assert serializer.errors['roleId'][0] == 'It is impossible to change role for the only administrator.'

    def test_the_only_admin_cpal_on_no_cp_admins(self, org_user_factory):
        self.org.channel_partner_access_level_id = OrganizationRoles.ORGANIZATION_ADMINISTRATOR
        self.org.save()
        org_admin = org_user_factory(organization=self.org)
        data = {
            'email': org_admin.user.email,
            'roleId': OrganizationRoles.POWER_USER
        }
        serializer = OrganizationUserSerializer(data=data, context={'organization': self.org})

        assert serializer.is_valid() is False
        assert serializer.errors['roleId'][0] == 'It is impossible to change role for the only administrator.'

    def test_the_only_admin_cpal_on_with_cp_admins(self, org_user_factory, cp_user_factory):
        self.org.channel_partner_access_level_id = OrganizationRoles.ORGANIZATION_ADMINISTRATOR
        self.org.save()
        cp_admin = cp_user_factory(channel_partner=self.cp)
        org_admin = org_user_factory(organization=self.org)

        data = {
            'email': org_admin.user.email,
            'roleId': OrganizationRoles.POWER_USER
        }
        serializer = OrganizationUserSerializer(data=data, context={'organization': self.org})

        assert serializer.is_valid() is True

    def test_mark_organization_user_new_user(self, mock_mark_organization_user, org_user_factory, arf):
        org_admin = org_user_factory(organization=self.org)
        mock_mark_organization_user.reset_mock()
        request = arf.post('/')
        request.user = org_admin.user
        email = f'{uuid4()}@networkoptix.com'
        data = {
            'email': email,
            'roleId': OrganizationRoles.ORGANIZATION_ADMINISTRATOR
        }
        serializer = OrganizationUserSerializer(data=data, context={'organization': self.org, 'request': request})
        serializer.is_valid()
        serializer.save()
        mock_mark_organization_user.assert_called_once_with(email=email)

    def test_mark_organization_user_existing_cloud_user(self, mock_mark_organization_user, org_user_factory,
                                                        arf, cloud_user_factory):
        org_admin = org_user_factory(organization=self.org)
        email = f'{uuid4()}@networkoptix.com'
        user = cloud_user_factory(email=email)
        mock_mark_organization_user.reset_mock()
        request = arf.post('/')
        request.user = org_admin.user
        data = {
            'email': email,
            'roleId': OrganizationRoles.ORGANIZATION_ADMINISTRATOR
        }
        serializer = OrganizationUserSerializer(data=data, context={'organization': self.org, 'request': request})
        serializer.is_valid()
        serializer.save()
        mock_mark_organization_user.assert_called_once_with(email=email)

    def test_mark_organization_user_existing_org_user(self, mock_mark_organization_user, org_user_factory, arf,
                                                      organization_factory):
        org_admin = org_user_factory(organization=self.org)
        email = f'{uuid4()}@networkoptix.com'
        user = org_user_factory(organization=organization_factory(), email=email)
        mock_mark_organization_user.reset_mock()
        request = arf.post('/')
        request.user = org_admin.user
        data = {
            'email': user.user.email,
            'roleId': OrganizationRoles.ORGANIZATION_ADMINISTRATOR
        }
        serializer = OrganizationUserSerializer(data=data, context={'organization': self.org, 'request': request})
        serializer.is_valid()
        serializer.save()
        mock_mark_organization_user.assert_not_called()

    def test_mark_organization_user_existing_cp_user(self, mock_mark_organization_user, org_user_factory,
                                                     cp_user_factory, arf, channel_partner_factory):
        org_admin = org_user_factory(organization=self.org)
        email = f'{uuid4()}@networkoptix.com'
        user = cp_user_factory(channel_partner=channel_partner_factory(), email=email)
        mock_mark_organization_user.reset_mock()
        request = arf.post('/')
        request.user = org_admin.user
        data = {
            'email': user.user.email,
            'roleId': OrganizationRoles.ORGANIZATION_ADMINISTRATOR
        }
        serializer = OrganizationUserSerializer(data=data, context={'organization': self.org, 'request': request})
        serializer.is_valid()
        serializer.save()
        mock_mark_organization_user.assert_not_called()
