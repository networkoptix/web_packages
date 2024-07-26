from typing import Type

import structlog
from django.db import transaction
from django.db.models.signals import (
    post_delete,
    post_save,
)
from django.dispatch import receiver

from partners.models import ChannelPartnerService
from partners.receivers.utils import disable_for_loaddata


logger = structlog.getLogger()


@receiver(post_save, sender=ChannelPartnerService)
@disable_for_loaddata
def on_channel_partner_service_saved(
        sender: Type[ChannelPartnerService],
        instance: ChannelPartnerService,
        created: bool = False,
        **kwargs
) -> None:
    def on_commit_callback():
        logger.debug(
            "Channel Partner Service saved - Incrementing Channel Partner that created it",
            id=instance.id,
            name=instance.name,
            channel_partner_id=instance.created_by_channel_partner_id)

        instance.created_by_channel_partner.increment_version()

    transaction.on_commit(on_commit_callback)

@receiver(post_delete, sender=ChannelPartnerService)
def on_channel_partner_service_deleted(
        sender: Type[ChannelPartnerService],
        instance: ChannelPartnerService,
        **kwargs
) -> None:
    def on_commit_callback():
        logger.debug(
            "Channel Partner Service deleted - Incrementing Channel Partner that created it",
            id=instance.id,
            name=instance.name,
            channel_partner_id=instance.created_by_channel_partner_id)

        instance.created_by_channel_partner.increment_version()

    transaction.on_commit(on_commit_callback)