import pytest

from partners.models import (
    ChannelPartnerPriceChange,
    OrganizationPriceChange,
    ServiceToOrganizationProperties,
    ServiceToSubChannelProperties,
)


class TestOrganizationPriceChange:

    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory, cp_service_factory):
        self.channel_partner = channel_partner_factory()
        self.organization = organization_factory(channel_partner=self.channel_partner)
        self.service = cp_service_factory(channel_partner=self.channel_partner)

    def test_create_organization_price_change(self):
        assert OrganizationPriceChange.objects.count() == 0
        properties = ServiceToOrganizationProperties.objects.create(
            organization=self.organization,
            service=self.service,
            price=100
        )
        assert OrganizationPriceChange.objects.count() == 1
        price_change = OrganizationPriceChange.objects.first()
        assert price_change.service_properties == properties
        assert price_change.price == 100
        assert price_change.created_ts == properties.created_ts

    def test_create_organization_price_change_null(self):
        assert OrganizationPriceChange.objects.count() == 0
        properties = ServiceToOrganizationProperties.objects.create(
            organization=self.organization,
            service=self.service,
        )
        assert OrganizationPriceChange.objects.count() == 1
        price_change = OrganizationPriceChange.objects.first()
        assert price_change.service_properties == properties
        assert price_change.price is None
        assert price_change.created_ts == properties.created_ts

    def test_organization_price_change(self):
        assert OrganizationPriceChange.objects.count() == 0
        properties = ServiceToOrganizationProperties.objects.create(
            organization=self.organization,
            service=self.service,
            price=100
        )
        properties.price = 200
        properties.save()
        assert OrganizationPriceChange.objects.count() == 2
        price_change = OrganizationPriceChange.objects.order_by('-created_ts').first()
        assert price_change.service_properties == properties
        assert price_change.price == 200
        assert price_change.created_ts != properties.created_ts

    def test_organization_price_change_null(self):
        assert OrganizationPriceChange.objects.count() == 0
        properties = ServiceToOrganizationProperties.objects.create(
            organization=self.organization,
            service=self.service,
            price=100
        )
        properties.price = None
        properties.save()
        assert OrganizationPriceChange.objects.count() == 2
        price_change = OrganizationPriceChange.objects.order_by('-created_ts').first()
        assert price_change.service_properties == properties
        assert price_change.price is None
        assert price_change.created_ts != properties.created_ts


class TestChannelPartnerPriceChange:

    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory, cp_service_factory):
        self.channel_partner = channel_partner_factory()
        self.sub_channel = channel_partner_factory(parent_channel_partner=self.channel_partner)
        self.service = cp_service_factory(channel_partner=self.channel_partner)

    def test_create_channel_partner_price_change(self):
        assert ChannelPartnerPriceChange.objects.count() == 0
        properties = ServiceToSubChannelProperties.objects.create(
            channel_partner=self.sub_channel,
            service=self.service,
            price=100
        )
        assert ChannelPartnerPriceChange.objects.count() == 1
        price_change = ChannelPartnerPriceChange.objects.first()
        assert price_change.service_properties == properties
        assert price_change.price == 100
        assert price_change.created_ts == properties.created_ts

    def test_create_channel_partner_price_change_null(self):
        assert ChannelPartnerPriceChange.objects.count() == 0
        properties = ServiceToSubChannelProperties.objects.create(
            channel_partner=self.sub_channel,
            service=self.service,
        )
        assert ChannelPartnerPriceChange.objects.count() == 1
        price_change = ChannelPartnerPriceChange.objects.first()
        assert price_change.service_properties == properties
        assert price_change.price is None
        assert price_change.created_ts == properties.created_ts

    def test_channel_partner_price_change(self):
        assert ChannelPartnerPriceChange.objects.count() == 0
        properties = ServiceToSubChannelProperties.objects.create(
            channel_partner=self.sub_channel,
            service=self.service,
            price=100
        )
        properties.price = 200
        properties.save()
        assert ChannelPartnerPriceChange.objects.count() == 2
        price_change = ChannelPartnerPriceChange.objects.order_by('-created_ts').first()
        assert price_change.service_properties == properties
        assert price_change.price == 200
        assert price_change.created_ts != properties.created_ts

    def test_channel_partner_price_change_null(self):
        assert ChannelPartnerPriceChange.objects.count() == 0
        properties = ServiceToSubChannelProperties.objects.create(
            channel_partner=self.sub_channel,
            service=self.service,
            price=100
        )
        properties.price = None
        properties.save()
        assert ChannelPartnerPriceChange.objects.count() == 2
        price_change = ChannelPartnerPriceChange.objects.order_by('-created_ts').first()
        assert price_change.service_properties == properties
        assert price_change.price is None
        assert price_change.created_ts != properties.created_ts