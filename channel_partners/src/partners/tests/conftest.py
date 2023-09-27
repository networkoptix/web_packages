import random
from uuid import uuid4

import pytest
from model_bakery import baker

from rest_framework.test import APIRequestFactory
from partners.models import CloudUser, CloudInstance, CloudHost, ChannelPartner, Organization, OrganizationToUser, \
    ChannelPartnerToUser, CloudSystemId, OrganizationRole, ChannelPartnerAccessLevel


@pytest.fixture()
def assert_all_responses_were_requested() -> bool:
    return False


@pytest.fixture()
def cloud_user_factory(db):
    def user(email=None):
        return CloudUser.objects.get_or_create(email=email)[0]

    return user


@pytest.fixture()
def cloud_test_instance(db):
    return CloudInstance.objects.get_or_create(name='cloud-test')[0]


@pytest.fixture()
def cloud_test_host(db):
    return CloudHost.objects.get_or_create(hostname='cloud-test.hdw.mx')[0]

@pytest.fixture()
def cloud_host_factory(db):
    def factory(hostname=None) -> CloudHost:
        if not hostname:
            hostname = f'{uuid4()}.ut.test.hdw.mx'
        return CloudHost.objects.get_or_create(hostname=hostname)[0]

    return factory


@pytest.fixture()
def cloud_test_nx_channel_partner(cloud_test_instance):
    return ChannelPartner.objects.get_or_create(name='Network Optix', instance=cloud_test_instance)[0]


@pytest.fixture()
def default_channel_partner(cloud_test_instance, cloud_test_nx_channel_partner):
    return ChannelPartner.objects.get_or_create(
        name='Default CP', instance=cloud_test_instance, parent_channel_partner=cloud_test_nx_channel_partner)[0]


@pytest.fixture()
def default_organization(default_channel_partner):
    return Organization.objects.create(name="Default Organization", channel_partner=default_channel_partner,
                                       channel_partner_access_level=ChannelPartnerAccessLevel.FULL)


@pytest.fixture()
def organization_factory(default_channel_partner):

    def factory(name=None, channel_partner=default_channel_partner,
                channel_partner_access_level=ChannelPartnerAccessLevel.FULL) -> Organization:
        return Organization.objects.create(
            name=name or f"Organization {uuid4()}",
            channel_partner=channel_partner,
            channel_partner_access_level=channel_partner_access_level
        )

    return factory


@pytest.fixture()
def channel_partner_factory(default_channel_partner, cloud_test_instance):
    def factory(name=None, parent_channel_partner=default_channel_partner) -> ChannelPartner:
        return ChannelPartner.objects.create(
            name=name or f"Channel Partner {uuid4()}",
            parent_channel_partner=parent_channel_partner,
        )

    return factory


@pytest.fixture()
def default_org_admin(cloud_user_factory, default_organization):
    user = cloud_user_factory(email='default_org_admin@networkoptix.com')
    return OrganizationToUser.objects.get_or_create(
        user=user, organization=default_organization, roles=['Organization Administrator'])[0]


@pytest.fixture()
def org_user_factory(cloud_user_factory, default_organization):
    def factory(email=None, role='Organization Administrator', organization=default_organization) -> OrganizationToUser:
        if not email:
            email = f'u-{uuid4()}@networkoptix.com'
        user = cloud_user_factory(email=email)
        return OrganizationToUser.objects.get_or_create(
            user=user, organization=organization, roles=[role])[0]

    return factory


@pytest.fixture()
def cp_user_factory(cloud_user_factory, default_channel_partner):
    def factory(email=None, role='Administrator', channel_partner=default_channel_partner) -> ChannelPartnerToUser:
        if not email:
            email = f'u-{uuid4()}@networkoptix.com'
        user = cloud_user_factory(email=email)
        return ChannelPartnerToUser.objects.get_or_create(
            user=user, channel_partner=channel_partner, roles=[role])[0]

    return factory


@pytest.fixture()
def default_cp_admin(cloud_user_factory, default_channel_partner):
    user = cloud_user_factory(email='default_cp_admin@networkoptix.com')
    return ChannelPartnerToUser.objects.get_or_create(
        user=user, channel_partner=default_channel_partner, roles=['Administrator'])[0]


@pytest.fixture()
def default_org_user(cloud_user_factory, default_organization):
    user = cloud_user_factory(email='default_org_user@networkoptix.com')
    return OrganizationToUser.objects.get_or_create(
        user=user, organization=default_organization)[0]


@pytest.fixture()
def default_cp_user(cloud_user_factory, default_channel_partner):
    user = cloud_user_factory(email='default_cp_user@networkoptix.com')
    return ChannelPartnerToUser.objects.get_or_create(
        user=user, channel_partner=default_channel_partner)[0]


@pytest.fixture()
def default_org_user_generator(default_organization, cloud_user_factory):
    roles = list(OrganizationRole.objects.all())

    def generate(email: str = None, role: str = None):
        if not email:
            email = f'{uuid4()}@{uuid4()}.com'
        if not role:
            role = random.choice(roles).name
        user = cloud_user_factory(email=email)
        return OrganizationToUser.objects.get_or_create(
            user=user, organization=default_organization, roles=[role])[0]
    return generate


@pytest.fixture()
def default_org_system_generator(default_organization, cloud_test_host):

    def generate():
        sys_id = f'{uuid4()}'
        return CloudSystemId.objects.get_or_create(
            system_id=sys_id, name=f'Test System {sys_id}',
            organization=default_organization, cloud_host=cloud_test_host)[0]

    return generate


@pytest.fixture()
def mock_auth_with_user(default_cp_admin, cloud_test_host, mocker):
    def mock(user=default_cp_admin, token=uuid4()):
        mock_authenticate = mocker.patch(
            'partners.authentication.NxCloudOauthTokenAuthentication.authenticate',
            return_value=(user.user, token)
        )
        return mock_authenticate

    return mock

class RequestFactory(APIRequestFactory):
    def request(self, **kwargs):
        request = super().request(**kwargs)
        if not hasattr(request, 'cloud_host'):
            request.cloud_host = self.defaults.get('cloud_host')
        return request


@pytest.fixture()
def arf(cloud_test_host):
    api_factory = RequestFactory(cloud_host=cloud_test_host, headers={"Authorization": "Bearer HERE_MIGHT_BE_TOKEN"})

    return api_factory


def mock_check_user_can_administer_system(mocker, ret=True):
    return mocker.patch('partners.authentication.check_user_can_administer_system', return_value=ret)


@pytest.fixture()
def allow_user_administer_system(mocker):
    return mock_check_user_can_administer_system(mocker)


@pytest.fixture()
def deny_user_administer_system(mocker):
    return mock_check_user_can_administer_system(mocker, ret=False)


@pytest.fixture()
def system_factory(cloud_test_host, default_organization):

    def factory(organization=default_organization, cloud_host=cloud_test_host, system_id=None):
        return baker.make(CloudSystemId, system_id=system_id or f'{uuid4()}',
                          organization=organization, cloud_host=cloud_host)

    return factory
