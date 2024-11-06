import uuid
from datetime import timedelta

import httpx
import pytest
from django.conf import settings
from django.utils import timezone
from rest_framework import exceptions

from partners.models import (
    ChannelPartnerService,
    ChannelPartnerServiceRecord,
    MigrationRecord,
    ServiceRecordTypes,
)
from partners.serializers.v2.serializers import (
    LegacyLicensesSerializer,
    MigrationResult,
)


class TestLegacyLicensesSerializer:
    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory, system_factory,
              cp_service_factory, service_record_factory, arf):
        self.license_quantity = 20
        self.cp = channel_partner_factory()
        self.organization = organization_factory(channel_partner=self.cp)
        self.system = system_factory(organization=self.organization)
        self.regular_services = []
        self.trial_services = []
        for i in range(10):
            service = cp_service_factory(channel_partner=self.cp)
            service.created_ts = timezone.now() - timedelta(days=3*i)
            service.save()
            self.regular_services.append(service)
            trial_service = cp_service_factory(channel_partner=self.cp)
            trial_service.sub_type = ChannelPartnerService.CREDIT
            trial_service.created_ts = timezone.now() - timedelta(days=2*i)
            trial_service.save()
            self.trial_services.append(trial_service)
        self.hardware_ids = [str(uuid.uuid4()) for _ in range(10)]
        self.licenses = [
            "4NSW-Q6ZR-6V6N-D9P2",
            "4NSW-Q6ZR-6V6N-D9P3",
            "4NSW-Q6ZR-6V6N-D9P4",
            "4NSW-Q6ZR-6V6N-D9P5",
            "4NSW-Q6ZR-6V6N-D9P6",
            "4NSW-Q6ZR-6V6N-D9P7",
        ]
        self.valid_data = {
            "licenses": self.licenses,
            "hardwareIds": self.hardware_ids
        }
        self.invalid_data = {
            "licenses": [],
        }
        service_record = service_record_factory(
            service=self.regular_services[0],
            cloud_system=self.system,
            quantity=1
        )
        MigrationRecord.objects.create(
            license_key=self.licenses[1],
            service_record_id=service_record.id
        )
        self.url = settings.LICENSE_MIGRATION_URL
        self.request = arf.post('/')
        self.request.auth = f'Bearer {uuid.uuid4()}'
        self.context = {'request': self.request}

    def lic_server_data(self, license_key, count=20, lic_type="permanent"):
        return [{
            "key": license_key,
            "count": count,
            "type": lic_type,
        }]

    def test_invalid_data(self):
        serializer = LegacyLicensesSerializer(data=self.invalid_data)
        assert serializer.is_valid() is False
        assert 'empty' in serializer.errors["licenses"][0]
        assert 'required' in serializer.errors["hardwareIds"][0]

    def test_validation_and_save(self, httpx_mock):
        initial_services = self.system.calculate_current_services(save_results=True)
        # valid permanent
        httpx_mock.add_response(
            status_code=200,
            url=self.url,
            json=self.lic_server_data(
                self.licenses[0],
                10
            ),
            match_json={"licenses": [self.licenses[0]], "hardwareIds": self.hardware_ids}
        )
        # already migrated
        httpx_mock.add_response(
            status_code=200,
            url=self.url,
            json=self.lic_server_data(
                self.licenses[1],
                20,
                "saas"
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
        # valid saas
        httpx_mock.add_response(
            status_code=200,
            url=self.url,
            json=self.lic_server_data(
                self.licenses[3],
                20,
                lic_type="saas"
            ),
            match_json={"licenses": [self.licenses[3]], "hardwareIds": self.hardware_ids}
        )
        # incorrect license key
        httpx_mock.add_response(
            status_code=200,
            url=self.url,
            json=self.lic_server_data(
                self.licenses[3],
                50
            ),
            match_json={"licenses": [self.licenses[4]], "hardwareIds": self.hardware_ids}
        )
        # invalid license type
        httpx_mock.add_response(
            status_code=200,
            url=self.url,
            json=self.lic_server_data(
                self.licenses[5],
                50,
                lic_type="invalid",
            ),
            match_json={"licenses": [self.licenses[5]], "hardwareIds": self.hardware_ids}
        )
        serializer = LegacyLicensesSerializer(data=self.valid_data, context=self.context)
        assert serializer.is_valid() is True
        results: MigrationResult = serializer.save(self.system)
        assert set(results.migratedLicenses) == {self.licenses[0], self.licenses[3]}
        assert set(results.skippedLicenses) == {self.licenses[1]}
        assert set(results.failedLicenses) == {self.licenses[2], self.licenses[4], self.licenses[5]}

        assert MigrationRecord.objects.all().count() == 3

        # check migration records
        migration_record = MigrationRecord.objects.get(license_key=self.licenses[0])
        assert migration_record.service_record.quantity == 10
        assert migration_record.service_record.service.sub_type == ChannelPartnerService.CREDIT
        assert migration_record.service_record.record_type == ServiceRecordTypes.LICENSE_MIGRATION
        credit_service_id = str(migration_record.service_record.service_id)

        migration_record = MigrationRecord.objects.get(license_key=self.licenses[3])
        assert migration_record.service_record.quantity == 20
        assert migration_record.service_record.service.sub_type == ChannelPartnerService.REGULAR
        assert migration_record.service_record.record_type == ServiceRecordTypes.LICENSE_MIGRATION
        regular_service_id = str(migration_record.service_record.service_id)

        # check current quantity of services
        self.system.refresh_from_db()
        assert self.system.current_services != initial_services

        # credit service
        init_services_quantity = initial_services['services'].get(credit_service_id, {}).get('quantity', 0)
        credit_service_quantity = self.system.current_services['services'][credit_service_id]['quantity']
        assert credit_service_quantity == init_services_quantity + 10

        # regular service
        init_services_quantity = initial_services['services'].get(regular_service_id, {}).get('quantity', 0)
        regular_service_quantity = self.system.current_services['services'][regular_service_id]['quantity']
        assert regular_service_quantity == init_services_quantity + 20


    def test_license_server_connection_error(self, httpx_mock):
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
        httpx_mock.add_exception(
            url=self.url,
            exception=httpx.ConnectError("this is connection error"),
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
        serializer = LegacyLicensesSerializer(data=self.valid_data, context=self.context)
        assert serializer.is_valid() is True
        try:
            results: MigrationResult = serializer.save(self.system)
        except exceptions.APIException as ex:
            assert ex.status_code == 500
            assert ex.detail == "Cannot proceed request."
        else:
            assert False, "Expected ValidationError."
        assert MigrationRecord.objects.count() == 1
        assert ChannelPartnerServiceRecord.objects.count() == 1

    def test_missing_trial_service(self):
        for service in self.trial_services:
            service.delete()
        serializer = LegacyLicensesSerializer(data=self.valid_data, context=self.context)
        assert serializer.is_valid()
        try:
            serializer.save(self.system)
        except exceptions.APIException as ex:
            assert ex.status_code == 400
            assert 'Cannot determine trial service for system' in ex.detail['detail']