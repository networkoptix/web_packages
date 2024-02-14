from datetime import timedelta

import pytest
from django.utils import timezone

from partners.models import (
    ChannelPartnerService,
    ChannelPartnerServiceRecord,
    CloudSystemId,
    ServiceRecordTypes,
)


class TestChannelPartnerServiceRecord:
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
        assert ChannelPartnerServiceRecord.objects.all().count() == self.initial_records_count + 3
        negation_records = ChannelPartnerServiceRecord.check_expired_services()
        assert len(negation_records) == 1
        assert (ChannelPartnerServiceRecord.objects.all().count() ==
                self.initial_records_count + 3 + 1)
        assert ChannelPartnerServiceRecord.objects.filter(negation_record_id=negation_records[0].id).count() == 3
        negated_record = ChannelPartnerServiceRecord.objects.filter(negation_record_id=negation_records[0].id).first()
        assert negated_record.cloud_system == system
        assert negation_records[0].cloud_system == system
        assert negation_records[0].service == self.cloud_storage_service
        assert negation_records[0].quantity == -self.service_quantity

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
