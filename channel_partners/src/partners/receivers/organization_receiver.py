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
    Organization,
)
from partners.receivers.utils import disable_for_loaddata
from partners.services.cache_service import CacheService


logger = structlog.getLogger()


# TODO: Find out: Should there also be a method to increment the version of CP's in path?

@receiver(post_save, sender=Organization)
@disable_for_loaddata
def on_organization_saved(sender: Type[Organization], instance: Organization, created: bool = False, **kwargs):
    def on_commit_callback():
        if not created:
            logger.debug(
                "Organization changed - Incrementing Version",
                organization_id=instance.id,
                path=instance.path,
                prior_version=instance.version,
                prior_descendant_version=instance.descendant_version)
            instance.increment_version()
        increment_related_users(instance)

        if instance.channel_partner_id:
            logger.debug(
                "Organization changed - Incrementing Version of Channel Partner",
                organization_id=instance.id,
                channel_partner_id=instance.channel_partner_id)
            instance.channel_partner.increment_descendant_version()
            CacheService.bulk_increment(
                instance.channel_partner.path,
                ChannelPartner,
                'descendant_version',
                DescendantVersionMixin)

    transaction.on_commit(on_commit_callback)


def increment_related_users(instance: Organization):
    # Get the ids of the related CloudUser instances
    user_ids = instance.users.values_list('id', flat=True)
    logger.debug(
        "Incrementing version of related Cloud User of Organization",
        organization_id=instance.id,
        user_ids=user_ids)
    if user_ids:
        CacheService.bulk_increment(
            list(user_ids),
            CloudUser,
            'version',
            VersionMixin)
