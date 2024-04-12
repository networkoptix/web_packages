import pytest
from django.utils import timezone

from partners.models import (
    CloudSystemHistory,
    CloudSystemId,
)


class TestCloudSystemHistory:
    @pytest.fixture(autouse=True)
    def setup(self, organization_factory, system_factory):
        self.organization = organization_factory()
        self.other_organization = organization_factory()
        self.system = system_factory(organization=self.organization)

    def test_init_state(self):
        assert CloudSystemHistory.objects.count() == 1

    def test_add_history_record(self):
        assert CloudSystemHistory.objects.count() == 1
        assert CloudSystemHistory.objects.first().organization == self.organization
        assert CloudSystemHistory.objects.first().cloud_system == self.system
        assert CloudSystemHistory.objects.first().from_ts
        assert CloudSystemHistory.objects.first().to_ts is None
        CloudSystemId.objects.filter(id=self.system.id).update(organization=self.other_organization)
        self.system.refresh_from_db()
        CloudSystemHistory.add_history_record(cloud_system=self.system, ts=timezone.now())
        assert CloudSystemHistory.objects.count() == 2
        assert CloudSystemHistory.objects.order_by('from_ts').first().organization == self.organization
        assert CloudSystemHistory.objects.order_by('from_ts').first().cloud_system == self.system
        assert CloudSystemHistory.objects.order_by('from_ts').first().from_ts
        assert CloudSystemHistory.objects.order_by('from_ts').first().to_ts
        assert CloudSystemHistory.objects.order_by('from_ts').last().organization == self.other_organization
        assert CloudSystemHistory.objects.order_by('from_ts').last().cloud_system == self.system
        assert CloudSystemHistory.objects.order_by('from_ts').last().from_ts
        assert CloudSystemHistory.objects.order_by('from_ts').last().to_ts is None


