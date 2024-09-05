from functools import wraps

import structlog


logger = structlog.getLogger()


def disable_for_loaddata(signal_handler):
    @wraps(signal_handler)
    def wrapper(*args, **kwargs):
        if kwargs.get('raw', False):
            print(f"Skipping signal for {args} {kwargs}")
            return
        signal_handler(*args, **kwargs)

    return wrapper


def handle_organization_id_change(instance):
    """
    TODO: Review the following comment
    Kyrylo: When organization is changed path is changed too. In cloud_system_receiver .update_cached_path()
            method is called. Shouldn't it be called here?
    """
    from partners.models import Organization
    new_organization_id = instance.organization_id
    old_organization_id = instance.get_audit_history('organization_id', idx=1)

    to_increment = set()

    # Increment descendant version for old organization if it has changed

    if instance.has_field_changed("organization_id", idx=1) and old_organization_id is not None:
        to_increment.add(old_organization_id)

    # Increment descendant version for new organization, if present
    if new_organization_id is not None:
        to_increment.add(new_organization_id)

    Organization.increment_descendant_version_bulk(list(to_increment))
