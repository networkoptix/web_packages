from uuid import UUID


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

