import pytest
from django.utils import timezone

from partners.models import ServiceToSystemProperties


class TestServiceToSystemProperties:

    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory, system_factory, cp_service_factory):
        self.channel_partner = channel_partner_factory()
        self.organization = organization_factory(channel_partner=self.channel_partner)
        self.system = system_factory(organization=self.organization)
        self.service = cp_service_factory(channel_partner=self.channel_partner)
        self.exp_date = timezone.now() - timezone.timedelta(days=1)

    def test_set_service_expiration_date_new_record(self):
        self.exp_date = timezone.now()
        assert ServiceToSystemProperties.objects.count() == 0
        ServiceToSystemProperties._set_service_expiration_date(
            service_id=self.service.id,
            cloud_system_id=self.system.id,
            expiration_date=self.exp_date
        )
        assert ServiceToSystemProperties.objects.count() == 1
        record = ServiceToSystemProperties.objects.first()
        assert record.service == self.service
        assert record.cloud_system == self.system
        assert record.expiration_date == self.exp_date

    def test_set_service_expiration_date_existing_record(self):
        self.exp_date = timezone.now() - timezone.timedelta(days=1)
        assert ServiceToSystemProperties.objects.count() == 0
        ServiceToSystemProperties.objects.create(
            service_id=self.service.id,
            cloud_system_id=self.system.id,
            expiration_date=self.exp_date
        )
        assert ServiceToSystemProperties.objects.count() == 1
        ServiceToSystemProperties._set_service_expiration_date(
            service_id=self.service.id,
            cloud_system_id=self.system.id,
            expiration_date=timezone.now()
        )
        assert ServiceToSystemProperties.objects.count() == 1
        record = ServiceToSystemProperties.objects.first()
        assert record.expiration_date == self.exp_date

    def test_set_service_expiration_date_expiration_not_set(self):
        ServiceToSystemProperties.objects.create(
            service_id=self.service.id,
            cloud_system_id=self.system.id,
        )
        assert ServiceToSystemProperties.objects.count() == 1
        ServiceToSystemProperties._set_service_expiration_date(
            service_id=self.service.id,
            cloud_system_id=self.system.id,
            expiration_date=self.exp_date
        )
        assert ServiceToSystemProperties.objects.count() == 1
        record = ServiceToSystemProperties.objects.first()
        assert record.expiration_date == self.exp_date
