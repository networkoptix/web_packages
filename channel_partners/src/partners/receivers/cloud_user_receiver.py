from typing import Type

import structlog
from django.db import transaction
from django.db.models.signals import (
    post_delete,
    post_save,
)
from django.dispatch import receiver

from partners.models import CloudUser
from partners.receivers.utils import disable_for_loaddata


logger = structlog.getLogger()


@receiver(post_save, sender=CloudUser)
@disable_for_loaddata
def on_cloud_user_saved(sender: Type[CloudUser], instance: CloudUser, created: bool = False, **kwargs):
    def on_commit_callback():
        if not created:
            logger.debug("Cloud User changed - Incrementing Version", user=instance.id)
            instance.increment_version()

    transaction.on_commit(on_commit_callback)


@receiver(post_delete, sender=CloudUser)
@disable_for_loaddata
def on_cloud_user_deleted(sender: Type[CloudUser], instance: CloudUser, **kwargs):
    # TODO: Do i need to increment all the related organizations and Channel partners?
    def on_commit_callback():
        logger.debug("Cloud User deleted - Not Incrementing Version", user=instance.id)

    transaction.on_commit(on_commit_callback)
