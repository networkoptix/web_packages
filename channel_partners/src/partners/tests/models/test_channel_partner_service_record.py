import datetime
from datetime import timedelta

import pytest
from dateutil.relativedelta import relativedelta
from django.db.models import Sum
from django.utils import timezone

from partners.models import (
    ChannelPartnerService,
    ChannelPartnerServiceRecord,
    CloudSystemId,
    ServiceRecordTypes,
    ServiceToOrganizationProperties,
)


class TestServiceRecordsExpiredServices:
    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory, system_factory,
              cp_service_factory, service_record_factory):
        self.service_quantity = 5
        self.systems_count = 3
        self.services_count = 4
        self.cp = channel_partner_factory()
        self.organization = organization_factory(channel_partner=self.cp)
        self.other_organization = organization_factory(channel_partner=self.cp)
        self.systems = [
            system_factory(organization=self.organization) for _ in range(self.systems_count)
        ]
        self.orher_systems = [
            system_factory(organization=self.other_organization) for _ in range(self.systems_count)
        ]
        self.local_recording_service = cp_service_factory(
            channel_partner=self.cp,
            service_type=ChannelPartnerService.LOCAL_RECORDING
        )
        self.cloud_storage_service = cp_service_factory(
            channel_partner=self.cp,
            service_type=ChannelPartnerService.CLOUD_STORAGE,
            duration=1
        )
        self.local_recording_conversion_service = cp_service_factory(
            channel_partner=self.cp,
            service_type=ChannelPartnerService.LOCAL_RECORDING,
            conversion_service=self.local_recording_service,
            duration=1
        )
        for system in self.systems + self.orher_systems:
            for _ in range(self.services_count - 1):
                service_record_factory(
                    service=self.local_recording_service,
                    cloud_system=system,
                    organization=self.organization,
                    quantity=self.service_quantity
                )
                service_record_factory(
                    service=self.cloud_storage_service,
                    cloud_system=system,
                    organization=self.organization,
                    quantity=self.service_quantity
                )
            service_record_factory(
                service=self.local_recording_service,
                cloud_system=system,
                organization=self.organization,
                quantity=-self.service_quantity
            )
            service_record_factory(
                service=self.cloud_storage_service,
                cloud_system=system,
                organization=self.organization,
                quantity=-self.service_quantity
            )
        self.initial_records_count = 2 * self.systems_count * 2 * self.services_count

    def test_negate_services(self):
        assert ChannelPartnerServiceRecord.objects.all().count() == self.initial_records_count
        system = self.systems[0]
        ChannelPartnerServiceRecord.negate_services(ChannelPartnerServiceRecord.objects.filter(cloud_system=system))
        assert ChannelPartnerServiceRecord.objects.all().count() == self.initial_records_count + 2
        assert ChannelPartnerServiceRecord.objects.filter(
            cloud_system=system, service=self.cloud_storage_service, record_type=ServiceRecordTypes.NEGATION
        ).count() == 1
        negation_record = ChannelPartnerServiceRecord.objects.filter(
            cloud_system=system, service=self.cloud_storage_service, record_type=ServiceRecordTypes.NEGATION
        ).first()
        assert negation_record.quantity == -self.service_quantity * (self.services_count - 2)
        assert ChannelPartnerServiceRecord.objects.filter(
            cloud_system=system, service=self.cloud_storage_service,
            negation_record=negation_record
        ).count() == self.services_count

    def test_negate_services_on_shutdown(self):
        assert ChannelPartnerServiceRecord.objects.all().count() == self.initial_records_count
        system = self.systems[0]
        ChannelPartnerServiceRecord.negate_services_on_shutdown(
            CloudSystemId.objects.filter(organization=self.organization))
        assert (ChannelPartnerServiceRecord.objects.all().count() ==
                self.initial_records_count + self.systems_count * 2)
        assert ChannelPartnerServiceRecord.objects.filter(
            cloud_system=system, service=self.cloud_storage_service, record_type=ServiceRecordTypes.NEGATION
        ).count() == 1
        negation_record = ChannelPartnerServiceRecord.objects.filter(
            cloud_system=system, service=self.cloud_storage_service, record_type=ServiceRecordTypes.NEGATION
        ).first()
        assert negation_record.quantity == -self.service_quantity * (self.services_count - 2)
        assert ChannelPartnerServiceRecord.objects.filter(
            cloud_system=system, service=self.cloud_storage_service,
            negation_record=negation_record
        ).count() == self.services_count

    def test_check_expired_services_not_expired(self):
        system = self.systems[0]
        service_record = ChannelPartnerServiceRecord.objects.filter(
            cloud_system=system, service=self.cloud_storage_service
        ).last()
        assert ChannelPartnerServiceRecord.objects.all().count() == self.initial_records_count
        service_record.created_ts = timezone.now() - timedelta(days=27)
        service_record.save()
        negation_records = ChannelPartnerServiceRecord.check_expired_services()
        assert len(negation_records) == 0
        assert ChannelPartnerServiceRecord.objects.all().count() == self.initial_records_count
        
    def test_check_expired_services_expired(self, service_record_factory):
        system = self.systems[0]
        service_record = service_record_factory(
            service=self.cloud_storage_service,
            cloud_system=system,
            organization=self.organization,
            quantity=self.service_quantity,
        )
        service_record.created_ts = timezone.now() - timedelta(days=37)
        service_record.save()
        service_record = service_record_factory(
            service=self.cloud_storage_service,
            cloud_system=system,
            organization=self.organization,
            quantity=self.service_quantity,
        )
        service_record.created_ts = timezone.now() - timedelta(days=37)
        service_record.save()
        service_record = service_record_factory(
            service=self.cloud_storage_service,
            cloud_system=system,
            organization=self.organization,
            quantity=-self.service_quantity,
        )
        service_record.created_ts = timezone.now() - timedelta(days=37)
        service_record.save()
        existing_records = ChannelPartnerServiceRecord.objects.filter(
            service=self.cloud_storage_service,
            cloud_system=system,
        )
        existing_records_quantity = existing_records.aggregate(Sum('quantity'))['quantity__sum']
        assert existing_records_quantity == 15
        assert ChannelPartnerServiceRecord.objects.all().count() == self.initial_records_count + 3
        negation_records = ChannelPartnerServiceRecord.check_expired_services()
        assert len(negation_records) == 1
        assert negation_records[0].cloud_system == system
        assert negation_records[0].service == self.cloud_storage_service
        assert negation_records[0].quantity == -existing_records_quantity

        assert (ChannelPartnerServiceRecord.objects.all().count() ==
                self.initial_records_count + 3 + 1)
        assert ChannelPartnerServiceRecord.objects.filter(negation_record_id=negation_records[0].id).count() == 3 + self.services_count
        negated_record = ChannelPartnerServiceRecord.objects.filter(negation_record_id=negation_records[0].id).first()
        assert negated_record.cloud_system == system

        other_records = service_record_factory(
            service=self.cloud_storage_service,
            cloud_system=system,
            organization=self.organization,
            quantity=self.service_quantity,
        )
        other_records.created_ts = timezone.now() - timedelta(days=33)
        other_records.save()
        negation_records = ChannelPartnerServiceRecord.check_expired_services()
        assert len(negation_records) == 1
        assert (ChannelPartnerServiceRecord.objects.all().count() ==
                self.initial_records_count + 3 + 1 + 2)
        assert ChannelPartnerServiceRecord.objects.filter(negation_record_id=negation_records[0].id).count() == 1
        negated_record = ChannelPartnerServiceRecord.objects.filter(negation_record_id=negation_records[0].id).first()
        assert negated_record.cloud_system == system
        assert negation_records[0].cloud_system == system
        assert negation_records[0].service == self.cloud_storage_service
        assert negation_records[0].quantity == -self.service_quantity

    def test_check_expired_services_conversion(self, service_record_factory):
        system = self.systems[0]
        service_record_factory(
            service=self.local_recording_conversion_service,
            cloud_system=system,
            organization=self.organization,
            quantity=self.service_quantity,
        )
        for record in system.service_records.all():
            record.created_ts = timezone.now() - timedelta(days=37)
            record.save()
        assert (ChannelPartnerServiceRecord.objects.all().count() ==
                self.initial_records_count + 1)
        assert ChannelPartnerServiceRecord.objects.filter(
            cloud_system=system,
            service=self.local_recording_conversion_service
        ).count() == 1
        assert ChannelPartnerServiceRecord.objects.filter(
            cloud_system=system,
            service=self.local_recording_service
        ).count() == 4
        negation_records = ChannelPartnerServiceRecord.check_expired_services()
        assert len(negation_records) == 2
        assert (ChannelPartnerServiceRecord.objects.all().count() ==
                self.initial_records_count + 1 + 2 + 1)
        assert ChannelPartnerServiceRecord.objects.filter(
            cloud_system=system,
            service=self.local_recording_conversion_service
        ).count() == 2
        assert ChannelPartnerServiceRecord.objects.filter(
            cloud_system=system,
            service=self.local_recording_service
        ).count() == 5

        converted_qs = ChannelPartnerServiceRecord.objects.filter(
            cloud_system=system,
            service=self.local_recording_service,
            record_type=ServiceRecordTypes.CONVERSION
        )
        assert converted_qs.count() == 1
        conversion_record = converted_qs.first()
        assert conversion_record.cloud_system == system
        assert conversion_record.quantity == self.service_quantity
        assert conversion_record.automated is True
        assert conversion_record.organization == self.organization

    def test_services_quantity_partial_decrease(self, system_factory, service_record_factory, mocker):
        ChannelPartnerServiceRecord.objects.all().delete()
        tz = timezone.get_default_timezone()
        return_01_16 = datetime.datetime(2024,1,16, 0,0,0, tzinfo=tz)
        return_02_02 = datetime.datetime(2024,2,2, 0,0,0, tzinfo=tz)
        return_02_11 = datetime.datetime(2024,2,11, 0,0,0, tzinfo=tz)
        return_02_16 = datetime.datetime(2024,2,16, 0,0,0, tzinfo=tz)
        system = system_factory(organization=self.organization)
        record_01_01 = service_record_factory(
            service=self.local_recording_conversion_service,
            cloud_system=system,
            quantity=10
        )
        record_01_01.created_ts = datetime.datetime(2024,1,1, 0,0,0, tzinfo=tz)
        record_01_01.save()
        record_01_10 = service_record_factory(
            service=self.local_recording_conversion_service,
            cloud_system=system,
            quantity=10
        )
        record_01_10.created_ts = datetime.datetime(2024, 1, 10, 0, 0, 0, tzinfo=tz)
        record_01_10.save()
        record_01_15 = service_record_factory(
            service=self.local_recording_conversion_service,
            cloud_system=system,
            quantity=-5
        )
        record_01_15.created_ts = datetime.datetime(2024, 1, 15, 0, 0, 0, tzinfo=tz)
        record_01_15.save()
        mocked_now = mocker.patch('django.utils.timezone.now', return_value=return_01_16)
        mocked_today = mocker.patch('partners.models.get_today', return_value=return_01_16.date())
        negation_records = ChannelPartnerServiceRecord.check_expired_services()
        # no expire services
        mocked_today.assert_called_once()
        mocked_now.assert_not_called()
        assert len(negation_records) == 0
        existing_service_quantity = ChannelPartnerServiceRecord.objects.filter(
            service=self.local_recording_conversion_service
        ).aggregate(Sum('quantity'))['quantity__sum']
        assert existing_service_quantity == 15
        assert ChannelPartnerServiceRecord.objects.filter(
            service=self.local_recording_service
        ).aggregate(Sum('quantity'))['quantity__sum'] is None

        mocked_now = mocker.patch('django.utils.timezone.now', return_value=return_02_02)
        mocked_today = mocker.patch('partners.models.get_today', return_value=return_02_02.date())

        # one record is expired but remains are still valid
        negation_records = ChannelPartnerServiceRecord.check_expired_services()
        mocked_now.assert_called()
        assert len(negation_records) == 1
        assert ChannelPartnerServiceRecord.objects.filter(
            service=self.local_recording_conversion_service
        ).aggregate(Sum('quantity'))['quantity__sum'] == 0
        assert ChannelPartnerServiceRecord.objects.filter(
            service=self.local_recording_service
        ).aggregate(Sum('quantity'))['quantity__sum'] == existing_service_quantity

        mocked_now = mocker.patch('django.utils.timezone.now', return_value=return_02_11)
        mocked_today = mocker.patch('partners.models.get_today', return_value=return_02_11.date())
        # one record expired and remains are invalid
        negation_records = ChannelPartnerServiceRecord.check_expired_services()
        mocked_now.assert_not_called()
        assert len(negation_records) == 0
        assert ChannelPartnerServiceRecord.objects.filter(
            service=self.local_recording_conversion_service
        ).aggregate(Sum('quantity'))['quantity__sum'] == 0
        assert ChannelPartnerServiceRecord.objects.filter(
            service=self.local_recording_service
        ).aggregate(Sum('quantity'))['quantity__sum'] == existing_service_quantity

        mocked_now = mocker.patch('django.utils.timezone.now', return_value=return_02_16)
        mocked_today = mocker.patch('partners.models.get_today', return_value=return_02_16.date())

        # all record is already negated
        negation_records = ChannelPartnerServiceRecord.check_expired_services()
        mocked_now.assert_not_called()
        assert len(negation_records) == 0
        assert ChannelPartnerServiceRecord.objects.filter(
            service=self.local_recording_conversion_service
        ).aggregate(Sum('quantity'))['quantity__sum'] == 0
        assert ChannelPartnerServiceRecord.objects.filter(
            service=self.local_recording_service
        ).aggregate(Sum('quantity'))['quantity__sum'] == existing_service_quantity


    def test_services_quantity_total_decrease(self, system_factory, service_record_factory, mocker):
        ChannelPartnerServiceRecord.objects.all().delete()
        tz = timezone.get_default_timezone()
        return_01_16 = datetime.datetime(2024,1,16, 0,0,0, tzinfo=tz)
        return_02_02 = datetime.datetime(2024,2,2, 0,0,0, tzinfo=tz)
        return_02_11 = datetime.datetime(2024,2,11, 0,0,0, tzinfo=tz)
        return_02_16 = datetime.datetime(2024,2,16, 0,0,0, tzinfo=tz)
        system = system_factory(organization=self.organization)
        record_01_01 = service_record_factory(
            service=self.local_recording_conversion_service,
            cloud_system=system,
            quantity=10
        )
        record_01_01.created_ts = datetime.datetime(2024,1,1, 0,0,0, tzinfo=tz)
        record_01_01.save()
        record_01_10 = service_record_factory(
            service=self.local_recording_conversion_service,
            cloud_system=system,
            quantity=10
        )
        record_01_10.created_ts = datetime.datetime(2024, 1, 10, 0, 0, 0, tzinfo=tz)
        record_01_10.save()
        record_01_15 = service_record_factory(
            service=self.local_recording_conversion_service,
            cloud_system=system,
            quantity=-15
        )
        record_01_15.created_ts = datetime.datetime(2024, 1, 15, 0, 0, 0, tzinfo=tz)
        record_01_15.save()
        mocked_now = mocker.patch('django.utils.timezone.now', return_value=return_01_16)
        mocked_today = mocker.patch('partners.models.get_today', return_value=return_01_16.date())
        existing_service_quantity = ChannelPartnerServiceRecord.objects.filter(
            service=self.local_recording_conversion_service
        ).aggregate(Sum('quantity'))['quantity__sum']
        # no expired records
        negation_records = ChannelPartnerServiceRecord.check_expired_services()
        mocked_now.assert_not_called()
        assert len(negation_records) == 0

        assert ChannelPartnerServiceRecord.objects.filter(
            service=self.local_recording_conversion_service
        ).aggregate(Sum('quantity'))['quantity__sum'] == existing_service_quantity
        assert ChannelPartnerServiceRecord.objects.filter(
            service=self.local_recording_service
        ).aggregate(Sum('quantity'))['quantity__sum'] is None

        mocked_now = mocker.patch('django.utils.timezone.now', return_value=return_02_02)
        mocked_today = mocker.patch('partners.models.get_today', return_value=return_02_02.date())

        # one record expired but remains are less than negation, negating all
        negation_records = ChannelPartnerServiceRecord.check_expired_services()
        mocked_now.assert_called()
        assert len(negation_records) == 1
        assert ChannelPartnerServiceRecord.objects.filter(
            service=self.local_recording_conversion_service
        ).aggregate(Sum('quantity'))['quantity__sum'] == 0
        assert ChannelPartnerServiceRecord.objects.filter(
            service=self.local_recording_service
        ).aggregate(Sum('quantity'))['quantity__sum'] == existing_service_quantity

        mocked_now = mocker.patch('django.utils.timezone.now', return_value=return_02_11)
        mocked_today = mocker.patch('partners.models.get_today', return_value=return_02_11.date())

        # there is no non negated and expired records
        negation_records = ChannelPartnerServiceRecord.check_expired_services()
        mocked_now.assert_not_called()
        assert len(negation_records) == 0
        assert ChannelPartnerServiceRecord.objects.filter(
            service=self.local_recording_conversion_service
        ).aggregate(Sum('quantity'))['quantity__sum'] == 0
        assert ChannelPartnerServiceRecord.objects.filter(
            service=self.local_recording_service
        ).aggregate(Sum('quantity'))['quantity__sum'] == existing_service_quantity

        mocked_now = mocker.patch('django.utils.timezone.now', return_value=return_02_16)
        mocked_today = mocker.patch('partners.models.get_today', return_value=return_02_16.date())

        # there is no non negated and expired records
        negation_records = ChannelPartnerServiceRecord.check_expired_services()
        mocked_now.assert_not_called()
        assert len(negation_records) == 0
        assert ChannelPartnerServiceRecord.objects.filter(
            service=self.local_recording_conversion_service
        ).aggregate(Sum('quantity'))['quantity__sum'] == 0
        assert ChannelPartnerServiceRecord.objects.filter(
            service=self.local_recording_service
        ).aggregate(Sum('quantity'))['quantity__sum'] == existing_service_quantity


class TestServicePropertiesExpirationDate:

    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory, system_factory,
              cp_service_factory, service_record_factory):
        self.cp = channel_partner_factory()
        self.organization = organization_factory(channel_partner=self.cp)
        self.system = system_factory(organization=self.organization)
        self.regular_service = cp_service_factory(
            channel_partner=self.cp,
            service_type=ChannelPartnerService.LOCAL_RECORDING,
            sub_type=ChannelPartnerService.REGULAR,
        )
        self.demo_service = cp_service_factory(
            channel_partner=self.cp,
            service_type=ChannelPartnerService.LOCAL_RECORDING,
            sub_type=ChannelPartnerService.DEMO,
            duration=1,
        )
        self.trial_service = cp_service_factory(
            channel_partner=self.cp,
            service_type=ChannelPartnerService.LOCAL_RECORDING,
            sub_type=ChannelPartnerService.TRIAL,
            duration=2,
        )
        self.unlimited_service = cp_service_factory(
            channel_partner=self.cp,
            service_type=ChannelPartnerService.LOCAL_RECORDING,
            sub_type=ChannelPartnerService.DEMO,
            duration=0
        )


    @pytest.mark.parametrize('service_name', ['regular_service', 'unlimited_service'])
    def test_add_expiration_date_not_called(self, service_name):
        assert ServiceToOrganizationProperties.objects.count() == 0
        record = ChannelPartnerServiceRecord.objects.create(
            service=getattr(self, service_name),
            cloud_system=self.system,
            organization=self.organization,
            quantity=1,
            effective_ts=timezone.now()
        )
        assert ServiceToOrganizationProperties.objects.count() == 0

    @pytest.mark.parametrize('service_name', ['demo_service', 'trial_service'])
    def test_creating_demo_service_record(self, service_name):
        service = getattr(self, service_name)
        assert ServiceToOrganizationProperties.objects.count() == 0
        record = ChannelPartnerServiceRecord.objects.create(
            service=service,
            cloud_system=self.system,
            quantity=1,
            effective_ts=timezone.now(),
        )
        assert ServiceToOrganizationProperties.objects.count() == 1
        properties = ServiceToOrganizationProperties.objects.first()
        assert properties.organization == self.organization
        assert properties.service == service
        assert properties.expiring_at == record.created_ts + relativedelta(months=service.duration)