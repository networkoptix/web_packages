import json
import random
import re
from datetime import timedelta
from uuid import uuid4

import httpx
import pytest
from dateutil.relativedelta import relativedelta
from django.conf import settings
from django.core.cache import (
    cache,
    caches,
)
from django.db import transaction
from django.utils import timezone
from mock.mock import MagicMock
from rest_framework import exceptions
from rest_framework.reverse import reverse
from rest_framework.test import APIClient

from partners.authentication import (
    CREDENTIALS_REMOVED_PERMANENTLY,
    TokenCache,
)
from partners.models import (
    ActionConfirmation,
    ChannelPartner,
    ChannelPartnerRole,
    ChannelPartnerRoles,
    ChannelPartnerService,
    ChannelPartnerStates,
    CloudSystemId,
    CloudSystemStates,
    CloudUser,
    MigrationRecord,
    OrganizationPermissions,
    OrganizationRole,
    OrganizationRoles,
    OrganizationToUser,
    ServiceUsage,
    SystemServiceCurrentQuantity,
    VmsRoles,
)
from partners.views.v2.views import (
    ChannelPartnerNestedViewSet,
    ChannelPartnerViewSet,
    CloudSystemViewSet,
    OrganizationViewSet,
    get_authorized_system,
    organization_roles,
)
from tools.serializers import VALUE_REPLACEMENT


class TestCloudSystemViewSetRetrieve:

    @pytest.fixture(autouse=True)
    def setup(self, system_factory, org_user_factory, cloud_test_host,
              system_group_factory, sys_group_user_factory, jwt_token_factory, arf,
              channel_partner_factory, cp_user_factory, organization_factory,
              cp_service_factory):

        # Create channel partners
        self.cp = channel_partner_factory()  # Main channel partner
        ## Sub channel partner
        self.sub_cp = channel_partner_factory(parent_channel_partner=self.cp)

        # Create organizations
        ## Main organization
        self.organization = organization_factory(channel_partner=self.sub_cp)
        ## Other organization
        self.other_org = organization_factory(channel_partner=self.sub_cp)

        # Create system groups
        ## Main system group
        self.group = system_group_factory(organization=self.organization)
        ## Other system group
        self.other_group = system_group_factory(organization=self.organization)

        # Create users
        ## User for main channel partner
        self.cp_user = cp_user_factory(channel_partner=self.cp)
        ## User for sub channel partner
        self.sub_cp_user = cp_user_factory(channel_partner=self.sub_cp)
        ## Admin for main organization
        self.org_admin = org_user_factory(organization=self.organization)
        #  # Admin for other organization
        self.other_org_admin = org_user_factory(organization=self.other_org)
        ## Admin for main system group
        self.group_admin = sys_group_user_factory(organization=self.organization, group=self.group)
        ## Admin for other system group
        self.other_group_admin = sys_group_user_factory(organization=self.organization, group=self.other_group)

        # Create systems
        ## System for main organization
        self.org_system = system_factory(organization=self.organization)
        ## System for main system group
        self.group_system = system_factory(organization=self.organization, system_group=self.group)

        # Creating Enabled & Disabled Services
        self.enabled_service = cp_service_factory(
            channel_partner=self.sub_cp,
            service_type=ChannelPartnerService.ANALYTICS,
            is_enabled=True)
        self.disabled_service = cp_service_factory(
            channel_partner=self.sub_cp,
            service_type=ChannelPartnerService.ANALYTICS,
            is_enabled=False)

        # Setup API client
        self.client = APIClient(SERVER_NAME=cloud_test_host.hostname)
        self.token = f'{uuid4()}'
        self.auth_cred = f'Bearer {self.token}'

        # Generate URL for cloud system detail
        self.url = reverse('v2:cloudsystem-detail', kwargs={'id': self.group_system.system_id})

        # Clear caches
        caches['default'].clear()
        caches['local'].clear()

    def test_returned_services_count(self, cloud_test_host, mock_auth_with_user):

        # Authenticating the user
        mock_auth_with_user(self.sub_cp_user.user)

        bearer_token = f'Bearer {uuid4()}'
        api_client = APIClient(SERVER_NAME=cloud_test_host.hostname)
        api_client.credentials(HTTP_AUTHORIZATION=bearer_token)

        path = reverse(
            'v2:cloudsystem-services',
            kwargs={'id': str(self.org_system.system_id)}
        )
        response = api_client.get(path=path)

        assert response.status_code == 200
        assert len(response.data) == 1

    def test_token_200_group_user(self, mock_cdb_token_introspect):
        mock_cdb_token_introspect(user=self.group_admin.user, system=self.group_system, system_role=None)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth_cred)
        response = self.client.get(path=self.url)
        assert response.status_code == 200
        assert response.data['name'] == self.group_system.name
        assert response.data['organizationName'] == self.organization.name

    def test_token_200_org_user(self, mock_cdb_token_introspect):
        mock_cdb_token_introspect(user=self.org_admin.user, system=self.group_system, system_role=None)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth_cred)
        response = self.client.get(path=self.url)
        assert response.status_code == 200
        assert response.data['name'] == self.group_system.name
        assert response.data['organizationName'] == self.organization.name

    def test_token_200_cp_user(self, mock_cdb_token_introspect):
        mock_cdb_token_introspect(user=self.sub_cp_user.user, system=self.group_system, system_role=None)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth_cred)
        response = self.client.get(path=self.url)
        assert response.status_code == 200
        assert response.data['name'] == self.group_system.name
        assert response.data['organizationName'] == self.organization.name

    def test_token_200_top_cp_user(self, mock_cdb_token_introspect):
        mock_cdb_token_introspect(user=self.cp_user.user, system=self.group_system, system_role=None)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth_cred)
        response = self.client.get(path=self.url)
        assert response.status_code == 200

    def test_token_200_system_user(self, mock_cdb_token_introspect, cloud_user_factory):
        vms_user = cloud_user_factory()
        mock_cdb_token_introspect(user=vms_user, system=self.group_system, system_role=VmsRoles.POWER_USER)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth_cred)
        response = self.client.get(path=self.url)
        assert response.status_code == 200
        assert response.data['name'] == self.group_system.name
        assert response.data['organizationName'] == self.organization.name

    def test_token_403_system_user(self, mock_cdb_token_introspect, cloud_user_factory):
        vms_user = cloud_user_factory()
        mock_cdb_token_introspect(user=vms_user, system=None, system_role=None)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth_cred)
        response = self.client.get(path=self.url)
        assert response.status_code == 403

    def test_token_200_custom_user(self, mock_cdb_token_introspect, cloud_user_factory):
        vms_user = cloud_user_factory()
        mock_cdb_token_introspect(user=vms_user, system=self.group_system, system_role=None)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth_cred)
        response = self.client.get(path=self.url)
        assert response.status_code == 200
        assert response.data['organizationName'] == self.organization.name

    def test_token_403_org_user(self, mock_cdb_token_introspect, cloud_user_factory):
        mock_cdb_token_introspect(user=self.other_org_admin.user, system=None, system_role=None)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth_cred)
        response = self.client.get(path=self.url)
        assert response.status_code == 403

    def test_token_403_user_with_no_org(self, cloud_user_factory, mock_auth_with_user):
        user = cloud_user_factory()
        mock_auth_with_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth_cred)
        response = self.client.get(path=self.url)
        assert response.status_code == 403

    def test_token_403_group_user(self, mock_cdb_token_introspect, cloud_user_factory):
        mock_cdb_token_introspect(user=self.other_group_admin.user, system=None, system_role=None)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth_cred)
        response = self.client.get(path=self.url)
        assert response.status_code == 403

    def test_system_auth_200(self, mock_auth_with_system, basic_auth_credentials):
        mock_auth_with_system(self.group_system)
        self.client.credentials(HTTP_AUTHORIZATION=f'Basic {basic_auth_credentials()}')
        response = self.client.get(path=self.url)
        assert response.status_code == 200

    def test_system_auth_403(self, mock_auth_with_system, basic_auth_credentials, system_factory):
        sys = system_factory(organization=self.organization)
        sys.organization = None
        sys.save()
        mock_auth_with_system(sys)
        self.client.credentials(HTTP_AUTHORIZATION=f'Basic {basic_auth_credentials()}')
        url = reverse('v2:cloudsystem-detail', kwargs={'id': sys.system_id})
        response = self.client.get(path=url)
        assert response.status_code == 403



class TestCloudSystemViewSetBind:

    @pytest.fixture(autouse=True)
    def setup(self, default_organization, org_user_factory, default_org_user,
              system_group_factory, sys_group_user_factory, httpx_mock, arf):
        sys_id = f'{uuid4()}'
        self.valid_data = {
            "name": f"system {sys_id}",
            "cloudSystemId": sys_id,
            "organization": str(default_org_user.organization.id),
            "customization": "default",
            "opaque": ""
        }
        self.group = system_group_factory(organization=default_organization)
        self.org_admin = org_user_factory(organization=default_organization)
        self.group_admin = sys_group_user_factory(organization=default_organization, group=self.group)
        system_url = f'https://cloud-test.hdw.mx/cdb/systems/bind'
        bind_response = {
            "id": sys_id,
            "status": "activated"
        }
        httpx_mock.add_response(url=system_url, json=bind_response)
        self.view = CloudSystemViewSet.as_view({'post': 'create'})

    def test_bind_403(self, default_cp_user, default_org_user, mock_auth_with_user, arf):
        # Channel partner user
        mock_auth_with_user(default_cp_user)

        valid_request = arf.post('/', data=self.valid_data, format='json')
        with transaction.atomic():
            response = self.view(valid_request)
        assert response.status_code == 403
        assert response.data['detail']
        # Org admin
        mock_auth_with_user(default_org_user)
        valid_request = arf.post('/', data=self.valid_data, format='json')
        with transaction.atomic():
            response = self.view(valid_request)
        assert response.status_code == 403
        assert response.data['detail']

    def test_bind_to_org_200(self, default_cp_user, default_org_user, mock_auth_with_user, arf,
                             httpx_mock, org_user_factory, default_organization):
        mock_auth_with_user(self.org_admin)
        request = arf.post('/', data=self.valid_data, format='json')
        with transaction.atomic():
            response = self.view(request)
        assert response.status_code == 200

    def test_bind_to_group_200(self, default_cp_user, default_org_user, mock_auth_with_user, arf,
                               httpx_mock, org_user_factory, default_organization, system_group_factory):
        self.valid_data['groupId'] = f'{self.group.id}'
        mock_auth_with_user(self.org_admin)
        request = arf.post('/', data=self.valid_data, format='json')
        view = CloudSystemViewSet.as_view({'post': 'create'})
        with transaction.atomic():
            response = view(request)
        assert response.status_code == 200

    def test_bind_to_group_400(self, default_cp_user, default_org_user, mock_auth_with_user, arf,
                               httpx_mock, org_user_factory, default_organization, system_group_factory):
        self.valid_data['groupId'] = f'{uuid4()}'
        mock_auth_with_user(self.org_admin)
        request = arf.post('/', data=self.valid_data, format='json')
        view = CloudSystemViewSet.as_view({'post': 'create'})
        with transaction.atomic():
            response = view(request)
        assert response.status_code == 400


class TestCloudSystemViewSetMenageLegacyLicenses:
    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory, system_factory,
              cp_service_factory, service_record_factory, cloud_test_host, org_user_factory):
        self.license_quantity = 20
        self.cp = channel_partner_factory()
        self.organization = organization_factory(channel_partner=self.cp)
        self.org_admin = org_user_factory(organization=self.organization)
        self.system = system_factory(organization=self.organization)
        self.other_services = []
        self.trial_services = []
        for i in range(10):
            service = cp_service_factory(channel_partner=self.cp)
            service.created_ts = timezone.now() - timedelta(days=3*i)
            service.save()
            self.other_services.append(service)
            trial_service = cp_service_factory(channel_partner=self.cp)
            trial_service.sub_type = ChannelPartnerService.CREDIT
            trial_service.created_ts = timezone.now() - timedelta(days=2*i)
            trial_service.save()
            self.trial_services.append(trial_service)
        self.hardware_ids = [str(uuid4()) for _ in range(10)]
        self.licenses = [
            "4NSW-Q6ZR-6V6N-D9P2",
            "4NSW-Q6ZR-6V6N-D9P3",
            "4NSW-Q6ZR-6V6N-D9P4",
            "4NSW-Q6ZR-6V6N-D9P5",
            "4NSW-Q6ZR-6V6N-D9P6",
        ]
        self.valid_data = {
            "licenses": self.licenses,
            "hardwareIds": self.hardware_ids
        }
        self.invalid_data = {
            "licenses": [],
        }
        service_record = service_record_factory(
            service=self.other_services[0],
            cloud_system=self.system
        )
        MigrationRecord.objects.create(
            license_key=self.licenses[1],
            service_record_id=service_record.id
        )
        self.auth = f'Basic {uuid4()}'
        self.url = f'{settings.LICENSE_SERVER}/nxlicensed/api/v2/internal/migrate_legacy'
        self.client = APIClient(SERVER_NAME=cloud_test_host.hostname)
        self.path = reverse('v2:cloudsystem-migrate-legacy-licenses', kwargs={'id': self.system.system_id})
        self.lic_response_data = [{
            "key": "key",
            "count": 10,
        }]
        caches['local'].clear()
        caches['default'].clear()

    def lic_server_data(self, license_key, count=20):
        return [{
            "key": license_key,
            "count": count,
        }]

    def test_success(self, httpx_mock, mock_cdb_basic_auth):
        httpx_mock.add_response(
            status_code=200,
            url=self.url,
            json=self.lic_server_data(
                self.licenses[0],
                10
            ),
            match_json={"licenses": [self.licenses[0]], "hardwareIds": self.hardware_ids}
        )
        httpx_mock.add_response(
            status_code=200,
            url=self.url,
            json=self.lic_server_data(
                self.licenses[1],
                20
            ),
            match_json={"licenses": [self.licenses[1]], "hardwareIds": self.hardware_ids}
        )
        # http status error
        httpx_mock.add_response(
            status_code=400,
            url=self.url,
            json=self.lic_server_data(
                self.licenses[2],
                30
            ),
            match_json={"licenses": [self.licenses[2]], "hardwareIds": self.hardware_ids}
        )
        httpx_mock.add_response(
            status_code=200,
            url=self.url,
            json=self.lic_server_data(
                self.licenses[3],
                20
            ),
            match_json={"licenses": [self.licenses[3]], "hardwareIds": self.hardware_ids}
        )
        # incorrect license key
        httpx_mock.add_response(
            status_code=400,
            url=self.url,
            json=self.lic_server_data(
                self.licenses[3],
                50
            ),
            match_json={"licenses": [self.licenses[4]], "hardwareIds": self.hardware_ids}
        )
        auth = mock_cdb_basic_auth(self.system)
        self.client.credentials(HTTP_AUTHORIZATION=auth)
        response = self.client.post(self.path, data=self.valid_data)
        assert response.status_code == 200
        data = response.json()
        assert MigrationRecord.objects.filter(license_key__in=self.licenses).count() == 3
        migration_record = MigrationRecord.objects.filter(license_key__in=self.licenses).last()
        assert migration_record.service_record.quantity == 30
        assert migration_record.service_record.cloud_system == self.system
        failed = [self.licenses[2], self.licenses[4]]
        skipped = [self.licenses[1]]
        success = [self.licenses[0], self.licenses[3]]
        assert data['migratedLicenses'] == success
        assert data['skippedLicenses'] == skipped
        assert data['failedLicenses'] == failed

    def test_all_failed(self, httpx_mock, mock_cdb_basic_auth):
        httpx_mock.add_response(
            status_code=400,
            url=self.url,
            json=self.lic_response_data,
        )
        auth = mock_cdb_basic_auth(self.system)
        self.client.credentials(HTTP_AUTHORIZATION=auth)
        response = self.client.post(self.path, data=self.valid_data)
        assert response.status_code == 200
        data = response.json()
        assert MigrationRecord.objects.filter(license_key__in=self.licenses).count() == 1
        skipped = self.licenses.pop(1)
        assert data['migratedLicenses'] == []
        assert data['skippedLicenses'] == [skipped]
        assert data['failedLicenses'] == self.licenses

    def test_missing_trial_service(self, httpx_mock, mock_cdb_basic_auth):
        for service in self.trial_services:
            service.delete()
        httpx_mock.add_response(
            status_code=400,
            url=self.url,
            json=self.lic_response_data,
        )
        auth = mock_cdb_basic_auth(self.system)
        self.client.credentials(HTTP_AUTHORIZATION=auth)
        response = self.client.post(self.path, data=self.valid_data)
        assert response.status_code == 400
        data = response.json()
        assert 'Cannot determine trial service for system' in data['detail']


class TestCloudSystemViewSet:

    def test_service_quantity(self, channel_partner_factory, cp_user_factory, organization_factory, org_user_factory,
                              arf, system_factory, cp_service_factory, service_record_factory,
                              service_usage_factory, cloud_storage_usage_factory, mock_cdb_token_introspect):
        quantity = 10
        usage_storage = 9
        usage_recording = int(ServiceUsage.get_usage_from_quantity(ChannelPartnerService.LOCAL_RECORDING, 1.1))
        now = timezone.now()
        root = channel_partner_factory(parent_channel_partner=None)
        child = channel_partner_factory(parent_channel_partner=root)
        root_user = cp_user_factory(channel_partner=root)
        child_user = cp_user_factory(channel_partner=child)
        root_org = organization_factory(channel_partner=root)
        root_org_user = org_user_factory(organization=root_org)
        system = system_factory(organization=root_org)

        local_recording_service = cp_service_factory(
            channel_partner=root, service_type=ChannelPartnerService.LOCAL_RECORDING)
        analytics_service = cp_service_factory(
            channel_partner=root, service_type=ChannelPartnerService.ANALYTICS)
        cloud_storage_service = cp_service_factory(
            channel_partner=root, service_type=ChannelPartnerService.CLOUD_STORAGE)

        service_record_factory(local_recording_service, cloud_system=system, quantity=quantity)
        service_record_factory(cloud_storage_service, cloud_system=system, quantity=quantity)
        service_record_factory(analytics_service, cloud_system=system, quantity=quantity)

        SystemServiceCurrentQuantity.objects.create(
            cloud_system=system,
            organization=root_org,
            service=local_recording_service,
            quantity=quantity
        )
        SystemServiceCurrentQuantity.objects.create(
            cloud_system=system,
            organization=root_org,
            service=cloud_storage_service,
            quantity=quantity * 2
        )
        req = arf.get(f'/partners/cloud_systems/{system.system_id}/service_quantity/')
        CloudSystemViewSet.detail = True
        view = CloudSystemViewSet.as_view({'get': 'service_quantity'}, detail=True)

        mock_cdb_token_introspect(root_user)
        req.user = root_user.user
        with transaction.atomic():
            response = view(req, id=str(system.system_id))
        assert response.status_code == 200
        assert response.data['services']
        assert response.data['services'][str(local_recording_service.id)]
        # Usage to quantity = 2 * 1.1 -> rounded to 3
        assert response.data['services'][str(local_recording_service.id)]['used'] == quantity
        assert response.data['services'][str(local_recording_service.id)]['quantity'] == quantity
        # storage usage metric is unchanged
        assert response.data['services'][str(cloud_storage_service.id)]['used'] == quantity * 2
        assert response.data['services'][str(cloud_storage_service.id)]['quantity'] == quantity
        # analytics is not used but allocated
        assert response.data['services'][str(analytics_service.id)]['used'] == 0
        assert response.data['services'][str(analytics_service.id)]['quantity'] == quantity

        mock_cdb_token_introspect(user=child_user)
        req.user = child_user.user
        with transaction.atomic():
            response = view(req, id=str(system.system_id))

        assert response.status_code == 403

    def test_service_quantity_patch_disabled_service(
            self,
            channel_partner_factory,
            organization_factory,
            cp_user_factory,
            system_factory,
            cp_service_factory,
            mock_auth_with_user,
            arf,
            mocker
    ) -> None:
        # Ensure there are ChannelPartnerRole objects in the database
        assert ChannelPartnerRole.objects.all().count() > 0

        # Clear the cache and remove throttling for the test
        cache.clear()
        CloudSystemViewSet.throttle_classes = []

        # Create a channel partner and a user for that partner
        channel_partner = channel_partner_factory()
        channel_partner_user = cp_user_factory(channel_partner=channel_partner)

        # Create an organization and a system for that organization
        organization = organization_factory(channel_partner=channel_partner)
        organization_system = system_factory(organization=organization)

        # Create a disabled service
        disabled_service = cp_service_factory(channel_partner=channel_partner, is_enabled=False)

        # Mock the notify_service_change method
        mocker.patch('partners.services.cloud_system_service.CloudSystemService.notify_service_change')
        # Authenticate the user
        mock_auth_with_user(channel_partner_user)

        # Prepare the view and the request
        view = CloudSystemViewSet.as_view(actions={'patch': 'service_quantity'}, detail=True)
        request = arf.patch('/', data={"services": {str(disabled_service.id): {"quantity": 15}}}, format='json')

        # Execute the view and get the response
        with transaction.atomic():
            response = view(request, id=str(organization_system.system_id))

        # Assert that the response status code is 400 (Bad Request)
        assert response.status_code == 400

        # Extract the disabled services from the response
        disabled_services = response.data.get("services").get("disabled")

        # Assert that the disabled service is in the response
        disabled_service_id = str(disabled_service.id)
        assert disabled_service_id  in disabled_services
        # Assert that the error message is correct
        assert "Service is disabled" in disabled_services[disabled_service_id]


    def test_service_quantity_patch(self, channel_partner_factory, organization_factory, cp_user_factory,
                                    service_record_factory, cp_service_factory, system_factory,
                                    mock_auth_with_user, arf, mocker):
        assert ChannelPartnerRole.objects.all().count() > 0

        # This test has some issues due to the mocking of redisCache.
        # Doing this fixes the test
        cache.clear()
        CloudSystemViewSet.throttle_classes = []

        cp = channel_partner_factory()
        cp_user = cp_user_factory(channel_partner=cp)
        org = organization_factory(channel_partner=cp)
        system = system_factory(organization=org)
        services = [cp_service_factory(channel_partner=cp) for _ in range(2)]
        service_records = [service_record_factory(service=service, cloud_system=system,
                                                  quantity=10, organization=system.organization)
                           for service in services]
        mock_method = mocker.patch('partners.services.cloud_system_service.CloudSystemService.notify_service_change')
        # with patch.object(CloudSystemService, 'notify_service_change', ew=Mock()) as mock_method:
        mock_auth_with_user(cp_user)
        view = CloudSystemViewSet.as_view(actions={'patch': 'service_quantity'}, detail=True)
        # test successful request
        request = arf.patch('/', data={"services": {str(services[0].id): {"quantity": 15}}}, format='json')
        with transaction.atomic():
            response = view(request, id=str(system.system_id))
        assert response.status_code == 200
        assert response.data['services'][str(services[0].id)]['quantity'] == 15
        assert response.data['services'][str(services[1].id)]['quantity'] == 10

        # test failure request because of busy lock
        mocker.patch('nx_django_redis.redis_cache.RedisSyncBackend.add', return_value=False)
        caches['default'].set(CloudSystemViewSet.get_service_quantity_lock(system), 1)
        request = arf.patch('/', data={"services": {str(services[1].id): {"quantity": 15}}}, format='json')
        with transaction.atomic():
            response = view(request, id=str(system.system_id))
        assert response.status_code == 429
        assert response.headers['Retry-After'] == '2'

        # test success request with freeing lock during waiting. it cannot be tested properly,
        # but we can catch side effect
        mocker.patch('nx_django_redis.redis_cache.RedisSyncBackend.add', return_value=False)
        cache_get_mock = mocker.patch('nx_django_redis.redis_cache.RedisSyncBackend.get', return_value=None)
        caches['default'].set(CloudSystemViewSet.get_service_quantity_lock(system), 1)
        request = arf.patch('/', data={"services": {str(services[1].id): {"quantity": 15}}}, format='json')
        raised_error = None
        try:
            response = view(request, id=str(system.system_id))
        except Exception as ex:
            raised_error = ex.__class__
        cache_get_mock.assert_called()
        assert raised_error == RecursionError

        # test successful request and second service value
        mocker.patch('nx_django_redis.redis_cache.RedisSyncBackend.add', return_value=True)
        request = arf.patch('/', data={"services": {str(services[0].id): {"quantity": 15}}}, format='json')
        with transaction.atomic():
            response = view(request, id=str(system.system_id))
        assert response.status_code == 200
        assert response.data['services'][str(services[0].id)]['quantity'] == 15
        assert response.data['services'][str(services[1].id)]['quantity'] == 10

        assert mock_method.call_count == 2

    def test_service_quantity_patch_not_activated(self, channel_partner_factory, organization_factory, cp_user_factory,
                                    service_record_factory, cp_service_factory, system_factory,
                                    mock_auth_with_user, arf, mocker):
        assert ChannelPartnerRole.objects.all().count() > 0
        cp = channel_partner_factory()
        cp_user = cp_user_factory(channel_partner=cp)
        org = organization_factory(channel_partner=cp)
        system = system_factory(organization=org, state=ChannelPartnerStates.SHUTDOWN)
        services = [cp_service_factory(channel_partner=cp) for _ in range(2)]
        service_records = [service_record_factory(service=service, cloud_system=system,
                                                  quantity=10, organization=system.organization)
                           for service in services]
        mock_method = mocker.patch('partners.services.cloud_system_service.CloudSystemService.notify_service_change')
        mock_auth_with_user(cp_user)
        view = CloudSystemViewSet.as_view(actions={'patch': 'service_quantity'}, detail=True)

        # test shutdown system change
        mocker.patch('nx_django_redis.redis_cache.RedisSyncBackend.add', return_value=True)
        request = arf.patch('/', data={"services": {str(services[0].id): {"quantity": 15}}}, format='json')

        response = view(request, id=str(system.system_id))
        assert response.status_code == 400
        assert "Unable to update; system is not activated" in response.data['message']
        assert mock_method.call_count == 0

    def test_service_quantity_patch_expired(
            self,
            channel_partner_factory,
            organization_factory,
            cp_user_factory,
            service_record_factory,
            cp_service_factory,
            system_factory,
            mock_auth_with_user,
            arf,
            mocker
    ):
        cp = channel_partner_factory()
        cp_user = cp_user_factory(channel_partner=cp)
        org = organization_factory(channel_partner=cp)
        system = system_factory(organization=org,)
        service = cp_service_factory(
            channel_partner=cp,
            sub_type=ChannelPartnerService.CREDIT,
            duration=1,
        )
        service_record_factory(
            service=service,
            cloud_system=system,
            quantity=10,
            created_ts=timezone.now() - timedelta(days=40),
        )
        mock_auth_with_user(cp_user)
        view = CloudSystemViewSet.as_view(actions={'patch': 'service_quantity'}, detail=True)

        mocker.patch('nx_django_redis.redis_cache.RedisSyncBackend.add', return_value=True)
        request = arf.patch('/', data={"services": {str(service.id): {"quantity": 15}}}, format='json')

        with transaction.atomic():
            response = view(request, id=str(system.system_id))
        assert response.status_code == 400
        assert response.data['services'][str(service.id)] == "Service has expired"

    def test_saas_report(self, channel_partner_factory, organization_factory, system_factory,
                         mock_auth_with_system, arf_basic_auth, service_record_factory, cp_service_factory):
        cp = channel_partner_factory()
        org = organization_factory(channel_partner=cp)
        system = system_factory(organization=org)
        system.system_state = CloudSystemStates.NOT_ACTIVATED
        system.save()
        service = cp_service_factory(channel_partner=cp)
        record = service_record_factory(service, system, organization=org, quantity=10)
        TokenCache.cache().clear()
        view = CloudSystemViewSet.as_view(actions={'get': 'saas_report'}, detail=True)
        request = arf_basic_auth.get('/', {'requestId': 'test-id-1'})
        mock_auth_with_system(system)
        response = view(request, id=system.system_id)
        system.refresh_from_db()
        assert response.status_code == 200
        assert system.system_state == CloudSystemStates.ACTIVATED
        status = response.data['security']['status']
        assert status[ChannelPartnerService.SERVICE_TYPE_TO_CODE_MAP[ChannelPartnerService.LOCAL_RECORDING]]
        assert status[ChannelPartnerService.SERVICE_TYPE_TO_CODE_MAP[ChannelPartnerService.CLOUD_STORAGE]]
        assert status[ChannelPartnerService.SERVICE_TYPE_TO_CODE_MAP[ChannelPartnerService.ANALYTICS]]
        stautsIds = response.data['security']['statusIds']
        assert stautsIds[str(service.id)]
        # clear cached authorizations
        TokenCache.cache().clear()
        request = arf_basic_auth.get('/')

        response_data = response.data
        assert response_data.get("requestId") == "test-id-1"

        request = arf_basic_auth.get('/', {'requestId': 'test-id-2'})
        mock_auth_with_system(system, authenticated=False, status=CloudSystemStates.DELETED)
        response = view(request, id=system.system_id)
        assert response.status_code == 401
        assert system.system_state == CloudSystemStates.DELETED

    def test_saas_report_empty_requestId(self, channel_partner_factory, organization_factory, system_factory,
                                         mock_auth_with_system, arf_basic_auth):
        cp = channel_partner_factory()
        org = organization_factory(channel_partner=cp)
        system = system_factory(organization=org)

        system.system_state = CloudSystemStates.NOT_ACTIVATED
        system.save()

        view = CloudSystemViewSet.as_view(actions={'get': 'saas_report'}, detail=True)
        request = arf_basic_auth.get('/')

        mock_auth_with_system(system)
        response = view(request, id=system.system_id)
        assert response.status_code == 200
        assert system.system_state == CloudSystemStates.ACTIVATED

        response_data = response.data
        assert response_data.get("requestId") == ""

    def test_services_no_organization(self, channel_partner_factory, organization_factory, system_factory,
                                      mocker, arf_basic_auth):
        cp = channel_partner_factory()
        system = system_factory(organization=None)
        mocked_check = mocker.patch('partners.authentication.check_system_credentials',
                                    return_value=(True, CloudSystemStates.ACTIVATED, 'Test'))
        system_id = f'{system.system_id}'
        password = f'{uuid4()}'
        auth = httpx.BasicAuth('u', 'p')._build_auth_header(system_id, password)
        view = CloudSystemViewSet.as_view(actions={'get': 'services'}, detail=True)
        request = arf_basic_auth.get('/', headers={'Authorization': auth})
        response = view(request, id=system.system_id)
        assert response.status_code == 401
        assert response.data['detail'] == 'Not an organization system.'

    def test_services_no_organization_user_token(self, channel_partner_factory, organization_factory,
                                                 system_factory, cloud_user_factory, arf,
                                                 mock_cdb_token_introspect, mock_auth_with_user):

        cp = channel_partner_factory()
        request = arf.get('/')
        system = system_factory(organization=None)
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=system, system_role=VmsRoles.ADMINISTRATOR)
        system_id = f'{system.system_id}'
        view = CloudSystemViewSet.as_view(actions={'get': 'services'}, detail=True)
        mock_auth_with_user(user)
        response = view(request, id=system.system_id)
        assert response.status_code == 403
        assert response.data['detail'] == 'You do not have permission to perform this action.'

    def test_services_deleted_form_cps(self, channel_partner_factory, organization_factory, system_factory,
                                      mocker, arf_basic_auth):
        cp = channel_partner_factory()
        system = system_factory(organization=None)
        system.system_state = CloudSystemStates.DELETED
        system.save()
        mocked_check = mocker.patch('partners.authentication.check_system_credentials',
                                    return_value=(True, CloudSystemStates.ACTIVATED, 'Test'))
        system_id = f'{system.system_id}'
        password = f'{uuid4()}'
        auth = httpx.BasicAuth('u', 'p')._build_auth_header(system_id, password)
        view = CloudSystemViewSet.as_view(actions={'get': 'services'}, detail=True)
        request = arf_basic_auth.get('/', headers={'Authorization': auth})
        response = view(request, id=system.system_id)
        assert response.status_code == 401
        assert response.data['detail'] == 'System has been disconnected.'
        assert response.data['resultCode'] == CREDENTIALS_REMOVED_PERMANENTLY

    def test_services_deleted_form_cdb(self, channel_partner_factory, organization_factory, system_factory,
                                      mocker, arf_basic_auth):
        cp = channel_partner_factory()
        system = system_factory(organization=organization_factory())
        mocked_check = mocker.patch('partners.authentication.check_system_credentials',
                                    return_value=(False, CloudSystemStates.DELETED, 'Test'))
        system_id = f'{system.system_id}'
        password = f'{uuid4()}'
        auth = httpx.BasicAuth('u', 'p')._build_auth_header(system_id, password)
        view = CloudSystemViewSet.as_view(actions={'get': 'services'}, detail=True)
        request = arf_basic_auth.get('/', headers={'Authorization': auth})
        with transaction.atomic():
            response = view(request, id=system.system_id)
        assert response.status_code == 401
        assert response.data['detail'] == 'Invalid system id or auth key'
        assert response.data['resultCode'] == CREDENTIALS_REMOVED_PERMANENTLY
        # check if system changes are not rolled back on raising exception
        system.refresh_from_db()
        assert system.system_state == CloudSystemStates.DELETED

    def test_services_invalid_host(self, channel_partner_factory, organization_factory, system_factory,
                                   mocker, arf_basic_auth, cloud_host_factory):
        cp = channel_partner_factory()
        cloud_host = cloud_host_factory()
        system = system_factory(organization=None, cloud_host=cloud_host)
        mocked_check = mocker.patch('partners.authentication.check_system_credentials',
                                    return_value=(True, CloudSystemStates.ACTIVATED, 'Test'))
        system_id = f'{system.system_id}'
        password = f'{uuid4()}'
        auth = httpx.BasicAuth('u', 'p')._build_auth_header(system_id, password)
        view = CloudSystemViewSet.as_view(actions={'get': 'services'}, detail=True)
        request = arf_basic_auth.get('/', headers={'Authorization': auth})
        request.cloud_host = cp.cloud_host
        response = view(request, id=system.system_id)
        assert response.status_code == 404
        assert response.data == {'detail': f'System {system_id} not found.'}


class TestCloudSystemViewSetSystemCurrentUsage:
    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory, system_factory,
              cp_service_factory, service_record_factory, cloud_test_host, mock_auth_with_system):
        self.channel_partner = channel_partner_factory()
        self.other_channel_partner = channel_partner_factory()
        self.organization = organization_factory(channel_partner=self.channel_partner)
        self.system = system_factory(organization=self.organization)
        self.cp_service_1 = cp_service_factory(
            channel_partner=self.channel_partner,
        )
        self.cp_service_2 = cp_service_factory(
            channel_partner=self.channel_partner,
        )
        self.cp_service_3 = cp_service_factory(
            channel_partner=self.channel_partner,
        )
        self.other_service = cp_service_factory(
            channel_partner=self.other_channel_partner,
        )
        service_record_factory(
            service=self.cp_service_1,
            cloud_system=self.system,
            quantity=10,
        )
        service_record_factory(
            service=self.cp_service_2,
            cloud_system=self.system,
            quantity=20,
        )
        service_record_factory(
            service=self.cp_service_3,
            cloud_system=self.system,
            quantity=30,
        )
        self.client = APIClient(SERVER_NAME=cloud_test_host.hostname)
        self.path = reverse('v2:cloudsystem-system-current-usage', kwargs={'id': self.system.system_id})
        self.client.credentials(HTTP_AUTHORIZATION=f'Basic {uuid4()}')
        mock_auth_with_system(self.system)

    def test_invalid_data(self):
        data = {
            'currentUsages': [
                {
                    'service': f'{uuid4()}',
                    'quantity': 10,
                },
                {
                    'service': self.other_service.id,
                    'quantity': 10,
                }
            ]
        }
        response = self.client.post(self.path, data=data, format='json')
        assert response.status_code == 400
        assert len(response.data['currentUsages']) == 2
        assert 'object does not exist' in response.data['currentUsages'][0]['service'][0]
        assert 'is not available for organization' in response.data['currentUsages'][1]['service'][0]

    def test_success(self):
        data = {
            'currentUsages': [
                {
                    'service': str(self.cp_service_1.id),
                    'quantity': 10,
                },
                {
                    'service': str(self.cp_service_2.id),
                    'quantity': 20,
                },
                {
                    'service': str(self.cp_service_2.id),
                    'quantity': 20,
                },
                {
                    'service': str(self.cp_service_3.id),
                    'quantity': 30,
                },
                {
                    'service': str(self.cp_service_3.id),
                    'quantity': 30,
                }
            ]
        }
        response = self.client.post(self.path, data=data, format='json')
        assert response.status_code == 200
        assert response.data['services'][str(self.cp_service_1.id)]['quantity'] == 10
        assert response.data['services'][str(self.cp_service_1.id)]['used'] == 10
        assert response.data['services'][str(self.cp_service_2.id)]['quantity'] == 20
        assert response.data['services'][str(self.cp_service_2.id)]['used'] == 40
        assert response.data['services'][str(self.cp_service_3.id)]['quantity'] == 30
        assert response.data['services'][str(self.cp_service_3.id)]['used'] == 60
        assert SystemServiceCurrentQuantity.objects.get(service=self.cp_service_1).quantity == 10
        assert SystemServiceCurrentQuantity.objects.get(service=self.cp_service_1).cloud_system == self.system
        assert SystemServiceCurrentQuantity.objects.get(service=self.cp_service_1).organization == self.organization
        assert SystemServiceCurrentQuantity.objects.get(service=self.cp_service_2).quantity == 40
        assert SystemServiceCurrentQuantity.objects.get(service=self.cp_service_2).cloud_system == self.system
        assert SystemServiceCurrentQuantity.objects.get(service=self.cp_service_2).organization == self.organization
        assert SystemServiceCurrentQuantity.objects.get(service=self.cp_service_3).quantity == 60
        assert SystemServiceCurrentQuantity.objects.get(service=self.cp_service_3).cloud_system == self.system
        assert SystemServiceCurrentQuantity.objects.get(service=self.cp_service_3).organization == self.organization
        assert SystemServiceCurrentQuantity.objects.count() == 3

    def test_system_auth_403(self, mock_auth_with_system, basic_auth_credentials, system_factory):
        sys = system_factory(organization=self.organization)
        sys.organization = None
        sys.save()
        mock_auth_with_system(sys)
        data = {
            'currentUsages': []
        }
        self.client.credentials(HTTP_AUTHORIZATION=f'Basic {basic_auth_credentials()}')
        path = reverse('v2:cloudsystem-system-current-usage', kwargs={'id': self.system.system_id})
        response = self.client.post(path=path)
        assert response.status_code == 403


class TestChannelPartnerNestedViewSet:
    @pytest.fixture(autouse=True)
    def setup(self, default_channel_partner, channel_partner_factory,
              cloud_test_host, cloud_host_factory, mock_auth_with_user,
              default_cp_admin, cp_user_factory, root_nx_channel_partner):
        self.gen_count = 3
        self.host = cloud_test_host
        self.other_host = cloud_host_factory(hostname=f'{uuid4()}')
        self.root_cp = channel_partner_factory(parent_channel_partner=root_nx_channel_partner)
        self.root_cp_user = cp_user_factory(channel_partner=self.root_cp)
        self.other_cp = channel_partner_factory(name=f'{uuid4()}', parent_channel_partner=root_nx_channel_partner,
                                                cloud_host=self.other_host)
        self.default_subs = [
            channel_partner_factory(parent_channel_partner=self.root_cp, cloud_host=self.host,
                                    name=f'Default child {uuid4()}')
            for _ in range(self.gen_count)
        ]
        self.default_subs += [
            channel_partner_factory(parent_channel_partner=self.root_cp, cloud_host=cloud_host_factory(f'{uuid4()}'))
            for _ in range(self.gen_count)
        ]
        self.other_subs = [channel_partner_factory(parent_channel_partner=self.other_cp, name=f'Other child {uuid4()}')
                      for _ in range(self.gen_count)]
        for sub in self.default_subs:
            self.grand_child = channel_partner_factory(parent_channel_partner=sub, cloud_host=self.host,
                                                       name=f'Default grandchild {uuid4()}')
            channel_partner_factory(parent_channel_partner=sub, cloud_host=cloud_test_host,
                                    name=f'Default grandchild {uuid4()}')
        for sub in self.other_subs:
            channel_partner_factory(parent_channel_partner=sub, cloud_host=self.host,
                                    name=f'Default grandchild {uuid4()}')
            channel_partner_factory(parent_channel_partner=sub, cloud_host=cloud_test_host,
                                    name=f'Default grandchild {uuid4()}')
        self.client = APIClient()

    def test_get_queryset_own_cp(self):
        # Test root channel partner's subs
        view = ChannelPartnerNestedViewSet(
            kwargs={'parent_lookup_parent_channel_partner': str(self.root_cp.id)})
        view.request = MagicMock()
        view.request.cloud_host = self.host
        view.request.user = self.root_cp_user.user
        qs = view.get_queryset()
        assert qs.count() == len(self.default_subs)

    def test_get_queryset_child_cp(self):
        # test second level partner's subs (has two children with different hosts)
        view = ChannelPartnerNestedViewSet(
            kwargs={'parent_lookup_parent_channel_partner': str(self.default_subs[0].id)})
        view.request = MagicMock()
        view.request.cloud_host = self.host
        view.request.user = self.root_cp_user.user
        qs = view.get_queryset()
        assert qs.count() == 2

    def test_permission_own_cp(self, mock_auth_with_user):
        mock_auth_with_user(self.root_cp_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        path = reverse('v2:channelpartners-subchannelpartner-list',
                       kwargs={'parent_lookup_parent_channel_partner': str(self.root_cp.id)})
        response = self.client.get(path, SERVER_NAME=self.host.hostname)
        assert response.status_code == 200

    def test_permission_lowest_lvl_cp(self, mock_auth_with_user):
        mock_auth_with_user(self.root_cp_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        path = reverse('v2:channelpartners-subchannelpartner-list',
                       kwargs={'parent_lookup_parent_channel_partner': str(self.grand_child.id)})
        response = self.client.get(path, SERVER_NAME=self.host.hostname)
        assert response.status_code == 200

    def test_permission_other_cp(self, mock_auth_with_user):
        mock_auth_with_user(self.root_cp_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        path = reverse('v2:channelpartners-subchannelpartner-list',
                       kwargs={'parent_lookup_parent_channel_partner': str(self.other_cp.id)})
        response = self.client.get(path, SERVER_NAME=self.host.hostname)
        assert response.status_code == 403

class TestChannelStructureViewSet:
    @pytest.fixture(autouse=True)
    def setUp(
            self,
            cloud_test_host,
            multi_cp_user_factory,
            channel_partner_factory,
            organization_factory,
            cp_user_factory,
            mock_auth_with_user
    ):
        self.client = APIClient()
        self.host = cloud_test_host
        self.mock_auth = mock_auth_with_user

    def __make_request_get_response(self, user: CloudUser, cloud_host_name: str = None):
        self.mock_auth(user)

        bearer = f"Bearer {uuid4()}"
        view_name = "v2:subchannels-channel-structure"

        self.client.credentials(HTTP_AUTHORIZATION=bearer)

        path = reverse(view_name)

        return self.client.get(path, SERVER_NAME=cloud_host_name or self.host.hostname)

    def test_unauthorized(self):

        view_name = "v2:subchannels-channel-structure"


        path = reverse(view_name)

        response = self.client.get(path, SERVER_NAME=self.host.hostname)
        assert response.status_code == 401


    def test_deep_nested_structure_with_multi_cp_user(
            self,
            multi_cp_user_factory,
            channel_partner_factory,
            organization_factory):
        """
            root_cp
            ├── root_cp_org [multi_cp_user]
            |
            └── cp_level_1
                │
                ├── org_level_1_1
                ├── org_level_1_2
                │
                └── cp_level_2 [multi_cp_user]
                │   ├── org_level_2_1
                │   └── org_level_2_2
                │       ...
                │           └── cp_level_18
                │               ├── org_level_18_1
                │               ├── org_level_18_2
                │               └── cp_level_19 [multi_cp_user]
                │                   ├── org_level_19_1
                │                   └── org_level_19_2
                │                       └── cp_level_20
                │                           ├── org_level_20_1
                │                           └── org_level_20_2
            """
        # Create a root channel partner
        root_cp = channel_partner_factory(name='root_cp', cloud_host=self.host)

        # List to hold specific channel partners for multi_cp_user
        cp_for_multi_user = []

        # Create a nested structure 20 layers deep
        current_parent = root_cp
        for i in range(1, 21):
            cp = channel_partner_factory(
                parent_channel_partner=current_parent,
                name=f"cp_level_{i}",
                cloud_host=self.host)
            organization_factory(channel_partner=cp, name=f"org_level_{i}_1")
            if i == 2 or i == 19:  # Identify channel partners for multi_cp_user
                cp_for_multi_user.append(cp)
            current_parent = cp

        # Create multi_cp_user associated with the 2nd and 19th level channel partners
        user, multi_cp_user_links = multi_cp_user_factory(channel_partners=cp_for_multi_user)

        # Add user to an organization that's not related
        user_org = OrganizationToUser.objects.create(
            user=user,
            organization=organization_factory(channel_partner=root_cp, name="root_cp_org"))
        user_org.save()

        # Use the final_cp and multi_cp_user for making a request and asserting the structure
        response = self.__make_request_get_response(user=multi_cp_user_links[0])

        assert response.status_code == 200

        actual = response.data
        actual_channel_partners = actual.get("channelPartners")
        actual_organizations = actual.get("organizations")

        assert len(actual_channel_partners) == 2

        assert actual_channel_partners[0]["name"] == "cp_level_19"
        assert actual_channel_partners[0]["subChannels"][0]["name"] == "cp_level_20"

        assert actual_channel_partners[1]["name"] == "cp_level_2"
        assert actual_channel_partners[1]["subChannels"][0]["name"] == "cp_level_3"

        assert len(actual_organizations) == 1
        assert actual_organizations[0]["name"] == "root_cp_org"

    def test_different_hosts(self, channel_partner_factory, organization_factory,
                             org_user_factory, cp_user_factory, cloud_test_host,
                             cloud_host_factory, root_nx_channel_partner,
                             default_channel_partner):
        host_1 = cloud_host_factory('host-1.cloud.hdw.mx')
        host_2 = cloud_host_factory('host-2.cloud.hdw.mx')
        cp_host_default = channel_partner_factory(parent_channel_partner=root_nx_channel_partner,
                                                  name='cp_default', cloud_host=cloud_test_host)
        cp_host_1 = channel_partner_factory(parent_channel_partner=root_nx_channel_partner,
                                            name='cp_1', cloud_host=host_1)
        cp_host_2 = channel_partner_factory(parent_channel_partner=root_nx_channel_partner,
                                            name='cp_2', cloud_host=host_2)
        cp_host_1_child = channel_partner_factory(
            parent_channel_partner=cp_host_1,
            name='cp_1_child', cloud_host=host_1
        )
        user = cp_user_factory(channel_partner=cp_host_default)
        cp_user_factory(email=user.user.email, channel_partner=cp_host_1)
        cp_user_factory(email=user.user.email, channel_partner=cp_host_2)

        response = self.__make_request_get_response(user=user.user, cloud_host_name=host_1.hostname)
        assert response.status_code == 200
        assert len(response.data['channelPartners']) == 1
        assert response.data['channelPartners'][0]['name'] == 'cp_1'
        response = self.__make_request_get_response(user=user.user, cloud_host_name=host_2.hostname)
        assert response.status_code == 200
        assert len(response.data['channelPartners']) == 1
        assert response.data['channelPartners'][0]['name'] == 'cp_2'
        response = self.__make_request_get_response(user=user.user, cloud_host_name=cloud_test_host.hostname)
        assert response.status_code == 200
        assert len(response.data['channelPartners']) == 1
        assert response.data['channelPartners'][0]['name'] == 'cp_default'

class TestChannelPartnerStructureNestedViewSet:
    @pytest.fixture(autouse=True)
    def setUp(
            self,
            cloud_test_host,
            multi_cp_user_factory,
            channel_partner_factory,
            organization_factory,
            cp_user_factory,
            mock_auth_with_user
    ):
        self.client = APIClient()
        self.host = cloud_test_host
        self.mock_auth = mock_auth_with_user
        """
        root_nx_channel_partner (Hidden Root)
        │
        └── cp_parent [cp_parent_user] [multi_cp_user]
            │
            ├── cp_parent_org_1
            ├── cp_parent_org_2
            │
            ├── cp (Child of cp_parent) [cp_user]
            │   ├── cp_org_1
            │   └── cp_org_2
            │
            └── cp_other (Child of cp_parent) [cp_other_user]
                ├── cp_other_org_1
                ├── cp_other_org_2
                │
                └── cp_other_child (Child of cp_other) [cp_other_child_user] [multi_cp_user]
                    ├── cp_other_child_org_1
                    └── cp_other_child_org_2
        """
        # Parent CP Stuff
        self.cp_parent = channel_partner_factory(
            name='cp_parent',
            cloud_host=self.host)
        self.cp_parent_user = cp_user_factory(
            channel_partner=self.cp_parent)

        self.cp_parent_org_1 = organization_factory(
            channel_partner=self.cp_parent,
            name='cp_parent_org_1')

        self.cp_parent_org_2 = organization_factory(
            channel_partner=self.cp_parent,
            name='cp_parent_org_2')

        # CP Stuff
        self.cp = channel_partner_factory(
            parent_channel_partner=self.cp_parent,
            name="cp",
            cloud_host=self.host)
        self.cp_user = cp_user_factory(
            channel_partner=self.cp)

        self.cp_org_1 = organization_factory(
            channel_partner=self.cp,
            name="cp_org_1")

        self.cp_org_2 = organization_factory(
            channel_partner=self.cp,
            name="cp_org_2")

        # Other CP (Same level) Stuff
        self.cp_other = channel_partner_factory(
            parent_channel_partner=self.cp_parent,
            name="cp_other",
            cloud_host=self.host)
        self.cp_other_user = cp_user_factory(
            channel_partner=self.cp_other)

        self.cp_other_org_1 = organization_factory(
            channel_partner=self.cp_other,
            name="cp_other_org_1")

        self.cp_other_org_2 = organization_factory(
            channel_partner=self.cp_other,
            name="cp_other_org_2")

        # Child of "Other CP" Stuff
        self.cp_other_child = channel_partner_factory(
            parent_channel_partner=self.cp_other,
            name="cp_other_child",
            cloud_host=self.host)
        self.cp_other_child_user = cp_user_factory(
            channel_partner=self.cp_other_child)

        self.cp_other_child_org_1 = organization_factory(
            channel_partner=self.cp_other_child,
            name="cp_other_child_org_1")

        self.cp_other_child_org_2 = organization_factory(
            channel_partner=self.cp_other_child,
            name="cp_other_child_org_2")

        # Multi Channel Partner User
        self.multi_cp_user, self.multi_cp_user_links = multi_cp_user_factory(
            channel_partners=[self.cp_parent, self.cp_other_child])
        # looks like there could be cache issue in some cases
        caches['default'].clear()

    def __make_request_get_response(self, user: CloudUser, channel_partner: ChannelPartner):
        self.mock_auth(user)

        bearer = f"Bearer {uuid4()}"
        view_name = "v2:channelpartner-channel-structure"

        self.client.credentials(HTTP_AUTHORIZATION=bearer)

        path = reverse(
            view_name,
            kwargs={'pk': str(channel_partner.id)})

        return self.client.get(path, SERVER_NAME=self.host.hostname)

    def test_get_queryset_cp_other_child_user_unsuccessful(self):
        response = self.__make_request_get_response(
            user=self.cp_other_child_user,
            channel_partner=self.cp_other)

        assert response.status_code == 403

    def test_deep_nested_structure_with_multi_cp_user(
            self,
            multi_cp_user_factory,
            channel_partner_factory,
            organization_factory):
        """
        root_cp
        │
        └── cp_level_1
            │
            ├── org_level_1_1
            ├── org_level_1_2
            │
            └── cp_level_2 [multi_cp_user]
            │   ├── org_level_2_1
            │   └── org_level_2_2
            │       ...
            │           └── cp_level_18
            │               ├── org_level_18_1
            │               ├── org_level_18_2
            │               └── cp_level_19 [multi_cp_user]
            │                   ├── org_level_19_1
            │                   └── org_level_19_2
            │                       └── cp_level_20
            │                           ├── org_level_20_1
            │                           └── org_level_20_2
        """
        # Create a root channel partner
        root_cp = channel_partner_factory(name='root_cp', cloud_host=self.host)

        # List to hold specific channel partners for multi_cp_user
        cp_for_multi_user = []

        # Create a nested structure 20 layers deep
        current_parent = root_cp
        for i in range(1, 21):
            cp = channel_partner_factory(parent_channel_partner=current_parent, name=f"cp_level_{i}", cloud_host=self.host)
            organization_factory(channel_partner=cp, name=f"org_level_{i}_1")
            if i == 2 or i == 19:  # Identify channel partners for multi_cp_user
                cp_for_multi_user.append(cp)
            current_parent = cp

        # Create multi_cp_user associated with the 2nd and 19th level channel partners
        multi_cp_user, multi_cp_user_links = multi_cp_user_factory(channel_partners=cp_for_multi_user)

        # Use the final_cp and multi_cp_user for making a request and asserting the structure
        response = self.__make_request_get_response(user=multi_cp_user_links[0], channel_partner=cp_for_multi_user[1])

        assert response.status_code == 200

        data = response.data
        assert len(data) == 1
        assert data[0]['name'] == 'cp_level_19'

    def test_deep_nested_structure_with_multi_cp_user_top_level(
        self,
        multi_cp_user_factory,
        channel_partner_factory,
        organization_factory):
        """
        root_cp
        │
        └── cp_level_1
            │
            ├── org_level_1_1
            ├── org_level_1_2
            │
            └── cp_level_2 [multi_cp_user]
            │   ├── org_level_2_1
            │   └── org_level_2_2
            │       ...
            │           └── cp_level_18
            │               ├── org_level_18_1
            │               ├── org_level_18_2
            │               └── cp_level_19 [multi_cp_user]
            │                   ├── org_level_19_1
            │                   └── org_level_19_2
            │                       └── cp_level_20
            │                           ├── org_level_20_1
            │                           └── org_level_20_2
        """
        # Create a root channel partner
        root_cp = channel_partner_factory(name='root_cp', cloud_host=self.host)

        # List to hold specific channel partners for multi_cp_user
        cp_for_multi_user = []

        # Create a nested structure 20 layers deep
        current_parent = root_cp
        for i in range(1, 21):
            cp = channel_partner_factory(parent_channel_partner=current_parent, name=f"cp_level_{i}", cloud_host=self.host)
            organization_factory(channel_partner=cp, name=f"org_level_{i}_1")
            if i == 2 or i == 19:  # Identify channel partners for multi_cp_user
                cp_for_multi_user.append(cp)
            current_parent = cp

        # Create multi_cp_user associated with the 2nd and 19th level channel partners
        multi_cp_user, multi_cp_user_links = multi_cp_user_factory(channel_partners=cp_for_multi_user)

        # Use the final_cp and multi_cp_user for making a request and asserting the structure
        response = self.__make_request_get_response(user=multi_cp_user_links[0], channel_partner=cp_for_multi_user[0])

        assert response.status_code == 200

        data = response.data
        assert len(data) == 1
        assert data[0]['name'] == 'cp_level_2'
        assert data[0]['subChannels'][0]['name'] == 'cp_level_3'
        assert len(data[0]['subChannels']) == 1
        assert len(data[0]['subChannels'][0]['subChannels']) == 0

    def test_multi_channel_partners_group_structure_multi_cp_user_cp_parent(self):
        response = self.__make_request_get_response(
            user=self.multi_cp_user_links[0],
            channel_partner=self.cp_parent)

        assert response.status_code == 200

        actual = response.data

        assert len(actual) == 1
        assert len(actual[0]["organizations"]) == 2
        assert len(actual[0]["subChannels"]) == 2

        assert len(actual[0]["subChannels"][0]["subChannels"]) == 0
        assert len(actual[0]["subChannels"][1]["subChannels"]) == 1

        cp_other_actual = actual[0]
        assert cp_other_actual is not None

    def test_multi_channel_partners_group_structure_multi_cp_user_cp_other_child(self):
        response = self.__make_request_get_response(
            user=self.multi_cp_user_links[0],
            channel_partner=self.cp_other_child)

        assert response.status_code == 200

        actual = response.data

        assert len(actual) == 1
        assert len(actual[0]["organizations"]) == 2
        assert len(actual[0]["subChannels"]) == 0

    def test_get_queryset_cp_other_child_user_success(self):
        response = self.__make_request_get_response(
            user=self.cp_other_child_user,
            channel_partner=self.cp_other_child)

        assert response.status_code == 200

        actual = response.data
        assert len(actual) == 1
        assert actual[0]["name"] == "cp_other_child"

        assert len(actual[0]["organizations"]) == 2
        actual_org_names = [org['name'] for org in actual[0]["organizations"]]
        assert "cp_other_child_org_1" in actual_org_names
        assert "cp_other_child_org_2" in actual_org_names

    def test_channel_partner_group_structure_other_cp_success(self):
        response = self.__make_request_get_response(
            user=self.cp_other_user,
            channel_partner=self.cp_other)

        assert response.status_code == 200

        actual = response.data

        assert len(actual) == 1

        cp_other_actual = actual[0]
        assert cp_other_actual is not None

        assert len(cp_other_actual["organizations"]) == 2
        assert cp_other_actual["organizations"][0]["name"] == "cp_other_org_1"
        assert cp_other_actual["organizations"][1]["name"] == "cp_other_org_2"

        assert len(cp_other_actual["subChannels"]) == 1
        cp_other_child = cp_other_actual["subChannels"][0]
        assert cp_other_child["name"] == "cp_other_child"

        assert len(cp_other_child["organizations"]) == 0

    def test_channel_partner_group_structure_cp_success(self):
        response = self.__make_request_get_response(
            user=self.cp_user,
            channel_partner=self.cp)

        assert response.status_code == 200

        actual = response.data

        assert len(actual) == 1

        cp_actual = next((item for item in actual if item["name"] == "cp"), None)
        assert cp_actual is not None

        assert len(cp_actual["organizations"]) == 2
        assert cp_actual["organizations"][0]["name"] == "cp_org_1"
        assert cp_actual["organizations"][1]["name"] == "cp_org_2"

        assert "subChannels" in cp_actual
        assert len(cp_actual["subChannels"]) == 0

    def test_channel_partner_group_structure_cp_parent_success(self):
        response = self.__make_request_get_response(
            user=self.cp_parent_user,
            channel_partner=self.cp_parent)

        assert response.status_code == 200

        actual = response.data

        assert len(actual) == 1
        assert len(actual[0].get("subChannels")) == 2
        assert len(actual[0].get("subChannels")[0].get("subChannels")) == 0
        assert len(actual[0].get("subChannels")[1].get("subChannels")) == 0


class TestChannelPartnerViewSet:

    def test_get_queryset(self, default_channel_partner, channel_partner_factory,
                          cloud_test_host, cloud_host_factory, mock_auth_with_user,
                          default_cp_admin, arf, cp_user_factory, organization_factory,
                          org_user_factory, root_nx_channel_partner):
        gen_count = 3
        host = cloud_test_host
        other_host = cloud_host_factory(hostname=f'{uuid4()}')
        root_cp = default_channel_partner
        root_cp_user = cp_user_factory(channel_partner=root_cp)
        other_cp = channel_partner_factory(name='other cp', parent_channel_partner=root_nx_channel_partner,
                                           cloud_host=other_host)
        default_host_subs = [
            channel_partner_factory(parent_channel_partner=root_cp, cloud_host=host,
                                    name=f'default sub {i}')
            for i in range(gen_count)
        ]
        other_host_subs = [
            channel_partner_factory(parent_channel_partner=root_cp, cloud_host=cloud_host_factory(f'{uuid4()}'),
                                    name=f'other host sub {i}')
            for i in range(gen_count)
        ]
        other_subs = [
            channel_partner_factory(parent_channel_partner=other_cp)
            for _ in range(gen_count)
        ]

        # Test root channel partner's users request for a different host sub channel partner
        mock_auth_with_user(root_cp_user)
        sub_cp = other_host_subs[-1]
        view = ChannelPartnerViewSet.as_view(actions={'get': 'retrieve'}, detail=True)
        request = arf.get('/')
        request.user = root_cp_user.user
        request.cloud_host = host
        response = view(request, pk=str(sub_cp.id))
        assert response.status_code == 200
        assert response.data['id'] == str(sub_cp.id)
        assert response.data['parentChannelPartner'] == root_cp.id

        # Test root channel partner's users request for a list
        view = ChannelPartnerViewSet.as_view(actions={'get': 'list'})
        request = arf.get('/')
        request.user = root_cp_user.user
        request.cloud_host = host
        response = view(request)
        assert response.status_code == 200
        # must contain only root_cp
        assert set([cp['id'] for cp in response.data['results']]) == {str(root_cp.id)}

        # Test organization user retrieve parent channel partner
        org = organization_factory(channel_partner=sub_cp)
        org_user = org_user_factory(organization=org)
        mock_auth_with_user(org_user)
        view = ChannelPartnerViewSet.as_view(actions={'get': 'retrieve'}, detail=True)
        request.user = org_user.user
        request.cloud_host = host
        response = view(request, pk=str(sub_cp.id))
        assert response.status_code == 200
        assert response.data['id'] == str(sub_cp.id)
        # Organizations users have no access to their parent's parent cp id
        assert response.data['parentChannelPartner'] == VALUE_REPLACEMENT

    def test_aggregate(self, default_channel_partner, channel_partner_factory, organization_factory,
                       system_factory, arf, mock_auth_with_user, cp_user_factory, service_record_factory,
                       cp_service_factory):
        gen_count = 3
        target_cp = channel_partner_factory(parent_channel_partner=default_channel_partner)
        other_cp = channel_partner_factory(parent_channel_partner=default_channel_partner)
        level_1 = [channel_partner_factory(parent_channel_partner=target_cp) for _ in range(gen_count)]
        level_2 = [channel_partner_factory(parent_channel_partner=level_1[int(i/gen_count)])
                   for i in range(gen_count ** 2)]
        level_3 = [channel_partner_factory(parent_channel_partner=level_2[int(i / gen_count)])
                   for i in range(int (gen_count ** 3))]
        target_partners = [target_cp] + level_1 + level_2 + level_3
        organizations = [organization_factory(channel_partner=target_partners[int(i/gen_count)])
                         for i in range(len(target_partners) * gen_count)]
        systems = [system_factory(organization=organizations[int(i/gen_count)])
                   for i in range(len(organizations) * gen_count)]
        services = [
            service_record_factory(
                service=cp_service_factory(channel_partner=systems[i].organization.channel_partner),
                cloud_system=systems[i], quantity=gen_count)
            for i in range(len(organizations))
        ]

        view = ChannelPartnerViewSet.as_view(actions={'get': 'aggregate'}, detail=True)
        cp_user = cp_user_factory(channel_partner=target_cp)
        mock_auth_with_user(cp_user)
        response = view(arf.get(f'/partners/channel_partners/{target_cp.id}/aggregate/'), pk=target_cp.id)
        assert response.status_code == 200
        assert response.data['channelPartners'] == len(target_partners) - 1
        assert response.data['organizations'] == len(organizations)
        assert response.data['systems'] == len(systems)
        assert response.data['serviceUsageQuantity'] == len(organizations) * gen_count

    def test_service_changes_history(self, channel_partner_factory, organization_factory, cp_user_factory,
                                     cp_service_factory, system_factory, service_record_factory,
                                     mock_auth_with_user, arf):
        start_ts = (timezone.now() - relativedelta(days=7)).date()
        cp = channel_partner_factory()
        cp_user = cp_user_factory(channel_partner=cp)
        org = organization_factory(channel_partner=cp)
        system = system_factory(organization=org)
        services = [cp_service_factory(channel_partner=cp) for _ in range(5)]
        records = [service_record_factory(service, system, created_ts=timezone.now() - relativedelta(days=idx))
                   for idx, service in enumerate(services)]
        view = ChannelPartnerViewSet.as_view(actions={'get': 'service_changes_history'}, detail=True)
        request = arf.get(f'/partners/channel_partners/{cp.id}/service_changes_history/?startTs={start_ts.isoformat()}&ordering=-created')
        mock_auth_with_user(cp_user)
        response = view(request, pk=cp.id)
        assert response.status_code == 200
        assert isinstance(response.data, dict)
        assert 'count' in response.data
        assert 'next' in response.data
        assert 'previous' in response.data
        assert len(response.data['results']) == len(services)
        assert 'channelPartnerId' in response.data['results'][0]
        assert response.data['results'][0]['date'] > response.data['results'][-1]['date']
        request = arf.get(
            f'/partners/channel_partners/{cp.id}/service_changes_history/?startTs={start_ts.isoformat()}&ordering=created')
        response = view(request, pk=cp.id)
        assert response.data['results'][0]['date'] < response.data['results'][-1]['date']

    def test_service_changes_summary(self, channel_partner_factory, organization_factory, cp_user_factory,
                                     cp_service_factory, system_factory, service_record_factory,
                                     mock_auth_with_user, arf):
        cp = channel_partner_factory()
        cp_user = cp_user_factory(channel_partner=cp)
        org = organization_factory(channel_partner=cp)
        system = system_factory(organization=org)
        services = [cp_service_factory(channel_partner=cp) for _ in range(5)]
        records = [service_record_factory(service, system) for service in services]
        view = ChannelPartnerViewSet.as_view(actions={'get': 'service_changes_summary'}, detail=True)
        request = arf.get(f'/partners/channel_partners/{cp.id}/service_changes_summary/')
        mock_auth_with_user(cp_user)
        response = view(request, pk=cp.id)
        assert response.status_code == 200
        assert isinstance(response.data, dict)
        assert 'count' in response.data
        assert 'next' in response.data
        assert 'previous' in response.data
        assert len(response.data['results']) == len(services)

    def test_ownPermissions(self, channel_partner_factory, cp_user_factory, arf, mock_auth_with_user):
        cp = channel_partner_factory()
        roles = ChannelPartnerRole.objects.all()
        partners = []
        users = []
        for role in roles:
            partner = channel_partner_factory(parent_channel_partner=cp)
            partners.append(partner)
            user = cp_user_factory(channel_partner=partner, role=role.name)
            users.append(user)

        view = ChannelPartnerViewSet.as_view(actions={'get': 'list'})

        for role, partner, user in zip(roles, partners, users):
            request = arf.get('/partners/channel_partners/')
            request.user = user.user
            mock_auth_with_user(user)

            response = view(request)
            for data in response.data['results']:
                if str(partner.id) == data['id']:
                    assert set(data['ownPermissions']) == set([p.codename for p in role.permissions.all()])
                    assert data['ownRolesIds'] == user.roles
                    assert data['ownRoles'] == user.roles_name
                else:
                    assert data['ownPermissions'] == []
                    assert data['ownRolesIds'] == []
                    assert data['ownRoles'] == []

    def test_partial_update(self, channel_partner_factory, cp_user_factory, arf, mock_auth_with_user):
        root = channel_partner_factory()
        cp = channel_partner_factory(parent_channel_partner=root)
        cp_user = cp_user_factory(channel_partner=cp)
        view = ChannelPartnerViewSet.as_view(actions={'patch': 'partial_update'}, detail=True)
        data = {'name': f'{uuid4()}'}
        request = arf.patch('/', data=data, format='json')
        mock_auth_with_user(cp_user)
        response = view(request, pk=cp.id)
        assert response.status_code == 200
        cp.refresh_from_db()
        assert cp.name == data['name']

    def test_change_state(self, channel_partner_factory, organization_factory, cp_user_factory, arf,
                          mock_auth_with_user, httpx_mock, mock_get_customization_request):
        cp = channel_partner_factory()
        cp_user = cp_user_factory(channel_partner=cp)
        sub_cp = channel_partner_factory(parent_channel_partner=cp)
        notification_url = f'https://{cp.cloud_host.hostname}/notifications/send'
        httpx_mock.add_response(url=notification_url, status_code=200, json={})
        mock_get_customization_request('default')
        request_data = {
            "targetState": "shutdown"
        }
        request = arf.post('/', data=request_data, format='json')
        view = ChannelPartnerViewSet.as_view(actions={'post': 'change_state'}, detail=True)
        mock_auth_with_user(cp_user)
        response = view(request, pk=sub_cp.id)
        assert response.status_code == 200
        assert response.data['id'] == str(sub_cp.id)
        assert response.data['targetState'] == 'shutdown'
        changeId = response.data['changeId']
        confirmation = ActionConfirmation.objects.get(pk=changeId)
        assert confirmation.state == int(ActionConfirmation.ConfirmationState.PENDING)
        assert confirmation.action == ActionConfirmation.ConfirmationActionType.PARTNER_STATE_CHANGE
        assert confirmation.target_id == sub_cp.id
        assert confirmation.changes == {'targetState': ChannelPartnerStates.SHUTDOWN}
        assert confirmation.created_by == cp_user.user.email
        assert re.match(r'^[A-Z0-9]{6}$', confirmation.code)
        notification_request = httpx_mock.get_request(url=notification_url)
        assert notification_request

        accountant = cp_user_factory(channel_partner=cp, role=ChannelPartnerRoles.REPORTS_VIEWER)
        request = arf.post('/', data=request_data, format='json')
        mock_auth_with_user(accountant)
        response = view(request, pk=sub_cp.id)
        assert response.status_code == 403

    def test_confirm_state(self, channel_partner_factory, organization_factory, cp_user_factory, arf,
                           mock_auth_with_user, httpx_mock, mock_get_customization_request):
        cp = channel_partner_factory()
        cp_user = cp_user_factory(channel_partner=cp)
        sub_cp = channel_partner_factory(parent_channel_partner=cp)
        notification_url = f'https://{cp.cloud_host.hostname}/notifications/send'
        httpx_mock.add_response(url=notification_url, status_code=200, json={})
        mock_get_customization_request('default')
        request_data = {
            "targetState": "shutdown"
        }
        request = arf.post('/', data=request_data, format='json')
        view = ChannelPartnerViewSet.as_view(actions={'post': 'change_state'}, detail=True)
        mock_auth_with_user(cp_user)
        response = view(request, pk=sub_cp.id)
        changeId = response.data['changeId']
        request_data = {
            "code": response.data['code'],
            "changeId": response.data['changeId']
        }
        request = arf.post('/', data=request_data, format='json')
        view = ChannelPartnerViewSet.as_view(actions={'post': 'confirm_state'}, detail=True)
        mock_auth_with_user(cp_user)
        response = view(request, pk=sub_cp.id)

        assert response.status_code == 200
        assert response.data['id'] == str(sub_cp.id)
        assert response.data['state'] == 'shutdown'
        sub_cp.refresh_from_db()
        assert sub_cp.state == ChannelPartnerStates.SHUTDOWN
        confirmation = ActionConfirmation.objects.get(pk=changeId)
        assert confirmation.state == int(ActionConfirmation.ConfirmationState.CONFIRMED)
        assert confirmation.action == ActionConfirmation.ConfirmationActionType.PARTNER_STATE_CHANGE
        assert confirmation.target_id == sub_cp.id
        assert confirmation.changes == {'targetState': ChannelPartnerStates.SHUTDOWN}
        assert confirmation.created_by == cp_user.user.email
        assert re.match(r'^[A-Z0-9]{6}$', confirmation.code)


class TestOrganizationViewSet:

    def test_aggregate(self, organization_factory, system_factory, arf, default_cp_admin, mock_auth_with_user,
                       service_record_factory, cp_service_factory):
        org = organization_factory()
        view = OrganizationViewSet.as_view(actions={'get': 'aggregate'}, detail=True)
        mock_auth_with_user(default_cp_admin)
        response = view(arf.get('/'), pk=org.id)
        assert response.status_code == 200
        assert response.data['systems'] == 0
        assert response.data['serviceUsageQuantity'] == 0
        sys_cnt = random.randint(30, 60)
        systems = [system_factory(organization=org) for _ in range(sys_cnt)]

        response = view(arf.get('/'), pk=org.id)

        assert response.data['systems'] == sys_cnt
        assert response.data['serviceUsageQuantity'] == 0

        usage = 0
        for sys in systems:
            qty = random.randint(0, 10)
            service_record_factory(service=cp_service_factory(channel_partner=sys.organization.channel_partner),
                                   cloud_system=sys, quantity=qty)
            usage += qty

        response = view(arf.get('/'), pk=org.id)

        assert response.data['systems'] == sys_cnt
        assert response.data['serviceUsageQuantity'] == usage

    def test_service_changes_history(self, channel_partner_factory, organization_factory, cp_user_factory,
                                     cp_service_factory, system_factory, service_record_factory,
                                     mock_auth_with_user, arf):
        start_ts = (timezone.now() - relativedelta(days=7)).date()
        cp = channel_partner_factory()
        cp_user = cp_user_factory(channel_partner=cp)
        org = organization_factory(channel_partner=cp)
        system = system_factory(organization=org)
        services = [cp_service_factory(channel_partner=cp) for _ in range(5)]
        records = [service_record_factory(service, system, created_ts=timezone.now() - relativedelta(days=idx)) for
                   idx, service in enumerate(services)]
        view = OrganizationViewSet.as_view(actions={'get': 'service_changes_history'}, detail=True)
        request = arf.get(f'/partners/organizations/{org.id}/service_changes_history/?startTs={start_ts.isoformat()}&ordering=-created')
        mock_auth_with_user(cp_user)
        response = view(request, pk=org.id)
        assert response.status_code == 200
        assert isinstance(response.data, dict)
        assert 'count' in response.data
        assert 'next' in response.data
        assert 'previous' in response.data
        assert len(response.data['results']) == len(services)

        assert response.data['results'][0]['date'] > response.data['results'][-1]['date']
        request = arf.get(
            f'/partners/organizations/{org.id}/service_changes_history/?startTs={start_ts.isoformat()}&ordering=created')
        response = view(request, pk=org.id)
        assert response.data['results'][0]['date'] < response.data['results'][-1]['date']

    def test_service_changes_summary_without_params(self, channel_partner_factory, organization_factory, cp_user_factory,
                                     cp_service_factory, system_factory, service_record_factory,
                                     mock_auth_with_user, arf):
        yesterday = (timezone.now() - relativedelta(days=1)).date()
        cp = channel_partner_factory()
        cp_user = cp_user_factory(channel_partner=cp)
        org = organization_factory(channel_partner=cp)
        system = system_factory(organization=org)
        services = [cp_service_factory(channel_partner=cp) for _ in range(5)]
        records = [service_record_factory(service, system, created_ts=yesterday) for service in services]
        view = OrganizationViewSet.as_view(actions={'get': 'service_changes_summary'}, detail=True)
        request = arf.get(f'/partners/channel_partners/{org.id}/service_changes_summary/')
        mock_auth_with_user(cp_user)
        response = view(request, pk=org.id)
        assert response.status_code == 200
        assert isinstance(response.data, dict)
        assert 'count' in response.data
        assert 'next' in response.data
        assert 'previous' in response.data
        assert len(response.data['results']) == len(services)

    def test_service_changes_summary(self, channel_partner_factory, organization_factory, cp_user_factory,
                                     cp_service_factory, system_factory, service_record_factory,
                                     mock_auth_with_user, arf):
        start_ts = (timezone.now() - relativedelta(days=7)).date()
        cp = channel_partner_factory()
        cp_user = cp_user_factory(channel_partner=cp)
        org = organization_factory(channel_partner=cp)
        system = system_factory(organization=org)
        services = [cp_service_factory(channel_partner=cp) for _ in range(5)]
        records = [service_record_factory(service, system) for service in services]
        view = OrganizationViewSet.as_view(actions={'get': 'service_changes_summary'}, detail=True)
        request = arf.get(f'/partners/channel_partners/{org.id}/service_changes_summary/?startTs={start_ts.isoformat()}')
        mock_auth_with_user(cp_user)
        response = view(request, pk=org.id)
        assert response.status_code == 200
        assert isinstance(response.data, dict)
        assert 'count' in response.data
        assert 'next' in response.data
        assert 'previous' in response.data
        assert len(response.data['results']) == len(services)

    def test_ownPermissions(self, channel_partner_factory, organization_factory, org_user_factory, arf, mock_auth_with_user):
        cp = channel_partner_factory()
        roles = OrganizationRole.objects.all()
        orgs = []
        users = []
        for role in roles:
            org = organization_factory(channel_partner=cp)
            orgs.append(org)
            user = org_user_factory(organization=org, role=role.name)
            users.append(user)

        view = OrganizationViewSet.as_view(actions={'get': 'list'})

        for role, org, user in zip(roles, orgs, users):
            request = arf.get('/partners/channel_partners/')
            request.user = user.user
            mock_auth_with_user(user)
            response = view(request)
            for data in response.data['results']:
                if str(org.id) == data['id']:
                    assert set(data['ownPermissions']) == set([p.codename for p in role.permissions.all()])
                    assert data['ownRolesIds']
                    assert data['ownRolesIds'] == user.roles
                    assert data['ownRoles'] == user.roles_name
                else:
                    assert data['ownPermissions'] == []
                    assert data['ownRolesIds'] == []
                    assert data['ownRoles'] == []

    def test_groups_structure(self, channel_partner_factory, cp_user_factory, organization_factory,
                              org_user_factory, system_group_factory, sys_group_user_factory,
                              system_factory, arf, mock_auth_with_user):
        root = channel_partner_factory()
        cp = channel_partner_factory(parent_channel_partner=root)
        cp_user = cp_user_factory(channel_partner=cp)
        org = organization_factory(channel_partner=cp)
        view = OrganizationViewSet.as_view(actions={'get': 'groups_structure'}, detail=True)

        def create_groups(organization, degree=3):
            groups = [[system_group_factory(organization=organization) for _ in range(degree)]]
            for level in range(degree):
                siblings = []
                for group in groups[level]:
                    for _ in range(degree):
                        siblings.append(system_group_factory(organization=organization, parent=group))
                groups.append(siblings)
            return groups

        org_groups = create_groups(organization=org)

        single_group_user = sys_group_user_factory(organization=org, group=org_groups[-1][-1])
        request = arf.get('/')
        mock_auth_with_user(single_group_user)
        response = view(request, pk=org.id)

        assert len(response.data) == 1
        assert response.data[0]['id'] == str(org_groups[-1][-1].id)

        one_sublevel_user = sys_group_user_factory(organization=org, group=org_groups[-2][-1])
        request = arf.get('/')
        mock_auth_with_user(one_sublevel_user)
        response = view(request, pk=org.id)
        assert len(response.data) == 1
        assert response.data[0]['id'] == str(org_groups[-2][-1].id)
        assert len(response.data[0]['children']) == 3

    def test_partial_update_org_admin(self, channel_partner_factory, cp_user_factory, organization_factory,
                                      org_user_factory, arf, mock_auth_with_user):
        root = channel_partner_factory()
        cp = channel_partner_factory(parent_channel_partner=root)
        org = organization_factory(channel_partner=cp)
        org_user = org_user_factory(organization=org)
        view = OrganizationViewSet.as_view(actions={'patch': 'partial_update'}, detail=True)
        data = {'name': f'{uuid4()}'}
        request = arf.patch('/', data=data, format='json')
        mock_auth_with_user(org_user)
        response = view(request, pk=org.id)
        assert response.status_code == 200
        org.refresh_from_db()
        assert org.name == data['name']
        data = {'name': f'{uuid4()}', 'state': 'suspended'}
        request = arf.patch('/', data=data, format='json')
        mock_auth_with_user(org_user)
        with transaction.atomic():
            response = view(request, pk=org.id)
        assert response.status_code == 400
        assert response.data['state']
        assert 'name' not in response.data

    def test_partial_update_cp_admin(self, channel_partner_factory, cp_user_factory, organization_factory,
                                      org_user_factory, arf, mock_auth_with_user):
        root = channel_partner_factory()
        cp = channel_partner_factory(parent_channel_partner=root)
        cp_user = cp_user_factory(channel_partner=cp)
        org = organization_factory(channel_partner=cp)
        view = OrganizationViewSet.as_view(actions={'patch': 'partial_update'}, detail=True)
        data = {'name': f'{uuid4()}'}
        request = arf.patch('/', data=data, format='json')
        mock_auth_with_user(cp_user)
        response = view(request, pk=org.id)
        assert response.status_code == 200
        org.refresh_from_db()
        assert org.name == data['name']
        data = {'name': f'{uuid4()}', 'state': 'suspended'}
        request = arf.patch('/', data=data, format='json')
        mock_auth_with_user(cp_user)
        with transaction.atomic():
            response = view(request, pk=org.id)
        assert response.status_code == 200
        #     disabling cpal
        org.channel_partner_access_level = None
        org.save()
        data = {'name': f'{uuid4()}', 'state': 'suspended'}
        request = arf.patch('/', data=data, format='json')
        mock_auth_with_user(cp_user)
        with transaction.atomic():
            response = view(request, pk=org.id)
        assert response.status_code == 400
        assert response.data['name']
        assert 'state' not in response.data

    def test_list(self, channel_partner_factory, organization_factory, cp_user_factory, org_user_factory,
                  arf, mock_auth_with_user):
        root = channel_partner_factory()
        cp = channel_partner_factory(parent_channel_partner=root)
        other_cp = channel_partner_factory(parent_channel_partner=root)
        other_org = organization_factory(channel_partner=other_cp)
        org = organization_factory(channel_partner=cp)
        org_user = org_user_factory(organization=org)
        other_cp_user = cp_user_factory(channel_partner=other_cp, email=org_user.user.email)
        cp_user = cp_user_factory(channel_partner=cp)
        root_user = cp_user_factory(channel_partner=root)
        mock_auth_with_user(org_user)
        view = OrganizationViewSet.as_view(actions={'get': 'list'})
        request = arf.get('/?includeChildOrgs=true')
        response = view(request)
        assert response.status_code == 200
        assert len(response.data['results']) == 2
        assert response.data['results'][0]['id'] in [str(org.id), str(other_org.id)]

        request = arf.get('/?')
        response = view(request)
        assert response.status_code == 200
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['id'] == str(org.id)

        mock_auth_with_user(cp_user)
        request = arf.get('/?includeChildOrgs=true')
        response = view(request)
        assert response.status_code == 200
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['id'] == str(org.id)

        request = arf.get('/?includeChildOrgs=false')
        response = view(request)
        assert response.status_code == 200
        assert len(response.data['results']) == 0

        request = arf.get('/?')
        response = view(request)
        assert response.status_code == 200
        assert len(response.data['results']) == 0

        mock_auth_with_user(root_user)
        request = arf.get('/?includeChildOrgs=true')
        response = view(request)
        assert response.status_code == 200
        assert len(response.data['results']) == 0

    def test_change_state(self, channel_partner_factory, organization_factory, cp_user_factory, arf,
                          mock_auth_with_user, httpx_mock, mock_get_customization_request):
        cp = channel_partner_factory()
        cp_user = cp_user_factory(channel_partner=cp)
        org = organization_factory(channel_partner=cp)
        notification_url = f'https://{cp.cloud_host.hostname}/notifications/send'
        httpx_mock.add_response(url=notification_url, status_code=200, json={})
        mock_get_customization_request('default')
        request_data = {
            "targetState": "shutdown"
        }
        request = arf.post('/', data=request_data, format='json')
        view = OrganizationViewSet.as_view(actions={'post': 'change_state'}, detail=True)
        mock_auth_with_user(cp_user)
        response = view(request, pk=org.id)
        assert response.status_code == 200
        assert response.data['id'] == str(org.id)
        assert response.data['targetState'] == 'shutdown'
        changeId = response.data['changeId']
        confirmation = ActionConfirmation.objects.get(pk=changeId)
        assert confirmation.state == int(ActionConfirmation.ConfirmationState.PENDING)
        assert confirmation.action == ActionConfirmation.ConfirmationActionType.ORGANIZATION_STATE_CHANGE
        assert confirmation.target_id == org.id
        assert confirmation.changes == {'targetState': ChannelPartnerStates.SHUTDOWN}
        assert confirmation.created_by == cp_user.user.email
        assert re.match(r'^[A-Z0-9]{6}$', confirmation.code)
        notification_request = httpx_mock.get_request(url=notification_url)
        assert notification_request
        accountant = cp_user_factory(channel_partner=cp, role=ChannelPartnerRoles.REPORTS_VIEWER)
        request = arf.post('/', data=request_data, format='json')
        mock_auth_with_user(accountant)
        response = view(request, pk=org.id)
        assert response.status_code == 403

    def test_confirm_state(self, channel_partner_factory, organization_factory, cp_user_factory, arf,
                           mock_auth_with_user, httpx_mock, mock_get_customization_request):
        cp = channel_partner_factory()
        cp_user = cp_user_factory(channel_partner=cp)
        org = organization_factory(channel_partner=cp)
        notification_url = f'https://{cp.cloud_host.hostname}/notifications/send'
        httpx_mock.add_response(url=notification_url, status_code=200, json={})
        mock_get_customization_request('default')
        request_data = {
            "targetState": "shutdown"
        }
        request = arf.post('/', data=request_data, format='json')
        view = OrganizationViewSet.as_view(actions={'post': 'change_state'}, detail=True)
        mock_auth_with_user(cp_user)
        response = view(request, pk=org.id)
        changeId = response.data['changeId']
        request_data = {
            "code": response.data['code'],
            "changeId": response.data['changeId']
        }
        request = arf.post('/', data=request_data, format='json')
        view = OrganizationViewSet.as_view(actions={'post': 'confirm_state'}, detail=True)
        mock_auth_with_user(cp_user)
        response = view(request, pk=org.id)

        assert response.status_code == 200
        assert response.data['id'] == str(org.id)
        assert response.data['state'] == 'shutdown'
        org.refresh_from_db()
        assert org.state == ChannelPartnerStates.SHUTDOWN
        confirmation = ActionConfirmation.objects.get(pk=changeId)
        assert confirmation.state == int(ActionConfirmation.ConfirmationState.CONFIRMED)
        assert confirmation.action == ActionConfirmation.ConfirmationActionType.ORGANIZATION_STATE_CHANGE
        assert confirmation.target_id == org.id
        assert confirmation.changes == {'targetState': ChannelPartnerStates.SHUTDOWN}
        assert confirmation.created_by == cp_user.user.email
        assert re.match(r'^[A-Z0-9]{6}$', confirmation.code)


class TestSystemUsers:
    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, cp_user_factory, organization_factory,
              org_user_factory, system_group_factory, system_factory,
              sys_group_user_factory, cloud_test_host, arf, mock_internal_token_auth):
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


    def test_cp_admin(self):
        url_args = {
            "system_id": self.group_sys.system_id
        }
        self.client.force_authenticate(self.cp_admin.user)
        url = reverse("v2:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 200
        assert len(response.data) == 4

        url_args = {
            "system_id": self.org_sys.system_id
        }
        url = reverse("v2:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 200
        assert len(response.data) == 3

    def test_org_admin(self):
        url_args = {
            "system_id": self.group_sys.system_id
        }
        self.client.force_authenticate(self.org_admin.user)
        url = reverse("v2:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 200
        assert len(response.data) == 4

        url_args = {
            "system_id": self.org_sys.system_id
        }
        url = reverse("v2:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 200
        assert len(response.data) == 3

    def test_group_user(self):
        url_args = {
            "system_id": self.group_sys.system_id
        }
        self.client.force_authenticate(self.group_user.user)
        url = reverse("v2:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 200
        assert len(response.data) == 4

        url_args = {
            "system_id": self.org_sys.system_id
        }
        url = reverse("v2:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 403

    def test_viewer(self):
        url_args = {
            "system_id": self.group_sys.system_id
        }
        self.client.force_authenticate(self.org_viewer.user)
        url = reverse("v2:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 403

        url_args = {
            "system_id": self.org_sys.system_id
        }
        url = reverse("v2:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 403

    def test_system_ok(self, mock_cdb_basic_auth):
        url_args = {
            "system_id": self.group_sys.system_id
        }

        auth = mock_cdb_basic_auth(self.group_sys)
        self.client.credentials(HTTP_AUTHORIZATION=auth)
        url = reverse("v2:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 200

        url_args = {
            "system_id": self.org_sys.system_id
        }
        auth = mock_cdb_basic_auth(self.org_sys)
        self.client.credentials(HTTP_AUTHORIZATION=auth)
        url = reverse("v2:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 200

    def test_system_failure(self, mock_cdb_basic_auth):
        url_args = {
            "system_id": self.group_sys.system_id
        }

        auth = mock_cdb_basic_auth(self.org_sys)
        self.client.credentials(HTTP_AUTHORIZATION=auth)
        url = reverse("v2:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 403

        url_args = {
            "system_id": self.org_sys.system_id
        }
        auth = mock_cdb_basic_auth(self.org_sys, status='deleted')
        self.client.credentials(HTTP_AUTHORIZATION=auth)
        url = reverse("v2:system_users", kwargs=url_args)
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
        url = reverse("v2:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 200
        assert len(response.data) == 4

        user_email = mock_cdb_token_introspect(user=None, system=self.group_sys)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        url = reverse("v2:system_users", kwargs=url_args)
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
        url = reverse("v2:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 403
        # invalid system id
        user_email = mock_cdb_token_introspect(user=None, system=self.org_sys)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        url = reverse("v2:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 403
        # missing system role in cdb response
        user_email = mock_cdb_token_introspect(user=None)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {uuid4()}')
        url = reverse("v2:system_users", kwargs=url_args)
        response = self.client.get(url)
        assert response.status_code == 403


class TestOrganizationRole:
    def test_organization_roles_has_all_fields(self, channel_partner_factory, cp_user_factory, arf):
        cp = channel_partner_factory()
        cp_admin = cp_user_factory(channel_partner=cp)

        request = arf.get('/partners/organization_roles')
        response = organization_roles(request)
        actual_records = response.data

        required_fields = ['id', 'permissions', 'systemRole', 'name', 'system_role_uuid', 'systemRoleId']
        results = []
        for record in actual_records:
            results.append(not (set(required_fields) - record.keys()))

        assert all(results)


class TestCloudSystemViewSetDelete:
    @pytest.fixture(autouse=True)
    def setUp(self, channel_partner_factory, organization_factory, cp_user_factory,
              org_user_factory, system_factory, mock_auth_with_user, arf, httpx_mock, arf_basic_auth):
        httpx_mock.reset(False)
        self.cp = channel_partner_factory()
        self.cp_user = cp_user_factory(channel_partner=self.cp)
        self.org = organization_factory(channel_partner=self.cp)
        self.org_user = org_user_factory(organization=self.org)
        self.system = system_factory(organization=self.org)
        self.url = f'https://{settings.DEFAULT_HOST_NAME}/cdb/systems/{self.system.system_id}'
        self.view = CloudSystemViewSet.as_view(actions={'delete': 'destroy'}, detail=True)
        self.request = arf.delete('/')
        self.token = 'HERE_MIGHT_BE_TOKEN'
        mock_auth_with_user(self.org_user, token=self.token)
        self.data = {'check': str(uuid4())}

    def test_error(self, httpx_mock):
        httpx_mock.add_response(url=self.url, status_code=401, json=self.data)
        response = self.view(self.request, id=self.system.system_id)
        assert response.status_code == 401
        assert response.data == self.data
        request = httpx_mock.get_request(url=self.url)
        assert request.headers.get('Authorization') == f'Bearer {self.token}'

    def test_success(self, httpx_mock):
        httpx_mock.add_response(url=self.url, status_code=200, json=self.data)
        response = self.view(self.request, id=self.system.system_id)
        assert response.status_code == 204
        request = httpx_mock.get_request(url=self.url)
        assert request.headers.get('Authorization') == f'Bearer {self.token}'
        self.system.refresh_from_db()
        assert self.system.state == ChannelPartnerStates.SHUTDOWN
        assert self.system.system_state == CloudSystemStates.DELETED
        assert self.system.organization is None
        assert self.system.system_group is None

    def test_empty_json(self, httpx_mock):
        httpx_mock.add_response(url=self.url, status_code=401)
        response = self.view(self.request, id=self.system.system_id)
        assert response.status_code == 401
        assert response.data == {'detail': 'A server error occurred.'}
        request = httpx_mock.get_request(url=self.url)
        assert request.headers.get('Authorization') == f'Bearer {self.token}'

    def test_destroy_perms(self, system_factory, org_user_factory, arf, mock_auth_with_user, httpx_mock):
        for role in OrganizationRole.objects.filter(permissions__codename=OrganizationPermissions.disconnect_systems):
            sys = system_factory(organization=self.org)
            url = f'https://{settings.DEFAULT_HOST_NAME}/cdb/systems/{sys.system_id}'
            httpx_mock.add_response(url=url, status_code=200)
            user = org_user_factory(organization=self.org, role=role.id)
            request = arf.delete('/')
            mock_auth_with_user(user)
            response = self.view(request, id=sys.system_id)
            assert response.status_code == 204, f'Failed for role {role.name} {role.id}'
            sys.refresh_from_db()
            assert sys.system_state == CloudSystemStates.DELETED

        role = OrganizationRole.objects.exclude(permissions__codename=OrganizationPermissions.disconnect_systems).first()
        sys = system_factory(organization=self.org)
        url = f'https://{settings.DEFAULT_HOST_NAME}/cdb/systems/{sys.system_id}'
        httpx_mock.add_response(url=url, status_code=200)
        user = org_user_factory(organization=self.org, role=role.id)
        request = arf.delete('/')
        mock_auth_with_user(user)
        response = self.view(request, id=sys.system_id)
        assert response.status_code == 403

    def test_destroy_system_perms_success(self, system_factory, arf, mock_cdb_token_introspect,
                                          httpx_mock, cdb_introspect_url):
        self.org_user.roles = [OrganizationRoles.VIEWER]
        self.org_user.save()
        # resetting introspection mock from mock_auth_with_user
        httpx_mock.reset(False)
        sys = system_factory(organization=self.org)
        url = f'https://{settings.DEFAULT_HOST_NAME}/cdb/systems/{sys.system_id}'
        httpx_mock.add_response(url=url, status_code=200)
        email = mock_cdb_token_introspect(user=self.org_user.user, system=sys, system_role=VmsRoles.ADMINISTRATOR)
        request = arf.delete('/')
        response = self.view(request, id=sys.system_id)
        assert response.status_code == 204
        sys.refresh_from_db()
        assert sys.system_state == CloudSystemStates.DELETED
        cdb_request = httpx_mock.get_request(url=cdb_introspect_url)
        assert cdb_request

    def test_destroy_system_perms_failed(self, system_factory, arf, mock_cdb_token_introspect,
                                         httpx_mock, cdb_introspect_url):
        self.org_user.roles = [OrganizationRoles.VIEWER]
        self.org_user.save()
        # resetting introspection mock from mock_auth_with_user
        httpx_mock.reset(False)
        sys = system_factory(organization=self.org)
        url = f'https://{settings.DEFAULT_HOST_NAME}/cdb/systems/{sys.system_id}'
        httpx_mock.add_response(url=url, status_code=200)
        email = mock_cdb_token_introspect(user=self.org_user.user, system=sys, system_role=VmsRoles.VIEWER)
        request = arf.delete('/')
        response = self.view(request, id=sys.system_id)
        assert response.status_code == 403

    def test_destroy_cpal_success(self, channel_partner_factory, organization_factory, system_factory,
                                  cp_user_factory, arf, mock_auth_with_user, httpx_mock):
        httpx_mock.add_response(url=self.url, status_code=200)
        mock_auth_with_user(self.cp_user, token=self.token)
        response = self.view(self.request, id=self.system.system_id)
        assert self.org.channel_partner_access_level_id
        assert response.status_code == 204
        request = httpx_mock.get_request(url=self.url)
        assert request.headers.get('Authorization') == f'Bearer {self.token}'

    def test_destroy_cpal_forbidden(self, channel_partner_factory, organization_factory, system_factory,
                                   cp_user_factory, arf, mock_auth_with_user, httpx_mock):
        httpx_mock.add_response(url=self.url, status_code=200)
        self.org.channel_partner_access_level = None
        self.org.save()
        mock_auth_with_user(self.cp_user, token=self.token)
        response = self.view(self.request, id=self.system.system_id)
        assert response.status_code == 403

    def test_destroy_cdb_errors_502(self, httpx_mock):
        httpx_mock.add_response(url=self.url, status_code=502, content=b'some text content')
        with transaction.atomic():
            response = self.view(self.request, id=self.system.system_id)
        assert response.status_code == 204

    def test_destroy_cdb_errors_504(self, httpx_mock):
        httpx_mock.add_response(url=self.url, status_code=504)
        with transaction.atomic():
            response = self.view(self.request, id=self.system.system_id)
        assert response.status_code == 204

    def test_destroy_cdb_errors_401(self, httpx_mock):
        httpx_mock.add_response(url=self.url, status_code=401, content=b'not authorized')
        with transaction.atomic():
            response = self.view(self.request, id=self.system.system_id)
        assert response.status_code == 401
        assert response.data['detail'] == 'not authorized'

    def test_destroy_cdb_errors_exception(self, httpx_mock):
        httpx_mock.add_exception(exception=httpx.ReadTimeout('timeout'), url=self.url)
        with transaction.atomic():
            response = self.view(self.request, id=self.system.system_id)
        assert response.status_code == 204

    def test_raised_error(self, httpx_mock):
        httpx_mock.add_exception(exception=httpx.TooManyRedirects('too many redirects'), url=self.url)
        try:
            response = self.view(self.request, id=self.system.system_id)
        except httpx.TooManyRedirects as e:
            pass
        else:
            assert False, 'Too many redirects must be raised'

class TestSystemTransferOffer:

    @pytest.fixture(autouse=True)
    def setUp(self, channel_partner_factory, organization_factory, org_user_factory, arf, context_vars):
        self.cp = channel_partner_factory()
        self.org = organization_factory(channel_partner=self.cp)
        self.other_org = organization_factory(channel_partner=self.cp)
        self.org_admin = org_user_factory(organization=self.org)
        self.org_viewer = org_user_factory(organization=self.org, role=OrganizationRoles.VIEWER)
        self.comment = f'{uuid4()}'
        self.sys_id = f'{uuid4()}'
        self.valid_request = arf.post(
            '/', data={'organizationId': self.org.id, 'comment': self.comment}, format='json')
        self.no_comment_request = arf.post(
            '/', data={'organizationId': self.org.id}, format='json')
        self.invalid_request = arf.post(
            '/', data={'organizationId': self.comment, 'comment': self.comment}, format='json')
        self.other_org_request = arf.post(
            '/', data={'organizationId': self.other_org.id, 'comment': self.comment}, format='json')
        self.view = CloudSystemViewSet.as_view(actions={'post': 'transfer_offer'}, detail=True)
        self.offer_url = f'https://{settings.DEFAULT_HOST_NAME}/cdb/v0/systems/{self.sys_id}/offer'
        self.accept_url = (f'https://{settings.DEFAULT_HOST_NAME}/cdb/v0'
                           f'/organizations/{self.org.id}/system-offers/{self.sys_id}/accept')
        self.offer_response = {
            "fromAccount": self.org_admin.user.email,
            "organizationId": f"{self.org.id}",
            "systemId": self.sys_id,
            "systemName": "string",
            "comment": self.comment,
            "status": "offered"
        }
        self.accept_response = {
            "errorClass": "noError",
            "errorDetail": "0",
            "errorText": "",
            "resultCode": "ok"
        }

    def test_invalid_organization_id(self, mock_auth_with_user):
        mock_auth_with_user(self.org_admin)
        response = self.view(self.invalid_request, id=uuid4())
        assert response.status_code == 400

    def test_other_organization_id(self, mock_auth_with_user):
        mock_auth_with_user(self.org_admin)
        response = self.view(self.other_org_request, id=uuid4())
        assert response.status_code == 403

    def test_failed_offer_request(self, mock_auth_with_user, httpx_mock):
        offer_error = {
            "errorClass": "unauthorized",
            "errorDetail": "101",
            "errorText": "forbidden",
            "resultCode": "forbidden"
        }
        httpx_mock.add_response(url=self.offer_url, status_code=403, json=offer_error)
        httpx_mock.add_response(url=self.accept_url, status_code=400)
        mock_auth_with_user(self.org_admin)
        response = self.view(self.valid_request, id=self.sys_id)
        assert response.status_code == 403
        assert response.data == offer_error
        accept_request = httpx_mock.get_request(url=self.accept_url)
        assert accept_request is None

    def test_failed_accept_request(self, mock_auth_with_user, httpx_mock):
        accept_error = {
            "errorClass": "badRequest",
            "errorDetail": "112",
            "errorText": "Offer not in valid state",
            "resultCode": "badRequest"
        }
        httpx_mock.add_response(url=self.offer_url, status_code=200, json=self.offer_response)
        httpx_mock.add_response(url=self.accept_url, status_code=400, json=accept_error)
        token = f'{uuid4()}'
        mock_auth_with_user(self.org_admin, token=token)
        response = self.view(self.valid_request, id=self.sys_id)
        assert response.status_code == 400
        assert response.data == accept_error
        offer_request = httpx_mock.get_request(url=self.offer_url)
        assert offer_request.headers.get('Authorization') == f'Bearer {token}'
        assert json.loads(offer_request.content) == {
            'comment': self.comment,
            'organizationId': f'{self.org.id}',
            'systemId': f'{self.sys_id}'
        }
        accept_request = httpx_mock.get_request(url=self.accept_url)
        assert accept_request.headers.get('Authorization') == f'Bearer {token}'

    def test_success_request(self, mock_auth_with_user, httpx_mock):
        httpx_mock.add_response(url=self.offer_url, status_code=200, json=self.offer_response)
        httpx_mock.add_response(url=self.accept_url, status_code=200, json=self.accept_response)
        token = f'{uuid4()}'
        mock_auth_with_user(self.org_admin, token=token)
        response = self.view(self.no_comment_request, id=self.sys_id)
        assert response.status_code == 200
        assert response.data['systemId'] == self.sys_id
        assert response.data['organization'] == self.org.id

        offer_request = httpx_mock.get_request(url=self.offer_url)
        assert offer_request.headers.get('Authorization') == f'Bearer {token}'
        assert json.loads(offer_request.content) == {
            'comment': '',
            'organizationId': f'{self.org.id}',
            'systemId': f'{self.sys_id}'
        }

        accept_request = httpx_mock.get_request(url=self.accept_url)
        assert accept_request.headers.get('Authorization') == f'Bearer {token}'

        assert CloudSystemId.objects.filter(system_id=self.sys_id, organization=self.org).exists()

    def test_success_with_system_auth(self, mock_cdb_token_introspect, httpx_mock):
        mock_cdb_token_introspect(user=self.org_admin, system_id=self.sys_id)
        httpx_mock.add_response(url=self.offer_url, status_code=200, json=self.offer_response)
        httpx_mock.add_response(url=self.accept_url, status_code=200, json=self.accept_response)
        response = self.view(self.no_comment_request, id=self.sys_id)
        assert response.status_code == 200
        assert response.data['systemId'] == self.sys_id
        assert response.data['organization'] == self.org.id



class TestGetAuthorizedSystem:

    @pytest.fixture(autouse=True)
    def setup(self, arf, channel_partner_factory, organization_factory, system_factory,
                         cp_user_factory, sys_group_user_factory, org_user_factory, mock_cdb_token_introspect):
        cp = channel_partner_factory()
        organization = organization_factory(channel_partner=cp)
        other_organization = organization_factory(channel_partner=cp)
        other_organization.channel_partner_access_level_id = None
        other_organization.save()
        self.cp_admin = cp_user_factory(channel_partner=cp)
        self.org_admin = org_user_factory(organization=organization)
        self.other_admin = org_user_factory(organization=other_organization)
        self.group_user = sys_group_user_factory(organization=organization)
        self.cloud_system = system_factory(organization=organization)
        self.group_system = system_factory(organization=organization, system_group=self.group_user.system_group)
        self.other_system = system_factory(organization=other_organization)


    def test_system_auth(self, arf, channel_partner_factory, organization_factory, system_factory):

        request = arf.get('/')
        request.cloud_system = self.cloud_system
        assert get_authorized_system(request, self.cloud_system.system_id) == self.cloud_system

        try:
            get_authorized_system(request, self.other_system.system_id)
        except exceptions.PermissionDenied as ex:
            assert 'Insufficient permissions' in str(ex)
        else:
            assert False, 'Permission denied must be raised'

    def test_cp_admin(self, arf, mock_cdb_token_introspect):
        request = arf.get('/')
        request.auth = f'Bearer {uuid4()}'

        request.user = self.cp_admin.user
        mock_cdb_token_introspect(self.cp_admin)
        assert get_authorized_system(request, self.cloud_system.system_id) == self.cloud_system
        assert get_authorized_system(request, self.group_system.system_id) == self.group_system
        # test cpal disabled
        try:
            get_authorized_system(request, self.other_system.system_id)
        except exceptions.PermissionDenied as ex:
            assert 'Insufficient permissions' in str(ex)
        else:
            assert False, 'Permission denied must be raised'

    def test_org_admin(self, arf, mock_cdb_token_introspect):
        request = arf.get('/')
        request.auth = f'Bearer {uuid4()}'
        request.user = self.org_admin.user
        mock_cdb_token_introspect(self.org_admin)

        assert get_authorized_system(request, self.cloud_system.system_id) == self.cloud_system
        assert get_authorized_system(request, self.group_system.system_id) == self.group_system

        # test insufficient permissions
        try:
            get_authorized_system(request, self.other_system.system_id)
        except exceptions.PermissionDenied as ex:
            assert 'Insufficient permissions' in str(ex)
        else:
            assert False, 'Permission denied must be raised'

    def test_group_user(self, arf, mock_cdb_token_introspect):
        request = arf.get('/')
        request.auth = f'Bearer {uuid4()}'
        request.user = self.group_user.user
        mock_cdb_token_introspect(self.group_user)
        assert get_authorized_system(request, self.group_system.system_id) == self.group_system
        try:
            get_authorized_system(request, self.cloud_system.system_id)
        except exceptions.PermissionDenied as ex:
            assert 'Insufficient permissions' in str(ex)
        else:
            assert False, 'Permission denied must be raised'
        try:
            get_authorized_system(request, self.other_system.system_id)
        except exceptions.PermissionDenied as ex:
            assert 'Insufficient permissions' in str(ex)
        else:
            assert False, 'Permission denied must be raised'

    def test_vms_user(self, arf, mock_cdb_token_introspect, cloud_user_factory, httpx_mock):
        user = cloud_user_factory()
        request = arf.get('/')
        request.auth = f'Bearer {uuid4()}'
        request.user = user
        mock_cdb_token_introspect(user, system=self.other_system)
        assert get_authorized_system(request, self.other_system.system_id) == self.other_system
        try:
            get_authorized_system(request, uuid4())
        except exceptions.PermissionDenied as ex:
            assert 'Insufficient permissions' in str(ex)
        else:
            assert False, 'Permission denied must be raised'
        caches['default'].clear()
        mock_cdb_token_introspect(user, system=self.cloud_system)
        assert get_authorized_system(request, self.cloud_system.system_id) == self.cloud_system
        caches['default'].clear()
        mock_cdb_token_introspect(user, system=self.cloud_system, system_role=VmsRoles.VIEWER)
        assert get_authorized_system(
            request, self.cloud_system.system_id, roles=[VmsRoles.VIEWER]) == self.cloud_system

        caches['default'].clear()
        try:
            get_authorized_system(request, self.cloud_system.system_id)
        except exceptions.PermissionDenied as ex:
            assert 'Insufficient permissions' in str(ex)
        else:
            assert False, 'Permission denied must be raised'


class TestCloudStorageUsageReport:

    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, cp_service_factory, organization_factory, system_factory,
              service_record_factory, cloud_test_host, mock_internal_token_auth):
        self.cp = channel_partner_factory()
        self.organization = organization_factory(channel_partner=self.cp)
        self.system = system_factory(organization=self.organization)
        self.service_quantity = 10
        self.local_recording_service = cp_service_factory(
            channel_partner=self.cp, service_type=ChannelPartnerService.LOCAL_RECORDING)
        self.local_recording_service_record = service_record_factory(self.local_recording_service,
                                                                     cloud_system=self.system,
                                                                     organization=self.organization,
                                                                     quantity=self.service_quantity)
        self.cloud_storage_service = cp_service_factory(
            channel_partner=self.cp, service_type=ChannelPartnerService.CLOUD_STORAGE)
        self.cloud_storage_service_record = service_record_factory(self.cloud_storage_service,
                                                                   cloud_system=self.system,
                                                                   organization=self.organization,
                                                                   quantity=self.service_quantity)
        self.cloud_storage_service_2 = cp_service_factory(
            channel_partner=self.cp, service_type=ChannelPartnerService.CLOUD_STORAGE)
        self.cloud_storage_service_record_2 = service_record_factory(self.cloud_storage_service_2,
                                                                     cloud_system=self.system,
                                                                     organization=self.organization,
                                                                     quantity=self.service_quantity)
        self.non_system_service = cp_service_factory(
            channel_partner=self.cp, service_type=ChannelPartnerService.CLOUD_STORAGE)
        self.service_types = {v: k for k, v in ChannelPartnerService.SERVICE_TYPE_CODES}
        self.client = APIClient(SERVER_NAME=cloud_test_host.hostname)
        self.token = f'{uuid4()}'
        self.auth_token = mock_internal_token_auth(self.token)
        self.auth = f'Bearer {self.token}'
        self.path = reverse('v2:cloud_storage_usage_report')
        self.headers = {"Authorization": self}

    def device_data(self, service_id):
        return {
            'id': f'{uuid4()}',
            'serviceId': str(service_id),
        }

    def test_401(self):
        data = {
            "usedDevices": {
                "cloudSystemId": str(self.system.system_id),
                "devices": [self.device_data(self.cloud_storage_service.id)]
            }
        }
        response = self.client.post(path=self.path, data=data, format='json')
        assert response.status_code == 401
        self.client.credentials(HTTP_AUTHORIZATION=f'{uuid4()}')
        response = self.client.post(path=self.path, data=data, format='json')
        assert response.status_code == 401


    def test_200_single_device(self):
        data = {
            "usedDevices": {
                "cloudSystemId": str(self.system.system_id),
                "devices": [
                    self.device_data(self.cloud_storage_service.id)
                ]
            }
        }
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        response = self.client.post(path=self.path, data=data, format='json')
        assert response.status_code == 200
        assert ServiceUsage.objects.all().count() == 1
        assert ServiceUsage.objects.first().service_id == self.cloud_storage_service.id
        assert ServiceUsage.objects.first().usage == 1


    def test_200_multiple_devices_single_service(self):
        data = {
            "usedDevices": {
                "cloudSystemId": str(self.system.system_id),
                "devices": [
                    self.device_data(self.cloud_storage_service.id),
                    self.device_data(self.cloud_storage_service.id),
                    self.device_data(self.cloud_storage_service.id),
                    self.device_data(self.cloud_storage_service.id),
                ]
            }
        }
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        response = self.client.post(path=self.path, data=data, format='json')
        assert response.status_code == 200
        assert ServiceUsage.objects.all().count() == 1
        assert ServiceUsage.objects.first().service_id == self.cloud_storage_service.id
        assert ServiceUsage.objects.first().usage == 4
        self.system.refresh_from_db()
        assert self.system.usage_issue_detected is False

    def test_200_multiple_devices_multiple_services(self):
        data = {
            "usedDevices": {
                "cloudSystemId": str(self.system.system_id),
                "devices": [
                    self.device_data(self.cloud_storage_service.id),
                    self.device_data(self.cloud_storage_service_2.id),
                    self.device_data(self.cloud_storage_service.id),
                    self.device_data(self.cloud_storage_service_2.id),
                    self.device_data(self.cloud_storage_service_2.id),
                ]
            }
        }
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        response = self.client.post(path=self.path, data=data, format='json')
        assert response.status_code == 200
        assert ServiceUsage.objects.all().count() == 2
        usage = ServiceUsage.objects.get(service_id=self.cloud_storage_service.id)
        assert usage.service_id == self.cloud_storage_service.id
        assert usage.usage == 2
        usage = ServiceUsage.objects.get(service_id=self.cloud_storage_service_2.id)
        assert usage.service_id == self.cloud_storage_service_2.id
        assert usage.usage == 3
        self.system.refresh_from_db()
        assert self.system.usage_issue_detected is False

    def test_200_multiple_devices_multiple_services_excess(self):
        data = {
            "usedDevices": {
                "cloudSystemId": str(self.system.system_id),
                "devices": [
                    self.device_data(self.cloud_storage_service.id)
                    for _ in range(self.service_quantity * 2)
                ]
            }
        }
        data['usedDevices']['devices'] += [self.device_data(self.cloud_storage_service_2.id)]
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        response = self.client.post(path=self.path, data=data, format='json')
        assert response.status_code == 200
        assert ServiceUsage.objects.all().count() == 2
        usage = ServiceUsage.objects.get(service_id=self.cloud_storage_service.id)
        assert usage.service_id == self.cloud_storage_service.id
        assert usage.usage == self.service_quantity * 2

        self.system.refresh_from_db()
        system = CloudSystemId.objects.get(system_id=self.system.system_id)
        assert self.system.usage_issue_detected is True


class TestChannelPartnerViewSetPermissions:
    @pytest.fixture(autouse=True)
    def setup(self, root_nx_channel_partner, channel_partner_factory, organization_factory,
              cp_user_factory, org_user_factory, cloud_user_factory, cloud_test_host):

        self.root_user = cp_user_factory(channel_partner=root_nx_channel_partner)

        self.cp_lvl_1 = channel_partner_factory(parent_channel_partner=root_nx_channel_partner)
        self.cp_admin_lvl_1 = cp_user_factory(channel_partner=self.cp_lvl_1)
        self.cp_manager_lvl_1 = cp_user_factory(channel_partner=self.cp_lvl_1, role=ChannelPartnerRoles.MANAGER)
        self.cp_accountant_lvl_1 = cp_user_factory(channel_partner=self.cp_lvl_1, role=ChannelPartnerRoles.REPORTS_VIEWER)
        self.org_lvl_1 = organization_factory(channel_partner=self.cp_lvl_1)
        self.org_user_lvl_1 = org_user_factory(organization=self.org_lvl_1)

        self.cp_lvl_2 = channel_partner_factory(parent_channel_partner=self.cp_lvl_1)
        self.cp_admin_lvl_2 = cp_user_factory(channel_partner=self.cp_lvl_2)
        self.cp_manager_lvl_2 = cp_user_factory(channel_partner=self.cp_lvl_2, role=ChannelPartnerRoles.MANAGER)
        self.cp_accountant_lvl_2 = cp_user_factory(channel_partner=self.cp_lvl_2, role=ChannelPartnerRoles.REPORTS_VIEWER)
        self.org_lvl_2 = organization_factory(channel_partner=self.cp_lvl_2)
        self.org_user_lvl_2 = org_user_factory(organization=self.org_lvl_2)

        self.cp_lvl_3 = channel_partner_factory(parent_channel_partner=self.cp_lvl_2)
        self.cp_admin_lvl_3 = cp_user_factory(channel_partner=self.cp_lvl_3)
        self.cp_manager_lvl_3 = cp_user_factory(channel_partner=self.cp_lvl_3, role=ChannelPartnerRoles.MANAGER)
        self.cp_accountant_lvl_3 = cp_user_factory(channel_partner=self.cp_lvl_3, role=ChannelPartnerRoles.REPORTS_VIEWER)
        self.org_lvl_3 = organization_factory(channel_partner=self.cp_lvl_3)
        self.org_user_lvl_3 = org_user_factory(organization=self.org_lvl_3)

        self.cp_other = channel_partner_factory(parent_channel_partner=root_nx_channel_partner)
        self.cp_admin_other = cp_user_factory(channel_partner=self.cp_other)
        self.org_other = organization_factory(channel_partner=self.cp_other)
        self.org_user_other = org_user_factory(organization=self.org_other)

        self.client = APIClient(SERVER_NAME=cloud_test_host.hostname)
        self.path_list = reverse('v2:channelpartner-list')
        self.kwargs_lvl_1 = {'pk': str(self.cp_lvl_1.id)}
        self.kwargs_lvl_2 = {'pk': str(self.cp_lvl_2.id)}
        self.kwargs_lvl_3 = {'pk': str(self.cp_lvl_3.id)}
        caches['default'].clear()

    @property
    def auth(self):
        return f'Bearer {uuid4()}'
    def test_list_cp_user(self, mock_auth_with_user):
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_1)

        response = self.client.get(path=self.path_list)

        assert response.status_code == 200

    def test_list_org_user(self, mock_auth_with_user):
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.org_user_lvl_1)
        response = self.client.get(path=self.path_list)
        assert response.status_code == 200
        assert len(response.data['results']) == 0

    def test_retrieve_cp_user(self, mock_auth_with_user):
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.root_user)
        view_name = 'v2:channelpartner-detail'
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_retrieve_org_user(self, mock_auth_with_user):
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v2:channelpartner-detail'

        mock_auth_with_user(self.org_user_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_user_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_partial_update_cp_users(self, mock_auth_with_user):

        view_name = 'v2:channelpartner-detail'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.root_user)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 200

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_accountant_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 200

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.patch(path=path)
        assert response.status_code == 403

    def test_partial_update_org_users(self, mock_auth_with_user):

        view_name = 'v2:channelpartner-detail'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)

        mock_auth_with_user(self.org_user_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_user_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.patch(path=path)
        assert response.status_code == 403

    def test_service_changes_history_cp_users(self, mock_auth_with_user):
        view_name = 'v2:channelpartner-service-changes-history'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.root_user)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_service_changes_history_org_users(self, mock_auth_with_user):

        view_name = 'v2:channelpartner-service-changes-history'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)

        mock_auth_with_user(self.org_user_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_user_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_service_changes_summary_cp_users(self, mock_auth_with_user):

        view_name = 'v2:channelpartner-service-changes-summary'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.root_user)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_service_changes_summary_org_users(self, mock_auth_with_user):

        view_name = 'v2:channelpartner-service-changes-summary'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)

        mock_auth_with_user(self.org_user_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_user_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_service_aggregate_cp_users(self, mock_auth_with_user):

        view_name = 'v2:channelpartner-aggregate'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.root_user)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_service_aggregate_org_users(self, mock_auth_with_user):

        view_name = 'v2:channelpartner-aggregate'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)

        mock_auth_with_user(self.org_user_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_user_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_service_change_state_cp_users(self, mock_auth_with_user):

        view_name = 'v2:channelpartner-change-state'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.root_user)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 400

        mock_auth_with_user(self.cp_manager_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.post(path=path)
        assert response.status_code == 403

    def test_service_change_state_org_users(self, mock_auth_with_user):

        view_name = 'v2:channelpartner-change-state'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)

        mock_auth_with_user(self.org_user_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_user_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.post(path=path)
        assert response.status_code == 403

    def test_service_confirm_state_cp_users(self, mock_auth_with_user):

        view_name = 'v2:channelpartner-confirm-state'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.root_user)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 400

        mock_auth_with_user(self.cp_manager_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.post(path=path)
        assert response.status_code == 403

    def test_service_confirm_state_org_users(self, mock_auth_with_user):

        view_name = 'v2:channelpartner-confirm-state'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)

        mock_auth_with_user(self.org_user_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_user_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.post(path=path)
        assert response.status_code == 403

    def test_channel_structure(self, mock_auth_with_user):
        view_name = "v2:channelpartner-channel-structure"
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.root_user)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403


    def test_invalid_method_405(self, mock_auth_with_user):

        view_name = 'v2:channelpartner-aggregate'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)

        mock_auth_with_user(self.org_user_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 405


class TestOrganizationViewSetPermissions:
    @pytest.fixture(autouse=True, scope='function')
    def setup(self, root_nx_channel_partner, channel_partner_factory, organization_factory,
              cp_user_factory, org_user_factory, cloud_user_factory, cloud_test_host, sys_group_user_factory):
        self.root_user = cp_user_factory(channel_partner=root_nx_channel_partner)

        self.cp_lvl_1 = channel_partner_factory(parent_channel_partner=root_nx_channel_partner)
        self.cp_admin_lvl_1 = cp_user_factory(channel_partner=self.cp_lvl_1)
        self.cp_manager_lvl_1 = cp_user_factory(channel_partner=self.cp_lvl_1, role=ChannelPartnerRoles.MANAGER)
        self.cp_accountant_lvl_1 = cp_user_factory(channel_partner=self.cp_lvl_1, role=ChannelPartnerRoles.REPORTS_VIEWER)
        self.org_lvl_1 = organization_factory(channel_partner=self.cp_lvl_1)
        self.org_admin_lvl_1 = org_user_factory(organization=self.org_lvl_1)
        self.org_viewer_lvl_1 = org_user_factory(organization=self.org_lvl_1, role=OrganizationRoles.VIEWER)
        self.group_user_lvl_1 = sys_group_user_factory(self.org_lvl_1)

        self.cp_lvl_2 = channel_partner_factory(parent_channel_partner=self.cp_lvl_1)
        self.cp_admin_lvl_2 = cp_user_factory(channel_partner=self.cp_lvl_2)
        self.cp_manager_lvl_2 = cp_user_factory(channel_partner=self.cp_lvl_2, role=ChannelPartnerRoles.MANAGER)
        self.cp_accountant_lvl_2 = cp_user_factory(channel_partner=self.cp_lvl_2, role=ChannelPartnerRoles.REPORTS_VIEWER)
        self.org_lvl_2 = organization_factory(channel_partner=self.cp_lvl_2)
        self.org_admin_lvl_2 = org_user_factory(organization=self.org_lvl_2)
        self.org_viewer_lvl_2 = org_user_factory(organization=self.org_lvl_2, role=OrganizationRoles.VIEWER)
        self.group_user_lvl_2 = sys_group_user_factory(self.org_lvl_2)

        self.cp_lvl_3 = channel_partner_factory(parent_channel_partner=self.cp_lvl_2)
        self.cp_admin_lvl_3 = cp_user_factory(channel_partner=self.cp_lvl_3)
        self.cp_manager_lvl_3 = cp_user_factory(channel_partner=self.cp_lvl_3, role=ChannelPartnerRoles.MANAGER)
        self.cp_accountant_lvl_3 = cp_user_factory(channel_partner=self.cp_lvl_3, role=ChannelPartnerRoles.REPORTS_VIEWER)
        self.org_lvl_3 = organization_factory(channel_partner=self.cp_lvl_3)
        self.org_admin_lvl_3 = org_user_factory(organization=self.org_lvl_3)
        self.org_viewer_lvl_3 = org_user_factory(organization=self.org_lvl_3, role=OrganizationRoles.VIEWER)
        self.group_user_lvl_3 = sys_group_user_factory(self.org_lvl_3)

        self.cp_other = channel_partner_factory(parent_channel_partner=root_nx_channel_partner)
        self.cp_admin_other = cp_user_factory(channel_partner=self.cp_other)
        self.org_other = organization_factory(channel_partner=self.cp_other)
        self.org_admin_other = org_user_factory(organization=self.org_other)
        self.org_viewer_other = org_user_factory(organization=self.org_other, role=OrganizationRoles.VIEWER)
        self.group_user_other = sys_group_user_factory(self.org_other)

        self.client = APIClient(SERVER_NAME=cloud_test_host.hostname)
        self.path_list = reverse('v2:organization-list')
        self.kwargs_lvl_1 = {'pk': str(self.org_lvl_1.id)}
        self.kwargs_lvl_2 = {'pk': str(self.org_lvl_2.id)}
        self.kwargs_lvl_3 = {'pk': str(self.org_lvl_3.id)}
        caches['default'].clear()

    @property
    def auth(self):
        return f'Bearer {uuid4()}'

    def test_list_cp_user(self, mock_auth_with_user):
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_1)

        response = self.client.get(path=self.path_list)

        assert response.status_code == 200

    def test_list_org_user(self, mock_auth_with_user):
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.org_admin_lvl_1)
        response = self.client.get(path=self.path_list)
        assert response.status_code == 200
        assert len(response.data['results']) == 1

    def test_retrieve_cp_user(self, mock_auth_with_user):
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.root_user)
        view_name = 'v2:organization-detail'
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_retrieve_org_user(self, mock_auth_with_user):
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v2:organization-detail'

        mock_auth_with_user(self.org_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.org_viewer_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.group_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_viewer_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.group_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_partial_update_cp_users(self, mock_auth_with_user):

        view_name = 'v2:organization-detail'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.root_user)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_accountant_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 200

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.patch(path=path)
        assert response.status_code == 403

    def test_partial_update_org_users(self, mock_auth_with_user):

        view_name = 'v2:organization-detail'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)

        mock_auth_with_user(self.org_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.patch(path=path)
        assert response.status_code == 403

    def test_service_changes_history_cp_users(self, mock_auth_with_user):

        view_name = 'v2:organization-service-changes-history'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.root_user)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_service_changes_history_org_users(self, mock_auth_with_user):

        view_name = 'v2:organization-service-changes-history'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)

        mock_auth_with_user(self.org_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_service_changes_summary_cp_users(self, mock_auth_with_user):

        view_name = 'v2:organization-service-changes-summary'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.root_user)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_service_changes_summary_org_users(self, mock_auth_with_user):

        view_name = 'v2:organization-service-changes-summary'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)

        mock_auth_with_user(self.org_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_service_aggregate_cp_users(self, mock_auth_with_user):

        view_name = 'v2:organization-aggregate'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.root_user)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_service_aggregate_org_users(self, mock_auth_with_user):

        view_name = 'v2:organization-aggregate'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)

        mock_auth_with_user(self.org_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_service_change_state_cp_users(self, mock_auth_with_user):

        view_name = 'v2:organization-change-state'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.root_user)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_manager_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 400

        mock_auth_with_user(self.cp_manager_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 400

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.post(path=path)
        assert response.status_code == 403

    def test_service_change_state_org_users(self, mock_auth_with_user):

        view_name = 'v2:organization-change-state'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)

        mock_auth_with_user(self.org_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.post(path=path)
        assert response.status_code == 403

    def test_service_confirm_state_cp_users(self, mock_auth_with_user):

        view_name = 'v2:organization-confirm-state'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.root_user)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_manager_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 400

        mock_auth_with_user(self.cp_manager_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 400

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.post(path=path)
        assert response.status_code == 403

    def test_service_confirm_state_org_users(self, mock_auth_with_user):

        view_name = 'v2:organization-confirm-state'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)

        mock_auth_with_user(self.org_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.post(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.post(path=path)
        assert response.status_code == 403

    def test_groups_structure_cp_user(self, mock_auth_with_user):
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.root_user)
        view_name = 'v2:organization-groups-structure'
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_groups_structure_org_user(self, mock_auth_with_user):
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v2:organization-groups-structure'

        mock_auth_with_user(self.org_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.org_viewer_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.group_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_viewer_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.group_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_invalid_method_405(self, mock_auth_with_user):
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.root_user)
        view_name = 'v2:organization-groups-structure'
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 405


class TestOrganizationNestedViewSetPermissions:
    @pytest.fixture(autouse=True, scope='function')
    def setup(self, root_nx_channel_partner, channel_partner_factory, organization_factory,
              cp_user_factory, org_user_factory, cloud_user_factory, cloud_test_host, sys_group_user_factory):
        self.root_user = cp_user_factory(channel_partner=root_nx_channel_partner)

        self.cp_lvl_1 = channel_partner_factory(parent_channel_partner=root_nx_channel_partner)
        self.cp_admin_lvl_1 = cp_user_factory(channel_partner=self.cp_lvl_1)
        self.cp_manager_lvl_1 = cp_user_factory(channel_partner=self.cp_lvl_1, role=ChannelPartnerRoles.MANAGER)
        self.cp_accountant_lvl_1 = cp_user_factory(channel_partner=self.cp_lvl_1, role=ChannelPartnerRoles.REPORTS_VIEWER)
        self.org_lvl_1 = organization_factory(channel_partner=self.cp_lvl_1)
        self.org_admin_lvl_1 = org_user_factory(organization=self.org_lvl_1)
        self.org_viewer_lvl_1 = org_user_factory(organization=self.org_lvl_1, role=OrganizationRoles.VIEWER)
        self.group_user_lvl_1 = sys_group_user_factory(self.org_lvl_1)

        self.cp_lvl_2 = channel_partner_factory(parent_channel_partner=self.cp_lvl_1)
        self.cp_admin_lvl_2 = cp_user_factory(channel_partner=self.cp_lvl_2)
        self.cp_manager_lvl_2 = cp_user_factory(channel_partner=self.cp_lvl_2, role=ChannelPartnerRoles.MANAGER)
        self.cp_accountant_lvl_2 = cp_user_factory(channel_partner=self.cp_lvl_2, role=ChannelPartnerRoles.REPORTS_VIEWER)
        self.org_lvl_2 = organization_factory(channel_partner=self.cp_lvl_2)
        self.org_admin_lvl_2 = org_user_factory(organization=self.org_lvl_2)
        self.org_viewer_lvl_2 = org_user_factory(organization=self.org_lvl_2, role=OrganizationRoles.VIEWER)
        self.group_user_lvl_2 = sys_group_user_factory(self.org_lvl_2)

        self.cp_lvl_3 = channel_partner_factory(parent_channel_partner=self.cp_lvl_2)
        self.cp_admin_lvl_3 = cp_user_factory(channel_partner=self.cp_lvl_3)
        self.cp_manager_lvl_3 = cp_user_factory(channel_partner=self.cp_lvl_3, role=ChannelPartnerRoles.MANAGER)
        self.cp_accountant_lvl_3 = cp_user_factory(channel_partner=self.cp_lvl_3, role=ChannelPartnerRoles.REPORTS_VIEWER)
        self.org_lvl_3 = organization_factory(channel_partner=self.cp_lvl_3)
        self.org_admin_lvl_3 = org_user_factory(organization=self.org_lvl_3)
        self.org_viewer_lvl_3 = org_user_factory(organization=self.org_lvl_3, role=OrganizationRoles.VIEWER)
        self.group_user_lvl_3 = sys_group_user_factory(self.org_lvl_3)

        self.cp_other = channel_partner_factory(parent_channel_partner=root_nx_channel_partner)
        self.cp_admin_other = cp_user_factory(channel_partner=self.cp_other)
        self.org_other = organization_factory(channel_partner=self.cp_other)
        self.org_admin_other = org_user_factory(organization=self.org_other)
        self.org_viewer_other = org_user_factory(organization=self.org_other, role=OrganizationRoles.VIEWER)
        self.group_user_other = sys_group_user_factory(self.org_other)

        self.client = APIClient(SERVER_NAME=cloud_test_host.hostname)
        self.kwargs_lvl_1 = {'parent_lookup_channel_partner': str(self.cp_lvl_1.id)}
        self.kwargs_lvl_2 = {'parent_lookup_channel_partner': str(self.cp_lvl_2.id)}
        self.kwargs_lvl_3 = {'parent_lookup_channel_partner': str(self.cp_lvl_3.id)}
        caches['default'].clear()
        self.view_name = 'v2:channelpartners-organization-list'

    @property
    def auth(self):
        return f'Bearer {uuid4()}'

    def test_list_cp_user(self, mock_auth_with_user):
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(self.view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)

        assert response.status_code == 200

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(self.view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)

        assert response.status_code == 200

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(self.view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)

        assert response.status_code == 200

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(self.view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)

        assert response.status_code == 200

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(self.view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)

        assert response.status_code == 403

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(self.view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)

        assert response.status_code == 403

    def test_list_org_user(self, mock_auth_with_user):
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.org_admin_lvl_1)
        path = reverse(self.view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_1)
        path = reverse(self.view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_1)
        path = reverse(self.view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403






class TestCloudSystemViewSetPermissions:
    @pytest.fixture(autouse=True, scope='function')
    def setup(self, root_nx_channel_partner, channel_partner_factory, organization_factory, system_factory,
              cp_user_factory, org_user_factory, cloud_user_factory, cloud_test_host, sys_group_user_factory,
              system_group_factory):
        self.root_user = cp_user_factory(channel_partner=root_nx_channel_partner)

        self.cp_lvl_1 = channel_partner_factory(parent_channel_partner=root_nx_channel_partner)
        self.cp_admin_lvl_1 = cp_user_factory(channel_partner=self.cp_lvl_1)
        self.cp_manager_lvl_1 = cp_user_factory(channel_partner=self.cp_lvl_1, role=ChannelPartnerRoles.MANAGER)
        self.cp_accountant_lvl_1 = cp_user_factory(channel_partner=self.cp_lvl_1, role=ChannelPartnerRoles.REPORTS_VIEWER)
        self.org_lvl_1 = organization_factory(channel_partner=self.cp_lvl_1)
        self.org_admin_lvl_1 = org_user_factory(organization=self.org_lvl_1)
        self.org_viewer_lvl_1 = org_user_factory(organization=self.org_lvl_1, role=OrganizationRoles.VIEWER)
        self.group_user_lvl_1 = sys_group_user_factory(self.org_lvl_1)
        self.system_lvl_1 = system_factory(organization=self.org_lvl_1)

        self.cp_lvl_2 = channel_partner_factory(parent_channel_partner=self.cp_lvl_1)
        self.cp_admin_lvl_2 = cp_user_factory(channel_partner=self.cp_lvl_2)
        self.cp_manager_lvl_2 = cp_user_factory(channel_partner=self.cp_lvl_2, role=ChannelPartnerRoles.MANAGER)
        self.cp_accountant_lvl_2 = cp_user_factory(channel_partner=self.cp_lvl_2, role=ChannelPartnerRoles.REPORTS_VIEWER)
        self.org_lvl_2 = organization_factory(channel_partner=self.cp_lvl_2)
        self.org_admin_lvl_2 = org_user_factory(organization=self.org_lvl_2)
        self.org_viewer_lvl_2 = org_user_factory(organization=self.org_lvl_2, role=OrganizationRoles.VIEWER)
        self.group_user_lvl_2 = sys_group_user_factory(self.org_lvl_2)
        self.system_lvl_2 = system_factory(organization=self.org_lvl_2)

        self.cp_lvl_3 = channel_partner_factory(parent_channel_partner=self.cp_lvl_2)
        self.cp_admin_lvl_3 = cp_user_factory(channel_partner=self.cp_lvl_3)
        self.cp_manager_lvl_3 = cp_user_factory(channel_partner=self.cp_lvl_3, role=ChannelPartnerRoles.MANAGER)
        self.cp_accountant_lvl_3 = cp_user_factory(channel_partner=self.cp_lvl_3, role=ChannelPartnerRoles.REPORTS_VIEWER)
        self.org_lvl_3 = organization_factory(channel_partner=self.cp_lvl_3)
        self.org_admin_lvl_3 = org_user_factory(organization=self.org_lvl_3)
        self.org_viewer_lvl_3 = org_user_factory(organization=self.org_lvl_3, role=OrganizationRoles.VIEWER)
        self.group_lvl_3 = system_group_factory(organization=self.org_lvl_3)
        self.group_user_lvl_3 = sys_group_user_factory(self.org_lvl_3, group=self.group_lvl_3)
        self.system_lvl_3 = system_factory(organization=self.org_lvl_3)
        self.system_lvl_3_1 = system_factory(organization=self.org_lvl_3, system_group=self.group_lvl_3)

        self.cp_other = channel_partner_factory(parent_channel_partner=root_nx_channel_partner)
        self.cp_admin_other = cp_user_factory(channel_partner=self.cp_other)
        self.org_other = organization_factory(channel_partner=self.cp_other)
        self.org_admin_other = org_user_factory(organization=self.org_other)
        self.org_viewer_other = org_user_factory(organization=self.org_other, role=OrganizationRoles.VIEWER)
        self.group_user_other = sys_group_user_factory(self.org_other)

        self.client = APIClient(SERVER_NAME=cloud_test_host.hostname)
        self.path_list = reverse('v2:cloudsystem-list')
        self.kwargs_lvl_1 = {'id': str(self.system_lvl_1.system_id)}
        self.kwargs_lvl_2 = {'id': str(self.system_lvl_2.system_id)}
        self.kwargs_lvl_3 = {'id': str(self.system_lvl_3.system_id)}
        self.kwargs_lvl_3_1 = {'id': str(self.system_lvl_3_1.system_id)}
        caches['default'].clear()

    @property
    def auth(self):
        return f'Bearer {uuid4()}'

    def test_list_cp_user(self, mock_auth_with_user):
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_1)

        response = self.client.get(path=self.path_list)

        assert response.status_code == 200
        assert len(response.data['results']) == 0

    def test_list_org_user(self, mock_auth_with_user):
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.org_admin_lvl_1)
        response = self.client.get(path=self.path_list)
        assert response.status_code == 200
        assert len(response.data['results']) == 1

    def test_retrieve_cp_user(self, mock_auth_with_user):
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.root_user)
        view_name = 'v2:cloudsystem-detail'
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_retrieve_org_user(self, mock_auth_with_user):
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v2:cloudsystem-detail'

        mock_auth_with_user(self.org_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.org_viewer_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.group_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3_1)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.group_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_viewer_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.group_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_partial_update_cp_users(self, mock_auth_with_user):

        view_name = 'v2:cloudsystem-detail'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.root_user)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_accountant_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 200

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.patch(path=path)
        assert response.status_code == 403

    def test_system_usage_report_org_users(self, mock_cdb_basic_auth, mock_auth_with_user):
        view_name = 'v2:cloudsystem-system-usage-report'

        auth = mock_cdb_basic_auth(self.system_lvl_1)
        self.client.credentials(HTTP_AUTHORIZATION=auth)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.post(path=path)
        assert response.status_code == 403

        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.post(path=path)
        assert response.status_code == 403

        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.post(path=path)
        assert response.status_code == 400

        mock_auth_with_user(self.org_admin_lvl_1)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)

        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.post(path=path)
        assert response.status_code == 403

    def test_service_quantity_cp_users(self, mock_auth_with_user):

        view_name = 'v2:cloudsystem-service-quantity'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.root_user)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_service_quantity_org_users(self, mock_auth_with_user):

        view_name = 'v2:cloudsystem-service-quantity'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)

        mock_auth_with_user(self.org_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.org_viewer_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_services_cp_users(self, mock_auth_with_user):

        view_name = 'v2:cloudsystem-services'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.root_user)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_services_org_users(self, mock_auth_with_user):

        view_name = 'v2:cloudsystem-services'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)

        mock_auth_with_user(self.org_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.org_viewer_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.group_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3_1)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.group_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_service_quantity_patch_org_users(self, mock_auth_with_user):
        view_name = 'v2:cloudsystem-service-quantity'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)

        mock_auth_with_user(self.org_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.patch(path=path)
        assert response.status_code == 403

    def test_service_quantity_patch_cp_user(self, mock_auth_with_user):
        view_name = 'v2:cloudsystem-service-quantity'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)

        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 400

        mock_auth_with_user(self.cp_manager_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 400

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.patch(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.patch(path=path)
        assert response.status_code == 403

    def test_destroy_cp_users(self, mock_auth_with_user, mocker):
        view_name = 'v2:cloudsystem-detail'
        cdb_response = MagicMock()
        cdb_response.status_code = 200
        mocker.patch('nx_cloud_api_client.apis.CdbSystemAPIBase.delete_system', return_value=cdb_response)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.root_user)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.delete(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.delete(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.delete(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.delete(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.delete(path=path)
        assert response.status_code == 403

        # 401 raised after permission check
        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.delete(path=path)
        assert response.status_code == 204

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.delete(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.delete(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.delete(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_destroy_org_users(self, mock_auth_with_user, mocker):
        view_name = 'v2:cloudsystem-detail'
        cdb_response = MagicMock()
        cdb_response.status_code = 200
        mocker.patch('nx_cloud_api_client.apis.CdbSystemAPIBase.delete_system', return_value=cdb_response)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)

        mock_auth_with_user(self.org_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.delete(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.delete(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.delete(path=path)
        assert response.status_code == 204

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.delete(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.delete(path=path)
        assert response.status_code == 403

    def test_saas_report_org_users(self, mock_auth_with_user, mocker):
        view_name = 'v2:cloudsystem-saas-report'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)

        mock_auth_with_user(self.org_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.org_viewer_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.group_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.group_user_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3_1)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.org_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_saas_report_cp_users(self, mock_auth_with_user, mocker):

        view_name = 'v2:cloudsystem-saas-report'
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        mock_auth_with_user(self.root_user)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_1)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_2)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 200

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_2)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_admin_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

        mock_auth_with_user(self.cp_accountant_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_retrieve_system_user_jwt_expired(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, jwt_is_valid=False)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v2:cloudsystem-detail'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 401

    def test_retrieve_system_user_ok(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, system_role=VmsRoles.ADMINISTRATOR)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v2:cloudsystem-detail'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 200

    def test_retrieve_system_user_no_roles(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, system_role=None)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v2:cloudsystem-detail'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 200

    def test_retrieve_system_user_no_system(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=None)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v2:cloudsystem-detail'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_retrieve_system_user_viewer_ok(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, system_role=VmsRoles.VIEWER)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v2:cloudsystem-detail'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 200

    def test_saas_report_system_viewer(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, system_role=VmsRoles.VIEWER)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v2:cloudsystem-saas-report'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 200

    def test_saas_report_system_admin(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, system_role=VmsRoles.ADMINISTRATOR)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v2:cloudsystem-saas-report'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 200

    def test_saas_report_system_user_no_roles(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, system_role=None)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v2:cloudsystem-saas-report'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 403

    def test_service_quantity_system_viewer(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, system_role=VmsRoles.VIEWER)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v2:cloudsystem-service-quantity'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 200

    def test_service_quantity_system_admin(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, system_role=VmsRoles.ADMINISTRATOR)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v2:cloudsystem-service-quantity'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 200

    def test_service_quantity_system_user_no_roles(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, system_role=None)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v2:cloudsystem-service-quantity'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 200

    def test_services_system_viewer(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, system_role=VmsRoles.VIEWER)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v2:cloudsystem-services'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 200

    def test_services_system_admin(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, system_role=VmsRoles.ADMINISTRATOR)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v2:cloudsystem-services'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 200

    def test_services_system_user_no_roles(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, system_role=None)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v2:cloudsystem-services'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.get(path=path)
        assert response.status_code == 200

    def test_migrate_legacy_licenses_system_viewer(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, system_role=VmsRoles.VIEWER)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v2:cloudsystem-migrate-legacy-licenses'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.post(path=path)
        # validation error expected
        assert response.status_code == 400
        assert response.data

    def test_migrate_legacy_licenses_system_admin(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, system_role=VmsRoles.ADMINISTRATOR)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v2:cloudsystem-migrate-legacy-licenses'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.post(path=path)
        # validation error expected
        assert response.status_code == 400
        assert response.data

    def test_migrate_legacy_licenses_system_user_no_roles(self, mock_cdb_token_introspect, cloud_user_factory):
        user = cloud_user_factory()
        mock_cdb_token_introspect(user=user, system=self.system_lvl_1, system_role=None)
        self.client.credentials(HTTP_AUTHORIZATION=self.auth)
        view_name = 'v2:cloudsystem-migrate-legacy-licenses'
        path = reverse(view_name, kwargs=self.kwargs_lvl_1)
        response = self.client.post(path=path)
        assert response.status_code == 403

    def test_invalid_method_405(self, mock_cdb_basic_auth, mock_auth_with_user):
        view_name = 'v2:cloudsystem-system-usage-report'

        auth = mock_cdb_basic_auth(self.system_lvl_1)
        self.client.credentials(HTTP_AUTHORIZATION=auth)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        response = self.client.get(path=path)
        assert response.status_code == 405

    @pytest.mark.parametrize(
        'view_name, method, success_status_code', [
            ('v2:cloudsystem-service-quantity', 'get', 200),
            ('v2:cloudsystem-services', 'get', 200),
            ('v2:cloudsystem-detail', 'get', 200),
            ('v2:cloudsystem-system-usage-report', 'post', 400),
            ('v2:cloudsystem-detail', 'delete', 204),
            ('v2:cloudsystem-saas-report', 'get', 200),
            ('v2:cloudsystem-migrate-legacy-licenses', 'post', 400),
        ]
    )
    def test_system_auth_without_org(
            self,
            view_name,
            method,
            success_status_code,
            mock_auth_with_system,
            system_factory,
            basic_auth_credentials,
            mocker,
    ):
        cdb_response = MagicMock()
        cdb_response.status_code = 200
        mocker.patch('nx_cloud_api_client.apis.CdbSystemAPIBase.delete_system', return_value=cdb_response)
        self.client.credentials(HTTP_AUTHORIZATION=f'Basic {basic_auth_credentials()}')
        mock_auth_with_system(self.system_lvl_3)
        path = reverse(view_name, kwargs=self.kwargs_lvl_3)
        handler = getattr(self.client, method)
        response = handler(path=path)
        assert response.status_code == success_status_code

        system_with_no_org = system_factory(organization=self.org_lvl_1)
        system_with_no_org.organization = None
        system_with_no_org.save()
        mock_auth_with_system(system_with_no_org)
        path = reverse(view_name, kwargs={'id': str(system_with_no_org.system_id)})
        response = handler(path=path)
        assert response.status_code == 403
