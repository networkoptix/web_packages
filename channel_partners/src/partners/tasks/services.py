import uuid

import structlog
from celery import shared_task
from django.db import transaction
from django.db.models.query import QuerySet

from partners.services.channel_partner_service_service import (
    ChannelPartnerServiceService,
)


logger = structlog.getLogger(__name__)

"""
Notes
- These functions will blindly create new services and must be checked in function that's calling. 
    - Consider adding an additional check.
"""


@shared_task
def check_expired_services_task():
    from partners.models import ChannelPartnerServiceRecord
    with transaction.atomic():
        negation_records = ChannelPartnerServiceRecord.check_expired_services()
    logger.info(f"Expired services are checked.", negation_records_count=negation_records)


@shared_task
def new_channel_partner_service_created(channel_partner_service_pk: uuid.UUID) -> None:
    from partners.models import ChannelPartnerService

    def clone_service(service_pk):
        service: ChannelPartnerService = ChannelPartnerService.objects.get(pk=service_pk)
        channel_partners = service.created_by_channel_partner.channel_partners.all()

        if len(channel_partners) == 0:
            logger.info(
                "No sub channel partners found",
                service=service.pk,
                cp_pk=service.created_by_channel_partner.pk
            )
            return

        for channel_partner in channel_partners:
            existing_clone = ChannelPartnerService.objects.filter(
                parent_service=service,
                created_by_channel_partner=channel_partner
            ).first()

            if existing_clone:
                logger.info(
                    "Clone already exists for this channel partner, skipping",
                    original_service_pk=service_pk,
                    existing_clone_pk=existing_clone.pk,
                    channel_partner_pk=channel_partner.pk,
                    channel_partner_name=channel_partner.name
                )
                continue

            cloned_service = ChannelPartnerServiceService.clone(channel_partner, service)

            logger.info(
                "Created new Channel Partner Service",
                original_service_pk=service_pk,
                cloned_service_pk=cloned_service.pk,
                channel_partner_pk=channel_partner.pk,
                channel_partner_name=channel_partner.name
            )
            # Add the cloned service PK to the queue for further processing
            service_pks_to_clone.append(cloned_service.pk)

    # Initialize a list to keep track of service PKs to clone
    service_pks_to_clone = [channel_partner_service_pk]

    # Process all service PKs to clone
    with transaction.atomic():
        while service_pks_to_clone:
            current_service_pk = service_pks_to_clone.pop(0)
            clone_service(current_service_pk)


@shared_task
def new_channel_partner_created(channel_partner_pk: uuid.UUID) -> None:
    from partners.models import (
        ChannelPartner,
        ChannelPartnerService,
    )

    with transaction.atomic():
        channel_partner: ChannelPartner = ChannelPartner.objects.get(pk=channel_partner_pk)
        services: QuerySet[ChannelPartnerService] = channel_partner.parent_channel_partner.services.all()

        for service in services:
            # Check if the service has already been cloned for this partner to ensure idempotency
            if not ChannelPartnerService.objects.filter(
                    parent_service=service,
                    created_by_channel_partner=channel_partner
            ).exists():
                # Clone service
                cloned_service: ChannelPartnerService = ChannelPartnerServiceService.clone(channel_partner, service)

                logger.info(
                    "Created new Channel Partner Service",
                    original_service_pk=service.pk,
                    cloned_service_pk=cloned_service.pk,
                    channel_partner_pk=channel_partner.pk,
                    channel_partner_name=channel_partner.name
                )
