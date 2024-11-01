from partners.models import (
    ChannelPartnerService,
    ServiceToSubChannelProperties,
)


class TestServiceToSubChannelProperties:

    def test_create_missing(
            self,
            cloud_test_host,
            channel_partner_factory,
            cp_service_factory,
            system_factory,
            django_capture_on_commit_callbacks
    ):
        with django_capture_on_commit_callbacks(execute=True):
            channel_partner = channel_partner_factory(name="cp")

            service = cp_service_factory(
                channel_partner=channel_partner,
                service_type=ChannelPartnerService.ANALYTICS,
                is_enabled=True)

            sub_channel_partner = channel_partner_factory(
                parent_channel_partner=channel_partner)

        assert ServiceToSubChannelProperties.objects.count() == 0

        with django_capture_on_commit_callbacks(execute=True):
            ServiceToSubChannelProperties.create_missing(sub_channel_partner.id)

        assert ServiceToSubChannelProperties.objects.count() == 1
        prop = ServiceToSubChannelProperties.objects.first()

        assert prop.channel_partner == sub_channel_partner
        assert prop.service == service
        assert prop.service.created_by_channel_partner == channel_partner

    def test_create_missing_idempotency(
            self,
            cloud_test_host,
            channel_partner_factory,
            cp_service_factory,
            system_factory,
            django_capture_on_commit_callbacks
    ):
        with django_capture_on_commit_callbacks(execute=True):
            channel_partner = channel_partner_factory(name="cp")
            sub_channel_partner = channel_partner_factory(parent_channel_partner=channel_partner)

        with django_capture_on_commit_callbacks(execute=True):
            cp_service_factory(channel_partner=channel_partner)


        with django_capture_on_commit_callbacks(execute=True):
            ServiceToSubChannelProperties.create_missing(sub_channel_partner.id)
        initial_count = ServiceToSubChannelProperties.objects.count()

        with django_capture_on_commit_callbacks(execute=True):
            ServiceToSubChannelProperties.create_missing(channel_partner.id)

        assert ServiceToSubChannelProperties.objects.count() == initial_count

        with django_capture_on_commit_callbacks(execute=True):
            cp_service_factory(channel_partner=channel_partner)

        with django_capture_on_commit_callbacks(execute=True):
            ServiceToSubChannelProperties.create_missing(sub_channel_partner.id)

        assert ServiceToSubChannelProperties.objects.count() == initial_count + 1


    def test_create_missing_multiple_services(
            self,
            cloud_test_host,
            channel_partner_factory,
            cp_service_factory,
            system_factory,
            django_capture_on_commit_callbacks
    ):
        with django_capture_on_commit_callbacks(execute=True):
            channel_partner = channel_partner_factory(name="cp")
            sub_channel_partner = channel_partner_factory(parent_channel_partner=channel_partner)

        with django_capture_on_commit_callbacks(execute=True):
            service1 = cp_service_factory(channel_partner=channel_partner)
            service2 = cp_service_factory(channel_partner=channel_partner)

        with django_capture_on_commit_callbacks(execute=True):
            ServiceToSubChannelProperties.create_missing(sub_channel_partner.id)

        # Refresh from db
        service1.refresh_from_db()
        service2.refresh_from_db()

        assert ServiceToSubChannelProperties.objects.count() == 2
        assert ServiceToSubChannelProperties.objects.filter(service=service1).exists()
        assert ServiceToSubChannelProperties.objects.filter(service=service2).exists()

    def test_create_missing_ignore_other_channel_partners(
            self,
            cloud_test_host,
            channel_partner_factory,
            cp_service_factory,
            system_factory,
            django_capture_on_commit_callbacks
    ):
        with django_capture_on_commit_callbacks(execute=True):
            channel_partner1 = channel_partner_factory(name="cp1")
            channel_partner2 = channel_partner_factory(name="cp2")
            sub_channel_partner = channel_partner_factory(parent_channel_partner=channel_partner1)
            channel_partner_factory(parent_channel_partner=channel_partner1)
            channel_partner_factory(parent_channel_partner=channel_partner2)

        with django_capture_on_commit_callbacks(execute=True):
            service1 = cp_service_factory(channel_partner=channel_partner1)
            service2 = cp_service_factory(channel_partner=channel_partner2)

        with django_capture_on_commit_callbacks(execute=True):
            ServiceToSubChannelProperties.create_missing(sub_channel_partner.id)

        # Refresh from db
        channel_partner1.refresh_from_db()
        channel_partner2.refresh_from_db()
        service1.refresh_from_db()
        service2.refresh_from_db()

        assert ServiceToSubChannelProperties.objects.count() == 1
        assert ServiceToSubChannelProperties.objects.filter(service=service1, channel_partner=sub_channel_partner).exists()
        assert not ServiceToSubChannelProperties.objects.filter(service=service2, channel_partner=sub_channel_partner).exists()


