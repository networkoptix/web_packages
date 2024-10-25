from typing import Type
from uuid import UUID

import structlog
from django.db import transaction
from django.db.models import (
    Q,
    QuerySet,
)
from django.db.models.signals import (
    post_delete,
    post_save,
)
from django.dispatch import receiver

from channel_partners.mixins.version_mixin import VersionMixin
from partners.models import (
    CloudUser,
    Organization,
    OrganizationToUser,
    SystemGroup,
)
from partners.receivers.utils import disable_for_loaddata
from partners.services.cache_service import CacheService


logger = structlog.getLogger()


@receiver(post_save, sender=OrganizationToUser)
@disable_for_loaddata
def on_organization_to_user_saved(
        sender: Type[OrganizationToUser],
        instance: OrganizationToUser,
        created: bool = False,
        **kwargs):
    def on_commit_callback():
        logger.debug(
            "Organization to User saved - Incrementing Version",
            organization_id=instance.organization.id,
            user_id=instance.user_id)
        CloudUser.increment_version_by_id(instance.user_id)
        Organization.increment_version_by_id(instance.organization_id)
        increment_if_group(instance)

    transaction.on_commit(on_commit_callback)


@receiver(post_delete, sender=OrganizationToUser)
@disable_for_loaddata
def on_organization_to_user_deleted(
        sender: Type[OrganizationToUser],
        instance: OrganizationToUser,
        **kwargs):
    def on_commit_callback():

        organization_id = None
        try:
            instance.organization.increment_version()
            organization_id = instance.organization_id
        except Organization.DoesNotExist:
            pass

        user_id = None
        try:
            instance.user.increment_version()
            user_id = instance.user_id
        except CloudUser.DoesNotExist:
            pass

        logger.debug(
            "Organization to User deleted - Incrementing Version",
            organization_id=organization_id,
            user_id=user_id)

        increment_if_group(instance)

    transaction.on_commit(on_commit_callback)


def increment_if_group(instance: OrganizationToUser):
    # TODO: Future enhancement, reduce the number of queries between this and the bulk increment
    if instance.system_group_id is not None:
        system_group_ids: QuerySet[UUID] = (
            SystemGroup.objects.filter(
                Q(id=instance.system_group_id) |
                Q(parent_id=instance.system_group_id)
            ).values_list('id', flat=True))

        logger.debug(
            "Incrementing System Group Versions",
            system_group_count=len(system_group_ids))

        if system_group_ids:
            CacheService.bulk_increment(
                list(system_group_ids),
                SystemGroup,
                'version',
                VersionMixin)
