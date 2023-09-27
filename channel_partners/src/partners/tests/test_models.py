from uuid import uuid4

from model_bakery import baker

from partners.models import CloudSystemId, OrganizationRole, OrganizationToUser, ChannelPartnerAccessLevel, \
    Organization, OrganizationPermissions


class TestCloudSystemId:

    def test_add_system_users_data(self, org_user_factory, default_organization, cloud_test_host):
        gen_cnt = 5
        roles = OrganizationRole.objects.exclude(system_role__isnull=True).exclude(system_role='')
        roles_names = roles.values_list('name', flat=True)
        users = []
        users_with_role = OrganizationToUser.objects.filter(
            organization=default_organization, roles__in=[[r_n] for r_n in roles_names]
        )

        for role in roles:
            users += [org_user_factory(email=f'{uuid4()}', role=role.name) for _ in range(gen_cnt)]
        sys_id = f'{uuid4()}'
        system = baker.make(CloudSystemId, system_id=sys_id, organization=default_organization,
                            cloud_host=cloud_test_host)

        batch_data = system.add_system_users_data()
        users_count = users_with_role.count()
        assert batch_data['items'].__len__() == len(roles)
        for item in batch_data['items']:
            assert item['systems'] == [sys_id]
            assert item['users'].__len__() == gen_cnt
            for email in item['users']:
                users_count -= 1
                user = next(filter(lambda u: u.user.email == email, users))
                role = roles.get(name=user.roles[0])
                assert item['accessRole'] == role.system_role

        assert users_count == 0

    def test_remove_system_users_data(self, default_org_admin, default_organization, org_user_factory, cloud_test_host):
        gen_cnt = 5
        sys_id = f'{uuid4()}'
        gen_users = [org_user_factory() for _ in range(gen_cnt)]
        system = baker.make(CloudSystemId, system_id=sys_id, organization=default_organization,
                            cloud_host=cloud_test_host)
        batch_data = system.remove_system_users_data(default_org_admin.user)
        all_users = OrganizationToUser.objects\
            .filter(organization=default_organization)\
            .exclude(pk=default_org_admin.pk)
        assert batch_data['items'].__len__() == 1
        assert batch_data['items'][0]['systems'] == [sys_id]
        assert batch_data['items'][0]['accessRole'] == 'none'
        assert batch_data['items'][0]['users'].__len__() == all_users.count()
        assert default_org_admin.user.email not in batch_data['items'][0]['users']
        for user in all_users:
            assert user.user.email in batch_data['items'][0]['users']


class TestOrganizationToUser:

    def test_update_user_systems_data(self, organization_factory, org_user_factory, cloud_test_host):
        gen_count = 10
        org = organization_factory()
        systems = [baker.make(CloudSystemId, system_id=f'{uuid4()}', organization=org,
                              cloud_host=cloud_test_host) for _ in range(gen_count)]
        user = org_user_factory(organization=org)
        role = OrganizationRole.objects.get(name="Power User")
        batch_data = user.update_user_systems_data(role)
        assert batch_data["items"].__len__() == 1
        assert batch_data["items"][0]["systems"].__len__() == gen_count
        assert set(batch_data["items"][0]["systems"]) == {str(system.system_id) for system in systems}
        assert batch_data["items"][0]["accessRole"] == role.system_role

        # test data on remove
        batch_data = user.update_user_systems_data(None)
        assert batch_data["items"].__len__() == 1
        assert batch_data["items"][0]["systems"].__len__() == gen_count
        assert set(batch_data["items"][0]["systems"]) == {str(system.system_id) for system in systems}
        assert batch_data["items"][0]["accessRole"] == 'none'



class TestOrganization:

    def test_has_perm(self, channel_partner_factory, cp_user_factory, organization_factory):
        cp = channel_partner_factory()
        admin = cp_user_factory(channel_partner=cp)
        org = organization_factory(channel_partner=cp)

        # test full access

        assert org.channel_partner_access_level == ChannelPartnerAccessLevel.FULL
        assert org.has_perm(admin.user, OrganizationPermissions.manage_users) is True
        assert org.has_perm(admin.user, OrganizationPermissions.manage_systems) is True
        assert org.has_perm(admin.user, OrganizationPermissions.configure_organization) is True
        assert org.has_perm(admin.user, OrganizationPermissions.access_systems) is True
        assert org.has_perm(admin.user, OrganizationPermissions.view_service_reports) is True
        assert org.has_perm(admin.user, OrganizationPermissions.view_health_monitoring) is True

        #  test privacy mode
        org.channel_partner_access_level = ChannelPartnerAccessLevel.PRIVACY_MODE
        org.save()
        assert org.has_perm(admin.user, OrganizationPermissions.manage_users) is False
        assert org.has_perm(admin.user, OrganizationPermissions.manage_systems) is False
        assert org.has_perm(admin.user, OrganizationPermissions.configure_organization) is False
        assert org.has_perm(admin.user, OrganizationPermissions.view_service_reports) is False
        assert org.has_perm(admin.user, OrganizationPermissions.access_systems) is True
        assert org.has_perm(admin.user, OrganizationPermissions.view_health_monitoring) is True

        #  test no access
        org.channel_partner_access_level = ChannelPartnerAccessLevel.PRIVACY_MODE
        org.save()
        assert org.has_perm(admin.user, OrganizationPermissions.manage_users) is False
        assert org.has_perm(admin.user, OrganizationPermissions.manage_systems) is False
        assert org.has_perm(admin.user, OrganizationPermissions.configure_organization) is False
        assert org.has_perm(admin.user, OrganizationPermissions.view_service_reports) is False
        assert org.has_perm(admin.user, OrganizationPermissions.access_systems) is True
        assert org.has_perm(admin.user, OrganizationPermissions.view_health_monitoring) is True


