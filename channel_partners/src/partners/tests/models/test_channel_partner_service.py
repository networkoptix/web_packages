import io
import logging
import sys
from unittest.mock import patch

import pytest
from django.db import transaction

from partners.models import ChannelPartnerService
from partners.tasks.services import new_channel_partner_service_created


@pytest.mark.django_db(transaction=False)
def test_channel_partner_service_creation_failure(channel_partner_factory, cp_service_factory,
                                                  django_capture_on_commit_callbacks):
    # Patch 'new_channel_partner_service_created' to track if it's called
    with patch('partners.tasks.services.new_channel_partner_service_created.apply_async') as mocked_task:
        # Start a transaction block
        with transaction.atomic():
            # Perform operations that would normally succeed and trigger on_commit callbacks
            root_cp = channel_partner_factory(parent_channel_partner=None)
            cp = channel_partner_factory(parent_channel_partner=root_cp)
            service = cp_service_factory(channel_partner=cp, service_type=ChannelPartnerService.LOCAL_RECORDING)

            # Force a failure by raising an exception, causing the transaction to roll back
            transaction.set_rollback(True)

        # Verify that the transaction was rolled back, so no ChannelPartnerService objects were created
        assert ChannelPartnerService.objects.count() == 0

        # Verify that 'new_channel_partner_service_created.apply_async' was not called since the transaction was rolled back
        mocked_task.assert_not_called()


def test_channel_partner_service_creation_1(
        channel_partner_factory,
        cp_service_factory,
        django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True) as callbacks:
        root_cp = channel_partner_factory(parent_channel_partner=None)
        cp = channel_partner_factory(parent_channel_partner=root_cp)
        cp_service_factory(channel_partner=cp, service_type=ChannelPartnerService.LOCAL_RECORDING)
    assert ChannelPartnerService.objects.count() == 1

    with django_capture_on_commit_callbacks(execute=True) as callbacks:
        channel_partner_factory(parent_channel_partner=cp, name="Sub CP")
    assert ChannelPartnerService.objects.count() == 2


@pytest.mark.django_db(transaction=False)
def test_channel_partner_service_creation_2(
        caplog,
        channel_partner_factory,
        cp_service_factory,
        django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True) as callbacks:
        caplog.set_level(logging.INFO)
        sys.stdout = io.StringIO()

        root_cp = channel_partner_factory(parent_channel_partner=None)
        cp = channel_partner_factory(parent_channel_partner=root_cp)

        # Create multiple services for the same channel partner
        for _ in range(3):
            cp_service_factory(channel_partner=cp, service_type=ChannelPartnerService.LOCAL_RECORDING)

    assert ChannelPartnerService.objects.count() == 3
    with django_capture_on_commit_callbacks(execute=True) as callbacks:
        # Adding a sub-channel partner should trigger additional services creation
        channel_partner_factory(parent_channel_partner=cp, name="Sub CP")

    assert ChannelPartnerService.objects.count() == 6

    logs = caplog.records
    assert len([log for log in logs if "No sub channel partners found" in log.message]) == 3
    assert len([log for log in logs if "Created new Channel Partner Service" in log.message]) == 3


@pytest.mark.django_db(transaction=False)
def test_channel_partner_service_creation_3(caplog, channel_partner_factory, cp_service_factory,
                                            django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True) as callbacks:
        caplog.set_level(logging.INFO)
        sys.stdout = io.StringIO()

        root_cp = channel_partner_factory(parent_channel_partner=None)
        cp = channel_partner_factory(parent_channel_partner=root_cp)

        # Create multiple services for the same channel partner
        for _ in range(3):
            cp_service_factory(channel_partner=cp, service_type=ChannelPartnerService.LOCAL_RECORDING)

    assert ChannelPartnerService.objects.count() == 3

    with django_capture_on_commit_callbacks(execute=True) as callbacks:
        # Adding sub-channel partners and their subs should trigger additional services creation
        sub_cp = channel_partner_factory(parent_channel_partner=cp, name="Sub CP")
        channel_partner_factory(parent_channel_partner=sub_cp, name="Sub CP - Sub")

    assert ChannelPartnerService.objects.count() == 9

    logs = caplog.records
    assert len([log for log in logs if "No sub channel partners found" in log.message]) == 3
    assert len([log for log in logs if "Created new Channel Partner Service" in log.message]) == 6


@pytest.mark.django_db(transaction=False)
def test_channel_partner_service_creation_4(
        caplog,
        channel_partner_factory,
        cp_service_factory,
        django_capture_on_commit_callbacks
):
    with django_capture_on_commit_callbacks(execute=True) as callbacks:
        caplog.set_level(logging.INFO)
        sys.stdout = io.StringIO()

        root_cp = channel_partner_factory(parent_channel_partner=None)
        cp = channel_partner_factory(parent_channel_partner=root_cp)

        # Create multiple services for the same channel partner
        for _ in range(3):
            cp_service_factory(channel_partner=cp, service_type=ChannelPartnerService.LOCAL_RECORDING)

    assert ChannelPartnerService.objects.count() == 3

    with django_capture_on_commit_callbacks(execute=True) as callbacks:
        # Adding a sub-channel partner and creating services for it
        sub_cp = channel_partner_factory(parent_channel_partner=cp, name="Sub CP")
        for _ in range(3):
            cp_service_factory(channel_partner=sub_cp, service_type=ChannelPartnerService.LOCAL_RECORDING)

        # Adding another level of sub-channel partner
        channel_partner_factory(parent_channel_partner=sub_cp, name="Sub CP - Sub")

    assert ChannelPartnerService.objects.count() == 15

    logs = caplog.records
    assert len([log for log in logs if "No sub channel partners found" in log.message]) == 6
    assert len([log for log in logs if "Created new Channel Partner Service" in log.message]) == 9


@pytest.mark.django_db(transaction=False)
def test_clone_new_channel_partner_service(channel_partner_factory, cp_service_factory,
                                           django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True) as callbacks:
        parent_cp = channel_partner_factory()
        child_cp1 = channel_partner_factory(parent_channel_partner=parent_cp, name="child_cp1")
        child_cp2 = channel_partner_factory(parent_channel_partner=parent_cp, name="child_cp2")
        child_cp2_cp1 = channel_partner_factory(parent_channel_partner=child_cp2, name="child_cp2_cp1")

        original_service = cp_service_factory(channel_partner=parent_cp)

        # Trigger the cloning process
        new_channel_partner_service_created(original_service.id)

        for cp in [child_cp1, child_cp2, child_cp2_cp1]:
            assert ChannelPartnerService.objects.filter(
                created_by_channel_partner=cp
            ).count() == 1


@pytest.mark.django_db(transaction=False)
def test_no_cloning_when_no_channel_partners(caplog, channel_partner_factory, cp_service_factory,
                                             django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True) as callbacks:
        caplog.set_level(logging.INFO)
        parent_cp = channel_partner_factory()
        original_service = cp_service_factory(channel_partner=parent_cp)

        # Trigger the cloning process without any sub channel partners
        new_channel_partner_service_created(original_service.id)

        assert "No sub channel partners found" in caplog.text
        assert "Created new Channel Partner Service" not in caplog.text


@pytest.mark.django_db(transaction=False)
def test_clone_multiple_services_with_precloned(channel_partner_factory, cp_service_factory,
                                                django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True) as callbacks:
        parent_cp = channel_partner_factory()
        child_cp = channel_partner_factory(parent_channel_partner=parent_cp)

        services_to_clone = [
            cp_service_factory(channel_partner=parent_cp) for _ in range(3)
        ]

    # Initially, each service should have a cloned version for the child channel partner
    assert ChannelPartnerService.objects.count() == 6

    with django_capture_on_commit_callbacks(execute=True) as callbacks:
        # Attempt to duplicate cloning should not increase the count
        for service in services_to_clone:
            new_channel_partner_service_created(service.id)

    assert ChannelPartnerService.objects.count() == 6

    with django_capture_on_commit_callbacks(execute=True) as callbacks:
        # Add a new child channel partner and clone services again
        new_child_cp = channel_partner_factory(parent_channel_partner=parent_cp)
        for service in services_to_clone:
            new_channel_partner_service_created(service.id)

        # Verify that new clones are created only for the new child channel partner
        for original_service in services_to_clone:
            assert ChannelPartnerService.objects.filter(
                parent_service=original_service,
                created_by_channel_partner=new_child_cp
            ).exists()

    assert ChannelPartnerService.objects.count() == 9


@pytest.mark.django_db(transaction=False)
def test_clone_multiple_services_with_parent_services(channel_partner_factory, cp_service_factory,
                                                      django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True) as callbacks:
        parent_cp = channel_partner_factory()
        child_cp = channel_partner_factory(parent_channel_partner=parent_cp)

        # Create parent services
        parent_services = [
            cp_service_factory(channel_partner=parent_cp) for _ in range(3)
        ]

    # Initially, each service should have a cloned version for the child channel partner
    assert ChannelPartnerService.objects.count() == 6

    with django_capture_on_commit_callbacks(execute=True) as callbacks:
        # Create services that are children of the parent services
        services_to_clone = [
            cp_service_factory(channel_partner=parent_cp, parent_service=parent_service)
            for parent_service in parent_services
        ]

        # Trigger cloning process for these new services
        for service in services_to_clone:
            new_channel_partner_service_created(service.id)

    # Verify that clones for the new services are created for the child channel partner
    for original_service in services_to_clone:
        assert ChannelPartnerService.objects.filter(
            parent_service=original_service.parent_service,
            created_by_channel_partner=child_cp
        ).exists()

    # The count should remain the same since these services were already cloned
    assert ChannelPartnerService.objects.count() == 12
