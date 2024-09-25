import pytest
from dateutil.parser import parse
from dateutil.relativedelta import relativedelta
from django.utils import timezone

from partners.models import ChannelPartnerService
from partners.serializers.v2.serializers import (
    ServiceExtendedSerializer,
    ServiceSerializer,
)
from tools.helpers import cast_uuid


class TestServiceSerializer:
    @pytest.fixture(autouse=True)
    def setup(self, default_channel_partner, channel_partner_factory, cp_service_factory,
              django_capture_on_commit_callbacks):

        self.parent_local_recording = cp_service_factory(
            channel_partner=default_channel_partner,
            service_type=ChannelPartnerService.LOCAL_RECORDING,
            sub_type=ChannelPartnerService.REGULAR,
        )
        self.parent_demo_analytic = cp_service_factory(
            channel_partner=default_channel_partner,
            service_type=ChannelPartnerService.ANALYTICS,
            sub_type=ChannelPartnerService.DEMO,
            duration=10
        )
        with django_capture_on_commit_callbacks(execute=True):
            self.cp = channel_partner_factory()

    def test_regular_service(self):
        local_recording = ChannelPartnerService.objects.get(parent_service=self.parent_local_recording)
        serializer = ServiceSerializer(local_recording)
        assert cast_uuid(serializer.data['id']) == local_recording.id
        assert cast_uuid(serializer.data['createdByChannelPartner']) == self.cp.id
        assert cast_uuid(serializer.data['parentServiceId']) == self.parent_local_recording.id
        assert serializer.data['type'] == 'local_recording'
        assert serializer.data['subType'] == 'regular'
        assert serializer.data['duration'] == 0

    def test_demo_service(self):
        demo_analytics = ChannelPartnerService.objects.get(parent_service=self.parent_demo_analytic)
        serializer = ServiceSerializer(demo_analytics)
        assert cast_uuid(serializer.data['id']) == demo_analytics.id
        assert cast_uuid(serializer.data['createdByChannelPartner']) == self.cp.id
        assert cast_uuid(serializer.data['parentServiceId']) == self.parent_demo_analytic.id
        assert serializer.data['type'] == 'analytics'
        assert serializer.data['subType'] == 'demo'
        assert serializer.data['duration'] == 10


class TestServiceExtendedSerializer:
    @pytest.fixture(autouse=True)
    def setup(self,
              default_channel_partner,
              channel_partner_factory,
              organization_factory,
              system_factory,
              cp_service_factory,
              service_record_factory,
              django_capture_on_commit_callbacks):
        self.organization = organization_factory(channel_partner=default_channel_partner)
        self.system = system_factory(organization=self.organization)
        self.parent_local_recording = cp_service_factory(
            channel_partner=default_channel_partner,
            service_type=ChannelPartnerService.LOCAL_RECORDING,
            sub_type=ChannelPartnerService.REGULAR,
        )
        self.creation_date = timezone.now() - relativedelta(months=2)
        service_record_factory(
            service=self.parent_local_recording,
            cloud_system=self.system,
            created_ts=self.creation_date
        )
        self.parent_demo_analytic = cp_service_factory(
            channel_partner=default_channel_partner,
            service_type=ChannelPartnerService.ANALYTICS,
            sub_type=ChannelPartnerService.DEMO,
            duration=10
        )
        service_record_factory(
            service=self.parent_demo_analytic,
            cloud_system=self.system,
            created_ts=self.creation_date
        )
        self.parent_demo_expired = cp_service_factory(
            channel_partner=default_channel_partner,
            service_type=ChannelPartnerService.CLOUD_STORAGE,
            sub_type=ChannelPartnerService.DEMO,
            duration=1
        )
        service_record_factory(
            service=self.parent_demo_expired,
            cloud_system=self.system,
            created_ts=self.creation_date
        )
        self.service_without_props = cp_service_factory(
            channel_partner=default_channel_partner,
            service_type=ChannelPartnerService.CLOUD_STORAGE,
            sub_type=ChannelPartnerService.REGULAR
        )

    def test_regular_service(self):
        serializer = ServiceExtendedSerializer(self.organization.all_services.get(id=self.parent_local_recording.id))
        assert cast_uuid(serializer.data['id']) == self.parent_local_recording.id
        assert serializer.data['expiringAt'] is None
        assert serializer.data['hidden'] is False

    def test_demo_service(self):
        serializer = ServiceExtendedSerializer(self.organization.all_services.get(id=self.parent_demo_analytic.id))
        assert cast_uuid(serializer.data['id']) == self.parent_demo_analytic.id
        assert parse(serializer.data['expiringAt']) == self.creation_date + relativedelta(months=10)
        assert serializer.data['hidden'] is False

    def test_demo_expired_service(self):
        serializer = ServiceExtendedSerializer(self.organization.all_services.get(id=self.parent_demo_expired.id))
        assert cast_uuid(serializer.data['id']) == self.parent_demo_expired.id
        assert parse(serializer.data['expiringAt']) == self.creation_date + relativedelta(months=1)
        assert serializer.data['hidden'] is True

    def test_service_without_props(self):
        serializer = ServiceExtendedSerializer(self.organization.all_services.get(id=self.service_without_props.id))
        assert cast_uuid(serializer.data['id']) == self.service_without_props.id
        assert serializer.data['expiringAt'] is None
        assert serializer.data['hidden'] is False

    def test_many(self):
        serializer = ServiceExtendedSerializer(self.organization.all_services, many=True)
        assert len(serializer.data) == 4