from datetime import timedelta
from uuid import uuid4

import pytest
from django.core.cache import caches
from django.utils import timezone
from mock.mock import MagicMock

from partners.models import (
    ChannelPartnerService,
    ChannelPartnerServiceRecord,
    SystemServiceCurrentQuantity,
)
from partners.serializers.v3.service_quantity_serializers import (
    ServiceQuantityChangeSerializerV3,
    ServiceQuantityReadSerializerV3,
)
from tools.exception import ErrorCodes


class TestServiceQuantityChangeSerializer:
    @pytest.fixture(autouse=True)
    def setup(self, mocker, channel_partner_factory, organization_factory, system_factory,
              cp_service_factory, service_record_factory, cp_user_factory):
        self.channel_partner = channel_partner_factory()
        self.channel_partner.monthly_additional_service_limit = 25
        self.channel_partner.save()
        self.user = cp_user_factory(channel_partner=self.channel_partner)
        self.organization = organization_factory(channel_partner=self.channel_partner)
        self.system = system_factory(organization=self.organization)
        self.local_recording_service = cp_service_factory(
            channel_partner=self.channel_partner,
            service_type=ChannelPartnerService.LOCAL_RECORDING,
        )
        self.local_recording_service_2 = cp_service_factory(
            channel_partner=self.channel_partner,
            service_type=ChannelPartnerService.LOCAL_RECORDING,
        )
        self.local_recording_service_demo = cp_service_factory(
            channel_partner=self.channel_partner,
            service_type=ChannelPartnerService.LOCAL_RECORDING,
            sub_type=ChannelPartnerService.DEMO,
        )
        self.local_recording_service_credit = cp_service_factory(
            channel_partner=self.channel_partner,
            service_type=ChannelPartnerService.LOCAL_RECORDING,
            sub_type=ChannelPartnerService.CREDIT,
        )
        self.analytics_service = cp_service_factory(
            channel_partner=self.channel_partner,
            service_type=ChannelPartnerService.ANALYTICS,
        )
        service_record_factory(
            cloud_system=self.system,
            service=self.local_recording_service,
            quantity=10,
        )
        service_record_factory(
            cloud_system=self.system,
            service=self.analytics_service,
            quantity=5,
        )
        service_record_factory(
            cloud_system=self.system,
            service=self.analytics_service,
            quantity=5,
        )

    def test_valid_data_single(self):
        data = [
            {
                'serviceId': self.local_recording_service.id,
                'quantity': 12,
            }
        ]
        serializer = ServiceQuantityChangeSerializerV3(
            cloud_system=self.system,
            data=data,
            many=True,
        )
        assert serializer.is_valid()
        assert len(serializer.validated_data) == 1
        assert serializer.validated_data[0]['service'] == self.local_recording_service
        assert serializer.validated_data[0]['quantity'] == 2

    def test_valid_data_demo_service(self):
        data = [
            {
                'serviceId': self.local_recording_service_demo.id,
                'quantity': 12,
            }
        ]
        serializer = ServiceQuantityChangeSerializerV3(
            cloud_system=self.system,
            data=data,
            many=True,
        )
        assert serializer.is_valid()
        assert len(serializer.validated_data) == 1
        assert serializer.validated_data[0]['service'] == self.local_recording_service_demo
        assert serializer.validated_data[0]['quantity'] == 12

    def test_valid_data_multiple(self):
        data = [
            {
                'serviceId': self.local_recording_service.id,
                'quantity': 12,
            },
            {
                'serviceId': self.analytics_service.id,
                'quantity': 22,
            },

        ]
        serializer = ServiceQuantityChangeSerializerV3(
            cloud_system=self.system,
            data=data,
            many=True,
        )
        assert serializer.is_valid()
        assert len(serializer.validated_data) == 2
        assert serializer.validated_data[0]['service'] == self.local_recording_service
        assert serializer.validated_data[0]['quantity'] == 2
        assert serializer.validated_data[1]['service'] == self.analytics_service
        assert serializer.validated_data[1]['quantity'] == 12

    def test_invalid_data_single_service_exceeded(self):
        data = [
            {
                'serviceId': self.local_recording_service.id,
                'quantity': 26,
            }
        ]
        serializer = ServiceQuantityChangeSerializerV3(
            cloud_system=self.system,
            data=data,
            many=True,
        )
        assert not serializer.is_valid()
        assert serializer.errors[0]['quantity'][0].code == ErrorCodes.service_quantity_exceeded

    def test_invalid_data_multiple_services_of_a_type_exceeded(self):
        data = [
            {
                'serviceId': self.local_recording_service.id,
                'quantity': 12,
            },
            {
                'serviceId': self.local_recording_service_2.id,
                'quantity': 22,
            },

        ]
        serializer = ServiceQuantityChangeSerializerV3(
            cloud_system=self.system,
            data=data,
            many=True,
        )
        assert not serializer.is_valid()
        assert serializer.errors[0] == {}
        assert serializer.errors[1]['quantity'][0].code == ErrorCodes.service_quantity_exceeded

    def test_invalid_data_multiple_services_exceeded(self):
        data = [
            {
                'serviceId': self.local_recording_service.id,
                'quantity': 26,
            },
            {
                'serviceId': self.local_recording_service_2.id,
                'quantity': 26,
            },
            {
                'serviceId': self.analytics_service.id,
                'quantity': 26,
            },

        ]
        serializer = ServiceQuantityChangeSerializerV3(
            cloud_system=self.system,
            data=data,
            many=True,
        )
        assert not serializer.is_valid()
        assert serializer.errors[0]['quantity'][0].code == ErrorCodes.service_quantity_exceeded
        assert serializer.errors[1]['quantity'][0].code == ErrorCodes.service_quantity_exceeded
        assert serializer.errors[2]['quantity'][0].code == ErrorCodes.service_quantity_exceeded

    def test_invalid_data_non_existing_service(self):
        data = [
            {
                'serviceId': f'{uuid4()}',
                'quantity': 26,
            },
        ]
        serializer = ServiceQuantityChangeSerializerV3(
            cloud_system=self.system,
            data=data,
            many=True,
        )
        assert not serializer.is_valid()
        assert serializer.errors[0]['serviceId'][0].code == 'does_not_exist'

    def test_invalid_data_disabled_service(self):
        self.local_recording_service.enabled = False
        self.local_recording_service.save()
        data = [
            {
                'serviceId': self.local_recording_service.id,
                'quantity': 26,
            },
        ]
        serializer = ServiceQuantityChangeSerializerV3(
            cloud_system=self.system,
            data=data,
            many=True,
        )
        assert not serializer.is_valid()
        assert serializer.errors[0]['serviceId'][0].code == ErrorCodes.service_disabled

    def test_invalid_data_credit_service_increased(self):
        data = [
            {
                'serviceId': self.local_recording_service_credit.id,
                'quantity': 26,
            },
        ]
        serializer = ServiceQuantityChangeSerializerV3(
            cloud_system=self.system,
            data=data,
            many=True,
        )
        assert not serializer.is_valid()
        assert serializer.errors[0]['quantity'][0].code == ErrorCodes.credit_service_increased

    def test_invalid_data_credit_service_decreased(self):
        data = [
            {
                'serviceId': self.local_recording_service_credit.id,
                'quantity': -26,
            },
        ]
        serializer = ServiceQuantityChangeSerializerV3(
            cloud_system=self.system,
            data=data,
            many=True,
        )
        assert serializer.is_valid()

    def test_invalid_data_other_partner_service(self, channel_partner_factory, cp_service_factory):
        channel_partner = channel_partner_factory()
        service = cp_service_factory(channel_partner=channel_partner)
        data = [
            {
                'serviceId': service.id,
                'quantity': 26,
            },
        ]
        serializer = ServiceQuantityChangeSerializerV3(
            cloud_system=self.system,
            data=data,
            many=True,
        )
        assert not serializer.is_valid()
        assert serializer.errors[0]['serviceId'][0].code == ErrorCodes.wrong_service_id

    def test_save_single_service_record(self):
        request = MagicMock()
        request.user = self.user.user
        data = [
            {
                'serviceId': self.local_recording_service.id,
                'quantity': 12,
            }
        ]
        serializer = ServiceQuantityChangeSerializerV3(
            cloud_system=self.system,
            data=data,
            context={'request': request},
            many=True,
        )
        assert serializer.is_valid()
        serializer.save()
        service_record = ChannelPartnerServiceRecord.objects.filter(
            cloud_system=self.system,
            service=self.local_recording_service,
        ).order_by('-created_ts').first()
        assert service_record.quantity == 2

    def test_save_single_service_record_decrease(self):
        request = MagicMock()
        request.user = self.user.user
        data = [
            {
                'serviceId': self.local_recording_service.id,
                'quantity': 8,
            }
        ]
        serializer = ServiceQuantityChangeSerializerV3(
            cloud_system=self.system,
            data=data,
            context={'request': request},
            many=True,
        )
        assert serializer.is_valid()
        serializer.save()
        service_record = ChannelPartnerServiceRecord.objects.filter(
            cloud_system=self.system,
            service=self.local_recording_service,
        ).order_by('-created_ts').first()
        assert service_record.quantity == -2

    def test_save_multiple_service_records(self):
        request = MagicMock()
        request.user = self.user.user
        data = [
            {
                'serviceId': self.local_recording_service.id,
                'quantity': 12,
            },
            {
                'serviceId': self.analytics_service.id,
                'quantity': 22,
            },
        ]
        serializer = ServiceQuantityChangeSerializerV3(
            cloud_system=self.system,
            data=data,
            context={'request': request},
            many=True,
        )
        assert serializer.is_valid()
        serializer.save()
        local_recording_record = ChannelPartnerServiceRecord.objects.filter(
            cloud_system=self.system,
            service=self.local_recording_service,
        ).order_by('-created_ts').first()
        assert local_recording_record.quantity == 2
        analytics_record = ChannelPartnerServiceRecord.objects.filter(
            cloud_system=self.system,
            service=self.analytics_service,
        ).order_by('-created_ts').first()
        assert analytics_record.quantity == 12

    def test_duplicated_service_records(self):
        request = MagicMock()
        request.user = self.user.user
        data = [
            {
                'serviceId': self.local_recording_service.id,
                'quantity': 12,
            },
            {
                'serviceId': self.local_recording_service.id,
                'quantity': 22,
            },
        ]
        serializer = ServiceQuantityChangeSerializerV3(
            cloud_system=self.system,
            data=data,
            context={'request': request},
            many=True,
        )
        assert not serializer.is_valid()
        assert serializer.errors['non_field_errors'][0].code == ErrorCodes.duplicated_service_quantity

    def test_expired_services(self,
                              service_record_factory,
                              cp_service_factory,
                              arf):
        self.channel_partner.monthly_additional_service_limit = None
        service_add_date = timezone.now() - timedelta(days=35)
        regular_service = cp_service_factory(channel_partner=self.channel_partner)
        expired_service = cp_service_factory(
            channel_partner=self.channel_partner,
            sub_type=ChannelPartnerService.DEMO,
            duration=1
        )
        not_expired_service = cp_service_factory(
            channel_partner=self.channel_partner,
            sub_type=ChannelPartnerService.DEMO,
            duration=2
        )
        not_used_service = cp_service_factory(
            channel_partner=self.channel_partner,
            sub_type=ChannelPartnerService.DEMO,
            duration=1
        )
        service_record_factory(
            service=regular_service,
            cloud_system=self.system,
            quantity=1,
            created_ts=service_add_date
        )
        service_record_factory(
            service=expired_service,
            cloud_system=self.system,
            quantity=1,
            created_ts=service_add_date
        )
        service_record_factory(
            service=not_expired_service,
            cloud_system=self.system,
            quantity=1,
            created_ts=service_add_date
        )
        services = [regular_service, expired_service, not_expired_service, not_used_service]
        data = [
            {'serviceId': str(service.id), 'quantity': 11}
            for service in services
        ]
        serializer = ServiceQuantityChangeSerializerV3(cloud_system=self.system, data=data, many=True)
        assert serializer.is_valid() is False
        assert not serializer.errors[0]
        assert serializer.errors[1]['serviceId'][0] == f'Service {expired_service.id} is expired.'
        assert serializer.errors[1]['serviceId'][0].code == ErrorCodes.service_expired
        assert not serializer.errors[2]
        assert not serializer.errors[3]

    def test_not_expired_services(self,
                              service_record_factory,
                              cp_service_factory,
                              system_factory,
                              arf):
        self.channel_partner.monthly_additional_service_limit = None
        other_system = system_factory(organization=self.organization)
        service_add_date = timezone.now() - timedelta(days=35)
        regular_service = cp_service_factory(channel_partner=self.channel_partner)
        not_expired_service = cp_service_factory(
            channel_partner=self.channel_partner,
            sub_type=ChannelPartnerService.DEMO,
            duration=1
        )
        service_record_factory(
            service=regular_service,
            cloud_system=self.system,
            quantity=1,
            created_ts=service_add_date
        )
        service_record_factory(
            service=not_expired_service,
            cloud_system=self.system,
            quantity=1,
        )
        service_record_factory(
            service=not_expired_service,
            cloud_system=other_system,
            quantity=1,
            created_ts=service_add_date
        )
        services = [regular_service, not_expired_service]
        data = [
            {'serviceId': str(service.id), 'quantity': 11}
            for service in services
        ]
        serializer = ServiceQuantityChangeSerializerV3(cloud_system=self.system, data=data, many=True)
        assert serializer.is_valid() is True


class TestServiceQuantityReadSerializer:
    @pytest.fixture(autouse=True)
    def setup(self, mocker, channel_partner_factory, organization_factory, system_factory,
              cp_service_factory, service_record_factory, cp_user_factory):
        self.channel_partner = channel_partner_factory()
        self.channel_partner.monthly_additional_service_limit = 25
        self.channel_partner.save()
        self.user = cp_user_factory(channel_partner=self.channel_partner)
        self.organization = organization_factory(channel_partner=self.channel_partner)
        self.system = system_factory(organization=self.organization)
        self.local_recording_service = cp_service_factory(
            channel_partner=self.channel_partner,
            service_type=ChannelPartnerService.LOCAL_RECORDING,
        )
        self.analytics_service = cp_service_factory(
            channel_partner=self.channel_partner,
            service_type=ChannelPartnerService.ANALYTICS,
        )
        service_record_factory(
            cloud_system=self.system,
            service=self.local_recording_service,
            quantity=15,
        )
        service_record_factory(
            cloud_system=self.system,
            service=self.analytics_service,
            quantity=5,
        )
        service_record_factory(
            cloud_system=self.system,
            service=self.analytics_service,
            quantity=5,
        )
        SystemServiceCurrentQuantity.objects.create(
            cloud_system=self.system,
            organization=self.organization,
            service=self.local_recording_service,
            quantity=11
        )
        SystemServiceCurrentQuantity.objects.create(
            cloud_system=self.system,
            organization=self.organization,
            service=self.analytics_service,
            quantity=6
        )
        caches['default'].clear()

    def test_serialization(self):

        serializer = ServiceQuantityReadSerializerV3(instance=self.system.get_current_services_list(), many=True)

        assert len(serializer.data) == 2
        for record in serializer.data:
            if record['serviceId'] == str(self.local_recording_service.id):
                assert record['quantity'] == 15
                assert record['used'] == 11
            else:
                assert record['quantity'] == 10
                assert record['used'] == 6