from typing import Type

import structlog
from django.db import transaction
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
    ChannelPartnerToUser,
    CloudUser,
)
from partners.receivers.utils import disable_for_loaddata
from partners.services.cache_service import CacheService


logger = structlog.getLogger()


@receiver(post_save, sender=ChannelPartnerToUser)
@disable_for_loaddata
def on_channel_partner_to_user_saved(
        sender: Type[ChannelPartnerToUser],
        instance: ChannelPartnerToUser,
        **kwargs):
    def on_commit_callback():
        logger.debug(
            "Channel Partner to User saved - Incrementing Version",
            channel_partner_id=instance.channel_partner_id,
            user_id=instance.user_id)
        CloudUser.increment_version_by_id(instance.user_id)
        ChannelPartner.increment_version_by_id(instance.channel_partner_id)
        increment_descendant_version_of_ancestors(instance.channel_partner)

    transaction.on_commit(on_commit_callback)


@receiver(post_delete, sender=ChannelPartnerToUser)
@disable_for_loaddata
def on_channel_partner_to_user_deleted(
        sender: Type[ChannelPartnerToUser],
        instance: ChannelPartnerToUser,
        **kwargs):
    def on_commit_callback():

        channel_partner_id = None
        try:
            instance.channel_partner.increment_version()
            increment_descendant_version_of_ancestors(instance.channel_partner)
            channel_partner_id = instance.channel_partner_id
        except ChannelPartner.DoesNotExist:
            pass

        user_id = None
        try:
            instance.user.increment_version()
            user_id = instance.user_id
        except CloudUser.DoesNotExist:
            pass


        logger.debug(
            "Channel Partner to User deleted - Incrementing Version",
            channel_partner_id=channel_partner_id,
            user_id=user_id)


    transaction.on_commit(on_commit_callback)


def increment_descendant_version_of_ancestors(instance: ChannelPartner):
    # Get the ids of the ancestor ChannelPartner instances
    ancestor_ids = instance.path
    logger.debug(
        "Incrementing descendant version of ancestor of channel partner",
        channel_partner_name=instance.name,
        ancestor_ids=ancestor_ids)
    if ancestor_ids:
        CacheService.bulk_increment(
            ancestor_ids,
            ChannelPartner,
            'descendant_version',
            DescendantVersionMixin)
