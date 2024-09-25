import pytest
from django.utils import timezone

from partners.models import ServiceToOrganizationProperties


class TestServiceToOrganizationProperties:

    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory, cp_service_factory):
        self.channel_partner = channel_partner_factory()
        self.organization = organization_factory(channel_partner=self.channel_partner)
        self.service = cp_service_factory(channel_partner=self.channel_partner)
        self.exp_date = timezone.now() - timezone.timedelta(days=1)

    def test_add_service_expiration_new_record(self):
        self.exp_date = timezone.now()
        assert ServiceToOrganizationProperties.objects.count() == 0
        ServiceToOrganizationProperties.add_service_expiration(
            service_id=self.service.id,
            organization_id=self.organization.id,
            expiring_at=self.exp_date
        )
        assert ServiceToOrganizationProperties.objects.count() == 1
        record = ServiceToOrganizationProperties.objects.first()
        assert record.service == self.service
        assert record.organization == self.organization
        assert record.expiring_at == self.exp_date

    def test_add_service_expiration_existing_record(self):
        self.exp_date = timezone.now() - timezone.timedelta(days=1)
        assert ServiceToOrganizationProperties.objects.count() == 0
        ServiceToOrganizationProperties.objects.create(
            service_id=self.service.id,
            organization_id=self.organization.id,
            expiring_at=self.exp_date
        )
        assert ServiceToOrganizationProperties.objects.count() == 1
        ServiceToOrganizationProperties.add_service_expiration(
            service_id=self.service.id,
            organization_id=self.organization.id,
            expiring_at=timezone.now()
        )
        assert ServiceToOrganizationProperties.objects.count() == 1
        record = ServiceToOrganizationProperties.objects.first()
        assert record.expiring_at == self.exp_date
        
    def test_add_service_expiration_expiration_not_set(self):
        ServiceToOrganizationProperties.objects.create(
            service=self.service,
            organization=self.organization
        )
        assert ServiceToOrganizationProperties.objects.count() == 1
        ServiceToOrganizationProperties.add_service_expiration(
            service_id=self.service.id,
            organization_id=self.organization.id,
            expiring_at=self.exp_date
        )
        assert ServiceToOrganizationProperties.objects.count() == 1
        record = ServiceToOrganizationProperties.objects.first()
        assert record.expiring_at == self.exp_date
