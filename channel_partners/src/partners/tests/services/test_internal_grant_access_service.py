from uuid import uuid4

import httpx
import pytest
from django.conf import settings

from partners.models import (
    ChannelPartner,
    ChannelPartnerRoles,
    ChannelPartnerToUser,
    Organization,
    OrganizationRoles,
    OrganizationToUser,
)
from partners.services.internal_grant_access_service import (
    CustomizationUsers,
    InternalGrantAccessService,
)


class TestCustomizationUsers:

    @pytest.fixture(autouse=True)
    def setup(self, root_nx_channel_partner, channel_partner_factory, cloud_host_factory):
        self.cloud_host_1 = cloud_host_factory('host-1.test.hdw.mx')
        self.cloud_host_2 = cloud_host_factory('host-2.test.hdw.mx')
        self.customization_1 = channel_partner_factory(parent_channel_partner=root_nx_channel_partner,
                                                       name='customization_1', cloud_host=self.cloud_host_1)
        self.customization_2 = channel_partner_factory(parent_channel_partner=root_nx_channel_partner,
                                                       name='customization_2', cloud_host=self.cloud_host_2)
        self.email_name = f'{uuid4()}'
        self.email_domain = f'{uuid4()}.com'
        self.base_email = f'{self.email_name}@{self.email_domain}'
        self.cp = channel_partner_factory(parent_channel_partner=root_nx_channel_partner, name=f'{uuid4()}')

    @pytest.mark.parametrize('method_name, customization, suffix', [
        ('customization_level_email', 'customization_1', 'admin'),
        ('cp_level_email', 'customization_2', 'cpadmin'),
        ('org_level_email', 'customization_2', 'orgadmin')
    ])
    def test_leveled_emails(self, method_name, customization, suffix):
        customization = f'{uuid4()}'
        customization_users = CustomizationUsers(customization, self.cp, self.base_email)
        method = getattr(customization_users, method_name)
        email = method()
        assert email == f'{self.email_name}+{customization}{suffix}@{self.email_domain}'.lower()

        customization_users = CustomizationUsers(customization.upper(), self.cp, self.base_email.upper())
        method = getattr(customization_users, method_name)
        email = method()
        assert email == f'{self.email_name}+{customization}{suffix}@{self.email_domain}'.lower()

    def test_create_channel_partner_role(self, root_nx_channel_partner):
        assert ChannelPartnerToUser.objects.count() == 0
        # Test creation of a new user relation
        user_relation = CustomizationUsers.create_channel_partner_role(self.base_email, root_nx_channel_partner)
        assert ChannelPartnerToUser.objects.count() == 1
        # Test existing user relation
        assert user_relation == CustomizationUsers.create_channel_partner_role(self.base_email, root_nx_channel_partner)
        assert ChannelPartnerToUser.objects.count() == 1
        # Test existing user relation with different role
        user_relation.roles = [ChannelPartnerRoles.REPORTS_VIEWER]
        user_relation.save()
        new_relation = CustomizationUsers.create_channel_partner_role(self.base_email, root_nx_channel_partner)
        assert new_relation.id == user_relation.id
        assert new_relation.roles == [ChannelPartnerRoles.ADMINISTRATOR]
        
    def test_create_organization_role(self, root_nx_channel_partner, organization_factory):
        organization = organization_factory(channel_partner=root_nx_channel_partner, name='organization')
        assert OrganizationToUser.objects.count() == 0
        # Test creation of a new user relation
        user_relation = CustomizationUsers.create_organization_role(self.base_email, organization)
        assert OrganizationToUser.objects.count() == 1
        assert user_relation.roles == [OrganizationRoles.ORGANIZATION_ADMINISTRATOR]
        # Test existing user relation
        assert user_relation == CustomizationUsers.create_organization_role(self.base_email, organization)
        assert OrganizationToUser.objects.count() == 1
        # Test existing user relation with different role
        user_relation.roles = [OrganizationRoles.POWER_USER]
        user_relation.save()
        new_relation = CustomizationUsers.create_organization_role(self.base_email, organization)
        assert new_relation.id == user_relation.id
        assert new_relation.roles == [OrganizationRoles.ORGANIZATION_ADMINISTRATOR]

    def test_get_sub_channel_partner_create(self, channel_partner_factory):
        expected_name = f"{self.email_name}'s {self.customization_1.name.capitalize()} Channel Partner"
        customization_users = CustomizationUsers(self.customization_1.name, self.customization_1, self.base_email)
        initial_cp_count = ChannelPartner.objects.count()
        sub_cp = customization_users.get_sub_channel_partner()
        assert sub_cp.name == expected_name
        assert ChannelPartner.objects.count() == initial_cp_count + 1
        assert customization_users.sub_channel_partner == sub_cp

    def test_get_sub_channel_partner_get_existing(self, channel_partner_factory):
        expected_name = f"{self.email_name}'s {self.customization_1.name.capitalize()} Channel Partner"
        customization_users = CustomizationUsers(self.customization_1.name, self.customization_1, self.base_email)
        sub_cp = channel_partner_factory(parent_channel_partner=self.customization_1, name=expected_name)
        initial_cp_count = ChannelPartner.objects.count()
        assert customization_users.get_sub_channel_partner() == sub_cp
        assert ChannelPartner.objects.count() == initial_cp_count
        assert customization_users.sub_channel_partner == sub_cp

    def test_get_sub_channel_partner_same_name_in_other_cp(self, channel_partner_factory):
        expected_name = f"{self.email_name}'s {self.customization_1.name.capitalize()} Channel Partner"
        customization_users = CustomizationUsers(self.customization_1.name, self.customization_1, self.base_email)
        channel_partner_factory(parent_channel_partner=self.customization_2, name=expected_name)
        initial_cp_count = ChannelPartner.objects.count()
        sub_cp = customization_users.get_sub_channel_partner()
        assert sub_cp.name == f"{self.email_name}'s {self.customization_1.name.capitalize()} Channel Partner"
        assert ChannelPartner.objects.count() == initial_cp_count + 1

    def test_get_sub_channel_partner_get_from_multiple(self, channel_partner_factory):
        expected_name = f"{self.email_name}'s {self.customization_1.name.capitalize()} Channel Partner"
        customization_users = CustomizationUsers(self.customization_1.name, self.customization_1, self.base_email)
        # create 3 sub channel partners with the same name
        sub_cp_ids = [
            channel_partner_factory(parent_channel_partner=self.customization_1, name=expected_name).id
            for _ in range(3)
        ]
        initial_cp_count = ChannelPartner.objects.count()
        sub_cp = customization_users.get_sub_channel_partner()
        assert sub_cp.id in sub_cp_ids
        assert sub_cp.name == expected_name
        assert ChannelPartner.objects.count() == initial_cp_count

    def test_get_organization_create(self, organization_factory):
        expected_name = f"{self.email_name}'s {self.customization_1.name.capitalize()} Organization"
        customization_users = CustomizationUsers(self.customization_1.name, self.cp, self.base_email)
        # create a sub channel partner to be used as parent
        customization_users.get_sub_channel_partner()
        initial_org_count = Organization.objects.count()
        org = customization_users.get_organization()
        assert org.name == expected_name
        assert Organization.objects.count() == initial_org_count + 1
        assert customization_users.organization == org

    def test_get_organization_get_existing(self, organization_factory):
        expected_name = f"{self.email_name}'s {self.customization_1.name.capitalize()} Organization"
        customization_users = CustomizationUsers(self.customization_1.name, self.cp, self.base_email)
        # create a sub channel partner to be used as parent
        customization_users.get_sub_channel_partner()
        org = organization_factory(channel_partner=customization_users.sub_channel_partner, name=expected_name)
        initial_org_count = Organization.objects.count()
        assert customization_users.get_organization() == org
        assert Organization.objects.count() == initial_org_count
        assert customization_users.organization == org

    def test_get_organization_same_name_in_other_cp(self, organization_factory):
        expected_name = f"{self.email_name}'s {self.customization_1.name.capitalize()} Organization"
        customization_users = CustomizationUsers(self.customization_1.name, self.cp, self.base_email)
        # create a sub channel partner to be used as parent
        customization_users.get_sub_channel_partner()
        organization_factory(channel_partner=self.customization_2, name=expected_name)
        initial_org_count = Organization.objects.count()
        org = customization_users.get_organization()
        assert org.name == f"{self.email_name}'s {self.customization_1.name.capitalize()} Organization"
        assert Organization.objects.count() == initial_org_count + 1
        assert customization_users.organization == org

    def test_get_organization_get_from_multiple(self, organization_factory):
        expected_name = f"{self.email_name}'s {self.customization_1.name.capitalize()} Organization"
        customization_users = CustomizationUsers(self.customization_1.name, self.cp, self.base_email)
        # create a sub channel partner to be used as parent
        customization_users.get_sub_channel_partner()
        # create 3 organizations with the same name
        org_ids = [
            organization_factory(channel_partner=customization_users.sub_channel_partner, name=expected_name).id
            for _ in range(3)
        ]
        initial_org_count = Organization.objects.count()
        org = customization_users.get_organization()
        assert org.id in org_ids
        assert org.name == expected_name
        assert Organization.objects.count() == initial_org_count
        assert customization_users.organization == org

    def test_create(self):
        expected_cp_name = f"{self.email_name}'s {self.customization_1.name.capitalize()} Channel Partner"
        expected_org_name = f"{self.email_name}'s {self.customization_1.name.capitalize()} Organization"
        customization_users = CustomizationUsers(self.customization_1.name, self.customization_1, self.base_email)
        customization_users.create()
        assert customization_users.customization_partner == self.customization_1
        assert customization_users.sub_channel_partner.parent_channel_partner == self.customization_1
        assert customization_users.sub_channel_partner.name == expected_cp_name
        assert customization_users.organization.channel_partner == customization_users.sub_channel_partner
        assert customization_users.organization.name == expected_org_name
        assert len(customization_users.users) == 3

        assert customization_users.users[0].channel_partner == self.customization_1
        assert customization_users.users[0].roles == [ChannelPartnerRoles.ADMINISTRATOR]
        assert customization_users.users[0].user.email == customization_users.customization_level_email()

        assert customization_users.users[1].channel_partner == customization_users.sub_channel_partner
        assert customization_users.users[1].roles == [ChannelPartnerRoles.ADMINISTRATOR]
        assert customization_users.users[1].user.email == customization_users.cp_level_email()

        assert customization_users.users[2].organization == customization_users.organization
        assert customization_users.users[2].roles == [OrganizationRoles.ORGANIZATION_ADMINISTRATOR]
        assert customization_users.users[2].user.email == customization_users.org_level_email()

        customization_users = CustomizationUsers(self.customization_1.name, self.customization_1, self.base_email)
        customization_users.create()

        assert self.customization_1.channel_partners.count() == 1
        assert customization_users.sub_channel_partner.organizations.count() == 1
        
class TestInternalGrantAccessService:
    @pytest.fixture(autouse=True)
    def setup(self, cloud_test_host):
        self.cloud_test_host = cloud_test_host
        self.ireg_customizations = [
            ('default', 'host-1.test.hdw.mx'),
            ('customization_1', 'host-2.test.hdw.mx'),
            ('customization_2', 'host-3.test.hdw.mx'),
        ]
        
    def test_get_customization_pub_success(self, mocker, mock_get_customizations_hdw_mx):
        mocked_get_customizations = mocker.patch(
            'nx_ireg.helpers.get_customizations_hdw_mx', return_value=self.ireg_customizations)
        customizations = InternalGrantAccessService.get_customizations()
        mocked_get_customizations.assert_called_once()
        assert customizations == dict(self.ireg_customizations)

    def test_get_customization_pub_connection_exception(self, mocker):
        mocked_get_customizations = mocker.patch(
            'nx_ireg.helpers.get_customizations_hdw_mx', side_effect=httpx.TimeoutException('test'))
        customizations = InternalGrantAccessService.get_customizations()
        mocked_get_customizations.assert_called_once()
        assert customizations == {}

    def test_get_customization_pub_no_customizations(self, mocker):
        ireg_customizations = []
        mocked_get_customizations = mocker.patch(
            'nx_ireg.helpers.get_customizations_hdw_mx', return_value=ireg_customizations)
        customizations = InternalGrantAccessService.get_customizations()
        mocked_get_customizations.assert_called_once()
        assert customizations == {}

    def test_get_customization_private_no_root(self, mocker, db):
        mocker.patch.object(settings, 'IS_PRIVATE_CLOUD', True)
        mocked_get_customizations = mocker.patch(
            'nx_ireg.helpers.get_customizations_hdw_mx', side_effect=httpx.TimeoutException('test'))
        customizations = InternalGrantAccessService.get_customizations()
        mocked_get_customizations.assert_not_called()
        assert customizations == {}

    def test_get_customization_private(self, mocker, root_nx_channel_partner, cloud_test_host):
        mocker.patch.object(settings, 'IS_PRIVATE_CLOUD', True)
        mocked_get_customizations = mocker.patch(
            'nx_ireg.helpers.get_customizations_hdw_mx', side_effect=httpx.TimeoutException('test'))
        customizations = InternalGrantAccessService.get_customizations()
        mocked_get_customizations.assert_not_called()
        assert customizations == {'default': cloud_test_host.hostname}
        
    def test_get_customization_partners_no_partners(self, mocker, root_nx_channel_partner, cloud_test_host):
        customization_partners = InternalGrantAccessService.get_customization_partners(
            [c[0] for c in self.ireg_customizations])
        assert customization_partners == {}

    def test_get_customization_partners(
            self,
            mocker,
            root_nx_channel_partner,
            cloud_test_host,
            channel_partner_factory
    ):
        cust_1 = channel_partner_factory(parent_channel_partner=root_nx_channel_partner, name='customization_1')
        cust_2 = channel_partner_factory(parent_channel_partner=root_nx_channel_partner, name='customization_2')
        customization_partners = InternalGrantAccessService.get_customization_partners(
            [c[0] for c in self.ireg_customizations])
        assert customization_partners == {
            'customization_1': cust_1,
            'customization_2': cust_2,
        }

    def test_get_customization_partners_not_root_children(
            self,
            mocker,
            root_nx_channel_partner,
            cloud_test_host,
            channel_partner_factory
    ):
        cust_1 = channel_partner_factory(parent_channel_partner=channel_partner_factory(), name='customization_1')
        cust_2 = channel_partner_factory(parent_channel_partner=channel_partner_factory(), name='customization_2')
        customization_partners = InternalGrantAccessService.get_customization_partners(
            [c[0] for c in self.ireg_customizations])
        assert customization_partners == {}

    def test_process(
            self,
            mocker,
            root_nx_channel_partner,
            cloud_test_host,
            cloud_host_factory,
            channel_partner_factory
    ):
        mocked_get_customizations = mocker.patch(
            'nx_ireg.helpers.get_customizations_hdw_mx', return_value=self.ireg_customizations)
        for customization, host in self.ireg_customizations[1:]:
            channel_partner_factory(parent_channel_partner=root_nx_channel_partner,
                                    name=customization,
                                    cloud_host=cloud_host_factory(host))

        base_email = 'asd@qwe.com'
        service = InternalGrantAccessService()
        customizations_users = service.new_process(base_email)
        assert len(customizations_users) == len(self.ireg_customizations)
        for cu in customizations_users:
            assert len(cu.users) == 3
