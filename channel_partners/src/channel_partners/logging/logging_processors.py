import uuid
from typing import (
    Any,
    Dict,
)

from django.db.models import UUIDField


def convert_uuids_to_strings(logger, method_name, event_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert any uuid.UUID or UUIDField values in the event_dict to strings, and handle None values in lists.
    """
    for key, value in event_dict.items():
        if isinstance(value, (uuid.UUID, UUIDField)):
            event_dict[key] = str(value)
        elif isinstance(value, list):
            event_dict[key] = [
                str(item) if isinstance(item, (uuid.UUID, UUIDField)) else item
                for item in value
            ]
    return event_dict
