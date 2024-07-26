import structlog

from partners.receivers.utils import handle_organization_id_change


logger = structlog.getLogger()


def on_cloud_system_saved(
        sender,
        instance,
        is_new: bool,
        groups_changed: bool,
        **kwargs
) -> None:
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
    if groups_changed:
        logger.debug(
            "Cloud System Group Changed - Updating path in cache",
            system=instance.id,
            organization=instance.organization_id,
            system_group=instance.system_group_id)
        instance.update_cached_path()
