from django.core.exceptions import ValidationError
from rest_framework.exceptions import ValidationError


def validate_active_organization(value: 'Organization') -> None:
    from partners.models import ChannelPartnerStates
    if value.effective_state != ChannelPartnerStates.ACTIVE:
        state_text = ChannelPartnerStates.STATE_TEXTS[value.effective_state]
        msg = f'Organization is {state_text}.'
        raise ValidationError(msg)


def validate_dict_max_size(value, max_size=3000) -> None:
    import json

    if len(json.dumps(value)) > max_size:
        raise ValidationError(f'JSON size exceeds the maximum allowed size of {max_size} bytes.')


def validate_role_and_roleId(attrs: dict) -> None:
    if not attrs.get('role') and not attrs.get('roleId'):
        msg = "One of 'role' or 'roleId' must be set."
        raise ValidationError(detail={'role': [msg], 'roleId': [msg]})
    if attrs.get('role') and attrs.get('roleId'):
        msg = "Either 'role' or 'roleId' must be set only."
        raise ValidationError(detail={'role': [msg], 'roleId': [msg]})
