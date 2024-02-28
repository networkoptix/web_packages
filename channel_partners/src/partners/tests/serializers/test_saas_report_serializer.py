from datetime import (
    datetime,
    timedelta,
)

import pytest
from django.utils import timezone

from partners.models import (
    ChannelPartnerService,
    ChannelPartnerServiceRecord,
    ServiceUsage,
)
from partners.serializers import SaaSReportSerializer


class TestSaaSReportSerializer:

    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, cp_service_factory, organization_factory, system_factory,
              service_record_factory):
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
        self.analytics_service = cp_service_factory(
            channel_partner=self.cp, service_type=ChannelPartnerService.ANALYTICS)
        self.analytics_service_record = service_record_factory(self.analytics_service,
                                                               cloud_system=self.system,
                                                               organization=self.organization,
                                                               quantity=self.service_quantity)
        self.service_types_map = ChannelPartnerService.SERVICE_TYPE_TO_CODE_MAP
        self.services = [
            self.local_recording_service,
            self.analytics_service,
            self.cloud_storage_service,
        ]

    def test_no_service_records(self, mocker):
        ChannelPartnerServiceRecord.objects.all().delete()
        spy_check_excess = mocker.spy(ServiceUsage, 'check_excess')
        self.system.refresh_security_statuses()
        serializer = SaaSReportSerializer(instance=self.system)
        security = serializer.data['security']
        # Security datetime is naive
        assert datetime.fromisoformat(security['lastCheck']) > datetime.now() - timedelta(hours=1)
        status = security['status']
        assert status[self.service_types_map[ChannelPartnerService.LOCAL_RECORDING]]['status'] == ServiceUsage.STATUS_OK
        assert status[self.service_types_map[ChannelPartnerService.ANALYTICS]]['status'] == ServiceUsage.STATUS_OK
        assert status[self.service_types_map[ChannelPartnerService.CLOUD_STORAGE]]['status'] == ServiceUsage.STATUS_OK
        assert security['statusIds'] == {}
        assert spy_check_excess.call_count == 1

    def test_no_usage(self):

        self.system.refresh_security_statuses()
        serializer = SaaSReportSerializer(instance=self.system)
        security = serializer.data['security']
        # Security datetime is naive
        assert datetime.fromisoformat(security['lastCheck']) > datetime.now() - timedelta(hours=1)
        status = security['status']
        assert status[self.service_types_map[ChannelPartnerService.LOCAL_RECORDING]]['status'] == ServiceUsage.STATUS_OK
        assert status[self.service_types_map[ChannelPartnerService.ANALYTICS]]['status'] == ServiceUsage.STATUS_OK
        assert status[self.service_types_map[ChannelPartnerService.CLOUD_STORAGE]]['status'] == ServiceUsage.STATUS_OK
        assert security['statusIds'][str(self.local_recording_service.id)]['status'] == ServiceUsage.STATUS_OK
        assert security['statusIds'][str(self.analytics_service.id)]['status'] == ServiceUsage.STATUS_OK
        assert security['statusIds'][str(self.cloud_storage_service.id)]['status'] == ServiceUsage.STATUS_OK

    def test_usage_no_excess(self, service_usage_factory, cloud_storage_usage_factory):
        cloud_storage_usage = cloud_storage_usage_factory(
            system=self.system,
            service=self.cloud_storage_service,
            usage=ServiceUsage.get_usage_from_quantity(self.cloud_storage_service.type, self.service_quantity - 1),
            ts=timezone.now() - timedelta(hours=24),
        )
        local_recording_usage = service_usage_factory(
            system=self.system,
            service=self.local_recording_service,
            usage=ServiceUsage.get_usage_from_quantity(self.local_recording_service.type,
                                                       self.service_quantity - 1),
            to_ts=timezone.now() - timedelta(hours=24),
        )
        analytics_usage = service_usage_factory(
            system=self.system,
            service=self.analytics_service,
            usage=ServiceUsage.get_usage_from_quantity(self.analytics_service.type,
                                                       self.service_quantity - 1),
            to_ts=timezone.now() - timedelta(hours=24),
        )
        self.system.refresh_security_statuses()
        serializer = SaaSReportSerializer(instance=self.system)
        security = serializer.data['security']
        # Security datetime is naive
        assert datetime.fromisoformat(security['lastCheck']) > datetime.now() - timedelta(hours=1)
        status = security['status']
        assert status[self.service_types_map[ChannelPartnerService.LOCAL_RECORDING]]['status'] == ServiceUsage.STATUS_OK
        assert status[self.service_types_map[ChannelPartnerService.ANALYTICS]]['status'] == ServiceUsage.STATUS_OK
        assert status[self.service_types_map[ChannelPartnerService.CLOUD_STORAGE]]['status'] == ServiceUsage.STATUS_OK
        assert security['statusIds'][str(self.local_recording_service.id)]['status'] == ServiceUsage.STATUS_OK
        assert security['statusIds'][str(self.analytics_service.id)]['status'] == ServiceUsage.STATUS_OK
        assert security['statusIds'][str(self.cloud_storage_service.id)]['status'] == ServiceUsage.STATUS_OK

    def test_usage_with_excess(self, service_usage_factory, cloud_storage_usage_factory, mocker):
        spy_check_excess = mocker.spy(ServiceUsage, 'check_excess')
        cloud_storage_usage = cloud_storage_usage_factory(
            system=self.system,
            service=self.cloud_storage_service,
            usage=ServiceUsage.get_usage_from_quantity(self.cloud_storage_service.type, self.service_quantity * 2),
            ts=timezone.now() - timedelta(hours=24),
        )
        local_recording_usage = service_usage_factory(
            system=self.system,
            service=self.local_recording_service,
            usage=ServiceUsage.get_usage_from_quantity(self.local_recording_service.type,
                                                       self.service_quantity - 1),
            to_ts=timezone.now() - timedelta(hours=24),
        )
        analytics_usage = service_usage_factory(
            system=self.system,
            service=self.analytics_service,
            usage=ServiceUsage.get_usage_from_quantity(self.analytics_service.type,
                                                       self.service_quantity * 2),
            to_ts=timezone.now() - timedelta(hours=24),
        )
        self.system.refresh_security_statuses()
        serializer = SaaSReportSerializer(instance=self.system)
        security = serializer.data['security']
        # Security datetime is naive
        assert datetime.fromisoformat(security['lastCheck']) > datetime.now() - timedelta(hours=1)
        status = security['status']
        assert (status[self.service_types_map[ChannelPartnerService.LOCAL_RECORDING]]['status']
                == ServiceUsage.STATUS_OK)
        assert (status[self.service_types_map[ChannelPartnerService.ANALYTICS]]['status']
                == ServiceUsage.STATUS_OVER_USE)
        assert (status[self.service_types_map[ChannelPartnerService.CLOUD_STORAGE]]['status']
                == ServiceUsage.STATUS_OVER_USE)
        assert security['statusIds'][str(self.local_recording_service.id)]['status'] == ServiceUsage.STATUS_OK
        assert security['statusIds'][str(self.analytics_service.id)]['status'] == ServiceUsage.STATUS_OVER_USE
        assert security['statusIds'][str(self.cloud_storage_service.id)]['status'] == ServiceUsage.STATUS_OVER_USE
        assert spy_check_excess.call_count == 1
