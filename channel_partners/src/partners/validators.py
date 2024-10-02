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


