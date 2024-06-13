from typing import Type

import structlog
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from channel_partners.mixins.version_mixin import VersionMixin
from partners.models import (
    CloudUser,
    Organization,
)
from partners.receivers.utils import disable_for_loaddata
from partners.services.cache_service import CacheService


logger = structlog.getLogger()


@receiver(post_save, sender=Organization)
@disable_for_loaddata
def on_organization_saved(sender: Type[Organization], instance: Organization, created: bool = False, **kwargs):
    def on_commit_callback():
        if not created:
            logger.debug(
                "Organization changed - Incrementing Version",
                organization=instance.id,
                path=instance.path,
                prior_version=instance.version,
                prior_descendant_version=instance.descendant_version)
            instance.increment_version()
            increment_related_users(instance)

    transaction.on_commit(on_commit_callback)


def increment_related_users(instance: Organization):
    # Get the ids of the related CloudUser instances
    user_ids = instance.users.values_list('id', flat=True)
    logger.debug(
        "Incrementing version of related Cloud User of Organization",
        organization=instance.id,
        users=user_ids)
    if user_ids:
        CacheService.bulk_increment(
            list(user_ids),
            CloudUser,
            'version',
            VersionMixin)
