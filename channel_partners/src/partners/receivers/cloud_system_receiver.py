import structlog


logger = structlog.getLogger()


def on_cloud_system_saved(
        sender,
        instance,
        is_new: bool,
        groups_changed: bool,
        **kwargs
) -> None:
    from partners.models import Organization
    """
    This is not being used as a full signal. It's connected durectly to the transaction.on_commit signal in the CloudSystem model.
    """
    # instance is being updated, not created
    if not is_new:
        logger.debug(
            "[NOT NEW] - Cloud System changed - Incrementing Version",
            id=instance.id,
            path=instance.path)
        instance.increment_version()
    Organization.increment_descendant_version_by_id(instance.organization_id)
    if groups_changed:
        logger.debug(
            "Cloud System Group Changed - Updating path in cache",
            system=instance.id,
            organization=instance.organization_id,
            system_group=instance.system_group_id)
        instance.update_cached_path()
