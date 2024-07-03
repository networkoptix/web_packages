import pytest

from partners.models import ChannelPartnerService
from partners.serializers.v2.serializers import ServiceSerializer
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
