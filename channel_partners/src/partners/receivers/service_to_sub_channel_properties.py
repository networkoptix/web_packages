import structlog
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from channel_partners.mixins.descendant_version_mixin import (
    DescendantVersionMixin,
)
from partners.models import (
    ChannelPartner,
    ServiceToSubChannelProperties,
)
from partners.receivers.utils import disable_for_loaddata
from partners.services.cache_service import CacheService


logger = structlog.getLogger()


@receiver(post_save, sender=ServiceToSubChannelProperties)
@disable_for_loaddata
def on_service_to_sub_channel_properties_saved(
        sender: ServiceToSubChannelProperties,
        instance: ServiceToSubChannelProperties,
        created: bool = False,
        **kwargs
) -> None:
    def on_commit_callback():
        logger.debug(
            "ServiceToSubChannelProperties changed - Incrementing Version",
            object_id=instance.id,
            channel_partner_id=instance.channel_partner_id)
        instance.channel_partner.increment_version()
        increment_descendant_version_of_ancestors(instance)

    transaction.on_commit(on_commit_callback)


def increment_descendant_version_of_ancestors(instance: ServiceToSubChannelProperties):
    # Get the ids of the ancestor ChannelPartner instances
    ancestor_ids = instance.channel_partner.path
    logger.debug("Incrementing descendant version of ancestor of Channel Partner", ancestor_ids=ancestor_ids)
    if ancestor_ids:
        CacheService.bulk_increment(
            ancestor_ids,
            ChannelPartner,
            'descendant_version',
            DescendantVersionMixin)
