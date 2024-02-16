import io
import logging
import sys
from typing import List

from partners.models import ChannelPartnerService
from partners.tasks.services import new_channel_partner_service_created


class TestChannelPartnerService:
    NO_CP_FOUND = "No sub channel partners found"
    CREATED_CP = "Created new Channel Partner Service"

    def log_finder(self, logs, str_to_match) -> List[str]:
        matched_logs = []
        for log in logs:
            if str_to_match in log.message:
                matched_logs.append(log.message)
        return matched_logs

    def test_channel_partner_service_creation_1(self, caplog, channel_partner_factory, cp_service_factory):
        caplog.set_level(logging.INFO)
        sys.stdout = io.StringIO()

        root_cp = channel_partner_factory(parent_channel_partner=None)
        cp = channel_partner_factory(parent_channel_partner=root_cp)

        cp_service_factory(channel_partner=cp, service_type=ChannelPartnerService.LOCAL_RECORDING)

        assert len(ChannelPartnerService.objects.all()) == 1

        channel_partner_factory(parent_channel_partner=cp, name="Sub CP")

        assert len(ChannelPartnerService.objects.all()) == 2

        logs = caplog.records
        assert len(self.log_finder(logs, self.NO_CP_FOUND)) == 1
        assert len(self.log_finder(logs, self.CREATED_CP)) == 1

    def test_channel_partner_service_creation_2(self, caplog, channel_partner_factory, cp_service_factory):
        caplog.set_level(logging.INFO)
        sys.stdout = io.StringIO()

        root_cp = channel_partner_factory(parent_channel_partner=None)
        cp = channel_partner_factory(parent_channel_partner=root_cp)

        cp_service_factory(channel_partner=cp, service_type=ChannelPartnerService.LOCAL_RECORDING)
        cp_service_factory(channel_partner=cp, service_type=ChannelPartnerService.LOCAL_RECORDING)
        cp_service_factory(channel_partner=cp, service_type=ChannelPartnerService.LOCAL_RECORDING)

        assert len(ChannelPartnerService.objects.all()) == 3

        channel_partner_factory(parent_channel_partner=cp, name="Sub CP")

        assert len(ChannelPartnerService.objects.all()) == 6

        logs = caplog.records
        assert len(self.log_finder(logs, self.NO_CP_FOUND)) == 3
        assert len(self.log_finder(logs, self.CREATED_CP)) == 3

    def test_channel_partner_service_creation_3(self, caplog, channel_partner_factory, cp_service_factory):
        caplog.set_level(logging.INFO)
        sys.stdout = io.StringIO()

        root_cp = channel_partner_factory(parent_channel_partner=None)
        cp = channel_partner_factory(parent_channel_partner=root_cp)

        cp_service_factory(channel_partner=cp, service_type=ChannelPartnerService.LOCAL_RECORDING)
        cp_service_factory(channel_partner=cp, service_type=ChannelPartnerService.LOCAL_RECORDING)
        cp_service_factory(channel_partner=cp, service_type=ChannelPartnerService.LOCAL_RECORDING)

        assert len(ChannelPartnerService.objects.all()) == 3

        sub_cp = channel_partner_factory(parent_channel_partner=cp, name="Sub CP")
        sub_cp_sub = channel_partner_factory(parent_channel_partner=sub_cp, name="Sub CP - Sub")

        assert len(ChannelPartnerService.objects.all()) == 9

        logs = caplog.records
        assert len(self.log_finder(logs, self.NO_CP_FOUND)) == 3
        assert len(self.log_finder(logs, self.CREATED_CP)) == 6

    def test_channel_partner_service_creation_4(self, caplog, channel_partner_factory, cp_service_factory):
        caplog.set_level(logging.INFO)
        sys.stdout = io.StringIO()

        root_cp = channel_partner_factory(parent_channel_partner=None)
        cp = channel_partner_factory(parent_channel_partner=root_cp)

        cp_service_factory(channel_partner=cp, service_type=ChannelPartnerService.LOCAL_RECORDING)
        cp_service_factory(channel_partner=cp, service_type=ChannelPartnerService.LOCAL_RECORDING)
        cp_service_factory(channel_partner=cp, service_type=ChannelPartnerService.LOCAL_RECORDING)

        assert len(ChannelPartnerService.objects.all()) == 3

        sub_cp = channel_partner_factory(parent_channel_partner=cp, name="Sub CP")

        cp_service_factory(channel_partner=sub_cp, service_type=ChannelPartnerService.LOCAL_RECORDING)
        cp_service_factory(channel_partner=sub_cp, service_type=ChannelPartnerService.LOCAL_RECORDING)
        cp_service_factory(channel_partner=sub_cp, service_type=ChannelPartnerService.LOCAL_RECORDING)

        sub_cp_sub = channel_partner_factory(parent_channel_partner=sub_cp, name="Sub CP - Sub")

        assert len(ChannelPartnerService.objects.all()) == 15

        logs = caplog.records
        assert len(self.log_finder(logs, self.NO_CP_FOUND)) == 6
        assert len(self.log_finder(logs, self.CREATED_CP)) == 9

    def test_clone_new_channel_partner_service(self, channel_partner_factory, cp_service_factory):
        parent_cp = channel_partner_factory()
        child_cp1 = channel_partner_factory(parent_channel_partner=parent_cp, name="child_cp1")
        child_cp2 = channel_partner_factory(parent_channel_partner=parent_cp, name="child_cp2")
        child_cp2_cp1 = channel_partner_factory(parent_channel_partner=child_cp2, name="child_cp2_cp1")

        original_service = cp_service_factory(channel_partner=parent_cp)

        assert ChannelPartnerService.objects.filter(
            parent_service=original_service,
            created_by_channel_partner=child_cp1
        ).exists()

        assert ChannelPartnerService.objects.filter(
            parent_service=original_service,
            created_by_channel_partner=child_cp2
        ).exists()

        for cp in [child_cp1, child_cp2, child_cp2_cp1]:
            assert ChannelPartnerService.objects.filter(
                created_by_channel_partner=cp
            ).count() == 1

        new_channel_partner_service_created(original_service.id)

        for cp in [child_cp1, child_cp2, child_cp2_cp1]:
            assert ChannelPartnerService.objects.filter(
                created_by_channel_partner=cp
            ).count() == 1

    def test_no_cloning_when_no_channel_partners(
            self,
            caplog,
            channel_partner_factory, cp_service_factory
    ):
        caplog.set_level(logging.INFO)
        parent_cp = channel_partner_factory()
        original_service = cp_service_factory(channel_partner=parent_cp)
        new_channel_partner_service_created(original_service.id)

        assert self.NO_CP_FOUND in caplog.text
        assert self.CREATED_CP not in caplog.text

    def test_clone_multiple_services_with_precloned(self, channel_partner_factory, cp_service_factory):
        parent_cp = channel_partner_factory()
        child_cp = channel_partner_factory(parent_channel_partner=parent_cp)

        assert ChannelPartnerService.objects.count() == 0
        services_to_clone = [
            cp_service_factory(channel_partner=parent_cp) for _ in range(3)
        ]

        assert ChannelPartnerService.objects.count() == 6

        # Attempt to duplicate
        for service in services_to_clone:
            new_channel_partner_service_created(service.id)

        assert ChannelPartnerService.objects.count() == 6

        # Add a new child channel partner and clone services again
        new_child_cp = channel_partner_factory(parent_channel_partner=parent_cp)
        for service in services_to_clone:
            new_channel_partner_service_created(service.id)

        for original_service in services_to_clone:
            assert ChannelPartnerService.objects.filter(
                parent_service=original_service,
                created_by_channel_partner=new_child_cp
            ).exists()

            assert ChannelPartnerService.objects.count() == 9

    def test_clone_multiple_services_with_parent_services(
            self,
            channel_partner_factory,
            cp_service_factory
    ):
        parent_cp = channel_partner_factory()
        child_cp = channel_partner_factory(parent_channel_partner=parent_cp)

        assert ChannelPartnerService.objects.count() == 0
        parent_services = [
            cp_service_factory(channel_partner=parent_cp) for _ in range(3)]

        assert ChannelPartnerService.objects.count() == 6

        services_to_clone = [
            cp_service_factory(channel_partner=parent_cp, parent_service=parent_service)
            for parent_service in parent_services]

        assert ChannelPartnerService.objects.count() == 12

        for service in services_to_clone:
            new_channel_partner_service_created(service.id)

        for original_service in services_to_clone:
            assert ChannelPartnerService.objects.filter(
                parent_service=original_service.parent_service,
                created_by_channel_partner=child_cp
            ).exists()
        assert ChannelPartnerService.objects.count() == 12
