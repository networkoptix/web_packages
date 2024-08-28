import structlog
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from channel_partners.mixins.descendant_version_mixin import (
    DescendantVersionMixin,
)
from partners.models import ServiceUsage
from partners.receivers.utils import disable_for_loaddata
from partners.services.cache_service import CacheService


logger = structlog.getLogger()


# I guess i do have this receiver... Hooked up?
# NOTE: Don't have any version mixins on this.
@receiver(post_save, sender=ServiceUsage)
@disable_for_loaddata
def on_service_usage_saved(
        sender: ServiceUsage,
        instance: ServiceUsage,
        created: bool = False,
        **kwargs
) -> None:
    def on_commit_callback():
        logger.debug(
            "Service Usage changed - Incrementing CloudSystem's version",
            id=instance.id,
            cloud_system_id=instance.cloud_system_id)
        instance.cloud_system.increment_version()

        # Update the ancestors of the cloud system
        ancestor = instance.cloud_system.systems_path_version_keys
        CacheService.bulk_increment_multiple_types(
            ancestor,
            'descendant_version',
            DescendantVersionMixin)

    transaction.on_commit(on_commit_callback)
