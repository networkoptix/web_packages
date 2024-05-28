import uuid

from partners.models import (
    CloudSystemHistory,
    CloudSystemId,
    OrganizationRoles,
    SystemServiceCurrentQuantity,
    VmsRoles,
)


class TestCloudSystemId:

    def test_get_organization_users(self, channel_partner_factory, cp_user_factory, organization_factory,
                                    org_user_factory, system_group_factory, system_factory,
                                    sys_group_user_factory, cloud_user_factory):
        cp = channel_partner_factory()
        cp_admin = cp_user_factory(channel_partner=cp)
        org = organization_factory(channel_partner=cp)
        org_admin = org_user_factory(organization=org)
        org_sys = system_factory(organization=org)
        group = system_group_factory(organization=org)
        group_sys = system_factory(organization=org, system_group=group)
        group_user = sys_group_user_factory(organization=org, group=group, role_id=OrganizationRoles.SYSTEM_HEALTH_VIEWER)

        users = org_sys.get_organization_users()

        assert users.count() == 1
        assert users.first()['user__email'] == org_admin.user.email
        assert users.first()['roles'] == org_admin.roles

        users = group_sys.get_organization_users()
        assert users.count() == 2
        for user in users:
            assert user['user__email'] in [org_admin.user.email, group_user.user.email]
            assert user['roles'][0] in org_admin.roles + group_user.roles

    def test_get_channel_partner_users(self, channel_partner_factory, cp_user_factory, organization_factory,
                                    org_user_factory, system_group_factory, system_factory,
                                    sys_group_user_factory, cloud_user_factory):
        cp = channel_partner_factory()
        cp_admin = cp_user_factory(channel_partner=cp)
        org = organization_factory(channel_partner=cp)
        org_sys = system_factory(organization=org)

        users = org_sys.get_channel_partner_users()

        assert users.count() == 1
        assert users.first()['user__email'] == cp_admin.user.email
        assert users.first()['roles'] == cp_admin.roles

    def test_get_all_users(self, channel_partner_factory, cp_user_factory, organization_factory,
                                    org_user_factory, system_group_factory, system_factory,
                                    sys_group_user_factory, cloud_user_factory):
        cp = channel_partner_factory()
        org = organization_factory(channel_partner=cp)
        org.channel_partner_access_level_id = OrganizationRoles.POWER_USER
        org.save()
        org_sys = system_factory(organization=org)
        group = system_group_factory(organization=org)
        group_sys = system_factory(organization=org, system_group=group)

        assert group_sys.get_all_users().count() == 0
        assert org_sys.get_all_users().count() == 0

        cp_admin = cp_user_factory(channel_partner=cp)
        org_admin = org_user_factory(organization=org)
        group_user = sys_group_user_factory(organization=org, group=group,
                                            role_id=OrganizationRoles.SYSTEM_HEALTH_VIEWER)

        users = group_sys.get_all_users()
        assert users.count() == 3
        for user in users:
            assert user['user__email'] in [org_admin.user.email, cp_admin.user.email, group_user.user.email]
            assert user['roles'][0] in [org.channel_partner_access_level_id] + org_admin.roles + group_user.roles

    def test_get_user_role_by_email(self, channel_partner_factory, cp_user_factory, organization_factory,
                                    org_user_factory, system_group_factory, system_factory,
                                    sys_group_user_factory, cloud_user_factory):
        cp = channel_partner_factory()
        org = organization_factory(channel_partner=cp)
        org.channel_partner_access_level_id = OrganizationRoles.POWER_USER
        org.save()
        org_sys = system_factory(organization=org)
        group = system_group_factory(organization=org)
        group_sys = system_factory(organization=org, system_group=group)
        cp_admin = cp_user_factory(channel_partner=cp)
        org_admin = org_user_factory(organization=org)
        group_user = sys_group_user_factory(organization=org, group=group,
                                            role_id=OrganizationRoles.SYSTEM_HEALTH_VIEWER)
        user_rel = group_sys.get_user_role_by_email(email='not_existing')
        assert user_rel is None

        user_rel = group_sys.get_user_role_by_email(email=group_user.user.email)
        assert user_rel['user__email'] == group_user.user.email
        assert user_rel['roles'] == group_user.roles
        assert user_rel['type'] == 'organization'

        user_rel = group_sys.get_user_role_by_email(email=org_admin.user.email)
        assert user_rel['user__email'] == org_admin.user.email
        assert user_rel['roles'] == org_admin.roles
        assert user_rel['type'] == 'organization'

        user_rel = group_sys.get_user_role_by_email(email=cp_admin.user.email)
        assert user_rel['user__email'] == cp_admin.user.email
        assert user_rel['roles'] == [org.channel_partner_access_level_id]
        assert user_rel['type'] == 'channel_partner'

    def test_has_vms_role(self, channel_partner_factory, cp_user_factory, organization_factory,
                          org_user_factory, system_group_factory, system_factory,
                          sys_group_user_factory, cloud_user_factory):
        cp = channel_partner_factory()
        org = organization_factory(channel_partner=cp)
        org.channel_partner_access_level_id = OrganizationRoles.SYSTEM_HEALTH_VIEWER
        org.save()
        org_sys = system_factory(organization=org)
        group = system_group_factory(organization=org)
        group_sys = system_factory(organization=org, system_group=group)
        cp_admin = cp_user_factory(channel_partner=cp)
        org_admin = org_user_factory(organization=org)
        group_user = sys_group_user_factory(organization=org, group=group,
                                            role_id=OrganizationRoles.SYSTEM_HEALTH_VIEWER)

        assert group_sys.has_vms_role(group_user.user, vms_roles=[VmsRoles.POWER_USER]) is False
        assert group_sys.has_vms_role(group_user.user, vms_roles=[VmsRoles.SYSTEM_HEALTH_VIEWER]) is True
        assert org_sys.has_vms_role(group_user.user, vms_roles=[VmsRoles.SYSTEM_HEALTH_VIEWER]) is False
        assert group_sys.has_vms_role(org_admin.user, vms_roles=[VmsRoles.POWER_USER]) is False
        assert group_sys.has_vms_role(org_admin.user, vms_roles=[VmsRoles.ADMINISTRATOR]) is True
        assert org_sys.has_vms_role(org_admin.user, vms_roles=[VmsRoles.ADMINISTRATOR]) is True
        assert group_sys.has_vms_role(cp_admin.user, vms_roles=[VmsRoles.SYSTEM_HEALTH_VIEWER]) is True
        assert group_sys.has_vms_role(cp_admin.user, vms_roles=[VmsRoles.ADMINISTRATOR]) is False
        assert org_sys.has_vms_role(cp_admin.user, vms_roles=[VmsRoles.ADMINISTRATOR]) is False

    def test_cloud_system_history(self, organization_factory):
        org = organization_factory()
        other_org = organization_factory()
        system = CloudSystemId.objects.create(system_id=uuid.uuid4(),
                                              cloud_host=org.channel_partner.cloud_host,
                                              organization=org)
        assert CloudSystemHistory.objects.count() == 1
        assert CloudSystemHistory.objects.filter(cloud_system=system, organization=org).exists()
        system.organization = other_org
        system.save()
        assert CloudSystemHistory.objects.count() == 2
        assert CloudSystemHistory.objects.filter(cloud_system=system, organization=org).first().to_ts
        new_record = CloudSystemHistory.objects.filter(cloud_system=system, organization=other_org).first()
        assert new_record.to_ts is None
        assert new_record.from_ts

    def test_services(self, channel_partner_factory, cp_service_factory, organization_factory, system_factory,
                      service_record_factory):
        cp = channel_partner_factory()
        org = organization_factory(channel_partner=cp)
        system = system_factory(organization=org)
        cp_service_1 = cp_service_factory(channel_partner=cp)
        cp_service_2 = cp_service_factory(channel_partner=cp)
        cp_service_3 = cp_service_factory(channel_partner=cp)
        service_record_factory(service=cp_service_1, cloud_system=system, quantity=10)
        service_record_factory(service=cp_service_2, cloud_system=system, quantity=20)
        service_record_factory(service=cp_service_3, cloud_system=system, quantity=30)
        SystemServiceCurrentQuantity.objects.create(
            cloud_system=system,
            organization=org,
            service=cp_service_1,
            quantity=9)
        SystemServiceCurrentQuantity.objects.create(
            cloud_system=system,
            organization=org,
            service=cp_service_2,
            quantity=19)
        assert len(system.services) == 3
        assert system.services[str(cp_service_1.id)]['used'] == 9
        assert system.services[str(cp_service_1.id)]['quantity'] == 10
        assert system.services[str(cp_service_2.id)]['used'] == 19
        assert system.services[str(cp_service_2.id)]['quantity'] == 20
        assert system.services[str(cp_service_3.id)]['used'] == 0
        assert system.services[str(cp_service_3.id)]['quantity'] == 30

