from typing import Type

import structlog
from django.db import transaction
from django.db.models.signals import (
    post_delete,
    post_save,
)
from django.dispatch import receiver

from channel_partners.mixins.version_mixin import VersionMixin
from partners.models import (
    ChannelPartner,
    CloudUser,
    Organization,
)
from partners.receivers.utils import disable_for_loaddata
from partners.services.cache_service import CacheService


logger = structlog.getLogger()


@receiver(post_save, sender=CloudUser)
@disable_for_loaddata
def on_cloud_user_saved(sender: Type[CloudUser], instance: CloudUser, created: bool = False, **kwargs):
    def on_commit_callback():
        if not created:
            logger.debug("Cloud User changed - Incrementing Version", user_id=instance.id)
            instance.increment_version()
            handle_channel_partner_to_user(instance)
            handle_organization_to_user(instance)

    transaction.on_commit(on_commit_callback)


@receiver(post_delete, sender=CloudUser)
@disable_for_loaddata
def on_cloud_user_deleted(sender: Type[CloudUser], instance: CloudUser, **kwargs):
    # TODO: Do i need to increment all the related organizations and Channel partners?
    def on_commit_callback():
        logger.debug("Cloud User deleted - Not Incrementing Version", user_id=instance.id)

    transaction.on_commit(on_commit_callback)


def handle_channel_partner_to_user(instance: CloudUser):
    # Get the ids of the related ChannelPartner instances
    channel_partner_ids = instance.channel_partners.values_list('id', flat=True)
    logger.debug(
        "Incrementing version of related Channel Partner of Cloud User",
        user_id=instance.id,
        channel_partner_ids=channel_partner_ids)
    if channel_partner_ids:
        CacheService.bulk_increment(
            list(channel_partner_ids),
            ChannelPartner,
            'version',
            VersionMixin)


def handle_organization_to_user(instance: CloudUser):
    # Get the ids of the related Organization instances
    organization_ids = instance.organizations.values_list('id', flat=True)
    logger.debug(
        "Incrementing version of related Organization of Cloud User",
        user_id=instance.id,
        organization_ids=organization_ids)
    if organization_ids:
        CacheService.bulk_increment(
            list(organization_ids),
            Organization,
            'version',
            VersionMixin)
