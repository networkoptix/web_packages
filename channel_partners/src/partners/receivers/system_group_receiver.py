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
from partners.models import SystemGroup
from partners.receivers.utils import (
    disable_for_loaddata,
    handle_organization_id_change,
)
from partners.services.cache_service import CacheService


logger = structlog.getLogger()


@receiver(post_save, sender=SystemGroup)
@disable_for_loaddata
def on_system_group_saved(
        sender: Type[SystemGroup],
        instance: SystemGroup,
        created: bool = False,
        **kwargs
) -> None:
    def on_commit_callback():
        if not created:
            logger.debug("System Group changed - Incrementing Version", system=instance.id)
            instance.increment_version()
        else:
            logger.debug("System Group created - Not Incrementing Version", system=instance.id)
        handle_organization_id_change(instance)
        increment_descendant_version_of_ancestors(instance)

    transaction.on_commit(on_commit_callback)


@receiver(post_delete, sender=SystemGroup)
@disable_for_loaddata
def on_system_group_deleted(sender: Type[SystemGroup], instance: SystemGroup, **kwargs):
    def on_commit_callback():
        logger.debug("System Group deleted - Incrementing Version", system=instance.id)
        handle_organization_id_change(instance)
        increment_descendant_version_of_ancestors(instance)

    transaction.on_commit(on_commit_callback)


def increment_descendant_version_of_ancestors(instance: SystemGroup):
    # Get the ids of the ancestor ChannelPartner instances
    ancestor_ids = instance.groups_path
    logger.debug(
        "Incrementing descendant version of ancestor of system group",
        name=instance.name,
        ancestors=ancestor_ids)
    if ancestor_ids:
        CacheService.bulk_increment(
            ancestor_ids,
            SystemGroup,
            'descendant_version',
            DescendantVersionMixin)
