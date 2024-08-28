from typing import Type

import structlog
from django.db.models.signals import (
    post_delete,
    post_save,
)
from django.dispatch import receiver

from channel_partners.mixins.descendant_version_mixin import (
    DescendantVersionMixin,
)
from partners.models import (
    ChannelPartner,
    ChannelPartnerService,
)
from partners.receivers.utils import disable_for_loaddata
from partners.services.cache_service import CacheService


logger = structlog.getLogger()


# I guess i do have this receiver... Hooked up?
# NOTE: Don't have any version mixins on this.
@receiver(post_save, sender=ChannelPartnerService)
@disable_for_loaddata
def on_channel_partner_service_saved(
        sender: Type[ChannelPartnerService],
        instance: ChannelPartnerService,
        created: bool = False,
        **kwargs
) -> None:
    logger.debug(
        "Channel Partner Service changed - Incrementing Channel Partner that created it",
        id=instance.id,
        name=instance.name,
        channel_partner_id=instance.created_by_channel_partner_id)

    partner = instance.created_by_channel_partner
    partner.increment_version()
    if partner.parent_channel_partner_id is not None:
        partner.parent_channel_partner.increment_version()
    # Increment the descendant version of all ancestors
    CacheService.bulk_increment(
        partner.path,
        ChannelPartner,
        "descendant_version",
        DescendantVersionMixin, )


@receiver(post_delete, sender=ChannelPartnerService)
def on_channel_partner_service_deleted(
        sender: Type[ChannelPartnerService],
        instance: ChannelPartnerService,
        **kwargs
) -> None:
    logger.debug(
        "Channel Partner Service deleted - Incrementing Channel Partner that created it",
        id=instance.id,
        name=instance.name,
        channel_partner_id=instance.created_by_channel_partner_id)
    # TODO: FIX THIS -- null values.
    if instance.created_by_channel_partner_id is not None:
        partner = instance.created_by_channel_partner
        partner.increment_version()
        ancestors = partner.path
        CacheService.bulk_increment(
            ancestors,
            ChannelPartner,
            "descendant_version",
            DescendantVersionMixin, )
