from typing import Type

import structlog
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from channel_partners.mixins.descendant_version_mixin import (
    DescendantVersionMixin,
)
from channel_partners.mixins.version_mixin import VersionMixin
from partners.models import (
    ChannelPartner,
    CloudUser,
)
from partners.receivers.utils import disable_for_loaddata
from partners.services.cache_service import CacheService


logger = structlog.getLogger()


@receiver(post_save, sender=ChannelPartner)
@disable_for_loaddata
def on_channel_partner_saved(
        sender: Type[ChannelPartner],
        instance: ChannelPartner,
        created: bool = False,
        **kwargs
) -> None:
    def on_commit_callback():
        if not created:
            logger.debug(
                "Channel Partner changed - Incrementing Version",
                name=instance.name,
                path=instance.path,
                prior_version=instance.version,
                prior_descendant_version=instance.descendant_version)
            # Direct change to Channel Partner
            instance.increment_version()

        # Increment the descendant version of all ancestors
        increment_descendant_version_of_ancestors(instance)
        # Increment the version of related CloudUser instances
        increment_related_users(instance)

    transaction.on_commit(on_commit_callback)


def increment_related_users(instance: ChannelPartner):
    # Get the ids of the related CloudUser instances
    user_ids = instance.users.values_list('id', flat=True)
    if user_ids:
        logger.debug(
            "Incrementing version of related Cloud User of Channel Partner",
            channel_partner_name=instance.name,
            users=user_ids)
        # Setting to cache
        CacheService.bulk_increment(
            list(user_ids),
            CloudUser,
            'version',
            VersionMixin)


def increment_descendant_version_of_ancestors(instance: ChannelPartner):
    ancestor_ids = instance.path
    if ancestor_ids:
        logger.debug(
            "Incrementing descendant version of ancestor of channel partner",
            name=instance.name,
            ancestors=ancestor_ids)
        # Setting to cache
        CacheService.bulk_increment(
            ancestor_ids,
            ChannelPartner,
            'descendant_version',
            DescendantVersionMixin)
