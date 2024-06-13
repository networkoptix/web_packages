from typing import Type
from uuid import UUID

from django.db import models


def cache_key_cloud_system_group_children_count(system_group_id: str | UUID) -> str:
    return f'cloud-system_group_and_children_count-{system_group_id}'


def cp_direct_children_count(channel_partner_id: str | UUID) -> str:
    return f'cp_direct_children-count-{channel_partner_id}'


def direct_organization_children_count(channel_partner_id: str | UUID) -> str:
    return f'direct_organization_children_count_{channel_partner_id}'


def cp_monthly_charges(id: str | UUID, start_date: str) -> str:
    return f'monthly-charges-{id}-{start_date}'


def organization_system_count(id: str | UUID) -> str:
    return f'organization-system-count-{id}'


def cache_key_channel_partner_descendents_structure(
        channel_partner_id: str | UUID,
        user_id: str | UUID
) -> str:
    return f'channel_partner-descendents-structure-{channel_partner_id}-{user_id}'


def cache_key_full_channel_partner_structure(user_id: str | UUID) -> str:
    return f'full-channel_partner-structure-{user_id}'


def get_version_cache_key(
        model_class: Type[models.Model],
        object_id: str,
        field: str
) -> str:
    """
    Generate a cache key based on the model class, object id and field.
    :param model_class:
    :param object_id: UUID
    :param field: [version, descendant_version, path]
    :return:
    """
    # TODO: Fix this hack
    if field == "path_version":
        field = "path"
    return f"{field}:{model_class.__name__}:{object_id}"
