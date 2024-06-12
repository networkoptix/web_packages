import datetime
from uuid import uuid4

import pytest
from dateutil.parser import parse
from dateutil.relativedelta import relativedelta

from partners.models import (
    ChannelPartnerService,
    ServiceUsage,
    SystemServiceCurrentQuantity,
)
from partners.serializers import SystemServiceCurrentQuantitySerializer


class TestSystemServiceCurrentQuantitySerializer:
    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory, system_factory,
              cp_service_factory, service_record_factory):
        self.channel_partner = channel_partner_factory()
        self.other_channel_partner = channel_partner_factory()
        self.organization = organization_factory(channel_partner=self.channel_partner)
        self.system = system_factory(organization=self.organization)
        self.cp_service_1 = cp_service_factory(
            channel_partner=self.channel_partner,
        )
        self.cp_service_2 = cp_service_factory(
            channel_partner=self.channel_partner,
            service_type=ChannelPartnerService.CLOUD_STORAGE,
        )
        self.cp_service_3 = cp_service_factory(
            channel_partner=self.channel_partner,
            service_type=ChannelPartnerService.ANALYTICS,
        )
        self.other_service = cp_service_factory(
            channel_partner=self.other_channel_partner,
        )
        self.unallocated_service = cp_service_factory(
            channel_partner=self.channel_partner,
            service_type=ChannelPartnerService.LOCAL_RECORDING,
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

    def test_invalid_service_not_available(self):
        data = {
            'currentUsages': [
                {
                    'service': self.other_service.id,
                    'quantity': 10,
                }
            ]
        }
        serializer = SystemServiceCurrentQuantitySerializer(instance=self.system, data=data)
        assert not serializer.is_valid()
        assert serializer.errors == {
            'currentUsages': [
                {
                    'service': [
                        f"Service {self.other_service.id} is not available for organization {self.organization.id}"
                    ],
                }
            ]
        }
        assert serializer.errors['currentUsages'][0]['service'][0].code == 'serviceNotAvailable'

    def test_invalid_service_not_exist(self):
        data = {
            'currentUsages': [
                {
                    'service':f'{uuid4()}',
                    'quantity': 10,
                }
            ]
        }
        serializer = SystemServiceCurrentQuantitySerializer(instance=self.system, data=data)
        assert not serializer.is_valid()
        assert serializer.errors['currentUsages'][0]['service'][0].code == 'does_not_exist'

    def test_invalid_quantity_negative(self):
        data = {
            'currentUsages': [
                {
                    'service': self.cp_service_1.id,
                    'quantity': -10,
                }
            ]
        }
        serializer = SystemServiceCurrentQuantitySerializer(instance=self.system, data=data)
        assert not serializer.is_valid()
        assert serializer.errors == {
            'currentUsages': [
                {
                    'quantity': [
                        'Ensure this value is greater than or equal to 0.'
                    ],
                }
            ]
        }
        assert serializer.errors['currentUsages'][0]['quantity'][0].code == 'min_value'


    def test_invalid_multiple_errors(self):
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
        serializer = SystemServiceCurrentQuantitySerializer(instance=self.system, data=data)
        assert not serializer.is_valid()
        assert serializer.errors['currentUsages'][0]['service'][0].code == 'does_not_exist'
        assert serializer.errors['currentUsages'][1]['service'][0].code == 'serviceNotAvailable'

    def test_valid(self):
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
                    'service': str(self.cp_service_3.id),
                    'quantity': 30,
                }
            ]
        }
        serializer = SystemServiceCurrentQuantitySerializer(instance=self.system, data=data)
        assert serializer.is_valid()
        assert serializer.validated_data['currentUsages'][0]['service'] == self.cp_service_1
        assert serializer.validated_data['currentUsages'][0]['quantity'] == 10
        assert serializer.validated_data['currentUsages'][1]['service'] == self.cp_service_2
        assert serializer.validated_data['currentUsages'][1]['quantity'] == 20
        assert serializer.validated_data['currentUsages'][2]['service'] == self.cp_service_3
        assert serializer.validated_data['currentUsages'][2]['quantity'] == 30


    def test_save(self):
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
        serializer = SystemServiceCurrentQuantitySerializer(instance=self.system, data=data)
        assert serializer.is_valid()
        serializer.save()
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

    def test_updated_security_statuses(self):
        statuses = ServiceUsage.check_excess(self.system)
        for typ, status in statuses['types'].items():
            assert status == ServiceUsage.STATUS_OK
        assert len(statuses['types']) > 0
        for sid, status in statuses['services'].items():
            assert status == ServiceUsage.STATUS_OK
        assert len(statuses['services']) > 0
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
                    'service': str(self.cp_service_3.id),
                    'quantity': 40,
                }
            ]
        }
        now = datetime.datetime.utcnow()
        serializer = SystemServiceCurrentQuantitySerializer(instance=self.system, data=data)
        assert serializer.is_valid()
        ret = serializer.save()
        self.system.refresh_from_db()
        assert self.system == ret
        assert self.system.security_statuses == ret.security_statuses
        local_recording_type = ChannelPartnerService.SERVICE_TYPE_TO_CODE_MAP[ChannelPartnerService.LOCAL_RECORDING]
        cloud_storage_type = ChannelPartnerService.SERVICE_TYPE_TO_CODE_MAP[ChannelPartnerService.CLOUD_STORAGE]
        analytics_type = ChannelPartnerService.SERVICE_TYPE_TO_CODE_MAP[ChannelPartnerService.ANALYTICS]
        assert ret.security_statuses['types'][local_recording_type]['status'] == ServiceUsage.STATUS_OK
        assert ret.security_statuses['types'][cloud_storage_type]['status'] == ServiceUsage.STATUS_OK
        assert ret.security_statuses['types'][analytics_type]['status'] == ServiceUsage.STATUS_OVER_USE
        assert ret.security_statuses['services'][str(self.cp_service_1.id)]['status'] == ServiceUsage.STATUS_OK
        assert ret.security_statuses['services'][str(self.cp_service_2.id)]['status'] == ServiceUsage.STATUS_OK
        assert ret.security_statuses['services'][str(self.cp_service_3.id)]['status'] == ServiceUsage.STATUS_OVER_USE
        expiration_date = parse(ret.security_statuses['types'][analytics_type]['issueExpirationDate'])
        assert expiration_date >= (now + relativedelta(days=29, hours=23, minutes=58))
        assert expiration_date <= (now + relativedelta(days=30, minutes=2))

    def test_updated_security_statuses_unallocated(self):
        statuses = ServiceUsage.check_excess(self.system)
        for typ, status in statuses['types'].items():
            assert status == ServiceUsage.STATUS_OK
        assert len(statuses['types']) > 0
        for sid, status in statuses['services'].items():
            assert status == ServiceUsage.STATUS_OK
        assert len(statuses['services']) > 0
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
                    'service': str(self.unallocated_service.id),
                    'quantity': 40,
                }
            ]
        }
        now = datetime.datetime.utcnow()
        serializer = SystemServiceCurrentQuantitySerializer(instance=self.system, data=data)
        assert serializer.is_valid()
        ret = serializer.save()
        self.system.refresh_from_db()
        assert self.system == ret
        assert self.system.security_statuses == ret.security_statuses
        local_recording_type = ChannelPartnerService.SERVICE_TYPE_TO_CODE_MAP[ChannelPartnerService.LOCAL_RECORDING]
        cloud_storage_type = ChannelPartnerService.SERVICE_TYPE_TO_CODE_MAP[ChannelPartnerService.CLOUD_STORAGE]
        assert ret.security_statuses['types'][local_recording_type]['status'] == ServiceUsage.STATUS_OVER_USE
        assert ret.security_statuses['types'][cloud_storage_type]['status'] == ServiceUsage.STATUS_OK
        assert ret.security_statuses['services'][str(self.cp_service_1.id)]['status'] == ServiceUsage.STATUS_OK
        assert ret.security_statuses['services'][str(self.unallocated_service.id)]['status'] == ServiceUsage.STATUS_OVER_USE
        expiration_date = parse(ret.security_statuses['types'][local_recording_type]['issueExpirationDate'])
        assert expiration_date >= (now + relativedelta(days=29, hours=23, minutes=58))
        assert expiration_date <= (now + relativedelta(days=30, minutes=2))

    def test_updated_quantities(self):
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
                    'service': str(self.unallocated_service.id),
                    'quantity': 40,
                }
            ]
        }
        now = datetime.datetime.utcnow()
        serializer = SystemServiceCurrentQuantitySerializer(instance=self.system, data=data)
        assert serializer.is_valid()
        ret = serializer.save()
        self.system.refresh_from_db()
        local_recording_type = ChannelPartnerService.SERVICE_TYPE_TO_CODE_MAP[ChannelPartnerService.LOCAL_RECORDING]
        cloud_storage_type = ChannelPartnerService.SERVICE_TYPE_TO_CODE_MAP[ChannelPartnerService.CLOUD_STORAGE]
        assert ret.security_statuses['types'][local_recording_type]['status'] == ServiceUsage.STATUS_OVER_USE
        assert ret.security_statuses['types'][cloud_storage_type]['status'] == ServiceUsage.STATUS_OK
        assert SystemServiceCurrentQuantity.objects.get(service=self.cp_service_1).quantity == 10
        assert SystemServiceCurrentQuantity.objects.get(service=self.cp_service_2).quantity == 20
        assert SystemServiceCurrentQuantity.objects.get(service=self.unallocated_service).quantity == 40
        assert SystemServiceCurrentQuantity.objects.count() == 3

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
            ]
        }
        now = datetime.datetime.utcnow()
        serializer = SystemServiceCurrentQuantitySerializer(instance=self.system, data=data)
        assert serializer.is_valid()
        ret = serializer.save()
        self.system.refresh_from_db()
        local_recording_type = ChannelPartnerService.SERVICE_TYPE_TO_CODE_MAP[ChannelPartnerService.LOCAL_RECORDING]
        cloud_storage_type = ChannelPartnerService.SERVICE_TYPE_TO_CODE_MAP[ChannelPartnerService.CLOUD_STORAGE]
        assert ret.security_statuses['types'][local_recording_type]['status'] == ServiceUsage.STATUS_OK
        assert ret.security_statuses['types'][cloud_storage_type]['status'] == ServiceUsage.STATUS_OK
        assert SystemServiceCurrentQuantity.objects.get(service=self.cp_service_1).quantity == 10
        assert SystemServiceCurrentQuantity.objects.get(service=self.cp_service_2).quantity == 20
        assert SystemServiceCurrentQuantity.objects.count() == 2