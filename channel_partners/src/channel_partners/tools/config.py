import os

import httpx
import structlog
from nx_ireg.registry import IReg


logger = structlog.get_logger(__name__)


def get_default_host(instance_name: str, instance_domain_name: str) -> str | None:
    try:
        ireg = IReg(instance_name)
    except Exception as ex:
        logger.warning("Cannot retrieve instance registry.",
                       instance_name=instance_name,
                       default_value=instance_domain_name,
                       exc_info=ex)
        return instance_domain_name
    hostname = ireg.get_default_host()
    if not hostname:
        logger.warning("Default customization is missing in instance registry.",
                       instance_name=instance_name,
                       default_value=instance_domain_name,
                       instance_registry=ireg.customizations)
        return instance_domain_name
    return hostname


def get_container_name():
    metadata_uri = os.environ.get('ECS_CONTAINER_METADATA_URI', '')
    if not metadata_uri:
        return ''
    try:
        response = httpx.get(metadata_uri)
        metadata = response.json()
    except Exception as ex:
        return ''
    return metadata.get('Name')
