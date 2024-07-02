import datetime
import json
import random
import re
import typing
import uuid
from uuid import (
    UUID,
    uuid4,
)

import httpx
import jwt
import pytest
import structlog
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.asymmetric.rsa import (
    RSAPrivateKey,
    RSAPublicKey,
)
from django.conf import settings
from django.core.cache import caches
from django.utils import timezone
from jwt.algorithms import RSAAlgorithm
from jwt.utils import (
    base64url_decode,
    base64url_encode,
)
from mock.mock import MagicMock
from model_bakery import baker
from requests.auth import _basic_auth_str  # noqa
from rest_framework.test import APIRequestFactory

from partners.models import (
    AuthToken,
    ChannelPartner,
    ChannelPartnerRole,
    ChannelPartnerService,
    ChannelPartnerServiceRecord,
    ChannelPartnerStates,
    ChannelPartnerToUser,
    CloudHost,
    CloudSystemId,
    CloudSystemStates,
    CloudUser,
    Organization,
    OrganizationRole,
    OrganizationRoles,
    OrganizationToUser,
    ServiceToOrganizationProperties,
    ServiceUsage,
    SystemGroup,
    VmsRoles,
)


@pytest.fixture()
def assert_all_responses_were_requested() -> bool:
    """
    Fixture that controls whether all mocked HTTP responses should be requested during the test.

    When set to True, the test will fail if there are any mocked HTTP responses that were not requested during the test.
    When set to False, the test will not fail if there are any mocked HTTP responses that were not requested.

    Documentation: https://colin-b.github.io/pytest_httpx/

    Returns:
        bool: False, indicating that the test will not fail if there are any mocked HTTP responses that were not requested.
    """
    return False


@pytest.fixture()
def context_vars():
    structlog.contextvars.bind_contextvars(
        request_id=str(uuid4())
    )


@pytest.fixture()
def cloud_user_factory(db, random_email):
    original_save = CloudUser.save

    def _save_no_task(self, *args, **kwargs):
        super(CloudUser, self).save(*args, **kwargs)

    # Replace the CloudUser's save method with the new one
    CloudUser.save = _save_no_task

    def user(email=None):
        if not email:
            email = f'{uuid.uuid4()}@networkoptix.com'
        cloud_user = CloudUser.objects.get_or_create(email=email)[0]
        return cloud_user

    yield user

    # Restore the original save
    CloudUser.save = original_save


@pytest.fixture()
def cloud_test_host(db):
    return CloudHost.objects.get_or_create(hostname='cloud-test.hdw.mx')[0]


@pytest.fixture()
def meta_cloud_host(db):
    return CloudHost.objects.get_or_create(hostname='meta-cloud-test.hdw.mx')[0]

@pytest.fixture()
def cloud_host_factory(db):
    def factory(hostname=None) -> CloudHost:
        if not hostname:
            hostname = f'{uuid4()}.ut.test.hdw.mx'
        return CloudHost.objects.get_or_create(hostname=hostname)[0]

    return factory


@pytest.fixture()
def root_nx_channel_partner(cloud_test_host):
    return ChannelPartner.objects.get_or_create(name='Network Optix', cloud_host=cloud_test_host)[0]


@pytest.fixture()
def default_channel_partner(cloud_test_host, root_nx_channel_partner):
    return ChannelPartner.objects.get_or_create(
        name='Default CP', cloud_host=cloud_test_host, parent_channel_partner=root_nx_channel_partner)[0]


@pytest.fixture()
def default_organization(default_channel_partner):
    return Organization.objects.create(name="Default Organization", channel_partner=default_channel_partner,
                                       channel_partner_access_level_id=OrganizationRoles.ORGANIZATION_ADMINISTRATOR)


@pytest.fixture()
def organization_factory(default_channel_partner):

    def factory(
            name=None,
            channel_partner=default_channel_partner,
            channel_partner_access_level_id=OrganizationRoles.ORGANIZATION_ADMINISTRATOR,
            state=ChannelPartnerStates.ACTIVE,
            effective_state=None
    ) -> Organization:

        return Organization.objects.create(
            name=name or f"Organization {uuid4()}",
            state=state,
            effective_state=effective_state or state,
            channel_partner=channel_partner,
            channel_partner_access_level_id=channel_partner_access_level_id
        )

    return factory


@pytest.fixture()
def channel_partner_factory(default_channel_partner, cloud_test_host, root_nx_channel_partner):
    def factory(name=None,
                parent_channel_partner=default_channel_partner,
                cloud_host=cloud_test_host,
                state=ChannelPartnerStates.ACTIVE,
                ) -> ChannelPartner:
        cp_id = uuid4()
        return ChannelPartner.objects.create(
            name=name or f"Channel Partner {cp_id}",
            id=cp_id,
            parent_channel_partner=parent_channel_partner or root_nx_channel_partner,
            cloud_host=cloud_host,
            state=state
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
def multi_cp_user_factory(cloud_user_factory):
    def factory(email=None, role: UUID | str = 'Administrator', channel_partners=None) -> (CloudUser, list[ChannelPartnerToUser]):
        if not email:
            email = f'u-{uuid4()}@networkoptix.com'
        user = cloud_user_factory(email=email)
        if not isinstance(role, UUID):
            role = ChannelPartnerRole.objects.get(name=role).id
        # Ensure channel_partners is a list to iterate over
        if channel_partners is None:
            channel_partners = []
        elif not isinstance(channel_partners, (list, tuple)):
            channel_partners = [channel_partners]

        cp_to_user_links = []
        for channel_partner in channel_partners:
            cp_to_user, _ = ChannelPartnerToUser.objects.get_or_create(
                user=user, channel_partner=channel_partner, roles=[role])
            cp_to_user_links.append(cp_to_user)

        return user, cp_to_user_links

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
def mock_auth_with_user(default_cp_admin, cloud_test_host, mocker, httpx_mock, cdb_introspect_url,):
    def mock(user: typing.Union[CloudUser, ChannelPartnerToUser, OrganizationToUser] = default_cp_admin, token=uuid4()):
        usr = getattr(user, 'user', user)
        mock_authenticate = mocker.patch(
            'partners.authentication.NxCloudOauthTokenAuthentication.authenticate',
            return_value=(getattr(user, 'user', user), token)
        )
        data = {
            "username": usr.email,
            "active": True,
            "token_type": "bearer",
            "where": "mock_auth_with_user"
        }
        httpx_mock.add_response(url=cdb_introspect_url, json=data, status_code=200)
        return mock_authenticate

    return mock

@pytest.fixture()
def mock_internal_token_auth(mocker):
    def mock(token=None):
        token = AuthToken.objects.create(key=str(token) or f"{uuid4()}", internal=True)
        return token

    return mock


@pytest.fixture()
def mock_auth_with_system(mocker):
    def mock(system, status: int = CloudSystemStates.ACTIVATED, authenticated: bool = True, name: str = 'name'):
        mocked_check = mocker.patch('partners.authentication.check_system_credentials',
                                    return_value=(authenticated, status, name))
        mocker.patch('partners.authentication.NxCloudSystemBasicAuthentication.get_or_create_system',
                     return_value=system)
        mocker.patch('partners.authentication.NxCloudSystemBasicAuthentication.get_system',
                     return_value=system)
        return mocked_check
    return mock


@pytest.fixture()
def mock_cdb_basic_auth(httpx_mock, cloud_test_host):
    def mock(system, status: str = 'activated', name: str = 'name') -> str:
        url = f'https://{cloud_test_host.hostname}/cdb/systems/{system.system_id}'
        httpx_mock.add_response(url=url,
                                json={'id': f'{system.system_id}', 'status': status, 'name': name},
                                status_code=200)
        auth = _basic_auth_str(f'{system.system_id}', 'password')
        return auth

    return mock


@pytest.fixture()
def cdb_introspect_url(cloud_test_host):
    return f'https://{cloud_test_host.hostname}/cdb/oauth2/introspect'


@pytest.fixture()
def mock_cdb_token_introspect(mocker, httpx_mock, cdb_introspect_url, random_email, mock_auth_with_user):
    # Define a mock function
    def mock(
            user: CloudUser | ChannelPartnerToUser | OrganizationToUser,
            system: CloudSystemId = None,
            system_id: uuid.UUID = None,
            active: bool = True,
            system_role: str | uuid.UUID = VmsRoles.ADMINISTRATOR,
            jwt_is_valid: bool = True,
            token_is_valid: bool = True
    ) -> MagicMock:

        # Raise an error if both system and system_id are provided
        if system and system_id:
            raise ValueError('Cannot specify both system and system_id.')

        # Get the email of the user
        if user is None:
            email = random_email
        elif isinstance(user, CloudUser):
            email = user.email
        else:
            email = user.user.email

        # Get the system roles
        if system or system_id:
            system_id = system_id or system.system_id
            system_roles = [str(system_role)] if system_role else []
            roles = {"system_role_ids": {str(system_id): system_roles}}
        else:
            roles = {}

        # Prepare the data for the response
        data = {
            "username": email,
            "active": active,
            "token_type": "bearer",
            **roles
        }

        # Mock the authentication functions
        mocker.patch(
            'partners.authentication.authenticate_jwt_token',
            return_value=email if jwt_is_valid else None
        )
        mocker.patch(
            'partners.authentication.authenticate_regular_token',
            return_value=email if jwt_is_valid else None
        )

        # Add a response to the httpx mock
        httpx_mock.add_response(url=cdb_introspect_url, json=data, status_code=200)

        # Return the email
        return email

    # Return the mock function
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

    def factory(
            organization=default_organization,
            cloud_host=cloud_test_host,
            system_id=None,
            state=ChannelPartnerStates.ACTIVE,
            system_group=None,
            name=None
    ) -> CloudSystemId:
        sys_id = system_id or f'{uuid4()}'
        system_name = name or f'System {sys_id}'
        return baker.make(
            CloudSystemId,
            system_id=sys_id,
            system_group=system_group,
            organization=organization,
            cloud_host=cloud_host,
            state=state,
            system_state=CloudSystemStates.ACTIVATED,
            name=system_name)

    return factory


@pytest.fixture()
def cp_service_factory(default_channel_partner):
    def factory(
            channel_partner=default_channel_partner,
            parent_service=None,
            service_type=ChannelPartnerService.LOCAL_RECORDING,
            duration=0,
            conversion_service=None,
            sub_type=ChannelPartnerService.REGULAR,
            is_enabled=True
    ):
        return baker.make(
            ChannelPartnerService, name=f'{uuid4()}',
            created_by_channel_partner=channel_partner,
            parent_service=parent_service,
            state=ChannelPartnerService.ACTIVE,
            type=service_type,
            duration=duration,
            conversion_service=conversion_service,
            sub_type=sub_type,
            enabled=is_enabled)
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
    def factory(service, cloud_system, organization=None,
                quantity=1, created_ts=timezone.now(), effective_ts=None):
        service = baker.make(ChannelPartnerServiceRecord, service=service,
                             cloud_system=cloud_system, quantity=quantity,
                             organization=organization or cloud_system.organization,
                             created_ts=created_ts, effective_ts=effective_ts or created_ts)
        service.created_ts = created_ts
        service.save()
        # Overwrite the created_ts
        service.created_ts = created_ts
        service.save()
        return service

    return factory


@pytest.fixture()
def system_group_factory():
    def factory(organization, parent=None, name=None):
        uid = uuid4()
        return baker.make(
            SystemGroup,
            id=uid,
            name=name or str(uid),
            organization=organization,
            parent=parent)

    return factory


@pytest.fixture()
def sys_group_user_factory(system_group_factory, cloud_user_factory):
    def factory(organization, group=None, cloud_user=None, role_id=OrganizationRoles.SYSTEMS_ADMINISTRATOR):
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
    return settings.DEFAULT_HOST_NAME


@pytest.fixture(autouse=True)
def auto_mock_get_customization(request, httpx_mock, request_host):
    if request.node.get_closest_marker('no_tasks_autofix'):
        return
    url = re.compile(r'https://.*/api/utils/customization')
    httpx_mock.add_response(url=url,
                            json={'name': 'default'},
                            status_code=200)


@pytest.fixture()
def mock_get_customization_request(httpx_mock, request_host):
    def mock_request(customization_name: str = 'default', status: int = 200):
        url = f'https://{request_host}/api/utils/customization'
        httpx_mock.add_response(url=url,
                                json={'name': customization_name},
                                status_code=status)
        return url

    return mock_request

@pytest.fixture(autouse=True)
def auto_mock_account_status(request, httpx_mock, request_host):
    if request.node.get_closest_marker('no_tasks_autofix'):
        return
    url = re.compile(r'https://.*/cdb/account/.*/status')
    httpx_mock.add_response(url=url, json={}, status_code=200)


@pytest.fixture()
def mock_account_status(httpx_mock, request_host):
    def mock_request(email: str, active: bool = True):
        url = f'https://{request_host}/cdb/account/{email}/status'
        httpx_mock.add_response(url=url, json={}, status_code=200 if active else 404)

    return mock_request


@pytest.fixture(autouse=True)
def auto_mock_post_notification(request, httpx_mock, request_host):
    if request.node.get_closest_marker('no_tasks_autofix'):
        return
    # url = f'https://{request_host}/notifications/send'
    url = re.compile(r'https://.*/notifications/send')
    httpx_mock.add_response(url=url, json={}, status_code=201)
    return url


@pytest.fixture()
def mock_post_notification(httpx_mock, request_host):
    def mock_request(response: str = None, status: int = 201):
        url = f'https://{request_host}/notifications/send'
        httpx_mock.add_response(url=url, json=response, status_code=201)
        return url

    return mock_request

@pytest.fixture(autouse=True)
def auto_mock_full_name_update(request, mocker):
    if request.node.get_closest_marker('no_tasks_autofix'):
        return
    mocker.patch('partners.tasks.cloud_user_full_name.update_cloud_user_full_name.apply_async')

@pytest.fixture(autouse=True, scope='function')
def mox_tasks_retries(mocker):
    mocker.patch('partners.tasks.notification.MAX_RETRIES', 1)
    mocker.patch('partners.tasks.notification.RETRY_TIMEOUT', 1)


@pytest.fixture(autouse=True, scope='function')
def clear_local_cache():
    caches['local'].clear()


@pytest.fixture()
def service_usage_factory():
    def factory(system: CloudSystemId, service: ChannelPartnerService = None,
                usage: int = 0, from_ts: datetime.datetime = None,
                to_ts: datetime.datetime = None) -> ServiceUsage:
        if not to_ts:
            raise ValueError("to_ts must be set")
        if not from_ts:
            from_ts = to_ts - datetime.timedelta(minutes=5)
        return ServiceUsage.objects.create(
            service=service,
            cloud_system=system,
            usage=usage,
            from_ts=from_ts,
            to_ts=to_ts
        )

    return factory


@pytest.fixture()
def cloud_storage_usage_factory():
    def factory(system: CloudSystemId, service: ChannelPartnerService = None,
                ts: datetime.datetime = None, usage: int = 0) -> ServiceUsage:
        if not ts:
            ts = timezone.now()
        return ServiceUsage.objects.create(
            service=service,
            cloud_system=system,
            usage=usage,
            from_ts=ts,
            to_ts=ts
        )

    return factory


@pytest.fixture()
def mock_new_partner_user_role_notification(mocker):
    return mocker.patch('partners.tasks.notification.notification_added_channel_partner_role')

@pytest.fixture()
def mock_new_org_user_role_notification(mocker):
    return mocker.patch('partners.tasks.notification.notification_added_organization_role')

@pytest.fixture()
def private_key_factory():
    def factory():
        return rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )

    return factory

def jwk_string(public_key: RSAPublicKey) -> str:
    pub_key = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.PKCS1
    )
    return f"{''.join(pub_key.strip().decode().splitlines()[1:-1])}"

@pytest.fixture()
def jwk_key_factory(private_key_factory):
    def factory(kid: str | UUID = None, priv_key: RSAPrivateKey = None) -> dict:
        alg = RSAAlgorithm(RSAAlgorithm.SHA256)
        if not kid:
            kid = f'{uuid4()}'
        if not priv_key:
            priv_key = private_key_factory()
        jwk = alg.to_jwk(priv_key, as_dict=True)
        return {
            "kty": "RSA",
            "use": "sig",
            "kid": f"{kid}",
            "n": jwk["n"],
            "e": "AQAB",
            "alg": "RS256",
            "key_ops": [
                "verify"
            ]
        }

    return factory


def generate_jwt_token(
        email: str,
        kid: str | UUID,
        priv_key: RSAPrivateKey,
        exp: datetime.datetime = None,
        cloud_host_name: str = 'cloud-test.hdw.mx'
    ) -> str:
        if not exp:
            exp = datetime.datetime.utcnow() + datetime.timedelta(hours=1)
        iat = exp - datetime.timedelta(hours=2)
        headers = {'typ': 'JWT', 'alg': 'RS256', 'kid': f'{kid}'}
        payload = {
            'exp': int(exp.timestamp()),
            'pwdTime': int(iat.timestamp()),
            'sid': f'{uuid4()}',
            'typ': 'accessToken',
            'aud': f'https://{cloud_host_name}/ cloudSystemId=*',
            'iat': int(iat.timestamp()),
            'sub': f'{email}',
            'client_id': '',
            'iss': 'cdb'
        }
        return jwt.encode(payload=payload, key=priv_key, headers=headers, algorithm='RS256')



@pytest.fixture()
def jwt_token_factory():
    def factory(
        email: str,
        kid: str | UUID,
        priv_key: RSAPrivateKey,
        exp: datetime.datetime = None,
        cloud_host_name: str = 'cloud-test.hdw.mx'
    ) -> str:
        if not exp:
            exp = datetime.datetime.utcnow() + datetime.timedelta(days=1)
        return generate_jwt_token(email, kid, priv_key, exp=exp, cloud_host_name=cloud_host_name)

    return factory


@pytest.fixture()
def faking_jwt_token():
    def factory(valid_token: str):
        parts = valid_token.split('.')
        payload = json.loads(base64url_decode(parts[1].encode()))
        payload['exp'] += 1000
        parts[1] = base64url_encode(json.dumps(payload).encode()).decode('utf-8')
        return '.'.join(parts)

    return factory


@pytest.fixture(scope='function')
def mock_jwks_request(mocker, cloud_test_host):
    def mock(ret_value: str, status_code: int = 200, side_effect=None):
        mock_urlopen = mocker.patch('urllib.request.urlopen', side_effect=side_effect)
        cm = MagicMock(side_effect=side_effect)
        cm.getcode.return_value = str(status_code)
        cm.read.return_value = ret_value
        cm.__enter__.return_value = cm
        mock_urlopen.return_value = cm
        return mock_urlopen

    return mock


def wrapped_report_mock_func(
        func,
        entity_obj_name,
        entity_id_name,
        report_type,
        *args,
        **kwargs,
):
    return func(*args, **kwargs)


@pytest.fixture()
def mock_reports_decoration(mocker):
    return mocker.patch('partners.services.usage_reports_service.wrapped_report_func',
                        wrapped_report_mock_func)


@pytest.fixture()
def generate_random_jwt(jwk_key_factory, private_key_factory):
    def factory(email, expiration=timezone.now() + datetime.timedelta(days=1)):
        kid = f'{uuid4()}'
        private_key = private_key_factory()
        jwk = jwk_key_factory(kid=kid, priv_key=private_key)
        jwt_token = f"nxcdb-{jwt_token_factory(f'{uuid4()}@netwrokotix.com', kid, private_key, exp=expiration)}"
        return jwt_token

    return factory