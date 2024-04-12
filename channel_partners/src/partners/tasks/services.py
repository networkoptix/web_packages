import uuid
from typing import List

import structlog
from celery import shared_task
from celery.exceptions import Retry
from django.core.cache import caches
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
    negation_records = ChannelPartnerServiceRecord.check_expired_services()
    logger.info("Expired services are checked.", negation_records_count=len(negation_records))


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


NEGATION_MAX_RETRIES = 5
NEGATION_RETRY_DELAY = 120
NEGATION_LOCK_KEY = "service_negation_lock_{organization_id}"


@shared_task(retry_kwargs={'max_retries': NEGATION_MAX_RETRIES,
                           'countdown': NEGATION_RETRY_DELAY})
def organization_systems_negation_task(
        organization_id: str | uuid.UUID,
        systems_ids: List[int]
):
    """
    Negates service for given systems id in organization.
    :param organization_id: Organization id which services need to be negated for
    :param systems_ids: list of systems ids. NOTE. this is the list of CloudSystemId.id.
    """
    from partners.models import (
        ChannelPartnerServiceRecord,
        Organization,
        ServiceRecordTypes,
    )
    lock_key = NEGATION_LOCK_KEY.format(organization_id=organization_id)
    try:
        organization = Organization.objects.get(id=organization_id)
    except Organization.DoesNotExist:
        logger.warning("Cannot find organization. Task cancelled",
                       organization_id=organization_id)
        return None
    if not caches['default'].add(lock_key, f"{uuid.uuid4()}", timeout=300):
        raise Retry(message=f"There is running negation for organization {organization_id}")
    service_records = ChannelPartnerServiceRecord.objects.filter(
        organization=organization,
        cloud_system_id__in=systems_ids,
        negation_record__isnull=True,
    ).exclude(
        record_type=ServiceRecordTypes.NEGATION
    )
    try:
        with transaction.atomic():
            return ChannelPartnerServiceRecord.negate_services(service_records)
    except Exception as ex:
        logger.critical("Exception occurred while negating service records",
                        organization_id=organization_id,
                        exception=f'{ex}')
        raise Retry(message=f"Exception occurred while negating service "
                            f"records for organization {organization_id}")
    finally:
        caches['default'].delete(lock_key)
