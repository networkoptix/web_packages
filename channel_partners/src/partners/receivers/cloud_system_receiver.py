from typing import Type

import structlog
from django.db import transaction

from channel_partners.mixins.descendant_version_mixin import (
    DescendantVersionMixin,
)
from partners.receivers.utils import handle_organization_id_change


logger = structlog.getLogger()


def on_cloud_system_saved(
        sender: Type['CloudSystemId'],
        instance: 'CloudSystemId',
        is_new: bool,
        groups_changed: bool,
        **kwargs
) -> None:
    def on_commit_callback():
        """
        This is not being used as a full signal. It's connected directly to the transaction.on_commit signal in the CloudSystem model.
        """
        # instance is being updated, not created
        if not is_new:
            logger.debug(
                "[NOT NEW] - Cloud System changed - Incrementing Version",
                id=instance.id,
                path=instance.path)
            instance.increment_version()
        handle_organization_id_change(instance)
        increment_descendant_version_of_ancestors(instance)

        if groups_changed:
            logger.debug("Cloud System Group Changed - Updating path in cache", system=instance.id)
            instance.update_cached_path()

    transaction.on_commit(on_commit_callback)


def increment_descendant_version_of_ancestors(instance: 'CloudSystemId'):
    from partners.services.cache_service import CacheService

    ids = instance.systems_path_version_keys
    logger.debug(
        "Updating ancestors of cloud system",
        name=instance.name,
        ids=ids)
    if ids:
        CacheService.bulk_increment_multiple_types(
            ids,
            'descendant_version',
            DescendantVersionMixin)
