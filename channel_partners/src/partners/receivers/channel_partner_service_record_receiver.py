from typing import Type

import structlog
from django.db import transaction
from django.db.models.signals import (
    post_delete,
    post_save,
)
from django.dispatch import receiver

from partners.models import (
    ChannelPartnerServiceRecord,
    CloudSystemId,
    Organization,
)
from partners.receivers.utils import disable_for_loaddata


logger = structlog.getLogger()


@receiver(post_save, sender=ChannelPartnerServiceRecord)
@disable_for_loaddata
def on_channel_partner_service_record_change(
        sender: Type[ChannelPartnerServiceRecord],
        instance: ChannelPartnerServiceRecord,
        created: bool = False,
        **kwargs):
    def on_commit_callback():
        logger.debug(
            "Channel Partner Service Record saved - Incrementing Version for Cloud System",
            cloud_system=instance.cloud_system_id,
            service=instance.service_id)
        CloudSystemId.increment_version_by_id(instance.cloud_system_id)
        Organization.increment_descendant_version_by_id(instance.organization_id)

    transaction.on_commit(on_commit_callback)


@receiver(post_delete, sender=ChannelPartnerServiceRecord)
@disable_for_loaddata
def on_channel_partner_service_record_deleted(
        sender: Type[ChannelPartnerServiceRecord],
        instance: ChannelPartnerServiceRecord,
        **kwargs):
    def on_commit_callback():
        logger.debug(
            "Channel Partner Service Record deleted - Incrementing Version for Cloud System",
            cloud_system=instance.cloud_system_id,
            service=instance.service_id)
        CloudSystemId.increment_version_by_id(instance.cloud_system_id)
        Organization.increment_descendant_version_by_id(instance.organization_id)

    transaction.on_commit(on_commit_callback)
