import random
import typing
import uuid
from uuid import uuid4, UUID

import httpx
import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Q
from model_bakery import baker
from requests.auth import  _basic_auth_str

from rest_framework.test import APIRequestFactory

from partners.models import (
    CloudUser, CloudInstance, CloudHost, ChannelPartner, Organization, OrganizationToUser,
    ChannelPartnerToUser, CloudSystemId, OrganizationRole, ChannelPartnerService, ServiceToOrganizationProperties,
    ChannelPartnerServiceRecord, ChannelPartnerAccessLevel, ChannelPartnerService,
    ServiceToOrganizationProperties, ChannelPartnerServiceRecord, ChannelPartnerStates, ChannelPartnerRole,
    OrganizationRoles, SystemGroup, AuthToken, CloudSystemStates, VmsRoles,
)


@pytest.fixture()
def assert_all_responses_were_requested() -> bool:
    return False


@pytest.fixture()
def cloud_user_factory(db, random_email):
    def user(email=None):
        if not email:
            email = random_email
        return CloudUser.objects.get_or_create(email=email)[0]

    return user


@pytest.fixture()
def cloud_test_instance(db):
    return CloudInstance.objects.get_or_create(name='cloud-test')[0]


@pytest.fixture()
def cloud_test_host(cloud_test_instance):
    return CloudHost.objects.get_or_create(hostname='cloud-test.hdw.mx', instance=cloud_test_instance)[0]

@pytest.fixture()
def cloud_host_factory(db, cloud_test_instance):
    def factory(hostname=None) -> CloudHost:
        if not hostname:
            hostname = f'{uuid4()}.ut.test.hdw.mx'
        return CloudHost.objects.get_or_create(hostname=hostname, instance=cloud_test_instance)[0]

    return factory


@pytest.fixture()
def cloud_test_nx_channel_partner(cloud_test_host):
    return ChannelPartner.objects.get_or_create(name='Network Optix', cloud_host=cloud_test_host)[0]


@pytest.fixture()
def default_channel_partner(cloud_test_host, cloud_test_nx_channel_partner):
    return ChannelPartner.objects.get_or_create(
        name='Default CP', cloud_host=cloud_test_host, parent_channel_partner=cloud_test_nx_channel_partner)[0]


@pytest.fixture()
def default_organization(default_channel_partner):
    return Organization.objects.create(name="Default Organization", channel_partner=default_channel_partner,
                                       channel_partner_access_level_id=OrganizationRoles.ORGANIZATION_ADMINISTRATOR)


@pytest.fixture()
def organization_factory(default_channel_partner):

    def factory(name=None, channel_partner=default_channel_partner,
                channel_partner_access_level_id=OrganizationRoles.ORGANIZATION_ADMINISTRATOR) -> Organization:
        return Organization.objects.create(
            name=name or f"Organization {uuid4()}",
            channel_partner=channel_partner,
            channel_partner_access_level_id=channel_partner_access_level_id
        )

    return factory


@pytest.fixture()
def channel_partner_factory(default_channel_partner, cloud_test_host):
    def factory(name=None,
                parent_channel_partner=default_channel_partner,
                cloud_host=cloud_test_host,
                # acs=False
                ) -> ChannelPartner:
        return ChannelPartner.objects.create(
            name=name or f"Channel Partner {uuid4()}",
            parent_channel_partner=parent_channel_partner,
            cloud_host=cloud_host,
            # allow_changing_services=acs,
        )

    return factory


@pytest.fixture()
def default_org_admin(cloud_user_factory, default_organization):
    user = cloud_user_factory(email='default_org_admin@networkoptix.com')
    return OrganizationToUser.objects.get_or_create(
        user=user, organization=default_organization, roles=[OrganizationRoles.ORGANIZATION_ADMINISTRATOR])[0]


@pytest.fixture()
def org_user_factory(cloud_user_factory, default_organization):
    def factory(email=None, role: UUID | str = 'Organization Administrator', organization=default_organization) -> OrganizationToUser:
        if not email:
            email = f'u-{uuid4()}@networkoptix.com'
        user = CloudUser.objects.get_or_create(email=email)[0]
        if not isinstance(role, UUID):
            role = OrganizationRole.objects.get(name=role).id
        return OrganizationToUser.objects.get_or_create(
            user=user, organization=organization, roles=[role])[0]

    return factory


@pytest.fixture()
def cp_user_factory(cloud_user_factory, default_channel_partner):
    def factory(email=None, role: UUID | str = 'Administrator', channel_partner=default_channel_partner) -> ChannelPartnerToUser:
        if not email:
            email = f'u-{uuid4()}@networkoptix.com'
        user = cloud_user_factory(email=email)
        if not isinstance(role, UUID):
            role = ChannelPartnerRole.objects.get(name=role).id
        return ChannelPartnerToUser.objects.get_or_create(
            user=user, channel_partner=channel_partner, roles=[role])[0]

    return factory


@pytest.fixture()
def default_cp_admin(cloud_user_factory, default_channel_partner):
    user = cloud_user_factory(email='default_cp_admin@networkoptix.com')
    return ChannelPartnerToUser.objects.get_or_create(
        user=user, channel_partner=default_channel_partner, roles=[uuid.UUID(int=1, version=4)])[0]


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
            system_id=sys_id, name=f'Test System {sys_id}', system_state=CloudSystemStates.ACTIVATED,
            organization=default_organization, cloud_host=cloud_test_host)[0]

    return generate


@pytest.fixture()
def mock_auth_with_user(default_cp_admin, cloud_test_host, mocker):
    def mock(user: typing.Union[ChannelPartnerToUser, OrganizationToUser] = default_cp_admin, token=uuid4()):
        mock_authenticate = mocker.patch(
            'partners.authentication.NxCloudOauthTokenAuthentication.authenticate',
            return_value=(user.user, token)
        )
        return mock_authenticate

    return mock

@pytest.fixture()
def mock_internal_token_auth(mocker):
    def mock():
        token = AuthToken.objects.create(key=f'{uuid4()}', internal=True)
        mock_auth = mocker.patch('partners.authentication.NxTokenAuthentication.authenticate',
                                 return_value=(get_user_model()(), token))
        return mock_auth

    return mock


@pytest.fixture()
def mock_auth_with_system(mocker):
    def mock(system, status: int = CloudSystemStates.ACTIVATED, authenticated: bool = True):
        mocked_check = mocker.patch('partners.authentication.check_system_credentials',
                                    return_value=(authenticated, status))
        mocker.patch('partners.authentication.NxCloudSystemBasicAuthentication.get_or_create_system',
                     return_value=system)
        mocker.patch('partners.authentication.NxCloudSystemBasicAuthentication.get_system',
                     return_value=system)
        return mocked_check
    return mock


@pytest.fixture()
def mock_cdb_basic_auth(httpx_mock, cloud_test_host):
    def mock(system, status: str = 'activated') -> str:
        url = f'https://{cloud_test_host.hostname}/cdb/systems/{system.system_id}'
        httpx_mock.add_response(url=url,
                                json={'id': f'{system.system_id}', 'status': status},
                                status_code=200)
        auth = _basic_auth_str(f'{system.system_id}', 'password')
        return auth

    return mock

@pytest.fixture()
def cdb_introspect_url(cloud_test_host):
    return f'https://{cloud_test_host.hostname}/cdb/oauth2/introspect'


@pytest.fixture()
def mock_cdb_token_introspect(httpx_mock, cdb_introspect_url, random_email):
    def mock(user: CloudUser | ChannelPartnerToUser | OrganizationToUser,
             system: CloudSystemId = None, active: bool = True,
             system_role: str = VmsRoles.ADMINISTRATOR):
        if user is None:
            email = random_email
        elif isinstance(user, CloudUser):
            email = user.email
        else:
            email = user.user.email
        if system:
            roles = {"system_role_ids": {str(system.system_id): [str(system_role)]}}
        else:
            roles = {}
        data = {
            "username": email,
            "active": active,
            "token_type": "bearer",
            **roles
        }
        httpx_mock.add_response(url=cdb_introspect_url, json=data, status_code=200)
        return email

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


@pytest.fixture()
def arf_basic_auth(cloud_test_host):
    auth = httpx.BasicAuth(username='username', password='password')._auth_header
    api_factory = RequestFactory(cloud_host=cloud_test_host, headers={"Authorization": auth})
    return api_factory


@pytest.fixture()
def arf_host_factory(cloud_test_host):
    def factory(cloud_host=cloud_test_host):
        api_factory = RequestFactory(cloud_host=cloud_host,
                                     headers={"Authorization": "Bearer HERE_MIGHT_BE_TOKEN"})
        return api_factory

    return factory


@pytest.fixture()
def system_factory(cloud_test_host, default_organization):

    def factory(organization=default_organization, cloud_host=cloud_test_host,
                system_id=None, state=ChannelPartnerStates.ACTIVE, system_group=None):
        return baker.make(CloudSystemId, system_id=system_id or f'{uuid4()}', system_group=system_group,
                          organization=organization, cloud_host=cloud_host, state=state,
                          system_state=CloudSystemStates.ACTIVATED)

    return factory


@pytest.fixture()
def cp_service_factory(default_channel_partner):
    def factory(channel_partner=default_channel_partner, parent_service=None,
                service_type=ChannelPartnerService.LOCAL_RECORDING):
        return baker.make(ChannelPartnerService, name=f'{uuid4()}',
                          created_by_channel_partner=channel_partner,
                          parent_service=parent_service,
                          state=ChannelPartnerService.ACTIVE,
                          type=service_type
                          )

    return factory

@pytest.fixture()
def org_service_factory(cp_service_factory):
    def factory(organization, service=None, price=10):
        return baker.make(ServiceToOrganizationProperties, organization=organization,
                          service=service or cp_service_factory(organization.channel_partner),
                          price=price)

    return factory

@pytest.fixture()
def service_record_factory():
    def factory(service, cloud_system, organization=None, quantity=1):
        return baker.make(ChannelPartnerServiceRecord, service=service,
                          cloud_system=cloud_system, quantity=quantity, organization=organization or cloud_system.organization)

    return factory


@pytest.fixture()
def system_group_factory():
    def factory(organization, parent=None):
        uid = uuid4()
        return baker.make(SystemGroup, id=uid, name=str(uid), organization=organization, parent=parent)

    return factory

@pytest.fixture()
def sys_group_user_factory(system_group_factory, cloud_user_factory):
    def factory(organization, group=None, cloud_user=None, role_id=OrganizationRoles.ORGANIZATION_ADMINISTRATOR):
        if not group:
            group = system_group_factory(organization=organization)
        if not cloud_user:
            cloud_user = cloud_user_factory(email=f'{uuid4()}@networkoptix.com')
        return baker.make(OrganizationToUser, organization=organization, user=cloud_user,
                          system_group=group, roles=[role_id])

    return factory


@pytest.fixture()
def random_email():
    return f'{uuid4()}@networkoptix.com'


@pytest.fixture()
def request_host():
    return settings.INSTANCE_CONFIG.get_instance_host(None)

@pytest.fixture()
def mock_get_customization_request(httpx_mock, request_host):
    def mock_request(customization_name: str = 'default', status: int = 200):
        url = f'https://{request_host}/api/utils/customization'
        httpx_mock.add_response(url=url,
                                json={'name': customization_name},
                                status_code=status)
        return url

    return mock_request


@pytest.fixture()
def mock_account_status(httpx_mock, request_host):
    def mock_request(email: str, active: bool = True):
        url = f'https://{request_host}/cdb/account/{email}/status'
        httpx_mock.add_response(url=url, json={}, status_code=200 if active else 404)

    return mock_request


@pytest.fixture()
def mock_post_notification(httpx_mock, request_host):
    def mock_request(response: str = None, status: int = 201):
        url = f'https://{request_host}/notifications/send'
        httpx_mock.add_response(url=url, json=response, status_code=201)
        return url

    return mock_request


@pytest.fixture(autouse=True, scope='function')
def mox_tasks_retries(mocker):
    mocker.patch('partners.tasks.notification.MAX_RETRIES', 1)
    mocker.patch('partners.tasks.notification.RETRY_TIMEOUT', 1)
