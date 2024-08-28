import structlog
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from channel_partners.mixins.descendant_version_mixin import (
    DescendantVersionMixin,
)
from partners.models import (
    ChannelPartner,
    ServiceToOrganizationProperties,
)
from partners.receivers.utils import disable_for_loaddata
from partners.services.cache_service import CacheService


logger = structlog.getLogger()


@receiver(post_save, sender=ServiceToOrganizationProperties)
@disable_for_loaddata
def on_service_to_organization_properties_saved(
        sender: ServiceToOrganizationProperties,
        instance: ServiceToOrganizationProperties,
        created: bool = False,
        **kwargs
) -> None:
    def on_commit_callback():
        logger.debug(
            "ServiceToOrganizationProperties changed - Incrementing Version",
            id=instance.id,
            organization_id=instance.organization_id)
        instance.organization.increment_version()
        increment_descendant_version_of_ancestors(instance)

    transaction.on_commit(on_commit_callback)


def increment_descendant_version_of_ancestors(instance: ServiceToOrganizationProperties):
    # Get the ids of the ancestor ChannelPartner instances
    ancestor_ids = instance.organization.path
    logger.debug("Incrementing descendant version of ancestor of Channel Partner", ancestors=ancestor_ids)
    if ancestor_ids:
        CacheService.bulk_increment(
            ancestor_ids,
            ChannelPartner,
            'descendant_version',
            DescendantVersionMixin)
