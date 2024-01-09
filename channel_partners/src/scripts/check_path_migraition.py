import sys
import structlog

from partners.models import ChannelPartner, Organization, SystemGroup, CloudSystemId

logger = structlog.get_logger(__name__)


def get_parent(instance):
    parent = (
        getattr(instance, 'parent', None)
        or getattr(instance, 'system_group', None)
        or getattr(instance, 'organization', None)
        or getattr(instance, 'channel_partner', None)
        or getattr(instance, 'parent_channel_partner', None)
    )
    return parent


def check_parent(parent, path: list):
    if not path and parent:
        logger.error("Missing path or parent", parent=parent, path=path)
        sys.exit(0)
    assert parent.id == path.pop(0)
    if next_parent := get_parent(parent):
        check_parent(next_parent, path)
        return
    if path:
        logger.error("Path is invalid", left=path, instance=path)
        sys.exit(0)


def check_path_upto_root(from_instance):
    path = from_instance.path
    logger.info("Checking path", instance=from_instance, path=path)
    if parent := get_parent(from_instance):
        check_parent(parent, path)
    else:
        logger.info("No parents")


def run():
    for model in (ChannelPartner, Organization, SystemGroup, CloudSystemId):
        for obj in model.objects.all():
            check_path_upto_root(obj)
